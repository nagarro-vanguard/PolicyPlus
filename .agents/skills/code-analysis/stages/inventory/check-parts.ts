import { dirname } from "node:path";
import type { Catalogue } from "../../shared/run/catalogue";
import type { SystemPart } from "../../shared/model/schemas/system-part";
import { rootOfFolder, type SourceRoot } from "../../shared/source/source-roots";

/**
 * Every folder that holds a file in scope, at any depth, and the roots' base (`.`) when any file is in scope: one pass
 * over the files, so asking whether a part's folder holds a file is a lookup (G14 of plan 0003), never a scan of every
 * file for every folder.
 * @param inScope every file in scope, relative to the roots' base
 * @returns the folders
 */
function foldersHolding(inScope: readonly string[]): ReadonlySet<string> {
    const folders = new Set<string>(inScope.length ? ["."] : []);
    for (const path of inScope) {
        for (let folder = dirname(path); folder !== "." && !folders.has(folder); folder = dirname(folder)) {
            folders.add(folder);
        }
    }
    return folders;
}

/**
 * The gaps in the parts of the system Inventory writes (D142, D175): at least one part; every folder a part names
 * holding a file in scope, so a part is never an empty name; a kind the catalogue lists; and every folder of a part in
 * one source root, so a part's repository is one. Whether a part is a thing built and run, not a project file alone,
 * is the reviewer's judgement (G5 of plan 0003).
 * @param parts the parts written
 * @param inScope every file still in scope, relative to the folder every cited path is relative to
 * @param catalogue the catalogue, whose part kinds a part takes
 * @param roots the source roots read
 * @returns one line per gap
 */
export function partGaps(
    parts: ReadonlyArray<typeof SystemPart.Type>,
    inScope: readonly string[],
    catalogue: Catalogue,
    roots: readonly SourceRoot[],
): string[] {
    const holding = foldersHolding(inScope);
    return [
        ...(parts.length
            ? []
            : [
                  "no SystemPart is written: write one for each thing the code builds that someone runs, deploys or schedules",
              ]),
        ...parts.flatMap((part) => [
            ...part.folders
                .filter((folder) => !holding.has(folder))
                .map((folder) => `${part.id} names the folder ${folder}, which holds no file in scope`),
            ...(catalogue.partKinds.some((kind) => kind.id === part.kind)
                ? []
                : [`${part.id} is of kind ${part.kind}, which the catalogue's part kinds do not list`]),
            ...(new Set(part.folders.map((folder) => rootOfFolder(roots, folder))).size > 1
                ? [`${part.id} names folders in more than one source root: a part lies in one`]
                : []),
        ]),
    ];
}
