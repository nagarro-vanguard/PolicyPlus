import { Effect } from "effect";
import { analysisPaths } from "../run/analysis-layout";
import { FileAccess } from "../source/file-access";
import { readDocumentStrictly } from "../run/json-files";
import { MapJob, MapJobList } from "../model/schemas/map-jobs";
import type { Lines } from "../model/shared-fields";

/**
 * The Map's job ids. Before the Map is first prepared there is none, which is that state: no job, no mapped line.
 * @param root the analysis root
 * @returns the job ids, in cut order
 */
export const readMapJobList = Effect.fnUntraced(function* (root: string) {
    const path = analysisPaths(root).mapJobs;
    return (yield* (yield* FileAccess).exists(path)) ? yield* readDocumentStrictly(path, MapJobList) : [];
});

/**
 * One Map job, from its own file: its windows.
 * @param root the analysis root
 * @param jobId the job id
 * @returns the job
 */
export const readMapJob = Effect.fnUntraced(function* (root: string, jobId: string) {
    return yield* readDocumentStrictly(analysisPaths(root).mapJobFile(jobId), MapJob);
});

/**
 * One Map job's windows.
 * @param root the analysis root
 * @param jobId the job id
 * @returns the windows, as `Lines`
 */
export const readMapJobLines = Effect.fnUntraced(function* (root: string, jobId: string) {
    return (yield* readMapJob(root, jobId)).lines;
});

/**
 * A job as a reader knows it: the code it holds, never its id, since a refused job's lines are named on the pages.
 * @param lines the job's windows
 * @returns the label
 */
export const mapJobLabel = (lines: readonly Lines[]) => {
    const [first, ...rest] = lines;
    if (first === undefined) {
        return "a map job with no lines";
    }
    const where = first.firstLine === 1 ? first.file : `lines ${first.firstLine} to ${first.lastLine} of ${first.file}`;
    return rest.length ? `the code of ${where} and ${rest.length} more files` : `the code of ${where}`;
};
