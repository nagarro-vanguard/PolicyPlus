import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Schema } from "effect";
import { subjectOf } from "./gates";
import { writeJson } from "./jobs/state";
import type { Layout } from "./model/layout";

/*
 * `target/manifest.json` says which version of the contract the files in `target/` follow, with the sha256 of each,
 * so a reader can refuse files it cannot read. The files themselves keep their shape (two of them are bare arrays).
 * The version goes up when a file changes in a way an older reader would misread.
 */
export const CONTRACT_VERSION = 2;

export const Manifest = Schema.Struct({
    contractVersion: Schema.Int,
    files: Schema.Record(Schema.String, Schema.String),
});
export type Manifest = typeof Manifest.Type;

/**
 * Writes the manifest of what `target/` holds now, when it differs from the one there.
 * @param layout the run's folders
 */
export const writeManifest = (layout: Layout) => {
    if (!existsSync(layout.target)) return;
    const names = readdirSync(layout.target)
        .filter((name) => name.endsWith(".json") && name !== "manifest.json")
        .sort();
    const manifest: Manifest = {
        contractVersion: CONTRACT_VERSION,
        files: Object.fromEntries(names.map((name) => [name, subjectOf(join(layout.target, name))])),
    };
    // Written only when it changes, so deriving again leaves `target/` as it was.
    if (
        !existsSync(layout.manifest) ||
        readFileSync(layout.manifest, "utf8") !== `${JSON.stringify(manifest, null, 2)}\n`
    )
        writeJson(layout.manifest, manifest);
};

/**
 * The manifest, when there is one: runs made before it existed have none, and are read as they are.
 * @param layout the run's folders
 * @returns the manifest, or nothing
 */
export const loadManifest = (layout: Layout): Manifest | undefined =>
    existsSync(layout.manifest)
        ? Schema.decodeUnknownSync(Manifest)(JSON.parse(readFileSync(layout.manifest, "utf8")))
        : undefined;
