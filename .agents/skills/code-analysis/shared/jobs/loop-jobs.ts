import { Effect, type Layer } from "effect";
import type { rootServices } from "../run/run-script";
import type { ShapeRegistry } from "../model/shape-registry";
import type { Stage } from "../run/analysis-layout";
import type { AgentCall } from "./dispatch-prompt";
import { JobStates } from "./job-state";
import { StageRecords } from "../store/stage-records";
import type { ReviewedJob } from "./review-rounds";
import { UsageInvalid, type ScriptError } from "../run/script-errors";
import type { FeedbackItem } from "../model/schemas/feedback";
import type { Fact } from "../model/schemas/fact";
import type { AssumptionNotice } from "../model/schemas/stage-actions";

type ReviewedFiles = {
    readonly reviewPath: string;
    readonly roundsFolder: string;
};

export type LoopJob = {
    readonly key: string;
    readonly label: string;
    readonly outputPath: string;
    readonly reviewed: ReviewedFiles;
};

/**
 * A job's files and key as the review rounds take it, once its stage is named.
 * @param stage the stage
 * @param job the job
 * @returns the job as the review rounds take it
 */
export const asReviewed = (stage: Stage, job: LoopJob): ReviewedJob => ({
    stage,
    key: job.key,
    label: job.label,
    outputPath: job.outputPath,
    ...job.reviewed,
});

export type LoopServices = Layer.Success<typeof rootServices> | ShapeRegistry;

type Step<A> = Effect.Effect<A, ScriptError, LoopServices>;

export type StageLoop = {
    readonly stage: Stage;
    readonly begin: Step<void>;
    readonly keys: Step<readonly string[]>;
    readonly job: (key: string) => Step<LoopJob>;
    readonly mayRun: (job: LoopJob) => Step<boolean>;
    readonly prepare: (
        keys: readonly string[],
    ) => Step<ReadonlyArray<{ readonly key: string; readonly call: AgentCall }>>;
    readonly review: (job: LoopJob) => Step<AgentCall>;
    readonly check: (job: LoopJob) => Step<readonly string[]>;
    readonly answer: (key: string, answer: FeedbackItem) => Step<void>;
    readonly finish: Step<{ readonly more: boolean; readonly said: readonly string[] }>;
    readonly leftOver: Step<readonly string[]>;
    readonly notices: (job: LoopJob) => Step<readonly AssumptionNotice[]>;
    readonly afterClose: (ran: readonly LoopJob[]) => Step<void>;
    readonly ownersOf: (fact: typeof Fact.Type) => Step<readonly string[]>;
    readonly registry: Step<{ readonly hash: string; readonly bytes: number } | undefined>;
    readonly root: string;
};

/**
 * A stage's loop, its error and service types inferred from every part of it.
 * @param loop the loop
 * @returns the loop
 */
export const stageLoop = (loop: StageLoop) => loop;

export type JobState = "toRun" | "toReview" | "reviewed" | "fixed" | "refused";

/**
 * A stored state as the words the loop counts by: a job to run or to fix is to run; a job decided is reviewed, or fixed
 * once its review's fix answered.
 * @param row the job's state
 * @param row.state where it stands
 * @param row.fixes the fixes it has taken
 * @param row.fixes.review whether its review's fix was taken
 * @returns the word
 */
const wordOf = (row: { readonly state: string; readonly fixes: { readonly review: boolean } }): JobState => {
    switch (row.state) {
        case "toReview":
            return "toReview";
        case "decided":
            return row.fixes.review ? "fixed" : "reviewed";
        case "refused":
            return "refused";
        default:
            return "toRun";
    }
};

/**
 * Where a job stands, from its stored state alone (P1.33, P1.37): nothing is inferred from which files exist.
 * @param job the job's stage and key
 * @param job.stage its stage
 * @param job.key its key
 * @returns its state
 */
export const reviewedJobState = Effect.fnUntraced(function* (job: { readonly stage: Stage; readonly key: string }) {
    return wordOf(yield* (yield* JobStates).ensure(job.stage, job.key));
});

/**
 * Whether a job is decided for now: reviewed, fixed after its review, or refused.
 * @param state the job's state
 * @returns true when decided
 */
export const decided = (state: JobState) => state !== "toRun" && state !== "toReview";

/**
 * Where a stage stands: each of its jobs by state, its open batch, and whether its records are written since its last
 * `prepare`. It changes nothing but makes no job's state: a job with no state yet is to run.
 * @param loop the stage
 * @returns the counts, the open batch if any, and whether the records are written
 */
export const standingOf = Effect.fnUntraced(function* (loop: StageLoop) {
    const states = yield* JobStates;
    const counts: Record<JobState, number> = { toRun: 0, toReview: 0, reviewed: 0, fixed: 0, refused: 0 };
    const stored = new Map((yield* states.list(loop.stage)).map((row) => [row.key, row] as const));
    for (const key of yield* loop.keys) {
        const row = stored.get(key);
        counts[row === undefined ? "toRun" : wordOf(row)] += 1;
    }
    const batch = yield* states.openBatchOf(loop.stage);
    const written = yield* (yield* StageRecords).stageHasAcceptedRecords(loop.stage);
    return { counts, open: batch === undefined ? undefined : batch.id, written };
});

/**
 * `status`: where every job stands and whether the stage's loop is complete: no open batch, every job decided, and
 * the stage's records written since its last `prepare`. It changes nothing.
 * @param loop the stage
 * @returns whether the loop is complete, and the lines to print
 */
export const stageStatus = Effect.fnUntraced(function* (loop: StageLoop) {
    const { counts, open, written } = yield* standingOf(loop);
    const complete = open === undefined && counts.toRun === 0 && counts.toReview === 0 && written;
    return {
        complete,
        lines: [
            `${loop.stage}: ${complete ? "complete" : "not complete"}`,
            `  jobs: ${counts.reviewed} reviewed, ${counts.fixed} fixed after review, ${counts.refused} refused, ${counts.toReview} to review, ${counts.toRun} to run`,
            `  open batch: ${open === undefined ? "none" : `${open} (report each agent with done <job>, then close it with next --after ${open})`}`,
            `  accepted records written since the last prepare: ${written ? "yes" : "no"}`,
        ],
    };
});

/**
 * Refuse a step that would change a job's files while a batch is open, since its agents may still be writing them
 * (P1.24, D57): every `prepare`, `challenge` and `attach` waits until the driver closes the batch.
 * @param stage the stage
 * @returns nothing when no batch is open; UsageInvalid naming the batch
 */
export const refuseWhileBatchOpen = Effect.fnUntraced(function* (stage: Stage) {
    const open = yield* (yield* JobStates).openBatchOf(stage);
    if (open !== undefined) {
        return yield* new UsageInvalid({
            issue: `batch ${open.id} is open and its agents may still be writing: close it with next --after ${open.id} first`,
        });
    }
});
