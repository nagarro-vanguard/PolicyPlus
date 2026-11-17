import { Effect, Option } from "effect";
import { FileAccess } from "../../shared/source/file-access";
import { keepFeedback, readFeedback } from "../../shared/jobs/job-feedback";
import type { LoopJob } from "../../shared/jobs/loop-jobs";
import { checkReviewedJob } from "../../shared/jobs/review-rounds";
import { reviewIn } from "../../shared/jobs/review-files";
import { JobStates } from "../../shared/jobs/job-state";
import { writeReviewReport } from "../../shared/jobs/job-transitions";
import type { FeedbackItem } from "../../shared/model/schemas/feedback";
import {
    stageAuditCall,
    stageAuditJob,
    stageAuditKey,
    stageAuditReview,
    writeAuditFindings,
} from "../../shared/jobs/stage-audit";
import { Fact } from "../../shared/model/schemas/fact";
import { inventoryOwner, routeStageAudit } from "./route-audit";
import { requestContext } from "./study-arguments";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { catalogueFolder } from "../../shared/run/catalogue";
import { reviewCall } from "../../shared/jobs/review-sheet";

const script = "explain-how-it-runs.ts";

/**
 * How it runs' audit as the loop takes it: its findings are the stage's accepted facts, its pass a review; it is always
 * in its first round, since it runs once per stage and is never redone.
 * @param root the analysis root
 * @returns the job
 */
export const auditLoopJob = (root: string): LoopJob => {
    const { outputPath, reviewPath, roundsFolder } = stageAuditJob(root, "how-it-runs");
    return { key: stageAuditKey, label: stageAuditKey, outputPath, reviewed: { reviewPath, roundsFolder } };
};

/**
 * Whether the stage's audit is decided: it runs once per stage.
 * @param job the audit's job
 * @returns true once its state says decided
 */
const auditDecided = Effect.fnUntraced(function* (job: ReturnType<typeof stageAuditJob>) {
    const row = yield* (yield* JobStates).get(job.stage, job.key);
    return row !== undefined && row.state === "decided";
});

/**
 * Open the stage's audit once, after How it runs' first commit (plan 0005, decision E): its findings are every accepted
 * fact. Once decided (its state says so), a later commit opens none: the jobs it reopened are judged by their own
 * review rounds.
 * @param root the analysis root
 * @returns whether an audit was opened
 */
export const openStageAudit = Effect.fnUntraced(function* (root: string) {
    const fs = yield* FileAccess;
    const job = stageAuditJob(root, "how-it-runs");
    if ((yield* auditDecided(job)) || (yield* fs.exists(job.outputPath))) {
        return false;
    }
    yield* writeAuditFindings(root, "how-it-runs", [{ type: "Fact", schema: Fact }]);
    const states = yield* JobStates;
    yield* states.ensure(job.stage, job.key);
    yield* states.update(job.stage, job.key, {
        state: "toReview",
        round: 0,
        fixes: { gate: false, review: false },
        reviewAttempts: 0,
    });
    return true;
});

/**
 * The validation agent's call at the whole stage's scope.
 * @param root the analysis root
 * @returns the call
 */
export const auditCall = Effect.fnUntraced(function* (root: string) {
    const { sourceFolder } = yield* requestContext(root);
    const paths = analysisPaths(root);
    return yield* reviewCall(
        stageAuditReview("how-it-runs", { Fact }),
        stageAuditJob(root, "how-it-runs"),
        {
            checklist: paths.stageChecklist,
            reads: [
                ["the pages the person reads", paths.pages],
                ["the catalogue", catalogueFolder],
            ],
        },
        stageAuditCall(root, script, sourceFolder),
    );
});

/**
 * `check 'the stage audit'`: the gate on the whole stage's audit: each verdict valid on a record of the stage, each
 * missed record within scope; a verdict is needed only on what the audit challenges.
 * @param root the analysis root
 * @returns one line per gap; none when the audit passes
 */
export const checkStageAudit = (root: string) =>
    checkReviewedJob(stageAuditReview("how-it-runs", { Fact }), stageAuditJob(root, "how-it-runs"));

/**
 * Decide the stage's audit once its review passes its gate (plan 0005, decision E): each item goes to the jobs that own
 * it, which are reopened with it as feedback; an item no job How it runs can reopen holds (Inventory's while How it
 * runs has records, or none) stays with the audit, for the operator (`auditLeftOver`); the person is never asked. The report marks the
 * audit done: it runs once per stage.
 * @param root the analysis root
 * @param reopen reopen one job with its items
 * @returns nothing once decided
 */
export const decideStageAudit = Effect.fnUntraced(function* <E, R>(
    root: string,
    reopen: (key: string, items: readonly FeedbackItem[]) => Effect.Effect<void, E, R>,
) {
    const fs = yield* FileAccess;
    const job = stageAuditJob(root, "how-it-runs");
    if (!(yield* fs.exists(job.reviewPath)) || (yield* auditDecided(job))) {
        return;
    }
    if ((yield* checkStageAudit(root)).length) {
        return;
    }
    const review = yield* reviewIn({ Fact }, job.reviewPath);
    const { routed, unrouted } = yield* routeStageAudit(root);
    for (const [key, items] of routed) {
        if (key !== inventoryOwner) {
            yield* reopen(key, items);
        }
    }
    const held = routed.get(inventoryOwner);
    const left = [...unrouted, ...(held === undefined ? [] : held)];
    if (left.length) {
        yield* keepFeedback(job, job.outputPath, left);
    }
    yield* writeReviewReport({
        job,
        outcome: "accepted",
        round: 0,
        accepted: [],
        counts: {
            findings: 0,
            partlyCorrect: review.verdicts.filter((verdict) => verdict.verdict === "partlyCorrect").length,
            wrong: review.verdicts.filter((verdict) => verdict.verdict === "wrong").length,
            unsettled: review.verdicts.filter((verdict) => verdict.verdict === "unsettled").length,
            missed: review.missed.length,
        },
        checks: [],
        fixes: { gate: false, review: false },
    });
});

/**
 * What the stage's audit left that no job could take, for the operator, never the person (plan 0007, decision D): how
 * many items and where they are; none while it is not decided.
 * @param root the analysis root
 * @returns the line, or none
 */
export const auditLeftOver = Effect.fnUntraced(function* (root: string) {
    const job = stageAuditJob(root, "how-it-runs");
    if (!(yield* auditDecided(job))) {
        return [];
    }
    const feedback = yield* readFeedback(job);
    return Option.isNone(feedback) || feedback.value.items.length === 0
        ? []
        : [
              `For the operator: the stage's audit left ${feedback.value.items.length} items no job could take, in the job state`,
          ];
});
