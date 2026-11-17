import { Effect, Schema } from "effect";
import type { SqlClient } from "effect/sql";
import type { Stage } from "../run/analysis-layout";
import { Feedback } from "../model/schemas/feedback";
import { runOf } from "../store/run-history";
import { decodedRows } from "../store/stored-bodies";
import { ReviewReport } from "./review-report";
import { jobStateNames, type BatchJob, type BatchRow, type JobPatch, type JobRow } from "./job-state-types";

const Count = Schema.Number;

const Snapshot = Schema.Struct({
    fixes: Schema.Struct({ gate: Schema.Boolean, review: Schema.Boolean }),
    reviewAttempts: Count,
    feedback: Schema.NullOr(Schema.String),
    report: Schema.NullOr(Schema.String),
    batch: Schema.NullOr(Schema.String),
});

const DecisionRow = Schema.Struct({
    job: Count,
    key: Schema.String,
    kind: Schema.String,
    state: Schema.Literals(jobStateNames),
    round: Count,
    note: Schema.fromJsonString(Snapshot),
});

const NumberRow = Schema.Struct({ number: Count });

const BatchHeadRow = Schema.Struct({
    batch: Schema.String,
    dispatchedAt: Schema.String,
    closedAt: Schema.NullOr(Schema.String),
    registryHash: Schema.NullOr(Schema.String),
    registryBytes: Schema.NullOr(Count),
    promptBytes: Count,
});

const EventRow = Schema.Struct({
    key: Schema.String,
    pass: Schema.Literals(["agent", "review"]),
    kind: Schema.Literals(["dispatched", "done", "closed", "abandoned"]),
});

const MemberRow = Schema.Struct({ batch: Schema.String, job: Count, pass: Schema.Literals(["agent", "review"]) });

const TextRow = Schema.Struct({ value: Schema.NullOr(Schema.String) });

const decodeFeedback = Schema.decodeUnknownSync(Schema.fromJsonString(Feedback));

const encodeFeedback = Schema.encodeSync(Schema.fromJsonString(Feedback));

const decodeReport = Schema.decodeUnknownSync(Schema.fromJsonString(ReviewReport));

const encodeReport = Schema.encodeSync(Schema.fromJsonString(ReviewReport));

/**
 * One job's, or every job's, latest state in the open run of a stage, a removed job left out.
 * @param sql the client
 * @param stage the stage
 * @param key one job's key, or none for every job
 * @returns the jobs' states, in the order they were made
 */
export const jobsIn = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, stage: Stage, key: string | undefined) {
    const run = yield* runOf(sql, stage);
    const rows = yield* decodedRows(DecisionRow)(
        key === undefined
            ? sql`SELECT j.runJob AS job, j.key, s.kind, s.outcome AS state, s.round, s.note
                FROM runJob j JOIN jobState s ON s.job = j.runJob WHERE j.stageRun = ${run} ORDER BY j.runJob`
            : sql`SELECT j.runJob AS job, j.key, s.kind, s.outcome AS state, s.round, s.note
                FROM runJob j JOIN jobState s ON s.job = j.runJob WHERE j.stageRun = ${run} AND j.key = ${key}`,
    );
    return rows
        .filter((row) => row.kind !== "remove")
        .map((row): JobRow => ({
            stage,
            key: row.key,
            state: row.state,
            round: row.round,
            fixes: row.note.fixes,
            reviewAttempts: row.note.reviewAttempts,
            feedback: row.note.feedback === null ? undefined : decodeFeedback(row.note.feedback),
            report: row.note.report === null ? undefined : decodeReport(row.note.report),
            batch: row.note.batch === null ? undefined : row.note.batch,
        }));
});

/**
 * Record a job's new state as a decision holding all of it.
 * @param sql the client
 * @param stage the stage
 * @param change the job's key, what the decision is, its state and round, and the rest of its state
 * @param change.key the job's key
 * @param change.kind what the decision is: ensure, update, batch or remove
 * @param change.row the job's whole state after it
 * @returns nothing once recorded
 */
export const decide = Effect.fnUntraced(function* (
    sql: SqlClient.SqlClient,
    stage: Stage,
    change: { readonly key: string; readonly kind: string; readonly row: JobRow },
) {
    const run = yield* runOf(sql, stage);
    yield* sql`INSERT OR IGNORE INTO runJob (stageRun, key) VALUES (${run}, ${change.key})`;
    const { row } = change;
    const note = JSON.stringify({
        fixes: row.fixes,
        reviewAttempts: row.reviewAttempts,
        feedback: row.feedback === undefined ? null : encodeFeedback(row.feedback),
        report: row.report === undefined ? null : encodeReport(row.report),
        batch: row.batch === undefined ? null : row.batch,
    });
    yield* sql`INSERT INTO decision (job, kind, outcome, round, note, at)
        SELECT runJob, ${change.kind}, ${row.state}, ${row.round}, ${note}, ${new Date().toISOString()}
        FROM runJob WHERE stageRun = ${run} AND key = ${change.key}`;
});

/**
 * A job's state after a patch.
 * @param row the state before
 * @param patch the changes
 * @returns the state after
 */
export const patched = (row: JobRow, patch: JobPatch): JobRow => ({
    ...row,
    ...(patch.state === undefined ? {} : { state: patch.state }),
    ...(patch.round === undefined ? {} : { round: patch.round }),
    ...(patch.fixes === undefined ? {} : { fixes: patch.fixes }),
    ...(patch.reviewAttempts === undefined ? {} : { reviewAttempts: patch.reviewAttempts }),
    ...(patch.feedback === undefined ? {} : { feedback: patch.feedback === null ? undefined : patch.feedback }),
    ...(patch.report === undefined ? {} : { report: patch.report === null ? undefined : patch.report }),
});

/**
 * The jobs of one batch, with whether each has been reported done and whether its pass has been closed; a job taken
 * out of it is left out.
 * @param sql the client
 * @param run the stage's run
 * @param batch the batch
 * @returns the jobs, in the order handed out
 */
const jobsOfBatch = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, run: number, batch: string) {
    const events = yield* decodedRows(EventRow)(
        sql`SELECT j.key, e.pass, e.kind FROM batchEvent e JOIN runJob j ON j.runJob = e.job
            WHERE e.stageRun = ${run} AND e.batch = ${batch} ORDER BY e.batchEvent`,
    );
    const members = new Map<string, { job: BatchJob; abandoned: boolean }>();
    for (const event of events) {
        const id = `${event.key}\n${event.pass}`;
        const known = members.get(id);
        const base: BatchJob =
            known === undefined ? { key: event.key, pass: event.pass, done: false, closed: false } : known.job;
        members.set(id, {
            abandoned: event.kind === "abandoned" ? true : known !== undefined && known.abandoned,
            job: { ...base, done: base.done || event.kind === "done", closed: base.closed || event.kind === "closed" },
        });
    }
    return [...members.values()].filter((member) => !member.abandoned).map((member) => member.job);
});

/**
 * The batches of the open run: the open one, or the last closed one still remembered.
 * @param sql the client
 * @param stage the stage
 * @param open true for the open batch, false for the last closed one
 * @returns the batch, or none
 */
export const batchOfRun = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, stage: Stage, open: boolean) {
    const run = yield* runOf(sql, stage);
    const [head] = yield* decodedRows(BatchHeadRow)(
        open
            ? sql`SELECT b.batch, b.dispatchedAt, NULL AS closedAt, b.registryHash, b.registryBytes, b.promptBytes
                FROM batch b WHERE b.stageRun = ${run}
                AND NOT EXISTS (SELECT 1 FROM batchClosed c WHERE c.stageRun = b.stageRun AND c.batch = b.batch) LIMIT 1`
            : sql`SELECT b.batch, b.dispatchedAt, c.closedAt, b.registryHash, b.registryBytes, b.promptBytes
                FROM batch b JOIN batchClosed c ON c.stageRun = b.stageRun AND c.batch = b.batch
                WHERE b.stageRun = ${run}
                AND NOT EXISTS (SELECT 1 FROM batchForgotten f WHERE f.stageRun = b.stageRun AND f.batch = b.batch)
                ORDER BY c.closedAt DESC, b.dispatchedAt DESC, b.batch DESC LIMIT 1`,
    );
    if (head === undefined) {
        return undefined;
    }
    const batch: BatchRow = {
        stage,
        id: head.batch,
        dispatchedAt: head.dispatchedAt,
        closedAt: head.closedAt === null ? undefined : head.closedAt,
        registryHash: head.registryHash === null ? undefined : head.registryHash,
        registryBytes: head.registryBytes === null ? undefined : head.registryBytes,
        promptBytes: head.promptBytes,
        jobs: yield* jobsOfBatch(sql, run, head.batch),
    };
    return batch;
});

/**
 * Close a batch once no job of it is in flight.
 * @param sql the client
 * @param run the stage's run
 * @param batch the batch
 * @returns nothing once closed or left open
 */
export const closeWhenEmpty = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, run: number, batch: string) {
    const [left] = yield* decodedRows(NumberRow)(
        sql`SELECT count(*) AS number FROM (
            SELECT job, pass FROM batchEvent WHERE stageRun = ${run} AND batch = ${batch} AND kind = 'dispatched'
            EXCEPT
            SELECT job, pass FROM batchEvent WHERE stageRun = ${run} AND batch = ${batch} AND kind IN ('closed', 'abandoned'))`,
    );
    if (left !== undefined && left.number === 0) {
        yield* sql`INSERT OR IGNORE INTO batchClosed (stageRun, batch, closedAt) VALUES (${run}, ${batch}, ${new Date().toISOString()})`;
    }
});

/**
 * The jobs of a stage still in flight in a batch, by key.
 * @param sql the client
 * @param run the stage's run
 * @param key the job's key
 * @returns each batch and pass the job is in flight in, with the job's number
 */
export const inFlight = (sql: SqlClient.SqlClient, run: number, key: string) =>
    decodedRows(MemberRow)(
        sql`SELECT d.batch, d.job, d.pass FROM batchEvent d JOIN runJob j ON j.runJob = d.job
            WHERE d.stageRun = ${run} AND j.key = ${key} AND d.kind = 'dispatched'
            AND NOT EXISTS (SELECT 1 FROM batchEvent x WHERE x.stageRun = d.stageRun AND x.batch = d.batch
                AND x.job = d.job AND x.pass = d.pass AND x.kind IN ('closed', 'abandoned'))`,
    );

/**
 * The latest text of a stop reason or a document, none when it was cleared.
 * @param sql the client
 * @param stage the stage
 * @param name a document's name, or none for the stop reason
 * @returns the text
 */
export const latestText = Effect.fnUntraced(function* (
    sql: SqlClient.SqlClient,
    stage: Stage,
    name: string | undefined,
) {
    const run = yield* runOf(sql, stage);
    const [row] = yield* decodedRows(TextRow)(
        name === undefined
            ? sql`SELECT reason AS value FROM stageStop WHERE stageRun = ${run} ORDER BY stageStop DESC LIMIT 1`
            : sql`SELECT body AS value FROM stageDocument WHERE stageRun = ${run} AND name = ${name}
                ORDER BY stageDocument DESC LIMIT 1`,
    );
    return row === undefined || row.value === null ? undefined : row.value;
});
