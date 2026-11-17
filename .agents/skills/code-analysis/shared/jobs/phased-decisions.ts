import { Effect } from "effect";
import { decided, reviewedJobState } from "./loop-jobs";
import { JobStates } from "./job-state";
import { settleOutcomes } from "../read/reviewed-jobs";
import { setRoundAside } from "./job-transitions";
import type { ReviewOutcome, ReviewedJob } from "./review-rounds";

/**
 * Whether a decided job's outcome is still to be taken: it has no report, or the report of the round set aside before
 * its fix ran. A job taken earlier keeps its report, which nothing changes until it runs again, so a finish between
 * a stage's phases reads only what is new (P1.12).
 * @param job the job
 * @returns true when it is decided and not yet taken
 */
const newlyDecided = Effect.fnUntraced(function* (job: ReviewedJob) {
    if (!decided(yield* reviewedJobState(job))) {
        return false;
    }
    const { report } = yield* (yield* JobStates).ensure(job.stage, job.key);
    return report === undefined || report.outcome === "redo";
});

/**
 * Take each job decided since it was last taken (`newlyDecided`): a job to redo is set aside for its one fix with its
 * feedback; every other is settled, its report written.
 * @param jobs the jobs, as the review rounds take them
 * @param decide the job's outcome
 * @returns the outcomes taken, and how many were set aside to redo
 */
export const decideNew = Effect.fnUntraced(function* <J extends ReviewedJob, E, R>(
    jobs: readonly J[],
    decide: (job: J) => Effect.Effect<ReviewOutcome<J>, E, R>,
) {
    const outcomes: Array<ReviewOutcome<J>> = [];
    for (const job of jobs) {
        if (yield* newlyDecided(job)) {
            outcomes.push(yield* decide(job));
        }
    }
    const redo = outcomes.filter((each) => each.outcome === "redo");
    for (const each of redo) {
        yield* setRoundAside(each);
    }
    yield* settleOutcomes(outcomes.filter((each) => each.outcome !== "redo"));
    return { redo: redo.length, outcomes };
});
