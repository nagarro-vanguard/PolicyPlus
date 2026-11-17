import { posix } from "node:path";
import { sourceBase } from "../run/analysis-layout";

export type SourceRoot = {
    readonly folder: string;
    readonly name: string;
    readonly commit: string | null;
    readonly clean: boolean | null;
};

type Listed = { readonly name: string; readonly commit: string | null; readonly clean: boolean | null };

/**
 * The source roots the analysis read (D175), derived each time, never stored: each root's folder relative to the
 * folder every cited path is relative to (empty when there is one root), with the commit and cleanliness the listing
 * recorded for it. The listing reads the request's roots in order, so the two lists pair by position.
 * @param roots the request's source roots, as absolute paths
 * @param listed what the listing recorded for each root, in the same order
 * @returns the roots
 */
export function sourceRootsOf(
    roots: readonly [string, ...string[]],
    listed: readonly [Listed, ...Listed[]],
): readonly SourceRoot[] {
    const base = sourceBase(roots);
    return roots.map((root, i) => {
        const read = listed[i];
        if (read === undefined || read.name !== posix.basename(root)) {
            throw new Error(`the listing recorded no root for ${root}: list the files again`);
        }
        return { folder: roots.length < 2 ? "" : posix.relative(base, root), ...read };
    });
}

/**
 * Whether a folder holds a path, compared segment by segment, never as text: `app` holds `app/x.php`, not
 * `apps/x.php`; the empty folder holds every path.
 * @param folder the folder
 * @param path the path
 * @returns true when every segment of the folder begins the path
 */
export const holds = (folder: string, path: string) => {
    if (folder === "") {
        return true;
    }
    const [held, file] = [folder.split("/"), path.split("/")];
    return held.length < file.length && held.every((segment, i) => segment === file[i]);
};

/**
 * The root a part's folder lies in: the one whose folder is it or holds it; `.` lies in the one root there is.
 * @param roots the roots
 * @param folder a part's folder, relative to the folder every cited path is relative to, or `.` for the one root
 * @returns the root, or undefined when no root holds it
 */
export const rootOfFolder = (roots: readonly SourceRoot[], folder: string) =>
    roots.find((root) => root.folder === "" || root.folder === folder || holds(root.folder, folder));
