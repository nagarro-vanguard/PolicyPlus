import { Effect, Schema } from "effect";
import type { SqlClient, SqlError } from "effect/sql";
import { stageNames, type Stage } from "../run/analysis-layout";
import { unique } from "../run/collections";
import type { JsonRecord } from "../model/json-record";
import type { Lines } from "../model/shared-fields";
import { RecordIdRepeated, RecordInvalid } from "../run/script-errors";
import { ShapeRegistry } from "../model/shape-registry";
import { storeFailureOf, type RecordStore, type StoreOpenFailure } from "./database";
import { indexGraphRecord, resolveLinkEnds } from "../graph/graph-writes";
import { fillEntryPointReach } from "../graph/graph-walks";
import { sha1Hasher } from "../run/hashing-and-random";
import { HolderRow, IdBodyRow, InsertedRow, JobRow, UnresolvedCitationRow } from "./rows";
import { decodedRows, recordsPerPage } from "./stored-bodies";

const strict = { onExcessProperty: "error" } as const;

type UnresolvedCitation = typeof UnresolvedCitationRow.Type;

export type StageWriteFailure = StoreOpenFailure | RecordIdRepeated | RecordInvalid;

export interface StageWriter {
    readonly insertRecords: (
        type: string,
        records: readonly JsonRecord[],
        jobId?: string,
    ) => Effect.Effect<void, StageWriteFailure, ShapeRegistry>;
    readonly mergeEntries: (merged: ReadonlyMap<string, string>) => Effect.Effect<void, StoreOpenFailure>;
    readonly removeJobRecords: (jobId: string) => Effect.Effect<void, StoreOpenFailure>;
    readonly resolveReferences: Effect.Effect<readonly UnresolvedCitation[], StoreOpenFailure>;
    readonly indexEntryPointReach: Effect.Effect<void, StoreOpenFailure>;
}

/**
 * The record's identity in the store: its record id, else the identity its type declares.
 * @param record the record
 * @param keyOf its type's identity
 * @returns the identity, or undefined when it has none
 */
const identityOf = (record: JsonRecord, keyOf: (record: JsonRecord) => string | undefined) =>
    typeof record.id === "string" ? record.id : keyOf(record);

/**
 * A record as the store keeps it (P1.38): each reference it keeps to a merged entry written as one to the entry
 * merging it, so a reader of its body finds the entry the store holds, as its citations do. Only a value the record
 * cites is replaced, wherever it sits; the rest is kept as written.
 * @param record the record as written
 * @param cites the record ids it keeps that the store must resolve
 * @param merged each merged entry's record id, to the record id of the entry merging it
 * @returns the record, its merged references replaced; the record itself when it keeps none
 */
const withMergedReferences = (
    record: JsonRecord,
    cites: readonly string[],
    merged: ReadonlyMap<string, string>,
): JsonRecord => {
    const replaced = new Map(
        cites.flatMap((cited) => {
            const to = merged.get(cited);
            return to === undefined ? [] : [[cited, to] as const];
        }),
    );
    if (!replaced.size) {
        return record;
    }
    const rewrite = (value: unknown): unknown => {
        if (typeof value === "string") {
            const to = replaced.get(value);
            return to === undefined ? value : to;
        }
        if (Array.isArray(value)) {
            return value.map(rewrite);
        }
        if (typeof value === "object" && value !== null) {
            return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, rewrite(inner)]));
        }
        return value;
    };
    return Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key, key === "id" ? value : rewrite(value)]),
    );
};

/**
 * Insert records of one type, each decoded by its registered schema with no unknown property, its references to a
 * merged entry written as ones to the entry merging it (`withMergedReferences`), put into the code graph when it is
 * part of it, and its references kept for resolving. A repeated record id is refused naming the jobs that wrote it,
 * the one holding it and the one writing it, so the stage gives each the feedback (D29).
 * @param sql the client, inside the stage's write
 * @param context the store's path, the stage, the job's store number and id, and the entries the write merges
 * @param context.path the store's file
 * @param context.stage the stage writing
 * @param context.jobNumber the job's number in the store, when a job wrote them
 * @param context.jobId the job's id, when a job wrote them
 * @param context.merged each merged entry's record id, to the record id of the entry merging it
 * @param type the registered type's name
 * @param records the records
 * @returns nothing once inserted
 */
const insertRecordsOf = Effect.fnUntraced(function* (
    sql: SqlClient.SqlClient,
    context: {
        readonly path: string;
        readonly stage: Stage;
        readonly jobNumber: number | null;
        readonly jobId?: string;
        readonly merged: ReadonlyMap<string, string>;
    },
    type: string,
    records: readonly JsonRecord[],
) {
    const registered = (yield* ShapeRegistry).records[type];
    if (registered === undefined) {
        return yield* new RecordInvalid({
            path: context.path,
            line: 0,
            issue: `${type} is not a registered record type`,
        });
    }
    const decodedOf = (record: JsonRecord) =>
        Schema.decodeUnknownEffect(
            registered.schema,
            strict,
        )(record).pipe(
            Effect.mapError(
                (error) => new RecordInvalid({ path: context.path, line: 0, issue: `${type}: ${error.message}` }),
            ),
        );
    for (const written of records) {
        yield* decodedOf(written);
        const record = withMergedReferences(written, registered.citesInStoreOf(written), context.merged);
        const decoded = yield* decodedOf(record);
        const id = identityOf(record, registered.keyOf);
        if (id === undefined) {
            return yield* new RecordInvalid({ path: context.path, line: 0, issue: `a ${type} record has no identity` });
        }
        const row = yield* insertedRow(sql, context, { id, type, at: registered.positionOf(record), record });
        if (row !== undefined) {
            yield* indexGraphRecord(sql, row, decoded);
            for (const cited of registered.citesInStoreOf(record)) {
                yield* sql`INSERT INTO temp.pendingCitation (fromRecord, citedId) VALUES (${row.recordNumber}, ${cited})`;
            }
        }
    }
});

/**
 * Insert one record's row and return its number and file: refused when its id is held already (`repeatedId`), or when
 * it sits in a file the store does not list, since a block there would leave the graph unseen.
 * @param sql the client, inside the stage's write
 * @param context the write's file path and job
 * @param context.path the file the records came from
 * @param context.jobId the job writing them, when a job is
 * @param context.stage the stage
 * @param context.jobNumber the job's number in the store
 * @param written the record, its id, type and position
 * @param written.id its id
 * @param written.type its type
 * @param written.at where it sits, when it sits in a file
 * @param written.record the record
 * @returns the inserted row, or none
 */
const insertedRow = Effect.fnUntraced(function* (
    sql: SqlClient.SqlClient,
    context: {
        readonly path: string;
        readonly stage: Stage;
        readonly jobNumber: number | null;
        readonly jobId?: string;
    },
    written: {
        readonly id: string;
        readonly type: string;
        readonly at: Lines | undefined;
        readonly record: JsonRecord;
    },
) {
    const { id, type, at, record } = written;
    const [row] = yield* decodedRows(InsertedRow)(
        sql`INSERT INTO record
        (id, type, stage, jobNumber, fileNumber, firstLine, lastLine, body)
        VALUES (${id}, ${type}, ${context.stage}, ${context.jobNumber},
            ${at === undefined ? null : sql`(SELECT fileNumber FROM file WHERE path = ${at.file})`},
            ${at === undefined ? null : at.firstLine}, ${at === undefined ? null : at.lastLine}, ${JSON.stringify(record)})
        RETURNING recordNumber, fileNumber`,
    ).pipe(
        Effect.catchIf(
            (error: SqlError.SqlError) => error.reason._tag === "UniqueViolation",
            () => repeatedId(sql, id, context.jobId),
        ),
    );
    if (row !== undefined && at !== undefined && row.fileNumber === null) {
        return yield* new RecordInvalid({
            path: context.path,
            line: 0,
            issue: `${id} sits in ${at.file}, which is not among the files listed: it would leave the graph unseen`,
        });
    }
    return row;
});

/**
 * The refusal of a record id the store already holds, naming the jobs that wrote it: the one holding it, when a job
 * of any stage did, and the one writing it, when a job is.
 * @param sql the client, inside the stage's write
 * @param id the record id
 * @param jobId the writing job, when a job writes it
 * @returns the failure
 */
const repeatedId = (sql: SqlClient.SqlClient, id: string, jobId: string | undefined) =>
    Effect.flatMap(
        decodedRows(HolderRow)(
            sql`SELECT j.jobId FROM record r JOIN job j ON j.jobNumber = r.jobNumber WHERE r.id = ${id}`,
        ),
        (holders) =>
            Effect.fail(
                new RecordIdRepeated({
                    ids: [id],
                    jobs: unique([...holders.map((holder) => holder.jobId), ...(jobId === undefined ? [] : [jobId])]),
                }),
            ),
    );

/**
 * Resolve the stage's link ends and the references its records keep: each reference found among the accepted
 * records, directly or through the entry merging it (P1.38), becomes a citation; those that name none are returned,
 * with the record and job that keep them.
 * @param sql the client, inside the stage's write
 * @param stage the stage writing
 * @returns the references that name no accepted record
 */
const resolveReferencesOf = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, stage: Stage) {
    yield* resolveLinkEnds(sql, stage);
    yield* sql`DELETE FROM citation WHERE fromRecord IN (SELECT fromRecord FROM temp.pendingCitation)`;
    yield* sql`INSERT OR IGNORE INTO citation (fromRecord, toRecord)
        SELECT p.fromRecord, r.recordNumber FROM temp.pendingCitation p
        JOIN record r ON r.id = coalesce((SELECT d.toId FROM temp.mergedEntry d WHERE d.fromId = p.citedId), p.citedId)`;
    return yield* decodedRows(UnresolvedCitationRow)(sql`SELECT f.id AS recordId, j.jobId, p.citedId
        FROM temp.pendingCitation p
        JOIN record f ON f.recordNumber = p.fromRecord
        LEFT JOIN job j ON j.jobNumber = f.jobNumber
        WHERE NOT EXISTS (SELECT 1 FROM record r
            WHERE r.id = coalesce((SELECT d.toId FROM temp.mergedEntry d WHERE d.fromId = p.citedId), p.citedId))
        ORDER BY f.recordNumber`);
});

/**
 * Remove a stage's accepted records and its jobs; the intervals of its blocks first, which no foreign
 * key reaches.
 * @param sql the client
 * @param stage the stage
 * @returns nothing once removed
 */
export const removeStage = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, stage: Stage) {
    yield* sql`DELETE FROM stageWrite WHERE stage = ${stage}`;
});

/**
 * The writer a stage's write is given: every statement mapped to the store's own failures. Its `resolveReferences`
 * resolves the stage's link ends and the references its records keep, as they stand, and returns those that name no
 * accepted record. Each job's gate already refuses a reference that names neither an accepted record nor one of the
 * job's own, so one left at commit is a defect of the scripts, never feedback for an agent; the write resolves them
 * again before it commits. Its `indexEntryPointReach` fills the reach of every entry point (D214) from the links as they then
 * stand, resolved first: the Map's write runs it once, after its last removal, so the index holds the chains it commits.
 * @param store the record store
 * @param stage the stage writing
 * @returns the writer
 */
export const writerFor = (store: RecordStore["Service"], stage: Stage): StageWriter => {
    const mapped = <A, E, R>(use: (sql: SqlClient.SqlClient) => Effect.Effect<A, E | SqlError.SqlError, R>) =>
        Effect.flatMap(store.client, (sql) => Effect.catchIf(use(sql), isSqlError, storeFailureOf(store.path)));
    const merges = new Map<string, string>();
    return {
        /**
         * Insert records of one registered type, decoded strictly, from one job or from the stage itself, each
         * reference to an entry the write merges written as one to the entry merging it.
         * @param type the registered type's name
         * @param records the records
         * @param jobId the job that wrote them, when a job did
         * @returns nothing once inserted; RecordIdRepeated naming the job when a record id is held twice
         */
        insertRecords: (type, records, jobId) =>
            mapped((sql) =>
                Effect.gen(function* () {
                    const jobNumber = jobId === undefined ? null : yield* jobNumberOf(sql, stage, jobId);
                    const job = jobId === undefined ? {} : { jobId };
                    yield* insertRecordsOf(
                        sql,
                        { path: store.path, stage, jobNumber, merged: merges, ...job },
                        type,
                        records,
                    );
                }),
            ),
        /**
         * Keep which entries the stage's write merges into others (P1.38), so a reference to a merged entry is written
         * as one to the entry merging it, in the bodies of the records inserted after, and as the write resolves its
         * citations and link ends.
         * @param merged each merged entry's record id, to the record id of the entry merging it
         * @returns nothing once kept
         */
        mergeEntries: (merged) =>
            mapped((sql) => {
                for (const [fromId, toId] of merged) {
                    merges.set(fromId, toId);
                }
                return Effect.forEach(
                    [...merged],
                    ([fromId, toId]) => sql`INSERT INTO temp.mergedEntry (fromId, toId) VALUES (${fromId}, ${toId})`,
                    { discard: true },
                );
            }),
        /**
         * Remove one job's records again, when the stage's checks across jobs refuse the job.
         * @param jobId the job id
         * @returns nothing once removed
         */
        removeJobRecords: (jobId) => store.query((sql) => removeJob(sql, stage, jobId)),
        resolveReferences: mapped((sql) => resolveReferencesOf(sql, stage)),
        indexEntryPointReach: mapped((sql) => Effect.andThen(resolveLinkEnds(sql, stage), fillEntryPointReach(sql))),
    };
};

/**
 * A job's number in the store, the job listed under the stage the first time it writes.
 * @param sql the client
 * @param stage the stage
 * @param jobId the job id
 * @returns its number
 */
const jobNumberOf = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, stage: Stage, jobId: string) {
    const rows = yield* decodedRows(JobRow)(sql`INSERT INTO job (stage, jobId) VALUES (${stage}, ${jobId})
        ON CONFLICT (stage, jobId) DO UPDATE SET jobId = excluded.jobId
        RETURNING jobNumber`);
    const [row] = rows;
    return row === undefined ? null : row.jobNumber;
});

/**
 * Remove one job's records, the intervals of its blocks first, and the references they keep that the write has yet to
 * resolve: a later resolution would otherwise cite from records no longer there. Other jobs' links and citations that
 * reach its records are cleared too, so the delete breaks no key; the write's next resolution finds them again, unresolved
 * where nothing else answers them, as the checks across jobs report.
 * @param sql the client
 * @param stage the stage
 * @param jobId the job id
 * @returns nothing once removed
 */
const removeJob = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, stage: Stage, jobId: string) {
    const ofJob = sql`SELECT r.recordNumber FROM record r JOIN job j ON j.jobNumber = r.jobNumber
        WHERE j.stage = ${stage} AND j.jobId = ${jobId} AND r.stage = ${stage}`;
    yield* sql`DELETE FROM temp.pendingCitation WHERE fromRecord IN (${ofJob})`;
    yield* sql`DELETE FROM temp.pendingExternalEnd WHERE linkRecord IN (${ofJob})`;
    yield* sql`UPDATE linkEnd SET toBlock = NULL WHERE toBlock IN (${ofJob})`;
    yield* sql`UPDATE linkEnd SET fromBlock = NULL WHERE fromBlock IN (${ofJob})`;
    yield* sql`UPDATE linkEnd SET toExternalSystem = NULL, resource = NULL WHERE toExternalSystem IN (${ofJob})`;
    yield* sql`DELETE FROM citation WHERE toRecord IN (${ofJob})`;
    yield* sql`DELETE FROM record WHERE recordNumber IN (${ofJob})`;
});

/**
 * Start a stage's write, holding the store: its earlier records removed, the stage listed at its rank with no digest
 * yet (`digestStageWrite` gives it one as the write ends), and the references of the write cleared.
 * @param sql the client
 * @param stage the stage
 * @returns nothing once started
 */
export const startStageWrite = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, stage: Stage) {
    yield* removeStage(sql, stage);
    yield* sql`INSERT INTO stageWrite (stage, rank, digest) VALUES (${stage}, ${stageNames.indexOf(stage)}, '')`;
    yield* sql`CREATE TEMP TABLE IF NOT EXISTS pendingCitation (fromRecord INTEGER NOT NULL, citedId TEXT NOT NULL)`;
    yield* sql`DELETE FROM temp.pendingCitation`;
    yield* sql`CREATE TEMP TABLE IF NOT EXISTS pendingExternalEnd (
        linkRecord INTEGER PRIMARY KEY, externalSystem TEXT NOT NULL, resource TEXT NOT NULL)`;
    yield* sql`DELETE FROM temp.pendingExternalEnd`;
    yield* sql`CREATE TEMP TABLE IF NOT EXISTS mergedEntry (fromId TEXT PRIMARY KEY, toId TEXT NOT NULL)`;
    yield* sql`DELETE FROM temp.mergedEntry`;
});

/**
 * Whether a failure is the store's database failure.
 * @param error any failure
 * @returns true for a `SqlError`
 */
const isSqlError = (error: unknown): error is SqlError.SqlError =>
    typeof error === "object" && error !== null && "_tag" in error && error._tag === "SqlError";

/**
 * Give a stage's write its digest as the write ends (D230): one SHA-1 over every record the stage keeps, each by its
 * record id and body, in record id order, read a page at a time. Records are told by their content, so the same records
 * written again, whatever the order or the store, give the same digest, and a later stage's brief built on them stays
 * current; any change to one of them changes it.
 * @param sql the client, inside the stage's write
 * @param stage the stage
 * @returns nothing once given
 */
export const digestStageWrite = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, stage: Stage) {
    const hash = sha1Hasher();
    let after = "";
    for (;;) {
        const rows = yield* decodedRows(IdBodyRow)(sql`SELECT id, body FROM record
            WHERE stage = ${stage} AND id > ${after} ORDER BY id LIMIT ${recordsPerPage}`);
        rows.forEach((row) => hash.update(`${row.id}\n${row.body}\n`));
        const last = rows.at(-1);
        if (last === undefined) {
            break;
        }
        after = last.id;
    }
    yield* sql`UPDATE stageWrite SET digest = ${hash.hex()} WHERE stage = ${stage}`;
});
