import { Effect, Result, Schema } from "effect";
import { AnyRecord, readRecords } from "../run/json-files";
import { RecordInvalid } from "../run/script-errors";
import { ShapeRegistry, typeNameOfId, type RecordType } from "../model/shape-registry";
import type { JsonRecord } from "../model/json-record";
import { prefixOf } from "../model/record-ids";

/**
 * Each record as last written: an agent corrects a record by appending it again, so a later copy with the same
 * identity replaces an earlier one, keeping the position of the last. A record with no identity is never replaced.
 * @param records the records, in file order
 * @param identityOf the identity a record type declares, for each record
 * @returns the newest copy of each, in file order
 */
function newestCopies<A>(records: ReadonlyArray<A>, identityOf: (record: A) => string | undefined): A[] {
    const last = new Map<string, number>();
    records.forEach((record, i) => {
        const key = identityOf(record);
        if (key !== undefined) {
            last.set(key, i);
        }
    });
    return records.filter((record, i) => {
        const key = identityOf(record);
        return key === undefined || last.get(key) === i;
    });
}

type Expected<T> = { readonly [K in keyof T]: Schema.ConstraintDecoder<unknown> };

type Line = { readonly name: string; readonly type: RecordType; readonly record: JsonRecord };

const strict = { onExcessProperty: "error" } as const;

/**
 * The record type of one line of an agent's output, as the caller declared the file may hold: the registered type
 * whose id prefix the record's id carries, or, for a record with no id, the one id-less type the caller allows.
 * Nothing is inferred from a record's shape.
 * @param record the parsed line
 * @param allowed the registered types the file may hold, by name
 * @param typeNameOf each registered type's name, by a record id
 * @param idLess the one type the file may hold without a record id, if any
 * @returns the line typed, or why the file may not hold it
 */
function typeOfLine(
    record: JsonRecord,
    allowed: ReadonlyMap<string, RecordType>,
    typeNameOf: (id: string) => string | undefined,
    idLess: string | undefined,
): { readonly kind: "typed"; readonly line: Line } | { readonly kind: "refused"; readonly issue: string } {
    const name = typeof record.id === "string" ? typeNameOf(record.id) : idLess;
    const type = name === undefined ? undefined : allowed.get(name);
    if (name === undefined || type === undefined) {
        const what = typeof record.id === "string" ? record.id : "a record with no id";
        return {
            kind: "refused",
            issue: `${what} is not a record this file may hold (${[...allowed.keys()].join(", ")})`,
        };
    }
    return { kind: "typed", line: { name, type, record } };
}

/**
 * The registered types a file may hold, by name, refusing a name the registry does not declare.
 * @param path the file, named in the error
 * @param names the types the caller says the file may hold
 * @returns each name's registered type; RecordInvalid naming every undeclared type
 */
const allowedTypes = Effect.fnUntraced(function* (path: string, names: readonly string[]) {
    const { records: registered } = yield* ShapeRegistry;
    const allowed = new Map(names.flatMap((name) => (registered[name] ? [[name, registered[name]] as const] : [])));
    const undeclared = names.filter((name) => !allowed.has(name));
    if (undeclared.length) {
        return yield* new RecordInvalid({ path, line: 0, issue: `no registered record type ${undeclared.join(", ")}` });
    }
    return { allowed, typeNameOf: typeNameOfId(registered) };
});

/**
 * An agent's output, read strictly: each line's type comes from its record id prefix through the registry (or is the one
 * id-less type the caller allows), each line is decoded against its type's schema with no unknown property let
 * through, and a record appended again replaces the earlier copy by its type's declared identity. A missing file, a
 * type the registry does not declare, a line of a type the file may not hold, or a line that fails its schema is an
 * error naming the line, never skipped.
 * @param path the agent's output file, which must exist
 * @param expected the record types the file may hold, by name, each with its schema
 * @param idLess the one type among `expected` the file may hold without a record id, if any
 * @returns `of(name)`: the newest copy of each record of that type, decoded, in file order
 */
export const readAgentOutput = Effect.fnUntraced(function* <T extends Expected<T>>(
    path: string,
    expected: T,
    idLess?: keyof T & string,
) {
    const { allowed, typeNameOf } = yield* allowedTypes(path, Object.keys(expected));
    const lines: Line[] = [];
    for (const [i, record] of (yield* readRecords(path, AnyRecord)).entries()) {
        const typed = typeOfLine(record, allowed, typeNameOf, idLess);
        if (typed.kind === "refused") {
            return yield* new RecordInvalid({ path, line: i + 1, issue: typed.issue });
        }
        const decoded = Schema.decodeUnknownResult(typed.line.type.schema, strict)(record);
        if (Result.isFailure(decoded)) {
            return yield* new RecordInvalid({
                path,
                line: i + 1,
                issue: `${typed.line.name}: ${decoded.failure.message}`,
            });
        }
        lines.push(typed.line);
    }
    const newest = newestCopies(lines, ({ name, type, record }) => {
        const key = type.keyOf(record);
        return key === undefined ? undefined : `${name}:${key}`;
    });
    return {
        of: <K extends keyof T & string>(name: K): T[K]["Type"][] =>
            newest
                .filter((line) => line.name === name)
                .map((line) => Schema.decodeUnknownSync(expected[name], strict)(line.record)),
    };
});

/**
 * A job's records of one type, each decoded by the type its record id prefix names. Every record was checked when it
 * was written, so this only restores its type.
 * @param records the job's records
 * @param prefix the type's record id prefix
 * @param schema the type's schema
 * @returns the records of that type
 */
export const ofType = <S extends Schema.ConstraintDecoder<unknown>>(
    records: ReadonlyArray<JsonRecord & { readonly id: string }>,
    prefix: string,
    schema: S,
): Array<S["Type"]> =>
    records
        .filter((record) => prefixOf(record.id) === prefix)
        .map((record) => Schema.decodeUnknownSync(schema)(record));
