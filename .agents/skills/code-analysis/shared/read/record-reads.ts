import { Context, Effect, Layer, Option, Stream } from "effect";
import type { SqlClient, Statement } from "effect/sql";
import type { Stage } from "../run/analysis-layout";
import type { RecordInvalid } from "../run/script-errors";
import { RecordStore, type StoreOpenFailure } from "../store/database";
import {
    type Decoder,
    decodedBodies,
    decodedBody,
    countOf,
    decodedRows,
    recordsPerPage,
    storeNumbersOf,
    valuesOf,
} from "../store/stored-bodies";
import { BodyRow, CountRow, IdRow, PositionRow, StageRow, WriterRow } from "../store/rows";

type RecordReadFailure = StoreOpenFailure | RecordInvalid;

type Found<S extends Decoder> = Effect.Effect<ReadonlyArray<S["Type"]>, RecordReadFailure>;

type Condition = (sql: SqlClient.SqlClient) => Statement.Fragment;

export interface RecordReadsOps {
    readonly recordsOfType: <S extends Decoder>(
        type: string,
        schema: S,
        fromStages?: readonly Stage[],
    ) => Stream.Stream<S["Type"], RecordReadFailure>;
    readonly findRecordsByIds: <S extends Decoder>(type: string, ids: readonly string[], schema: S) => Found<S>;
    readonly findRecordsCiting: <S extends Decoder>(ids: readonly string[], type: string, schema: S) => Found<S>;
    readonly findRecordIds: (ids: readonly string[]) => Effect.Effect<readonly string[], StoreOpenFailure>;
    readonly countRecordsOfType: (type: string) => Effect.Effect<number, StoreOpenFailure>;
    readonly positionsOfType: (type: string) => Effect.Effect<ReadonlyArray<typeof PositionRow.Type>, StoreOpenFailure>;
    readonly findWritersOfType: (type: string) => Effect.Effect<ReadonlyArray<typeof WriterRow.Type>, StoreOpenFailure>;
}

/**
 * The next store number to read after a page, or none once a page comes back empty.
 * @param rows the page
 * @returns the page, and where the next one starts
 */
const nextAfter = (rows: ReadonlyArray<typeof BodyRow.Type>) => {
    const last = rows.at(-1);
    return [rows, last === undefined ? Option.none() : Option.some(last.recordNumber)] as const;
};

/**
 * The accepted records a condition on `r` (the record) selects, decoded by `schema`, in stage order then the order
 * they were written.
 * @param store the record store
 * @param condition the condition
 * @param schema their schema
 * @returns the records
 */
const recordsWhere = <S extends Decoder>(store: RecordStore["Service"], condition: Condition, schema: S): Found<S> =>
    Effect.flatMap(
        store.query((sql) =>
            decodedRows(BodyRow)(sql`SELECT r.recordNumber, r.id, r.body
                FROM record r JOIN stageWrite s ON s.stage = r.stage
                WHERE ${condition(sql)}
                ORDER BY s.rank, r.recordNumber`),
        ),
        (rows) => decodedBodies(store.path, rows, schema),
    );

/**
 * Which of these ids a condition on `r` (the record) keeps.
 * @param store the record store
 * @param ids the ids, in order
 * @param condition the condition, besides the id being one of `ids`
 * @returns those kept, in the order given
 */
const idsWhere = (store: RecordStore["Service"], ids: readonly string[], condition: Condition) =>
    Effect.map(
        store.query((sql) =>
            decodedRows(IdRow)(sql`SELECT r.id FROM record r
                WHERE r.id IN (${valuesOf(sql, ids)}) AND ${condition(sql)}`),
        ),
        (rows) => {
            const kept = new Set(rows.map((row) => row.id));
            return ids.filter((id) => kept.has(id));
        },
    );

/**
 * Every accepted record of a type, stage by stage in the declared stage order, each stage's in the order they were
 * written, decoded by `schema`, a page at a time, so no read holds them all (`recordByStageAndType`).
 * @param store the record store
 * @returns the read
 */
const recordsOfTypeIn =
    (store: RecordStore["Service"]): RecordReadsOps["recordsOfType"] =>
    (type, schema, fromStages) => {
        const pageOf = (stage: Stage, after: number) =>
            store.query((sql) =>
                decodedRows(BodyRow)(sql`SELECT recordNumber, id, body FROM record
                    WHERE stage = ${stage} AND type = ${type} AND recordNumber > ${after}
                    ORDER BY recordNumber
                    LIMIT ${recordsPerPage}`),
            );
        const stagesInOrder = store.query((sql) =>
            decodedRows(StageRow)(sql`SELECT stage FROM stageWrite ORDER BY rank`),
        );
        return Stream.unwrap(
            Effect.map(stagesInOrder, (stages) =>
                Stream.fromIterable(
                    stages.filter(({ stage }) => fromStages === undefined || fromStages.includes(stage)),
                ).pipe(
                    Stream.flatMap(({ stage }) =>
                        Stream.paginate(0, (after) => Effect.map(pageOf(stage, after), nextAfter)),
                    ),
                    Stream.mapEffect((row) => decodedBody(store.path, row, schema)),
                ),
            ),
        );
    };

/**
 * The lookups by record id: records of a type by id, and which ids name accepted records (of any type or of one).
 * @param store the record store
 * @returns the lookups
 */
const idLookupsIn = (store: RecordStore["Service"]): Pick<RecordReadsOps, "findRecordsByIds" | "findRecordIds"> => ({
    /**
     * The accepted records of a type with these record ids or identities, by the unique index on ids; an
     * id no record of the type holds is left out.
     * @param type the record type
     * @param ids the record ids or identities
     * @param schema its schema
     * @returns the records, in stage order then the order they were written
     */
    findRecordsByIds: Effect.fn("RecordReads.findRecordsByIds")(function* <S extends Decoder>(
        type: string,
        ids: readonly string[],
        schema: S,
    ) {
        return yield* recordsWhere(store, (sql) => sql`r.id IN (${valuesOf(sql, ids)}) AND r.type = ${type}`, schema);
    }),
    /**
     * Which of these ids name an accepted record, of any type: the gate's check that every reference a
     * record must resolve in the store does, by the unique index on ids.
     * @param ids the ids
     * @returns those that do, in the order given
     */
    findRecordIds: Effect.fn("RecordReads.findRecordIds")(function* (ids: readonly string[]) {
        return yield* idsWhere(store, ids, (sql) => sql.and([]));
    }),
});

/**
 * Where every record of a type sits, as its id, file and first line: a whole-type read of small rows, so a reader can
 * put the records in location order and read them a page at a time.
 * @param store the record store
 * @returns the read, given the record type
 */
const positionsOfTypeIn = (store: RecordStore["Service"]): RecordReadsOps["positionsOfType"] =>
    Effect.fn("RecordReads.positionsOfType")(function* (type: string) {
        return yield* store.query((sql) =>
            decodedRows(PositionRow)(sql`SELECT r.id, f.path AS file, r.firstLine
                FROM record r JOIN file f ON f.fileNumber = r.fileNumber
                WHERE r.type = ${type}
                ORDER BY r.recordNumber`),
        );
    });

export class RecordReads extends Context.Service<RecordReads, RecordReadsOps>()("code-analysis/core/RecordReads") {
    static readonly layer: Layer.Layer<RecordReads, never, RecordStore> = Layer.effect(
        RecordReads,
        Effect.gen(function* () {
            const store = yield* RecordStore;
            return RecordReads.of({
                recordsOfType: recordsOfTypeIn(store),
                positionsOfType: positionsOfTypeIn(store),
                ...idLookupsIn(store),
                /**
                 * The accepted records of a type that cite any of these records, each once (`citationByCited`): the
                 * facts and fields of blocks.
                 * @param ids the cited records' ids
                 * @param type the citing records' type
                 * @param schema its schema
                 * @returns the records, in stage order then the order they were written
                 */
                findRecordsCiting: Effect.fn("RecordReads.findRecordsCiting")(function* <S extends Decoder>(
                    ids: readonly string[],
                    type: string,
                    schema: S,
                ) {
                    return yield* recordsWhere(
                        store,
                        (sql) => sql`r.type = ${type} AND r.recordNumber IN (
                            SELECT c.fromRecord FROM citation c WHERE c.toRecord IN (${storeNumbersOf(sql, ids)}))`,
                        schema,
                    );
                }),
                /**
                 * How many accepted records of a type there are, by `recordByPosition`.
                 * @param type the record type
                 * @returns the count
                 */
                countRecordsOfType: Effect.fn("RecordReads.countRecordsOfType")(function* (type: string) {
                    return yield* Effect.map(
                        store.query((sql) =>
                            decodedRows(CountRow)(sql`SELECT count(*) AS count FROM record WHERE type = ${type}`),
                        ),
                        countOf,
                    );
                }),
                /**
                 * Which job wrote each accepted record of a type, with its stage: none for a record a stage wrote
                 * itself. A named whole-set read over one type, bounded by its records.
                 * @param type the records' type
                 * @returns each record's id, stage and job id
                 */
                findWritersOfType: Effect.fn("RecordReads.findWritersOfType")(function* (type: string) {
                    return yield* store.query((sql) =>
                        decodedRows(WriterRow)(sql`SELECT r.id, r.stage, j.jobId
                            FROM record r LEFT JOIN job j ON j.jobNumber = r.jobNumber
                            WHERE r.type = ${type}
                            ORDER BY r.recordNumber`),
                    );
                }),
            });
        }),
    );
}
