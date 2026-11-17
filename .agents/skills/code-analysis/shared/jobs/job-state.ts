import { Context, Effect, Layer } from "effect";
import type { SqlClient, SqlError } from "effect/sql";
import type { Stage } from "../run/analysis-layout";
import { JobStateFailed } from "../run/script-errors";
import { RecordStore } from "../store/database";
import { openGeneration, runOf } from "../store/run-history";
import { batchOfRun, closeWhenEmpty, decide, inFlight, jobsIn, latestText, patched } from "./job-state-sql";
import type { JobPatch, JobRow, JobStatesOps, NewBatch, StateFailure } from "./job-state-types";

type Run = <A>(
    use: (sql: SqlClient.SqlClient) => Effect.Effect<A, SqlError.SqlError>,
) => Effect.Effect<A, StateFailure>;

/**
 * A job's state when it is first made: to run, in no round, no fix taken.
 * @param stage the stage
 * @param key the job's key
 * @returns the state
 */
const initial = (stage: Stage, key: string): JobRow => ({
    stage,
    key,
    state: "toRun",
    round: 0,
    fixes: { gate: false, review: false },
    reviewAttempts: 0,
    feedback: undefined,
    report: undefined,
    batch: undefined,
});

/**
 * The operations on jobs' states, each change a decision appended to the run history, never a row changed in place.
 * @param query run reads
 * @param write run a change as one transaction
 * @returns the operations
 */
const jobOps = (query: Run, write: Run) => ({
    get: (stage: Stage, key: string) => query((sql) => Effect.map(jobsIn(sql, stage, key), (rows) => rows.at(0))),
    ensure: (stage: Stage, key: string) =>
        write((sql) =>
            Effect.gen(function* () {
                const [found] = yield* jobsIn(sql, stage, key);
                if (found !== undefined) {
                    return found;
                }
                const row = initial(stage, key);
                yield* decide(sql, stage, { key, kind: "ensure", row });
                return row;
            }),
        ),
    update: (stage: Stage, key: string, patch: JobPatch) =>
        write((sql) =>
            Effect.gen(function* () {
                const [found] = yield* jobsIn(sql, stage, key);
                if (found !== undefined) {
                    yield* decide(sql, stage, { key, kind: "update", row: patched(found, patch) });
                }
            }),
        ),
    list: (stage: Stage) => query((sql) => jobsIn(sql, stage, undefined)),
    remove: (stage: Stage, key: string) =>
        write((sql) =>
            Effect.gen(function* () {
                const [found] = yield* jobsIn(sql, stage, key);
                if (found !== undefined) {
                    yield* decide(sql, stage, { key, kind: "remove", row: found });
                }
            }),
        ),
    clearStage: (stage: Stage) => write((sql) => openGeneration(sql, stage)),
});

/**
 * Take a job out of the batch it is in, in the batch's events and in the job's own state.
 * @param sql the client
 * @param stage the stage
 * @param taken the job's key, batch and pass, and how it leaves: closed or abandoned
 * @param taken.key the job's key
 * @param taken.batch the batch
 * @param taken.pass the pass
 * @param taken.kind how it leaves
 * @returns nothing once taken out
 */
const leaveBatch = Effect.fnUntraced(function* (
    sql: SqlClient.SqlClient,
    stage: Stage,
    taken: {
        readonly key: string;
        readonly batch: string;
        readonly pass: "agent" | "review";
        readonly kind: "closed" | "abandoned";
    },
) {
    const run = yield* runOf(sql, stage);
    yield* sql`INSERT INTO batchEvent (stageRun, batch, job, pass, kind, seconds, at)
        SELECT ${run}, ${taken.batch}, runJob, ${taken.pass}, ${taken.kind}, NULL, ${new Date().toISOString()}
        FROM runJob WHERE stageRun = ${run} AND key = ${taken.key}`;
    const [job] = yield* jobsIn(sql, stage, taken.key);
    if (job !== undefined && job.batch === taken.batch) {
        yield* decide(sql, stage, { key: taken.key, kind: "batch", row: { ...job, batch: undefined } });
    }
    yield* closeWhenEmpty(sql, run, taken.batch);
});

/**
 * Hand a batch out if none is open for the stage: its row, an event for each job, and each job marked as in the batch.
 * @param sql the client
 * @param stage the stage
 * @param batch the batch
 * @returns whether it opened; false when another batch of the stage is open
 */
const openBatchIn = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, stage: Stage, batch: NewBatch) {
    if ((yield* batchOfRun(sql, stage, true)) !== undefined) {
        return false;
    }
    const run = yield* runOf(sql, stage);
    const { registry } = batch;
    const now = new Date().toISOString();
    yield* sql`INSERT INTO batch (stageRun, batch, dispatchedAt, registryHash, registryBytes, promptBytes) VALUES (
        ${run}, ${batch.id}, ${now}, ${registry === undefined ? null : registry.hash},
        ${registry === undefined ? null : registry.bytes}, ${batch.promptBytes})`;
    for (const job of batch.jobs) {
        yield* sql`INSERT INTO batchEvent (stageRun, batch, job, pass, kind, seconds, at)
            SELECT ${run}, ${batch.id}, runJob, ${job.pass}, 'dispatched', NULL, ${now}
            FROM runJob WHERE stageRun = ${run} AND key = ${job.key}`;
        const [found] = yield* jobsIn(sql, stage, job.key);
        if (found !== undefined) {
            yield* decide(sql, stage, { key: job.key, kind: "batch", row: { ...found, batch: batch.id } });
        }
    }
    return true;
});

/**
 * The operations on batches: handing one out, the jobs the harness reports done or abandons, and closing a job's pass.
 * @param query run reads
 * @param write run a change as one transaction
 * @returns the operations
 */
const batchOps = (query: Run, write: Run) => ({
    openBatch: (stage: Stage, batch: NewBatch) => write((sql) => openBatchIn(sql, stage, batch)),
    openBatchOf: (stage: Stage) => query((sql) => batchOfRun(sql, stage, true)),
    lastBatch: (stage: Stage) => query((sql) => batchOfRun(sql, stage, false)),
    markDone: (stage: Stage, key: string, seconds: number | undefined) =>
        write((sql) =>
            Effect.gen(function* () {
                const run = yield* runOf(sql, stage);
                const flying = yield* inFlight(sql, run, key);
                for (const member of flying) {
                    yield* sql`INSERT INTO batchEvent (stageRun, batch, job, pass, kind, seconds, at)
                        VALUES (${run}, ${member.batch}, ${member.job}, ${member.pass}, 'done', ${seconds === undefined ? null : seconds}, ${new Date().toISOString()})`;
                }
                return flying.length > 0;
            }),
        ),
    abandon: (stage: Stage, key: string) =>
        write((sql) =>
            Effect.gen(function* () {
                const flying = yield* inFlight(sql, yield* runOf(sql, stage), key);
                for (const member of flying) {
                    yield* leaveBatch(sql, stage, { key, batch: member.batch, pass: member.pass, kind: "abandoned" });
                }
                return flying.length > 0;
            }),
        ),
    forgetClosedBatches: (stage: Stage) =>
        write((sql) =>
            Effect.gen(function* () {
                const run = yield* runOf(sql, stage);
                yield* sql`INSERT OR IGNORE INTO batchForgotten (stageRun, batch)
                    SELECT stageRun, batch FROM batchClosed WHERE stageRun = ${run}`;
            }),
        ),
    closeJob: (stage: Stage, batch: string, key: string, pass: "agent" | "review") =>
        write((sql) => leaveBatch(sql, stage, { key, batch, pass, kind: "closed" })),
});

/**
 * The operations on why a stage stopped, and on the stage documents that are state rather than findings.
 * @param query run reads
 * @param write run a change as one transaction
 * @returns the operations
 */
const noteOps = (query: Run, write: Run) => ({
    stop: (stage: Stage, reason: string | undefined) =>
        write((sql) =>
            Effect.gen(function* () {
                const run = yield* runOf(sql, stage);
                yield* sql`INSERT INTO stageStop (stageRun, reason) VALUES (${run}, ${reason === undefined ? null : reason})`;
            }),
        ),
    stopped: (stage: Stage) => query((sql) => latestText(sql, stage, undefined)),
    document: (stage: Stage, name: string) => query((sql) => latestText(sql, stage, name)),
    setDocument: (stage: Stage, name: string, body: string | undefined) =>
        write((sql) =>
            Effect.gen(function* () {
                const run = yield* runOf(sql, stage);
                yield* sql`INSERT INTO stageDocument (stageRun, name, body) VALUES (${run}, ${name}, ${body === undefined ? null : body})`;
            }),
        ),
});

/**
 * The state of every job of a run, its batches, why a stage stopped, and the stage documents that are state rather than
 * findings: kept in the run history of `analysis.sqlite`, each change a row added, so what a job went through is never
 * lost. A job's state is its latest decision; a stage run again opens a new generation. Nothing about a job is inferred
 * from which files exist.
 */
export class JobStates extends Context.Service<JobStates, JobStatesOps>()("code-analysis/core/JobStates") {
    static readonly layer: Layer.Layer<JobStates, never, RecordStore> = Layer.effect(
        JobStates,
        Effect.gen(function* () {
            const store = yield* RecordStore;
            const failed = (cause: unknown) => new JobStateFailed({ path: store.path, cause });
            const query: Run = (use) => store.query(use).pipe(Effect.mapError(failed));
            const write: Run = (use) =>
                Effect.flatMap(store.client, (sql) => store.holdStore(use(sql))).pipe(Effect.mapError(failed));
            return JobStates.of({
                path: store.path,
                ...jobOps(query, write),
                ...batchOps(query, write),
                ...noteOps(query, write),
            });
        }),
    );
}
