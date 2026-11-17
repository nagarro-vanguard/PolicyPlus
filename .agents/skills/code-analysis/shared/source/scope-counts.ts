import { dirname } from "node:path";
import ignore from "ignore";
import type { SystemPart } from "../model/schemas/system-part";
import type { Technology } from "../model/schemas/technology";
import { compareText } from "../run/collections";
import { holds } from "./source-roots";

/**
 * Whether a part's folder holds a path; the folder `.` holds every path.
 * @param folder the part's folder
 * @param path the path
 * @returns true when the folder holds it
 */
const partFolderHolds = (folder: string, path: string) => folder === "." || holds(folder, path);

/**
 * The part a file belongs to (D142): the part with the longest folder holding it, so nested folders never count twice.
 * @param parts the parts
 * @returns for a path, relative to the roots' base, its part, or undefined when no part holds it
 */
export const partOf = (parts: ReadonlyArray<typeof SystemPart.Type>) => {
    const folders = parts
        .flatMap((part) => part.folders.map((folder) => ({ part, folder })))
        .toSorted((one, other) => other.folder.length - one.folder.length);
    return (path: string) => {
        const holding = folders.find((each) => partFolderHolds(each.folder, path));
        return holding === undefined ? undefined : holding.part;
    };
};

/**
 * The technology of the given kinds covering a file, by the .gitignore patterns Inventory recorded in `covers`: the
 * same matcher the scope rules use, so `*.cbl` covers what an extension did and a folder covers members with no
 * extension. Where two technologies cover a file, the one written first does.
 * @param stack the technologies
 * @param kinds the kinds that cover files: languages, and kinds of file that are not code
 * @returns for a path, relative to the roots' base, the technology covering it, or undefined when none does
 */
export const technologyCovering = (
    stack: ReadonlyArray<typeof Technology.Type>,
    kinds: ReadonlyArray<(typeof Technology.Type)["kind"]>,
) => {
    const matchers = stack.flatMap((entry) =>
        entry.covers === undefined || !kinds.includes(entry.kind)
            ? []
            : [{ entry, matcher: ignore().add([...entry.covers]) }],
    );
    return (path: string) => {
        const covering = matchers.find((each) => each.matcher.ignores(path));
        return covering === undefined ? undefined : covering.entry;
    };
};

type Counts = { readonly folder: string; lines: number; files: number };

/**
 * Lines and files by the folder each file sits in directly, largest first, ties in path order.
 * @param files the files
 * @returns the folders, each with its lines and files
 */
export function byFolder(files: ReadonlyArray<{ readonly path: string; readonly lines: number }>): Counts[] {
    const folders = new Map<string, Counts>();
    for (const file of files) {
        const folder = dirname(file.path);
        const counts = folders.get(folder);
        if (counts === undefined) {
            folders.set(folder, { folder, lines: file.lines, files: 1 });
        } else {
            counts.lines += file.lines;
            counts.files += 1;
        }
    }
    return [...folders.values()].sort(
        (left, right) => right.lines - left.lines || compareText(left.folder, right.folder),
    );
}
