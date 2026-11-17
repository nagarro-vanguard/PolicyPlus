/**
 * What happens to a job's state and files when a round of its cycle ends: set aside for its fix, refused, or reported.
 * The decision is the review rounds'; this is its bookkeeping.
 */
import { basename, dirname, join } from "node:path";
import { Effect } from "effect";
import { FileAccess } from "../source/file-access";
import { keepFeedback } from "./job-feedback";
import { JobStates } from "./job-state";
import type { FixesTaken } from "./job-state-types";
import type { ReviewOutcome, ReviewedJob } from "./review-rounds";
import { noCounts } from "./review-verdicts";
import { FeedbackItem } from "../model/schemas/feedback";

/**
 * Where an agent's output that failed its gate is kept aside once, beside it, for the person to read.
 * @param path the output
 * @returns the kept-aside file
 */
export const rejectedPathOf = (path: string) => join(dirname(path), `${basename(path, ".jsonl")}.rejected.jsonl`);

const checking = new Set<string>(["gate", "acrossJobs", "store"]);

/**
 * Whether a job runs once more (P1.37): when what was found holds an item of a kind whose fix it has not taken yet, the
 * review's challenges and misses for the review fix, the gate's, the checks across jobs' and the store's gaps for the
 * gate fix. Each fix runs once in a cycle, so a job runs at most three times: its run, and one fix of each kind.
 * @param taken the fixes the job has taken
 * @param found what its review and its checks found
 * @returns true when it runs once more
 */
export const owesFix = (taken: FixesTaken, found: readonly FeedbackItem[]) =>
    found.some((item) => (item.from === "review" ? !taken.review : checking.has(item.from) && !taken.gate));

/**
 * Record one job's outcome in its state: its report, which the stage's later steps and `show` read, with its review
 * counts, and where it stands: decided once accepted, refused once refused; a job to redo is set aside by
 * `setRoundAside`.
 * @param outcome the job's outcome
 * @returns nothing once written
 */
export const writeReviewReport = Effect.fnUntraced(function* (outcome: ReviewOutcome<ReviewedJob>) {
    const { job, counts, round } = outcome;
    yield* (yield* JobStates).update(job.stage, job.key, {
        report: {
            outcome: outcome.outcome,
            round,
            partlyCorrect: counts.partlyCorrect,
            wrong: counts.wrong,
            unsettled: counts.unsettled,
            missed: counts.missed,
        },
        ...(outcome.outcome === "accepted" ? { state: "decided" as const } : {}),
        ...(outcome.outcome === "refused" ? { state: "refused" as const } : {}),
    });
});

/**
 * Set a job to redo aside for its one fix (P1.37): its output (an empty one stands for an output never written), and
 * its review where it has one, move to the next numbered rounds folder, where its fix reads the artifact its feedback
 * is about; its state holds the round, which fix it takes (the review's when a review stood, else the gate's), and its
 * report. The caller holds the record store.
 * @param outcome the job to redo, with what was found
 * @returns nothing once moved
 */
export const setRoundAside = Effect.fnUntraced(function* (outcome: ReviewOutcome<ReviewedJob>) {
    const fs = yield* FileAccess;
    const { job, fixes } = outcome;
    const artifact = join(job.roundsFolder, String(outcome.round + 1), basename(job.outputPath));
    if (yield* fs.exists(job.outputPath)) {
        yield* fs.move(job.outputPath, artifact);
    } else {
        yield* fs.writeText(artifact, "");
    }
    const reviewed = yield* fs.exists(job.reviewPath);
    if (reviewed) {
        yield* fs.move(job.reviewPath, join(dirname(artifact), basename(job.reviewPath)));
    }
    yield* keepFeedback(job, artifact, outcome.checks);
    yield* writeReviewReport(outcome);
    yield* (yield* JobStates).update(job.stage, job.key, {
        state: "toFix",
        round: outcome.round + 1,
        fixes: reviewed ? { gate: fixes.gate, review: true } : { gate: true, review: fixes.review },
    });
});

/**
 * Set aside an agent's output that failed its gate, or was never written, for its gate fix (D58): the gate's gaps become
 * the feedback the next run improves on.
 * @param job the job
 * @param gaps what the gate found
 * @returns nothing once set aside
 */
export const setGateRoundAside = Effect.fnUntraced(function* (job: ReviewedJob, gaps: readonly string[]) {
    const { round, fixes } = yield* (yield* JobStates).ensure(job.stage, job.key);
    const checks = FeedbackItem.fromGaps("gate", gaps);
    yield* setRoundAside({ job, outcome: "redo", round, accepted: [], counts: noCounts, checks, fixes });
});

/**
 * Refuse a job once its gate fix is taken and its gate still finds gaps (P1.35), or once its review has failed its own
 * check twice, which nothing writes (P1.33): its state says refused, its feedback stays for the operator, and the pages
 * show its lines as not mapped. A refused review is removed, since no job is written unreviewed.
 * @param job the job
 * @param gaps what the gate found last; none for a review given up
 * @returns nothing once written
 */
export const refuseJob = Effect.fnUntraced(function* (job: ReviewedJob, gaps: readonly string[]) {
    const states = yield* JobStates;
    const { round, fixes } = yield* states.ensure(job.stage, job.key);
    yield* (yield* FileAccess).remove(job.reviewPath);
    if (gaps.length) {
        yield* keepFeedback(job, job.outputPath, FeedbackItem.fromGaps("gate", gaps));
    }
    yield* writeReviewReport({
        job,
        outcome: "refused",
        round,
        accepted: [],
        counts: noCounts,
        checks: [],
        fixes,
    });
});
