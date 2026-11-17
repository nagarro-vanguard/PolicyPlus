import { Effect, Schema } from "effect";
import type { SqlClient } from "effect/sql";
import { RecordInvalid } from "../run/script-errors";
import { BodyRow as BodyRowSchema } from "./rows";

export const recordsPerPage = 10_000;

/**
 * The count a `SELECT count(*)` statement returns: its one row's count. SQLite always returns that row, so none is a
 * defect in our SQL, never zero (D24).
 * @param rows the statement's rows
 * @returns the count
 */
export const countOf = (rows: ReadonlyArray<{ readonly count: number }>) => {
    const [row] = rows;
    if (row === undefined) {
        throw new Error("a count statement returned no row");
    }
    return row.count;
};

const tolerant = { onExcessProperty: "ignore" } as const;

export type Decoder = Schema.ConstraintDecoder<unknown>;

export type BodyRow = typeof BodyRowSchema.Type;

/**
 * Decode one stored record's body by a schema, with no unknown property let through.
 * @param path the store's file, named when the body does not decode
 * @param row the stored row
 * @param schema the schema
 * @returns the record; RecordInvalid naming the record when its body no longer decodes
 */
export const decodedBody = <S extends Decoder>(path: string, row: BodyRow, schema: S) =>
    Schema.decodeUnknownEffect(
        Schema.fromJsonString(schema),
        tolerant,
    )(row.body).pipe(
        Effect.mapError((error) => new RecordInvalid({ path, line: 0, issue: `${row.id}: ${error.message}` })),
    );

/**
 * Decode stored rows by a schema, in their order.
 * @param path the store's file
 * @param rows the rows
 * @param schema the schema
 * @returns the records
 */
export const decodedBodies = <S extends Decoder>(path: string, rows: readonly BodyRow[], schema: S) =>
    Effect.forEach(rows, (row) => decodedBody(path, row, schema));

/**
 * A set of values bound as one JSON array, read back as rows, so a set of any size binds once and the column it is
 * compared with keeps its index.
 * @param sql the client
 * @param values the values
 * @returns the fragment selecting each value
 */
export const valuesOf = (sql: SqlClient.SqlClient, values: Iterable<string>) =>
    sql`SELECT value FROM json_each(${JSON.stringify([...new Set(values)])})`;

/**
 * The store numbers of the records with these record ids, by the unique index on ids.
 * @param sql the client
 * @param recordIds the record ids
 * @returns the fragment selecting each store number
 */
export const storeNumbersOf = (sql: SqlClient.SqlClient, recordIds: Iterable<string>) =>
    sql`SELECT recordNumber FROM record WHERE id IN (${valuesOf(sql, recordIds)})`;

/**
 * A statement's rows, decoded by the shape its SQL selects. A row of another shape means the SQL and its declared row
 * disagree, which is a defect in the code, never a state of the data.
 * @param schema the shape of one row, from `rows.ts`
 * @returns the statement's rows, decoded
 */
export const decodedRows =
    <S extends Decoder>(schema: S) =>
    <E, R>(statement: Effect.Effect<ReadonlyArray<object>, E, R>) =>
        Effect.flatMap(statement, (found) => Effect.orDie(Schema.decodeUnknownEffect(Schema.Array(schema))(found)));
