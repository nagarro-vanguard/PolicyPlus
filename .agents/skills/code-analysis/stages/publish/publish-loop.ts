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
    briefingReviewReadsOf,
    prepareBriefing,
    reviewedBriefingJob,
} from "./briefing-job";
import { reviewCall } from "../../shared/jobs/review-sheet";
import { briefingReview, checkBriefing } from "./check-briefing";
import type { LoopServices } from "../../shared/jobs/loop-jobs";
import type { ScriptError } from "../../shared/run/script-errors";
import { finishBriefing } from "./finish-briefing";
import { journeySteps } from "./journey-steps";

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
 * The jobs of the journeys of today as the loop takes them.
 * @param root the analysis root
 * @param sourceFolder the folder record paths are relative to
 * @returns the steps
 */
export const publishJourneys = (root: string, sourceFolder: string) => journeySteps(root, sourceFolder);

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
 * Which of Publish's three kinds of job a key names, and so which of three effects to run for it: a job of the journeys
 * by its job id, a concluding job by its key, else the briefing.
 * @param journeys the jobs of the journeys
 * @param conclusions the concluding jobs
 * @returns the choice, given the key and one effect for each kind of job
 */
const amongJobs =
    (journeys: ReturnType<typeof publishJourneys>, conclusions: ReturnType<typeof publishConclusions>) =>
    <A, E1, R1, E2, R2, E3, R3>(
        key: string,
        briefing: Effect.Effect<A, E1, R1>,
        journey: Effect.Effect<A, E2, R2>,
        concluding: Effect.Effect<A, E3, R3>,
    ): Effect.Effect<A, E1 | E2 | E3 | ScriptError, R1 | R2 | R3 | LoopServices> =>
        Effect.flatMap(
            journeys.isJourney(key),
            (isJourney): Effect.Effect<A, E1 | E2 | E3 | ScriptError, R1 | R2 | R3 | LoopServices> =>
                isJourney
                    ? journey
                    : Effect.flatMap(
                          conclusions.isConcluding(key),
                          (isConcluding): Effect.Effect<A, E1 | E3, R1 | R3> => (isConcluding ? concluding : briefing),
                      ),
        );

/**
 * `finish` as the loop takes it: the decision of the briefing, the journeys and the concluding jobs, and whether any
 * job remains to run again.
 * @param root the analysis root
 * @returns the step
 */
const finishStep = (root: string) =>
    Effect.map(finishBriefing(root), (decision) => ({
        more:
            !decision.written &&
            (decision.briefing.outcome === "redo" || decision.concluding || decision.journeysPending),
        said: [
            `the briefing: ${decision.briefing.outcome}`,
            ...(decision.journeysPending ? ["the journeys of today have a job to fix or to run"] : []),
            ...(decision.concluding ? ["the topics every stage's facts leave open are concluded next"] : []),
        ],
    }));

/**
 * Publish as the loop drives it (D56, D177, D225, 4.10): its briefing, brief-the-system and its review, which groups
 * the capabilities into areas; the journeys of today, one job per capability that writes its tasks and one that joins
 * the tasks written twice, each reviewed; then the concluding jobs `finish` lists over every stage's facts, the entries'
 * tier and the system's; then `finish` writes the areas, the journeys and the conclusions in one commit. It draws the
 * subject pages.
 * @param root the analysis root
 * @returns the stage's loop
 */
export const publishLoop = Effect.fnUntraced(function* (root: string) {
    const context = yield* briefingContext(root);
    const conclusions = publishConclusions(root, context.sourceFolder);
    const journeys = publishJourneys(root, context.sourceFolder);
    const among = amongJobs(journeys, conclusions);
    return stageLoop({
        stage: "publish",
        root,
        begin: Effect.void,
        keys: Effect.flatMap(journeys.keys, (journeyKeys) =>
            Effect.map(conclusions.keys, (keys) => [briefingLabel, ...journeyKeys, ...keys]),
        ),
        job: (key) => among(key, loopJob(root), journeys.job(key), conclusions.job(key)),
        mayRun: (job) => among(job.key, Effect.succeed(true), journeys.mayRun(job.key), conclusions.mayRun(job.key)),
        prepare: (keys) =>
            Effect.forEach(keys, (key) =>
                among(
                    key,
                    Effect.map(prepareBriefing(root, undefined), (prepared) => ({
                        key,
                        call: { agent: "publish/brief-the-system", arguments: prepared.briefing },
                    })),
                    journeys.prepare(key),
                    conclusions.prepare(key),
                ),
            ),
        review: (job) =>
            among(
                job.key,
                Effect.gen(function* () {
                    const feedback = yield* feedbackArgument(briefingFiles(root));
                    return yield* reviewCall(
                        briefingReview(root),
                        reviewedBriefingJob(root),
                        {
                            checklist: analysisPaths(root).reviewChecklist("publish"),
                            reads: yield* briefingReviewReadsOf(root),
                        },
                        briefingReviewCall(root, feedback, context),
                    );
                }),
                journeys.review(job.key),
                conclusions.review(job.key),
            ),
        check: (job) => among(job.key, checkBriefing(root), journeys.check(job.key), conclusions.check(job.key)),
        answer: (key, answer) =>
            among(
                key,
                Effect.asVoid(prepareBriefing(root, answer)),
                journeys.answer(key, answer),
                conclusions.answer(key, answer),
            ),
        registry: Effect.succeed(undefined),
        leftOver: Effect.succeed([]),
        afterClose: () => Effect.void,
        notices: (job) => assumptionNotices(job.label, job.outputPath),
        ownersOf: () => Effect.succeed([]),
        finish: finishStep(root),
    });
});
