import { Effect, Option, Schema } from "effect";
import type { SqlClient } from "effect/sql";
import { type RecordShapes, retiredRecordTypes } from "../model/record-shapes";
import { RecordShapesChanged } from "../run/script-errors";
import { decodedRows, recordsPerPage } from "./stored-bodies";

const ColumnRow = Schema.Struct({ name: Schema.String });
const ShapesRow = Schema.Struct({ recordShapes: Schema.NullOr(Schema.String) });
const TypedBodyRow = Schema.Struct({
    recordNumber: Schema.Number,
    id: Schema.String,
    type: Schema.String,
    body: Schema.String,
});

const tolerant = { onExcessProperty: "ignore" } as const;

/**
 * The fingerprint of the record shapes a store's records were last checked against: none for a store made before
 * stores kept one, whose `analysis` row has no such column yet.
 * @param sql the client
 * @returns the fingerprint, or none
 */
const keptFingerprint = Effect.fnUntraced(function* (sql: SqlClient.SqlClient) {
    const columns = yield* decodedRows(ColumnRow)(sql`SELECT name FROM pragma_table_info('analysis')`);
    if (!columns.some((column) => column.name === "recordShapes")) {
        return Option.none<string>();
    }
    const [row] = yield* decodedRows(ShapesRow)(sql`SELECT recordShapes FROM analysis`);
    return row === undefined || row.recordShapes === null ? Option.none<string>() : Option.some(row.recordShapes);
});

/**
 * Whether a store's records were last checked against these shapes, asked without the write lock.
 * @param sql the client
 * @param shapes the record shapes of these scripts
 * @returns true when nothing needs checking
 */
export const recordShapesKept = (sql: SqlClient.SqlClient, shapes: RecordShapes) =>
    Effect.map(keptFingerprint(sql), (kept) => Option.isSome(kept) && kept.value === shapes.digest);

/**
 * Which stored records no longer decode by their type's schema, counted by type, the first of each named: read a
 * page at a time, as a stored record is read (a property the schema no longer has is ignored).
 * @param sql the client
 * @param shapes the record shapes of these scripts
 * @returns one line per type with records that do not decode
 */
const undecodable = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, shapes: RecordShapes) {
    const failed = new Map<string, { count: number; first: string }>();
    let after = 0;
    for (;;) {
        const page = yield* decodedRows(TypedBodyRow)(
            sql`SELECT recordNumber, id, type, body FROM record WHERE recordNumber > ${after}
                ORDER BY recordNumber LIMIT ${recordsPerPage}`,
        );
        for (const row of page) {
            if (retiredRecordTypes.has(row.type)) {
                continue;
            }
            const schema = shapes.schemas.get(row.type);
            const decoded =
                schema === undefined
                    ? false
                    : Option.isSome(
                          yield* Effect.option(
                              Schema.decodeUnknownEffect(Schema.fromJsonString(schema), tolerant)(row.body),
                          ),
                      );
            if (!decoded) {
                const seen = failed.get(row.type);
                failed.set(
                    row.type,
                    seen === undefined ? { count: 1, first: row.id } : { ...seen, count: seen.count + 1 },
                );
            }
        }
        const last = page.at(-1);
        if (last === undefined) {
            break;
        }
        after = last.recordNumber;
    }
    return [...failed].map(([type, { count, first }]) => `${type}: ${count} (first ${first})`);
});

/**
 * Bring a store's record-shape fingerprint up to these scripts', under the write lock: a store made before stores
 * kept one gains the column (nothing else in it changes, no record is lost); then every stored record is decoded by
 * its type's schema. When all decode, the fingerprint is stamped and the store is used as it is; when some do not,
 * the store is refused, naming the types, before any script reads a record it would misread.
 * @param sql the client
 * @param path the store's file, named in the refusal
 * @param shapes the record shapes of these scripts
 * @returns nothing once stamped; a defect RecordShapesChanged when records no longer decode
 */
export const settleRecordShapes = Effect.fnUntraced(function* (
    sql: SqlClient.SqlClient,
    path: string,
    shapes: RecordShapes,
) {
    if (yield* recordShapesKept(sql, shapes)) {
        return;
    }
    const columns = yield* decodedRows(ColumnRow)(sql`SELECT name FROM pragma_table_info('analysis')`);
    if (!columns.some((column) => column.name === "recordShapes")) {
        yield* sql.unsafe("ALTER TABLE analysis ADD COLUMN recordShapes TEXT");
    }
    const failed = yield* undecodable(sql, shapes);
    if (failed.length > 0) {
        return yield* Effect.die(new RecordShapesChanged({ path, types: failed }));
    }
    yield* sql`UPDATE analysis SET recordShapes = ${shapes.digest}`;
});
