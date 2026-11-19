import { Console, Effect, Layer, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { join } from "node:path";
import { BundleIndex, BundlePayload } from "../shared/model/schemas/bundle-payload";
import { CapabilityPayload } from "../shared/model/schemas/payloads";
import { KnowledgePayload } from "../shared/model/schemas/knowledge-payload";
import { SystemPayload } from "../shared/model/schemas/system-payload";
import {
    bundleGaps,
    bundleText,
    capabilityBundle,
    capabilityBundleNames,
    screenBundle,
    slug as slugOf,
    surfaceBundle,
    surfaceBundleName,
    surfacePairs,
    type Bundle,
    type Payloads,
} from "../shared/read/bundle";
import { capabilityFileOf, checkPayloadContract } from "../shared/read/payload-files";
import { AnalysisRoot } from "../shared/run/analysis-root";
import { analysisPaths, sourceBase } from "../shared/run/analysis-layout";
import { AnalysisRequest } from "../shared/run/analysis-request";
import { readDocumentStrictly } from "../shared/run/json-files";
import { UsageInvalid } from "../shared/run/script-errors";
import { needsAction, runScript, scriptServices } from "../shared/run/run-script";
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
 * Read every payload write-payloads wrote, once their manifest says they follow the contract these scripts read.
 * @param folder the payloads' folder
 * @returns the system's, the capabilities' and the knowledge payload
 */
const readPayloads = Effect.fnUntraced(function* (folder: string) {
    yield* checkPayloadContract(folder);
    const system = yield* readDocumentStrictly(join(folder, "system.json"), SystemPayload);
    const knowledge = yield* readDocumentStrictly(join(folder, "knowledge.json"), KnowledgePayload);
    const capabilities = [];
    for (const each of system.capabilities) {
        capabilities.push(yield* readDocumentStrictly(join(folder, capabilityFileOf(each)), CapabilityPayload));
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
 * Write one bundle: its text, with the source of its files when asked, and a line saying where and how big; and say what
 * does not add up in it.
 * @param input the bundle, the file to write it to and where the source is read from
 * @param input.bundle the bundle
 * @param input.path the file to write
 * @param input.sourceFolder the folder the source is read from; undefined when it is not to be embedded
 * @returns the size of the written text in lines and bytes, and how many things in it do not add up
 */
const writeBundle = Effect.fnUntraced(function* (input: {
    readonly bundle: Bundle;
    readonly path: string;
    readonly sourceFolder: string | undefined;
}) {
    const { bundle, path, sourceFolder } = input;
    const sources =
        sourceFolder === undefined
            ? new Map<string, string>()
            : yield* sourcesOf(
                  sourceFolder,
                  bundle.files.map((file) => file.path),
              );
    const text = bundleText(bundle, (file) => sources.get(file));
    yield* (yield* FileAccess).writeText(path, text);
    const bytes = new TextEncoder().encode(text).length;
    yield* Console.log(`${path}: ${bundle.files.length} files named, ${sources.size} embedded`);
    const gaps = bundleGaps(bundle);
    for (const gap of gaps) {
        yield* Console.log(`the bundle does not add up: ${gap}`);
    }
    return { lines: text.split("\n").length - 1, gaps: gaps.length, bytes };
});

/**
 * Write the bundle of every surface of every capability, then the bundle of every capability, then
 * `bundles/index.json`, which lists each with its kind, surface, capability and size, and sum up.
 * @param root the analysis root
 * @param payloads everything the analysis wrote
 * @param sourceFolder the folder the source is read from; undefined when it is not to be embedded
 * @returns the effect that writes the files and prints one line each and a summary
 */
const buildAll = Effect.fnUntraced(function* (root: string, payloads: Payloads, sourceFolder: string | undefined) {
    let failing = 0;
    let largest = { path: "", lines: 0 };
    const index: Array<(typeof BundleIndex.Type)[number]> = [];
    const wanted = [
        ...surfacePairs(payloads).map((pair) => ({
            kind: "surface" as const,
            surface: pair.surface,
            capabilityId: pair.capabilityId,
            capability: pair.capability,
            file: surfaceBundleName(pair.surface, pair.capability),
            bundle: surfaceBundle(payloads, pair.surface, pair.capabilityId),
        })),
        ...capabilityBundleNames(payloads).map((each) => ({
            kind: "capability" as const,
            surface: "",
            capabilityId: each.capabilityId,
            capability: each.capability,
            file: each.file,
            bundle: capabilityBundle(payloads, each.capabilityId),
        })),
    ];
    for (const each of wanted) {
        if (each.bundle === undefined) {
            continue;
        }
        const path = `${root}/bundles/${each.file}`;
        const done = yield* writeBundle({ bundle: each.bundle, path, sourceFolder });
        failing += done.gaps;
        largest = done.lines > largest.lines ? { path, lines: done.lines } : largest;
        index.push({
            file: each.file,
            kind: each.kind,
            surface: each.surface,
            capability: each.capability,
            capabilityId: each.capabilityId,
            bytes: done.bytes,
        });
    }
    yield* (yield* FileAccess).writeText(
        `${root}/bundles/index.json`,
        `${JSON.stringify(Schema.encodeSync(BundleIndex)(index), null, 2)}\n`,
    );
    yield* Console.log(
        `${index.length} bundles written to ${root}/bundles (${index.filter((each) => each.kind === "capability").length} of whole capabilities), listed in index.json, ${failing} things that do not add up; the largest is ${largest.path} with ${largest.lines} lines`,
    );
    if (failing > 0) {
        yield* needsAction;
    }
});

/**
 * Build the bundles asked for: the bundle of a screen (all of it, or the part one capability holds), of a capability, or
 * of every surface of every capability. Each holds its context and, when told to, the source of every file it names, as
 * one text to paste into a tool that will modernise it, written beside the payloads.
 * @param kind `screen`, `capability` or `all`
 * @param name a screen's address, or a capability's name or record id; none for `all`
 * @param options what to restrict to and embed
 * @param options.capability a capability's name or record id to restrict a screen to
 * @param options.withSource whether to embed the files' source
 * @returns the effect that writes the files under `<analysis root>/bundles/` and says where
 */
const buildBundle = Effect.fn("buildBundle")(function* (
    kind: string,
    name: string | undefined,
    options: { readonly capability: string | undefined; readonly withSource: boolean },
) {
    const { root } = yield* AnalysisRoot;
    const payloads = yield* readPayloads(`${root}/payloads`);
    const request = yield* readDocumentStrictly(analysisPaths(root).analysisRequest, AnalysisRequest);
    const sourceFolder = options.withSource ? sourceBase(request.sourceRoots) : undefined;
    if (kind === "all") {
        return yield* buildAll(root, payloads, sourceFolder);
    }
    const capabilityId = options.capability === undefined ? undefined : capabilityIdOf(payloads, options.capability);
    const bundle =
        name === undefined
            ? undefined
            : kind === "screen"
              ? screenBundle(payloads, name, capabilityId)
              : kind === "capability"
                ? capabilityBundle(payloads, capabilityIdOf(payloads, name))
                : undefined;
    if (bundle === undefined || name === undefined) {
        return yield* new UsageInvalid({
            issue: `${kind} "${name === undefined ? "" : name}" is no screen address (with that capability) or capability of this analysis: give \`screen\` and an address as the site shows it, \`capability\` and its name, or \`all\``,
        });
    }
    const slug = name
        .toLowerCase()
        .split("")
        .map((char) => ((char >= "a" && char <= "z") || (char >= "0" && char <= "9") ? char : "-"))
        .join("");
    const suffix = kind === "screen" && options.capability !== undefined ? `--${slugOf(options.capability)}` : "";
    const done = yield* writeBundle({ bundle, path: `${root}/bundles/${kind}-${slug}${suffix}.md`, sourceFolder });
    if (done.gaps > 0) {
        yield* needsAction;
    }
});

const command = Command.make(
    "build-bundle",
    {
        kind: Argument.String("kind"),
        name: Argument.String("name").pipe(Argument.optional),
        capability: Flag.String("capability").pipe(Flag.optional),
        withSource: Flag.Boolean("with-source").pipe(Flag.withDefault(false)),
    },
    ({ kind, name, capability, withSource }) =>
        buildBundle(kind, Option.getOrUndefined(name), { capability: Option.getOrUndefined(capability), withSource }),
).pipe(
    Command.withDescription(
        "Builds the bundle of one screen, one screen as one capability holds it, one capability, or every surface of every capability of a finished analysis, to modernise it to another stack, as one markdown text each, written to <analysis root>/bundles/. It reads only payloads/, work/analysis-request.json and the source, not the record store. It holds the product context with the system diagram, where the slice sits (diagram), the screens it opens and is opened by, what it must do (controls, actions and the rules it owns), the rules it relies on that other code decides, the data it touches with the life of each kind and its changes of state, what to doubt (records challenged in review, risks once each, assumptions, code nothing reaches) and the files to read in order, each with the lines to read. The source is referenced, not embedded; --with-source embeds the lines the file list names. Checks that each rule is listed once, every cited place is covered by the file list and no boilerplate is left; the run needs action when not. Run write-payloads first. Nothing is redacted: a secret in the code is in the bundle when the source is embedded. Arguments: `screen <address>` (file <kind>-<address>.md; the screen's address as its page shows it) with `--capability <name>` to cut it to the actions, rules and neighbours of that capability (file screen-<address>--<capability>.md); `capability <name>`; or `all`, which writes screen-<slug(surface)>--<slug(capability)>.md for every (surface, capability) pair, a surface being the screen an action names or `Entry points without a window`, then capability-<slug(capability)>.md for every capability, and bundles/index.json listing each file with its kind (`surface` or `capability`), surface, capability and size in bytes; it prints one line per bundle and a summary with the largest.",
    ),
);

runScript(command, Layer.mergeAll(scriptServices, AnalysisRoot.layer));
