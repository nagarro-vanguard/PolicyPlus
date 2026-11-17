import { Effect } from "effect";
import { AnalysisRequest } from "../../shared/run/analysis-request";
import { analysisPaths, briefingKey, scriptsCommand, sourceBase } from "../../shared/run/analysis-layout";
import { rejectedPathOf } from "../../shared/jobs/job-transitions";
import {
    agentRecords,
    carryForward,
    feedbackArgument,
    instructionsOf,
    personsWords,
    prepareJobRun,
    requireArtifacts,
    type PersonsWords,
} from "../../shared/jobs/job-feedback";
import { readDocumentStrictly } from "../../shared/run/json-files";
import { reviewArguments } from "../../shared/jobs/review-sheet";
import { requireAcceptedRecords, startStageRun } from "../../shared/store/stage-guards";
import { StageRecords } from "../../shared/store/stage-records";
import { CapabilityGroup, CrossCuttingConcern } from "../../shared/model/schemas/briefing";
import { Fact } from "../../shared/model/schemas/fact";
import { writeBriefingBrief } from "./briefing-brief";

export const briefingShapes = { CapabilityGroup, CrossCuttingConcern, Fact };

export const briefingLabel = briefingKey;

/**
 * The briefing's files: brief-the-system's output, its review, and the folder earlier rounds are kept in (D29).
 * @param root the analysis root
 * @returns the job's files
 */
export const briefingFiles = (root: string) => {
    const paths = analysisPaths(root);
    return {
        stage: "publish" as const,
        key: briefingKey,
        outputPath: paths.briefingOutput,
        reviewPath: paths.briefingReview,
        roundsFolder: paths.briefingRounds,
    };
};

/**
 * The briefing as the review rounds take it: its label and its files.
 * @param root the analysis root
 * @returns the job
 */
export const reviewedBriefingJob = (root: string) => ({ label: briefingLabel, ...briefingFiles(root) });

type WithFeedback = { readonly customInstructions?: string };

type RequestContext = { readonly sourceFolder: string; readonly withSupportingMaterial: boolean };

/**
 * What both agents' arguments depend on in the request: the source folder, and whether it lists Supporting Material.
 * @param root the analysis root
 * @returns the context
 */
export const briefingContext = Effect.fnUntraced(function* (root: string) {
    const request = yield* readDocumentStrictly(analysisPaths(root).analysisRequest, AnalysisRequest);
    const context: RequestContext = {
        sourceFolder: sourceBase(request.sourceRoots),
        withSupportingMaterial: request.supportingMaterial.length > 0,
    };
    return context;
});

/**
 * The named arguments of brief-the-system, in the order its contract lists them.
 * @param root the analysis root
 * @param job the job's feedback, when it has some
 * @param context the source folder, and whether the request lists Supporting Material
 * @returns the arguments; `analysisRequestPath` only with Supporting Material, `customInstructions` only with feedback
 */
const briefingArguments = (root: string, job: WithFeedback, context: RequestContext) => {
    const paths = analysisPaths(root);
    return {
        scriptsCommand: scriptsCommand(root),
        sourceFolder: context.sourceFolder,
        briefPath: paths.briefingBrief,
        ...(context.withSupportingMaterial ? { analysisRequestPath: paths.analysisRequest } : {}),
        outputPath: paths.briefingOutput,
        ...instructionsOf(job),
    };
};

/**
 * The named arguments of the briefing's review, in the order the shared reviewer's contract lists them: the findings
 * are the briefing, the checklist Publish's, and the brief what the writer worked from.
 * @param root the analysis root
 * @param job the job's feedback, when it has some
 * @param context the source folder
 * @returns the arguments; `customInstructions` only when the job has feedback
 */
const briefingReviewArguments = (root: string, job: WithFeedback, context: RequestContext) =>
    reviewArguments(briefingFiles(root), briefingReviewCall(root, job, context));

/**
 * What the briefing's reviewer is given besides its files: the source folder, the command that checks its review and the
 * job's feedback.
 * @param root the analysis root
 * @param job the job's feedback, when it has some
 * @param context the source folder
 * @returns the call
 */
export const briefingReviewCall = (root: string, job: WithFeedback, context: RequestContext) => ({
    root,
    sourceFolder: context.sourceFolder,
    checkCommand: `${scriptsCommand(root)}/publish-pages.ts check`,
    feedback: job,
});

/**
 * `prepare`: make the briefing ready for its next run, while holding the record store, as every stage run starts:
 * refused until Capabilities and entities has accepted records, it removes Publish's accepted records until its next
 * `finish`. The job's output and review are cleared, so a cut-off run leaves nothing behind;
 * the person's words, when given, are feedback on its last briefing (refused before it wrote one), kept with it for the
 * run to improve (D29). The brief
 * is written again from the accepted records first, so a failure writing it leaves Publish's records as they were
 * (D226).
 * @param root the analysis root
 * @param words the person's feedback on the last briefing, when they give it
 * @returns both agents' arguments, the feedback as `customInstructions` last
 */
export const prepareBriefing = Effect.fnUntraced(function* (root: string, words: PersonsWords | undefined) {
    yield* requireAcceptedRecords("capabilities-and-entities");
    const files = briefingFiles(root);
    if (words !== undefined) {
        yield* requireArtifacts([{ jobId: briefingLabel, files }]);
    }
    const stages = yield* StageRecords;
    yield* writeBriefingBrief(root);
    yield* startStageRun(
        "publish",
        [],
        Effect.gen(function* () {
            yield* prepareJobRun(files, personsWords(words), [files.reviewPath, rejectedPathOf(files.reviewPath)]);
            yield* stages.removeStageRecords("publish");
        }),
    );
    const feedback = yield* feedbackArgument(files);
    const context = yield* briefingContext(root);
    return {
        briefing: briefingArguments(root, feedback, context),
        review: briefingReviewArguments(root, feedback, context),
    };
});

/**
 * `carry`: start the run from the briefing its feedback is about, copying every record of it that stands with its
 * record id, so the agent writes only what the feedback changes.
 * @param root the analysis root
 * @param leftOut the record ids that do not stand
 * @returns how many records were carried and left out
 */
export const carryBriefing = (root: string, leftOut: readonly string[]) =>
    carryForward(briefingFiles(root), agentRecords(briefingShapes), leftOut);
