import type { ManifestFile } from "../../shared/model/schemas/file-listing";
import type { Technology } from "../../shared/model/schemas/technology";
import { technologyCovering } from "../../shared/source/scope-counts";
import { byFolderAnd, filesWords, folderWords } from "../../shared/source/file-groups";

type Listed = Pick<typeof ManifestFile.Type, "path" | "readsAs">;

/**
 * The gaps in what the files in scope are (plan 0002, phase 4): every file in scope that is not binary is covered by
 * a technology's pattern, listed by folder.
 * @param inScope every file still in scope, with how Read sees it
 * @param stack the technologies, whose patterns cover files
 * @returns one line per gap
 */
export function fileGaps(inScope: readonly Listed[], stack: ReadonlyArray<typeof Technology.Type>): string[] {
    const anyCovering = technologyCovering(stack, ["language", "notCode"]);
    return byFolderAnd(
        inScope.filter((file) => file.readsAs !== "binary" && anyCovering(file.path) === undefined),
        () => "uncovered",
    ).map(
        (group) =>
            `no technology covers ${filesWords(group.paths.length, "")} in ${folderWords(group.folder)}, such as ${group.paths[0]}: add a pattern to the technology they are written in, or to a kind of file that is not code`,
    );
}
