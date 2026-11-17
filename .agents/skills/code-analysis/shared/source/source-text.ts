import { isAbsolute, relative, resolve, sep } from "node:path";
import { Effect } from "effect";
import { PathOutsideRoot } from "../run/script-errors";
import { AnalysisRequest } from "../run/analysis-request";
import { readDocument } from "../run/json-files";
import { analysisPaths, sourceBase } from "../run/analysis-layout";
import { FileAccess } from "./file-access";

/**
 * The absolute path of a source file a record names. The path must not climb out of the source folder; links
 * are never listed, so none leads elsewhere.
 * @param base the folder every source path is relative to
 * @param path the path as a record names it
 * @returns the absolute path, or PathOutsideRoot
 */
const sourcePath = (base: string, path: string): Effect.Effect<string, PathOutsideRoot> => {
    const target = resolve(base, path);
    const fromBase = relative(base, target);
    return fromBase === ".." || fromBase.startsWith(`..${sep}`) || isAbsolute(fromBase)
        ? Effect.fail(new PathOutsideRoot({ path, root: base }))
        : Effect.succeed(target);
};

/**
 * The request, the folder every source path is relative to (derived from the request's roots), and a reader of
 * source text, without the manifest: what a step run per job or per call needs to read code, so it never reads the
 * whole manifest.
 * @param root the analysis root
 * @returns the reader; `sourceText(path)` reads a source file as the agent reads it: the file as UTF-8, or the decoded
 * copy Inventory wrote when the Read tool would show the file wrongly
 */
export const sourceReader = Effect.fnUntraced(function* (root: string) {
    const fs = yield* FileAccess;
    const paths = analysisPaths(root);
    const request = yield* readDocument(paths.analysisRequest, AnalysisRequest);
    const base = sourceBase(request.sourceRoots);
    const sourceText = (path: string) =>
        Effect.gen(function* () {
            const source = yield* sourcePath(base, path);
            const copy = paths.decodedCopy(path);
            return yield* fs.readText((yield* fs.exists(copy)) ? copy : source);
        });
    return { paths, request, base, sourceText };
});
