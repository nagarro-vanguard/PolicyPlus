import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

/*
 * The one fingerprint of files and folders that the plan, the conductor and shape-target share, so they agree on what
 * counts. Nothing else here: no skill-specific file list. The conductor imports it; shape-target's own copy in
 * `derive/legacy.ts` is to be replaced by it.
 */

/**
 * The analysis's journeys of today are read by the as-is step and the app, which name the file themselves. A folder that
 * holds them (the analysis's payloads) is hashed without them, so a run that adopts them does not run again the steps
 * built from the rest of the analysis (the plan's agents among them). A file named on its own always counts.
 */
export const namedByTheirReaders: ReadonlySet<string> = new Set(["journeys.json", "journeys.schema.json"]);

/**
 * The bytes a file counts by: the file itself, or, for a JSON file named in `without`, the file with those top-level
 * fields taken out. A file that has none of them counts by its own bytes, so adding the rule changes no stored hash.
 */
const contentOf = (file: string, without: Readonly<Record<string, readonly string[]>>) => {
    const bytes = readFileSync(file);
    const fields = without[basename(file)];
    if (fields === undefined) return bytes;
    try {
        const value = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
        if (!fields.some((field) => field in value)) return bytes;
        for (const field of fields) delete value[field];
        return `${JSON.stringify(value, null, 2)}\n`;
    } catch {
        return bytes;
    }
};

export type HashOptions = {
    /** For a JSON file of that name, the top-level fields left out. */
    readonly without?: Readonly<Record<string, readonly string[]>>;
    /** Name each file by its path below this folder instead of its absolute path, so a moved run keeps its hash. */
    readonly relativeTo?: string;
};

/**
 * One fingerprint of files and folders: every file in name order, each named by its path, then its bytes.
 * @param paths the files and folders; a missing one counts as nothing
 * @param options fields left out, and the folder files are named from
 * @returns the hex sha256
 */
export const hashFiles = (paths: readonly string[], options: HashOptions = {}) => {
    const hash = createHash("sha256");
    const walk = (path: string, listed: boolean): string[] =>
        !existsSync(path)
            ? []
            : statSync(path).isDirectory()
              ? readdirSync(path)
                    .sort()
                    .flatMap((name) => walk(join(path, name), false))
              : !listed && namedByTheirReaders.has(basename(path))
                ? []
                : [path];
    for (const file of paths.flatMap((path) => walk(path, true))) {
        hash.update(
            options.relativeTo !== undefined && file.startsWith(options.relativeTo)
                ? file.slice(options.relativeTo.length)
                : file,
        );
        hash.update(contentOf(file, options.without ?? {}));
    }
    return hash.digest("hex");
};

/**
 * A fingerprint of an analysis's payload files, so a plan can say which analysis it was made from. The analysis's
 * journeys of today are left out of the folder, as the conductor leaves them out: the plan does not read them.
 * @param payloads the payloads folder
 * @returns a hex digest
 */
export const fingerprintOf = (payloads: string) => hashFiles([payloads], { relativeTo: payloads });
