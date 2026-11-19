import { Console, Effect, Schema } from "effect";
import {
    ManifestVersion,
    PayloadManifest,
    payloadContractVersion,
    type PayloadKind,
} from "../model/schemas/payload-manifest";
import { compareText } from "../run/collections";
import { sha1Hex } from "../run/hashing-and-random";
import { readDocument } from "../run/json-files";
import { UsageInvalid } from "../run/script-errors";
import { FileAccess } from "../source/file-access";
import { capabilitySlugs } from "./payload-journeys";

/** One payload file as written: its path in the payloads' folder, its kind and its text. */
export type WrittenPayload = { readonly path: string; readonly kind: typeof PayloadKind.Type; readonly text: string };

const capabilityPrefix = "capability-";

/**
 * The file each capability's payload is written to: `capability-<slug>.json`, the slug its name as an address, made
 * unique the way a task's id is (`capabilitySlugs`). A name survives a stage run again from nothing, where a record id
 * does not, so readers that hold a file name keep it; the record id stays inside the payload as data. Every reader that
 * globs `capability-*.json` still finds them.
 * @param capabilities every capability, with its record id and name
 * @returns the file name of each, by record id
 */
export const capabilityFiles = (capabilities: ReadonlyArray<{ readonly id: string; readonly name: string }>) =>
    new Map([...capabilitySlugs(capabilities)].map(([id, slug]) => [id, `${capabilityPrefix}${slug}.json`] as const));

/**
 * The file a capability's payload is in, as the system payload names it: its `file`, or, in payloads written before
 * files were named for capabilities, its record id.
 * @param capability the capability, as the system payload lists it
 * @param capability.id its record id
 * @param capability.file its payload's file, when the system payload names it
 * @returns the file name
 */
export const capabilityFileOf = (capability: { readonly id: string; readonly file?: string }) =>
    capability.file === undefined ? `${capability.id}.json` : capability.file;

/**
 * The manifest of a set of payloads: the contract version, which writer wrote them (a digest of their JSON Schemas)
 * and each file with its kind, its schema and the digest of its text, in a fixed order.
 * @param written the payload files, as written
 * @param schemas the JSON Schema document of each kind, as written
 * @returns the manifest
 */
export const manifestOf = (
    written: readonly WrittenPayload[],
    schemas: ReadonlyArray<readonly [typeof PayloadKind.Type, string]>,
): PayloadManifest => {
    const rank = (kind: typeof PayloadKind.Type) =>
        ["system", "capability", "knowledge", "journeys", "bundle"].indexOf(kind);
    return {
        contractVersion: payloadContractVersion,
        writer: { skill: "code-analysis", version: sha1Hex(schemas.map(([, text]) => text).join("\n")).slice(0, 12) },
        files: written
            .toSorted((one, other) => rank(one.kind) - rank(other.kind) || compareText(one.path, other.path))
            .map((each) => ({
                path: each.path,
                kind: each.kind,
                schema: `schema/${each.kind}.schema.json`,
                digest: sha1Hex(each.text),
            })),
    };
};

/**
 * The payload files of an earlier run that this one did not write again: capability files under another name, such
 * as those named by record id before files were named for capabilities. Left in place, a reader that globs
 * `capability-*.json` would read a capability twice.
 * @param entries the names in the payloads' folder
 * @param written the paths this run wrote
 * @returns the names to remove
 */
export const stalePayloads = (entries: readonly string[], written: readonly WrittenPayload[]) => {
    const kept = new Set(written.map((each) => each.path));
    return entries
        .filter((name) => name.startsWith(capabilityPrefix) && name.endsWith(".json") && !kept.has(name))
        .toSorted(compareText);
};

/**
 * Refuse payloads written for a contract these scripts do not read. Payloads with no manifest were written before it
 * existed, by a writer whose payloads these scripts still read: they are read, and the person is told to write them
 * again.
 * @param folder the payloads' folder
 * @returns nothing when the payloads can be read; UsageInvalid naming both versions when they cannot
 */
export const checkPayloadContract = Effect.fnUntraced(function* (folder: string) {
    const path = `${folder}/manifest.json`;
    if (!(yield* (yield* FileAccess).exists(path))) {
        yield* Console.log(
            `${folder} has no manifest.json: these payloads were written before it, and are read as contract version ${payloadContractVersion}; run write-payloads again to stamp them`,
        );
        return;
    }
    const { contractVersion } = yield* readDocument(path, ManifestVersion);
    if (contractVersion !== payloadContractVersion) {
        return yield* new UsageInvalid({
            issue: `the payloads in ${folder} follow contract version ${contractVersion}, and these scripts read version ${payloadContractVersion}: run write-payloads of the same skill version again`,
        });
    }
    yield* readDocument(path, PayloadManifest);
});

/**
 * The text a payload is written as: its encoding by its schema, as indented JSON with a final newline.
 * @param schema the payload's schema
 * @param value the payload
 * @returns the text
 */
export const payloadText = <A, I>(schema: Schema.Codec<A, I>, value: A) =>
    `${JSON.stringify(Schema.encodeSync(schema)(value), null, 2)}\n`;
