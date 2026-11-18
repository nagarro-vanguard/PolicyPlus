import { Console, Effect } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { join } from "node:path";
import { BundlePayload } from "../shared/model/schemas/bundle-payload";
import { CapabilityPayload } from "../shared/model/schemas/payloads";
import { KnowledgePayload } from "../shared/model/schemas/knowledge-payload";
import { SystemPayload } from "../shared/model/schemas/system-payload";
import { bundleGaps, bundleText, capabilityBundle, screenBundle, type Payloads } from "../shared/read/bundle";
import { AnalysisRoot } from "../shared/run/analysis-root";
import { analysisPaths, sourceBase } from "../shared/run/analysis-layout";
import { AnalysisRequest } from "../shared/run/analysis-request";
import { readDocumentStrictly } from "../shared/run/json-files";
import { UsageInvalid } from "../shared/run/script-errors";
import { needsAction, rootServices, runScript } from "../shared/run/run-script";
import { FileAccess } from "../shared/source/file-access";

/**
 * The record id of the capability a person names by its name or its id; the name itself when none matches.
 * @param payloads everything the analysis wrote
 * @param name the capability's name or record id
 * @returns the id
 */
const capabilityIdOf = (payloads: Payloads, name: string) => {
    const found = payloads.capabilities.find(
        (each) => each.capability.id === name || each.capability.name.toLowerCase() === name.toLowerCase(),
    );
    return found === undefined ? name : found.capability.id;
};

/**
 * Read every payload write-payloads wrote.
 * @param folder the payloads' folder
 * @returns the system's, the capabilities' and the knowledge payload
 */
const readPayloads = Effect.fnUntraced(function* (folder: string) {
    const system = yield* readDocumentStrictly(join(folder, "system.json"), SystemPayload);
    const knowledge = yield* readDocumentStrictly(join(folder, "knowledge.json"), KnowledgePayload);
    const capabilities = [];
    for (const each of system.capabilities) {
        capabilities.push(yield* readDocumentStrictly(join(folder, `${each.id}.json`), CapabilityPayload));
    }
    const index = yield* readDocumentStrictly(join(folder, "bundle.json"), BundlePayload);
    const payloads: Payloads = { system, capabilities, knowledge, index };
    return payloads;
});

/**
 * The source text of the files a bundle names, where each can be read; a file that cannot is left out and said.
 * @param folder the source folder
 * @param paths the bundle's files
 * @returns the text by path
 */
const sourcesOf = Effect.fnUntraced(function* (folder: string, paths: readonly string[]) {
    const files = yield* FileAccess;
    const texts = new Map<string, string>();
    for (const path of paths) {
        const text = yield* Effect.option(files.readText(join(folder, path)));
        if (text._tag === "Some") {
            texts.set(path, text.value);
        } else {
            yield* Console.log(`not embedded, cannot be read: ${path}`);
        }
    }
    return texts;
});

/**
 * Build the bundle of a screen or a capability: its context and, unless told not to, the source of every file it names,
 * as one text to paste into a tool that will modernise it, and written beside the payloads.
 * @param kind `screen` or `capability`
 * @param name a screen's address, or a capability's name or record id
 * @param withSource whether to embed the files' source
 * @returns the effect that writes `<analysis root>/bundles/<kind>-<name>.md` and says where
 */
const buildBundle = Effect.fn("buildBundle")(function* (kind: string, name: string, withSource: boolean) {
    const { root } = yield* AnalysisRoot;
    const payloads = yield* readPayloads(`${root}/payloads`);
    const bundle =
        kind === "screen"
            ? screenBundle(payloads, name)
            : kind === "capability"
              ? capabilityBundle(payloads, capabilityIdOf(payloads, name))
              : undefined;
    if (bundle === undefined) {
        return yield* new UsageInvalid({
            issue: `${kind} "${name}" is no screen address or capability of this analysis: give \`screen\` and an address as the site shows it, or \`capability\` and its name`,
        });
    }
    const request = yield* readDocumentStrictly(analysisPaths(root).analysisRequest, AnalysisRequest);
    const sources = withSource
        ? yield* sourcesOf(
              sourceBase(request.sourceRoots),
              bundle.files.map((file) => file.path),
          )
        : new Map<string, string>();
    const slug = name
        .toLowerCase()
        .split("")
        .map((char) => ((char >= "a" && char <= "z") || (char >= "0" && char <= "9") ? char : "-"))
        .join("");
    const path = `${root}/bundles/${kind}-${slug}.md`;
    yield* (yield* FileAccess).writeText(
        path,
        bundleText(bundle, (file) => sources.get(file)),
    );
    yield* Console.log(`${path}: ${bundle.files.length} files named, ${sources.size} embedded`);
    const gaps = bundleGaps(bundle);
    for (const gap of gaps) {
        yield* Console.log(`the bundle does not add up: ${gap}`);
    }
    if (gaps.length > 0) {
        yield* needsAction;
    }
});

const command = Command.make(
    "build-bundle",
    {
        kind: Argument.String("kind"),
        name: Argument.String("name"),
        withSource: Flag.Boolean("with-source").pipe(Flag.withDefault(false)),
    },
    ({ kind, name, withSource }) => buildBundle(kind, name, withSource),
).pipe(
    Command.withDescription(
        "Builds the bundle of one screen or one capability of a finished analysis, to modernise it to another stack, as one markdown text written to <analysis root>/bundles/<kind>-<name>.md. It holds the product context with the system diagram, where the slice sits (diagram), the screens it opens and is opened by, what it must do (controls, actions and the rules it owns), the rules it relies on that other code decides, the data it touches with the life of each kind and its changes of state, what to doubt (records challenged in review, risks once each, assumptions, code nothing reaches) and the files to read in order, each with the lines to read. The source is referenced, not embedded; --with-source embeds the lines the file list names. Checks that each rule is listed once, every cited place is covered by the file list and no boilerplate is left; the run needs action when not. Run write-payloads first. Nothing is redacted: a secret in the code is in the bundle when the source is embedded. Arguments: `screen` with the screen's address as its page shows it, or `capability` with its name.",
    ),
);

runScript(command, rootServices);
