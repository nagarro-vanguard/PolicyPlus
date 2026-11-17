import { Effect } from "effect";
import { AnalysisRequest } from "../../shared/run/analysis-request";
import { analysisPaths, scriptsCommand, shellWord, sourceBase } from "../../shared/run/analysis-layout";
import { catalogueFolder } from "../../shared/run/catalogue";
import { instructionsOf } from "../../shared/jobs/job-feedback";
import { readDocumentStrictly } from "../../shared/run/json-files";
import { reviewArguments as reviewArgumentsOf } from "../../shared/jobs/review-sheet";
import type { ListedJob } from "../../shared/model/schemas/how-it-runs-jobs";

/**
 * What every agent of the stage is given from the request: the folder record paths are relative to, and whether the
 * request lists Supporting Material.
 * @param root the analysis root
 * @returns the source folder, and whether there is Supporting Material
 */
export const requestContext = Effect.fnUntraced(function* (root: string) {
    const request = yield* readDocumentStrictly(analysisPaths(root).analysisRequest, AnalysisRequest);
    return {
        sourceFolder: sourceBase(request.sourceRoots),
        withSupportingMaterial: request.supportingMaterial.length > 0,
    };
});

type RequestContext = Effect.Success<ReturnType<typeof requestContext>>;

type WithFeedback = typeof ListedJob.Type & { readonly customInstructions?: string };

/**
 * The named arguments of one job's study, in the order study-how-it-runs's contract lists them. What else it is given
 * (its technology, its registry, the Supporting Material) the job file names.
 * @param root the analysis root
 * @param job the listed job
 * @param context the source folder
 * @returns the arguments; `customInstructions` only with feedback
 */
export const studyArguments = (root: string, job: WithFeedback, context: RequestContext) => ({
    scriptsCommand: scriptsCommand(root),
    sourceFolder: context.sourceFolder,
    jobId: job.jobId,
    jobPath: analysisPaths(root).studyTopics(job.jobId),
    cataloguePath: catalogueFolder,
    outputPath: analysisPaths(root).studyOutput(job.jobId),
    ...instructionsOf(job),
});

/**
 * What the reviewer of one job's study is given besides its files: the source folder, the command that checks its review
 * and the job's feedback.
 * @param root the analysis root
 * @param job the listed job, and its feedback when it has some
 * @param context the source folder
 * @returns the call
 */
export const studyReviewCall = (root: string, job: WithFeedback, context: RequestContext) => ({
    root,
    sourceFolder: context.sourceFolder,
    checkCommand: `${scriptsCommand(root)}/explain-how-it-runs.ts check ${shellWord(job.jobId)}`,
    feedback: job,
});

/**
 * The named arguments of the review of one job's study, in the order the reviewer's contract lists them.
 * @param root the analysis root
 * @param job the listed job
 * @param context the source folder
 * @returns the arguments; `customInstructions` only when the job has feedback
 */
export const reviewArguments = (root: string, job: WithFeedback, context: RequestContext) =>
    reviewArgumentsOf(studyJobFiles(root, job), studyReviewCall(root, job, context));

/**
 * Where one job's agents and rounds write, and the stage and key its state is held under (its job id), as the review
 * rounds take them.
 * @param root the analysis root
 * @param job the job's id
 * @param job.jobId the job id
 * @returns the job's files
 */
export const studyJobFiles = (root: string, job: { readonly jobId: string }) => {
    const paths = analysisPaths(root);
    return {
        stage: "how-it-runs" as const,
        key: job.jobId,
        outputPath: paths.studyOutput(job.jobId),
        reviewPath: paths.reviewOutput(job.jobId),
        roundsFolder: paths.studyRounds(job.jobId),
    };
};
