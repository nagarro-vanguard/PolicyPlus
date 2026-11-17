import { Effect } from "effect";
import type { Stage } from "../run/analysis-layout";
import { getOrCreate } from "../run/collections";
import type { JsonRecord } from "../model/json-record";
import type { StageWriter } from "../store/stage-records";
import { everyOrGaps } from "../jobs/every-or-gaps";
import { countProgress } from "../jobs/progress";
import { setRoundAside, writeReviewReport } from "../jobs/job-transitions";
import type { ReviewedJob, ReviewOutcome } from "../jobs/review-rounds";
import { owesFix } from "../jobs/job-transitions";
import { clearFeedback, keepFeedback } from "../jobs/job-feedback";
import { FeedbackItem } from "../model/schemas/feedback";
import type { GapsRemain } from "../run/script-errors";
import { ShapeRegistry, typeNameOfId } from "../model/shape-registry";

type Job = ReviewedJob & { readonly jobId: string };

/**
 * Insert one accepted job's records into the stage's write, one batch per registered type, so the job is looked up
 * once per batch, not once per record: the agent's output names a record's type by its record id's declared prefix
 * (T5).
 * @param writer the stage's write
 * @param jobId the job
 * @param records the job's accepted records
 * @returns nothing once inserted
 */
const insertAcceptedRecords = Effect.fnUntraced(function* (
    writer: StageWriter,
    jobId: string,
    records: readonly JsonRecord[],
) {
    const typeNameOf = typeNameOfId((yield* ShapeRegistry).records);
    const byType = new Map<string, JsonRecord[]>();
    for (const record of records) {
        const type = typeof record.id === "string" ? typeNameOf(record.id) : undefined;
        getOrCreate(byType, type === undefined ? "an unregistered type" : type).push(record);
    }
    for (const [type, batch] of byType) {
        yield* writer.insertRecords(type, batch, jobId);
    }
});

/**
 * An accepted job's outcome once a check after its review finds something to change (P1.37): its gate fix, when it has
 * not taken it in this cycle, else refused, its records removed from the write, the findings its feedback (D29).
 * @param each the job's outcome
 * @param found what the check found in the job's output; none leaves the outcome as it was
 * @returns the outcome
 */
export const refusedAfterReview = <J extends ReviewedJob>(
    each: ReviewOutcome<J>,
    found: readonly FeedbackItem[],
): ReviewOutcome<J> => {
    if (each.outcome !== "accepted" || found.length === 0) {
        return each;
    }
    const checks = [...each.checks, ...found];
    return { ...each, outcome: owesFix(each.fixes, checks) ? "redo" : "refused", checks };
};

/**
 * Decide every job's outcome, one job at a time (`decide`, the stage's review rounds), inserting a written job's
 * records as soon as it is decided, and keeping only the outcome's summary: no job keeps its
 * records. A record id the store already holds is feedback for the jobs that wrote it, the holder and the writer, from
 * the record store's rules: each runs its gate fix, or is refused with its records removed from the write. Refused,
 * naming every gap of every review, while any review leaves one.
 * @param writer the stage's write
 * @param stage the stage, named in its progress
 * @param jobs every job
 * @param decide one job's outcome, by the stage's review rounds
 * @returns the outcomes' summaries; GapsRemain naming each gap the reviews leave
 */
export const decideEveryJob = Effect.fnUntraced(function* <J extends Job, E, R>(
    writer: StageWriter,
    stage: Stage,
    jobs: readonly J[],
    decide: (job: J) => Effect.Effect<ReviewOutcome<J>, E | GapsRemain, R>,
) {
    const refused = new Map<string, FeedbackItem[]>();
    const finished = yield* countProgress(`${stage} finish`, jobs.length, "jobs decided");
    const outcomes = yield* everyOrGaps(
        jobs,
        (job) =>
            Effect.gen(function* () {
                const result = yield* decide(job);
                if (result.outcome === "accepted") {
                    yield* insertAcceptedRecords(writer, job.jobId, result.accepted).pipe(
                        Effect.catchTag("RecordIdRepeated", (repeated) =>
                            Effect.sync(() =>
                                repeated.jobs.forEach((jobId) =>
                                    getOrCreate(refused, jobId).push(
                                        ...FeedbackItem.fromGaps("store", [repeated.message]),
                                    ),
                                ),
                            ),
                        ),
                    );
                }
                const summary: ReviewOutcome<J> = { ...result, accepted: [] };
                return summary;
            }),
        finished,
    );
    const decided = outcomes.map((each) => {
        const found = refused.get(each.job.jobId);
        return found === undefined ? each : refusedAfterReview(each, found);
    });
    for (const each of decided.filter((outcome) => outcome.outcome !== "accepted" && refused.has(outcome.job.jobId))) {
        yield* writer.removeJobRecords(each.job.jobId);
    }
    return decided;
});

/**
 * Set every job to redo aside, through the review rounds, which keep its feedback on the artifact set aside and count
 * its round in its state, for its agents' next run. The caller holds the record store.
 * @param redo the jobs to redo
 * @returns nothing once set aside
 */
export const setRoundsAside = Effect.fnUntraced(function* (redo: ReadonlyArray<ReviewOutcome<Job>>) {
    for (const each of redo) {
        yield* setRoundAside(each);
    }
});

/**
 * Keep each decided job's feedback as its outcome leaves it: a refused job keeps what its checks found on its output,
 * for the operator (D29); a written job's is cleared, since its review's findings are its labels now (P1.36).
 * @param outcome the job's outcome, never one to redo
 * @returns nothing once kept
 */
const settleFeedback = (outcome: ReviewOutcome<ReviewedJob>) =>
    outcome.outcome === "refused" && outcome.checks.length
        ? keepFeedback(outcome.job, outcome.job.outputPath, outcome.checks)
        : outcome.outcome === "refused"
          ? Effect.void
          : clearFeedback(outcome.job);

/**
 * Write each decided job's report and settle its feedback, once the stage's write is over (D74): never for a commit
 * that did not happen.
 * @param settled each job's outcome
 * @returns nothing once written
 */
export const settleOutcomes = Effect.fnUntraced(function* (settled: ReadonlyArray<ReviewOutcome<ReviewedJob>>) {
    for (const outcome of settled) {
        yield* writeReviewReport(outcome);
        yield* settleFeedback(outcome);
    }
});
