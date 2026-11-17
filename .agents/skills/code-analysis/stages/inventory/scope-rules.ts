import type { ManifestFile } from "../../shared/model/schemas/file-listing";

/**
 * The manifest: every inventory file the scope keeps. A copy keeps naming its original only while the original is
 * kept too, else it is read as itself.
 * @param inventory every listed file
 * @param isLeftOut whether a file is left out, by the scope
 * @returns the manifest rows, in inventory order
 */
export function manifestOf(
    inventory: ReadonlyArray<typeof ManifestFile.Type>,
    isLeftOut: (path: string) => boolean,
): Array<typeof ManifestFile.Encoded> {
    return inventory
        .filter((file) => !isLeftOut(file.path))
        .map(({ copyOf, ...file }) => (copyOf && !isLeftOut(copyOf) ? { ...file, copyOf } : file));
}
