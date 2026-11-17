import { Effect, type Schema } from "effect";
import { RecordReads } from "./record-reads";

/**
 * Records of one type by their record ids, from the record store, each by its id: for a reader that holds ids and
 * shows what they name. Only the records asked for are read, by index.
 * @param type the record type
 * @param ids the record ids
 * @param schema the type's schema, which every record is decoded by
 * @returns each record found, by its record id
 */
export const readRecordsById = Effect.fnUntraced(function* <
    S extends Schema.ConstraintDecoder<{ readonly id: string }>,
>(type: string, ids: readonly string[], schema: S) {
    const found = yield* (yield* RecordReads).findRecordsByIds(type, ids, schema);
    return new Map<string, S["Type"]>(found.map((record) => [record.id, record]));
});
