import { analysisPaths } from "../../shared/run/analysis-layout";
import { assumptionNotices } from "../../shared/read/assumptions";
import { Effect } from "effect";
import { conclusionSteps } from "../../shared/jobs/conclusion-steps";
import { feedbackArgument } from "../../shared/jobs/job-feedback";
import { stageLoop } from "../../shared/jobs/loop-jobs";
import {
    briefingContext,
    briefingFiles,
    briefingLabel,
    briefingReviewCall,
    prepareBriefing,
    reviewedBriefingJob,
} from "./briefing-job";
import { reviewCall } from "../../shared/jobs/review-sheet";
import { briefingReview, checkBriefing } from "./check-briefing";
import { finishBriefing } from "./finish-briefing";

const script = "publish-pages.ts";

/**
 * Publish's concluding jobs' steps (D177), over every stage's facts.
 * @param root the analysis root
 * @param sourceFolder the folder record paths are relative to
 * @returns the steps
 */
export const publishConclusions = (root: string, sourceFolder: string) =>
    conclusionSteps({ root, stage: "publish", later: [], script, sourceFolder });

/**
 * The briefing as the loop takes it: its key, label and files.
 * @param root the analysis root
 * @returns the job
 */
const loopJob = (root: string) => {
    const { outputPath, label, key, reviewPath, roundsFolder } = reviewedBriefingJob(root);
    return Effect.succeed({ key, label, outputPath, reviewed: { reviewPath, roundsFolder } });
};

/**
 * Publish as the loop drives it (D56, D177, D225, 4.10): its briefing, brief-the-system and its review, which groups
 * the capabilities into areas; then the concluding jobs `finish` lists over every stage's facts, the entries' tier
 * and the system's; then `finish` writes the areas and the conclusions in one commit. It draws the
 * subject pages.
 * @param root the analysis root
 * @returns the stage's loop
 */
export const publishLoop = Effect.fnUntraced(function* (root: string) {
    const context = yield* briefingContext(root);
    const conclusions = publishConclusions(root, context.sourceFolder);
    const either = <A, E, R>(key: string, briefing: Effect.Effect<A, E, R>, concluding: Effect.Effect<A, E, R>) =>
        Effect.flatMap(conclusions.isConcluding(key), (isConcluding) => (isConcluding ? concluding : briefing));
    return stageLoop({
        stage: "publish",
        root,
        begin: Effect.void,
        keys: Effect.map(conclusions.keys, (keys) => [briefingLabel, ...keys]),
        job: (key) => either(key, loopJob(root), conclusions.job(key)),
        mayRun: (job) => either(job.key, Effect.succeed(true), conclusions.mayRun(job.key)),
        prepare: (keys) =>
            Effect.forEach(keys, (key) =>
                either(
                    key,
                    Effect.map(prepareBriefing(root, undefined), (prepared) => ({
                        key,
                        call: { agent: "publish/brief-the-system", arguments: prepared.briefing },
                    })),
                    conclusions.prepare(key),
                ),
            ),
        review: (job) =>
            either(
                job.key,
                Effect.flatMap(feedbackArgument(briefingFiles(root)), (feedback) =>
                    reviewCall(
                        briefingReview(root),
                        reviewedBriefingJob(root),
                        {
                            checklist: analysisPaths(root).reviewChecklist("publish"),
                            reads: [["what the writer worked from", analysisPaths(root).briefingBrief]],
                        },
                        briefingReviewCall(root, feedback, context),
                    ),
                ),
                conclusions.review(job.key),
            ),
        check: (job) => either(job.key, checkBriefing(root), conclusions.check(job.key)),
        answer: (key, answer) =>
            either(key, Effect.asVoid(prepareBriefing(root, answer)), conclusions.answer(key, answer)),
        registry: Effect.succeed(undefined),
        leftOver: Effect.succeed([]),
        afterClose: () => Effect.void,
        notices: (job) => assumptionNotices(job.label, job.outputPath),
        ownersOf: () => Effect.succeed([]),
        finish: Effect.map(finishBriefing(root), (decision) => ({
            more: !decision.written && (decision.briefing.outcome === "redo" || decision.concluding),
            said: [
                `the briefing: ${decision.briefing.outcome}`,
                ...(decision.concluding ? ["the topics every stage's facts leave open are concluded next"] : []),
            ],
        })),
    });
});
