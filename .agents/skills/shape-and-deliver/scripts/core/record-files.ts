import { Effect, Schema, SchemaAST } from "effect";
import { RecordInvalid, RequestInvalid } from "./script-errors";
import { System } from "./system";
import { idPrefix, isRecordIdOf, recordTypes, type RecordName } from "./records";

/** A record as one line of a records file holds it: its type, its id and its other properties, already checked against the type's schema. */
export type Stored = { readonly type: RecordName; readonly id: string } & Record<string, unknown>;

/** A records-file line as written: an object with at least a type and an id. */
type Line = { readonly type: RecordName; readonly id: string };

/** The lines of a records file are JSON objects. */
const JsonObject = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown));

/**
 * Tells whether a name is a record type an agent may write.
 * @param name the name to test
 * @returns true for a registered record type
 */
const isRecordName = (name: string): name is RecordName => Object.hasOwn(recordTypes, name);

/**
 * Parses one line of text as a JSON object.
 * @param path the file, named in the error
 * @param line the line number, from 1
 * @param text the line's text
 * @returns the object, or a RecordInvalid failure when the line is not a JSON object
 */
const objectOf = (path: string, line: number, text: string) =>
    Schema.decodeUnknownEffect(JsonObject)(text).pipe(
        Effect.mapError((error) => new RecordInvalid({ path, line, issue: error.message })),
    );

/**
 * Reads one line as a stored record. The line must name a registered type, carry an id and, unless it withdraws the
 * record, satisfy the type's schema.
 * @param path the file, named in the error
 * @param line the line number, from 1
 * @param text the line's text
 * @returns the stored record
 * Fails: RecordInvalid.
 */
const storedOn = Effect.fnUntraced(function* (path: string, line: number, text: string) {
    const { type, id, ...properties } = yield* objectOf(path, line, text);
    if (typeof type !== "string" || !isRecordName(type)) {
        return yield* new RecordInvalid({ path, line, issue: `${String(type)} is not a record type` });
    }
    if (typeof id !== "string") {
        return yield* new RecordInvalid({ path, line, issue: "a record has an id" });
    }
    if (properties.withdrawn !== true) {
        yield* Schema.decodeUnknownEffect(recordTypes[type])({ ...properties, id }).pipe(
            Effect.mapError((error) => new RecordInvalid({ path, line, issue: error.message })),
        );
    }
    const stored: Stored = { ...properties, type, id };
    return stored;
});

/**
 * Reads a records file and keeps the newest line of each id, withdrawn ones included, so no id is issued twice.
 * @param path the records file; a missing file holds none
 * @returns the newest copies, in the order their ids first appeared
 */
const readNewestCopies = Effect.fnUntraced(function* (path: string) {
    const system = yield* System;
    if (!(yield* system.exists(path))) {
        return [];
    }
    const byId = new Map<string, Stored>();
    for (const [index, text] of (yield* system.readText(path)).split("\n").entries()) {
        if (text.trim().length === 0) {
            continue;
        }
        const stored = yield* storedOn(path, index + 1, text);
        byId.set(stored.id, stored);
    }
    return [...byId.values()];
});

/**
 * Reads the records of a file. The newest line of an id wins, so a record is corrected by writing it again with its id
 * and dropped by writing its withdrawal.
 * @param path the records file; a missing file holds no records
 * @returns the records that are not withdrawn, each with its type and id, in the order their ids first appeared
 * Fails: RecordInvalid, for a line that is no record.
 */
export const readRecords = Effect.fn("RecordFiles.readRecords")(function* (path: string) {
    return (yield* readNewestCopies(path)).filter((record) => record.withdrawn !== true);
});

/**
 * Checks one object an agent wrote against its record type, refusing properties the type does not name, and numbers it
 * with the next id of its prefix unless it names one. `{"id": …, "withdrawn": true}` withdraws a record instead.
 * @param type the record type
 * @param value the object the agent wrote
 * @param held the records already in the file
 * @returns the record to store, or the text of the problem that makes it invalid
 */
function decodeAndNumber(type: RecordName, value: Record<string, unknown>, held: readonly Line[]): Line | string {
    const prefix = idPrefix[type];
    if (value.withdrawn !== undefined) {
        const target = held.find((record) => record.id === value.id && record.type === type);
        if (Object.keys(value).length !== 2 || value.withdrawn !== true || target === undefined) {
            return `a withdrawal is {"id": "<an id of a ${type} in this file>", "withdrawn": true}`;
        }
        const withdrawal = { type, id: target.id, withdrawn: true };
        return withdrawal;
    }
    const decoded = Schema.decodeUnknownExit(recordTypes[type], { onExcessProperty: "error" })(value);
    if (decoded._tag === "Failure") {
        return String(decoded.cause);
    }
    const given = typeof value.id === "string" ? value.id : undefined;
    if (given !== undefined && !held.some((record) => record.id === given)) {
        return `${given} names no record in this file; leave the id out for a new record`;
    }
    const numbers = held
        .filter((record) => isRecordIdOf(prefix, record.id))
        .map((record) => Number(record.id.slice(prefix.length + 1)));
    const id = given ?? `${prefix}-${Math.max(0, ...numbers) + 1}`;
    return { ...decoded.value, type, id };
}

/**
 * Adds the records an agent wrote, one JSON object per line, to its output file. It reads the whole file and rewrites
 * it, and writes nothing when any line is invalid, so a half-written output never exists.
 * @param type the record type's name
 * @param path the output file
 * @param input the lines the agent wrote
 * @returns the id of each record written, in order
 * Writes: the output file, rewritten whole. Fails: RequestInvalid, RecordInvalid.
 */
export const appendRecords = Effect.fn("RecordFiles.appendRecords")(function* (
    type: string,
    path: string,
    input: string,
) {
    if (!isRecordName(type)) {
        return yield* new RequestInvalid({
            issue: `${type} is not a record type; the types are ${Object.keys(recordTypes).join(", ")}`,
        });
    }
    const held: Line[] = [...(yield* readNewestCopies(path))];
    const written: Line[] = [];
    for (const [index, text] of input.split("\n").entries()) {
        if (text.trim().length === 0) {
            continue;
        }
        const record = decodeAndNumber(type, yield* objectOf("standard input", index + 1, text), [...held, ...written]);
        if (typeof record === "string") {
            return yield* new RecordInvalid({ path: "standard input", line: index + 1, issue: record });
        }
        written.push(record);
        held.push(record);
    }
    const system = yield* System;
    const before = (yield* system.exists(path)) ? yield* system.readText(path) : "";
    yield* system.writeText(path, before + written.map((record) => `${JSON.stringify(record)}\n`).join(""));
    return written.map((record) => record.id);
});

/**
 * Lists the values a property may take when it is a choice of literals or a list of them.
 * @param ast the property's schema
 * @returns the values joined by " | ", or undefined when any value is allowed
 */
function allowedValues(ast: SchemaAST.AST): string | undefined {
    const inner = ast._tag === "Arrays" && ast.rest[0] ? ast.rest[0] : ast;
    if (inner._tag === "Literal") {
        return JSON.stringify(inner.literal);
    }
    if (inner._tag === "Union" && inner.types.every((member) => member._tag === "Literal")) {
        return inner.types
            .map((member) => (member._tag === "Literal" ? JSON.stringify(member.literal) : ""))
            .join(" | ");
    }
    return undefined;
}

/**
 * Describes a record type for an agent: one line per property with its meaning, reader, allowed values and the keys of
 * an object, taken from the schema's own annotations. A property with no description or reader is a defect.
 * @param type the record type's name
 * @returns the lines to print
 * Fails: RequestInvalid, for a name that is no record type.
 */
export const describeRecord = Effect.fn("RecordFiles.describeRecord")(function* (type: string) {
    if (!isRecordName(type)) {
        return yield* new RequestInvalid({
            issue: `${type} is not a record type; the types are ${Object.keys(recordTypes).join(", ")}`,
        });
    }
    const ast = recordTypes[type].ast;
    const lines = [`${type}: ${SchemaAST.resolveDescription(ast) ?? ""}`];
    const undescribed: string[] = [];
    if (ast._tag === "Objects") {
        for (const property of ast.propertySignatures) {
            const description = SchemaAST.resolveDescription(property.type);
            const readBy = SchemaAST.resolveAt<string>("readBy")(property.type);
            if (description === undefined || readBy === undefined) {
                undescribed.push(String(property.name));
            }
            const optional = SchemaAST.isOptional(property.type) ? " (optional)" : "";
            const list = property.type._tag === "Arrays" ? " (a list)" : "";
            const object =
                property.type._tag === "Objects"
                    ? ` (an object {${property.type.propertySignatures.map((key) => String(key.name)).join(", ")}})`
                    : "";
            const values = allowedValues(property.type);
            lines.push(
                `- ${String(property.name)}${list}${object}${optional}${values ? `: ${values}` : ""}: ${description ?? ""} (read by: ${readBy ?? ""})`,
            );
        }
    }
    if (undescribed.length > 0) {
        return yield* Effect.die(`${type} has properties with no description or reader: ${undescribed.join(", ")}`);
    }
    return lines;
});

/** A record in its typed form: the properties its schema decodes, plus its id. */
export type RecordOf<K extends RecordName> = (typeof recordTypes)[K]["Type"] & { readonly id: string };

/**
 * Picks the records of one type and decodes each by its schema. They were checked when read, so one the schema refuses
 * here is an impossible state and a defect, not a failure.
 * @param records the stored records
 * @param type the record type to pick
 * @returns the records of that type, decoded, each with its id
 */
export const recordsOf = Effect.fn("RecordFiles.recordsOf")(function* <K extends RecordName>(
    records: readonly Stored[],
    type: K,
) {
    const decode = Schema.decodeUnknownEffect(recordTypes[type]);
    return yield* Effect.forEach(
        records.filter((record) => record.type === type),
        ({ type: _type, ...record }) =>
            decode(record).pipe(
                Effect.map((decoded): RecordOf<K> => ({ ...decoded, id: record.id })),
                Effect.orDie,
            ),
    );
});
