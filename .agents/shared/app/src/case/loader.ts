import type { Loader } from "astro/loaders";
import { buildConfig } from "./build-config";
import { caseProblems } from "./integrity";
import { type Case, openCase } from "./read";

// The content loader: reads `case/` into the app's collections, one entry per record. Before any entry is stored the
// whole case is opened (version and digests) and checked as a whole: every node, row, crumb, lateral
// link, fact reference and number key must resolve. Astro's own `reference()` only logs a broken reference and lets the
// build pass, so this check throws, and a thrown loader fails the build.

let opened: Case | undefined;

/**
 * The case of this build, opened and checked once for every collection.
 * @returns the case
 */
export const theCase = (): Case => {
    if (opened === undefined) {
        const candidate = openCase(buildConfig().caseDir);
        const problems = caseProblems(candidate);
        if (problems.length > 0) {
            throw new Error(
                `The case cannot be shown: ${problems.length} broken references or keys:\n${problems.slice(0, 20).join("\n")}`,
            );
        }
        opened = candidate;
    }
    return opened;
};

/**
 * The records of one collection: every record of each file, keyed by a field; a file of one object is one entry.
 * @param kase the case
 * @param files the case files the collection reads; a file the case does not hold gives nothing
 * @param id the field that keys a record, or null for a file of one object
 * @param name the collection's name, the key of a single object
 * @returns the entries' ids and data
 */
export const recordsOf = (
    kase: Case,
    files: readonly string[],
    id: string | null,
    name: string,
): { id: string; data: Record<string, unknown> }[] =>
    files
        .filter((file) => kase.has(file))
        .flatMap((file) => {
            const value = kase.json(file);
            if (id === null) return [{ id: name, data: value as Record<string, unknown> }];
            return (value as Record<string, unknown>[]).map((record) => ({ id: String(record[id]), data: record }));
        });

/**
 * A loader for one collection of the case.
 * @param name the collection
 * @param files the case files it reads
 * @param id the field that keys a record, or null for a single object
 * @returns the loader
 */
export const caseLoader = (name: string, files: readonly string[], id: string | null): Loader => ({
    name: `case-${name}`,
    load: async ({ store, parseData, generateDigest }) => {
        const records = recordsOf(theCase(), files, id, name);
        store.clear();
        const seen = new Set<string>();
        for (const record of records) {
            if (seen.has(record.id)) throw new Error(`two ${name} records share the key ${record.id}`);
            seen.add(record.id);
            const data = await parseData({ id: record.id, data: record.data });
            store.set({ id: record.id, data, digest: generateDigest(record.data) });
        }
    },
});
