import { dirname } from "node:path";

/**
 * Files grouped by the folder each sits in directly and one more key, each group with its files in listing order.
 * @param files the files
 * @param keyOf the key besides the folder
 * @returns the groups, in the order first met
 */
export function byFolderAnd<F extends { readonly path: string }, K extends string>(
    files: readonly F[],
    keyOf: (file: F) => K,
) {
    const groups = new Map<string, { folder: string; key: K; paths: string[] }>();
    for (const file of files) {
        const folder = dirname(file.path);
        const key = keyOf(file);
        const id = JSON.stringify([folder, key]);
        const group = groups.get(id);
        if (group === undefined) {
            groups.set(id, { folder, key, paths: [file.path] });
        } else {
            group.paths.push(file.path);
        }
    }
    return [...groups.values()];
}

/**
 * A folder as a gap names it: the roots' base for a file at the top.
 * @param folder the folder, relative to the roots' base
 * @returns its words
 */
export const folderWords = (folder: string) => (folder === "." ? "the roots' base" : `${folder}/`);

/**
 * A count of files in words.
 * @param count how many
 * @param what the files, as a noun before "file"
 * @returns "1 code file", "3 code files"
 */
export const filesWords = (count: number, what: string) => `${count} ${what}${count === 1 ? "file" : "files"}`;
