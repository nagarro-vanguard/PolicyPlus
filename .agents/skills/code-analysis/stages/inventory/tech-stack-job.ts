import { Effect } from "effect";
import {
    analysisPaths,
    inventoryJobKey,
    inventoryJobLabel,
    scriptsCommand,
    sourceBase,
} from "../../shared/run/analysis-layout";
import {
    agentRecords,
    carryForward,
    feedbackArgument,
    personsWords,
    prepareJobRun,
    requireArtifacts,
    type PersonsWords,
} from "../../shared/jobs/job-feedback";
import { rejectedPathOf } from "../../shared/jobs/job-transitions";
import { startStageRun } from "../../shared/store/stage-guards";
import { StageRecords } from "../../shared/store/stage-records";
import { Technology } from "../../shared/model/schemas/technology";
import { Fact } from "../../shared/model/schemas/fact";
import { SystemPart } from "../../shared/model/schemas/system-part";
import { catalogueFolder } from "../../shared/run/catalogue";
import { reviewArguments } from "../../shared/jobs/review-sheet";

export const inventoryShapes = { Technology, SystemPart, Fact };

/**
 * Inventory's one job's files: profile-tech-stack's output, its review, and the folder earlier rounds are kept in (D29).
 * @param root the analysis root
 * @returns the job's files
 */
export const techStackFiles = (root: string) => {
    const paths = analysisPaths(root);
    return {
        stage: "inventory" as const,
        key: inventoryJobKey,
        outputPath: paths.techStackOutput,
        reviewPath: paths.techStackReview,
        roundsFolder: paths.techStackRounds,
    };
};

/**
 * Inventory's one job as the review rounds take it: its label and its files.
 * @param root the analysis root
 * @returns the job
 */
export const reviewedInventoryJob = (root: string) => ({ label: inventoryJobLabel, ...techStackFiles(root) });

/**
 * The named arguments of profile-tech-stack, in the order its contract lists them.
 * @param root the analysis root
 * @param sourceRoots the request's source roots, whose base is the folder record paths are relative to
 * @returns the arguments
 */
const techStackArguments = (root: string, sourceRoots: readonly [string, ...string[]]) => ({
    scriptsCommand: scriptsCommand(root),
    sourceFolder: sourceBase(sourceRoots),
    fileSummaryPath: analysisPaths(root).fileSummary,
    cataloguePath: catalogueFolder,
    outputPath: analysisPaths(root).techStackOutput,
});

/**
 * What Inventory's reviewer is given besides its job's files: the source folder, the command that checks its review and
 * the job's feedback.
 * @param root the analysis root
 * @param sourceRoots the request's source roots
 * @param feedback the job's feedback, when it has some
 * @returns the call
 */
export const inventoryReviewCall = (
    root: string,
    sourceRoots: readonly [string, ...string[]],
    feedback?: { readonly customInstructions?: string },
) => ({
    root,
    sourceFolder: sourceBase(sourceRoots),
    checkCommand: `${scriptsCommand(root)}/inventory-codebase.ts check`,
    ...(feedback === undefined ? {} : { feedback }),
});

/**
 * The named arguments of Inventory's review, in the order the shared reviewer's contract lists them (D114).
 * @param root the analysis root
 * @param sourceRoots the request's source roots
 * @param feedback the job's feedback, when it has some
 * @returns the arguments
 */
const techStackReviewArguments = (
    root: string,
    sourceRoots: readonly [string, ...string[]],
    feedback?: { readonly customInstructions?: string },
) => reviewArguments(techStackFiles(root), inventoryReviewCall(root, sourceRoots, feedback));

/**
 * `prepare`: make Inventory's one job ready for its next run, while holding the record store, as every stage run
 * starts: refused while How it runs has accepted records, it removes Inventory's accepted records until its next
 * `finish`, and the pages it leaves stale. The job's output and review are removed, so a cut-off run leaves nothing
 * behind; the person's words, when given, are feedback on its last output (refused before it wrote one), kept with that
 * output for the run to improve (D29).
 * @param root the analysis root
 * @param sourceRoots the request's source roots
 * @param words the person's feedback on the last stack and scope, when they give it
 * @returns both agents' arguments, the feedback as `customInstructions` last
 */
export const prepareTechStack = Effect.fnUntraced(function* (
    root: string,
    sourceRoots: readonly [string, ...string[]],
    words: PersonsWords | undefined,
) {
    const files = techStackFiles(root);
    if (words !== undefined) {
        yield* requireArtifacts([{ jobId: inventoryJobKey, files }]);
    }
    const stages = yield* StageRecords;
    yield* startStageRun(
        "inventory",
        ["how-it-runs"],
        Effect.gen(function* () {
            yield* prepareJobRun(files, personsWords(words), [files.reviewPath, rejectedPathOf(files.reviewPath)]);
            yield* stages.removeStageRecords("inventory");
        }),
    );
    const feedback = yield* feedbackArgument(files);
    return {
        profile: { ...techStackArguments(root, sourceRoots), ...feedback },
        review: techStackReviewArguments(root, sourceRoots, feedback),
    };
});

/**
 * `carry`: start the run from the output its feedback is about, copying every technology, part and fact that stands
 * with its record id, so the agent writes only what the feedback changes and the review traces each across rounds.
 * @param root the analysis root
 * @param leftOut the record ids that do not stand
 * @returns how many records were carried and left out
 */
export const carryTechStack = (root: string, leftOut: readonly string[]) =>
    carryForward(techStackFiles(root), agentRecords(inventoryShapes), leftOut);
