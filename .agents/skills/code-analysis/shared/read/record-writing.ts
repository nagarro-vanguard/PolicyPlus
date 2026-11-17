import { resolve, sep } from "node:path";
import { gap } from "../jobs/gap-remedies";
import { lineSpan } from "../model/line-ranges";
import { Effect, Predicate, Schema } from "effect";
import { AnalysisRoot } from "../run/analysis-root";
import { RecordRejected } from "../run/script-errors";
import { FileAccess } from "../source/file-access";
import { prefixOf, recordIdDigits } from "../model/record-ids";
import { RandomIds } from "../run/hashing-and-random";
import { AnyRecord, readRecords } from "../run/json-files";
import type { JsonRecord } from "../model/json-record";
import { ShapeRegistry, type RecordType } from "../model/shape-registry";
import { Lines } from "../model/shared-fields";

const isLines = Schema.is(Lines);

const strict = { onExcessProperty: "error" } as const;

/**
 * A value's span of lines, when it is a `{file, firstLine, lastLine}` object that the Lines schema accepts.
 * @param value any value inside a record
 * @returns the span, or undefined
 */
const linesOf = (value: unknown): Lines | undefined => (isLines(value) ? value : undefined);

/**
 * Every `{file, firstLine, lastLine}` object inside a record, so its cited lines can be checked.
 * @param value the record, or any value inside it
 * @param out the list the spans are added to
 * @returns `out`, with every span found
 */
export function citedRanges(value: unknown, out: Lines[] = []): Lines[] {
    if (Array.isArray(value)) {
        value.forEach((item) => citedRanges(item, out));
    } else if (Predicate.isObject(value)) {
        const lines = linesOf(value);
        if (lines) {
            out.push(lines);
        }
        Object.values(value).forEach((item) => citedRanges(item, out));
    }
    return out;
}

/**
 * The cited ranges of a record that lie outside a file list: a file the list does not hold, or a last line past the
 * file's end. One rule for every caller, so a record is held to the same scope when it is written and when a gate
 * checks it again later against the current list.
 * @param record the record, or any value inside it
 * @param lineCounts each listed file's line count
 * @returns the ranges outside the list, in the record's order
 */
const citationGaps = (record: unknown, lineCounts: ReadonlyMap<string, number>): Lines[] =>
    citedRanges(record).filter((cited) => {
        const total = lineCounts.get(cited.file);
        return total === undefined || cited.lastLine > total;
    });

/**
 * Every file a set of records cites, so a gate can read the line counts of those files alone.
 * @param records the records
 * @returns the cited files, once each
 */
export const citedFiles = (records: readonly unknown[]): Set<string> =>
    new Set(records.flatMap((record) => citedRanges(record).map((cited) => cited.file)));

/**
 * One line per cited range of a set of records that lies outside a file list, naming the record.
 * @param records the records
 * @param lineCounts each listed file's line count
 * @param listing what the list is called, for the message
 * @param nameOf how a record is named in the message
 * @returns the gaps, in the records' order
 */
export const scopeGaps = <R>(
    records: readonly R[],
    lineCounts: ReadonlyMap<string, number>,
    listing: string,
    nameOf: (record: R) => string,
): string[] =>
    records.flatMap((record) =>
        citationGaps(record, lineCounts).map((cited) =>
            gap("outside-listing", `${nameOf(record)} cites ${lineSpan(cited)}, which is not in the ${listing}`),
        ),
    );

/**
 * The declared record type of a name an agent or script gives, from the shape registry.
 * @param name the record type's name
 * @returns the record type, or RecordRejected naming an unknown one
 */
export const recordTypeOf = Effect.fnUntraced(function* (name: string) {
    const type = (yield* ShapeRegistry).records[name];
    if (!type) {
        return yield* new RecordRejected({ reason: `unknown record type ${name}` });
    }
    return type;
});

/**
 * Reject a record that does not match its schema.
 * @param name the record type's name
 * @param type the record type
 * @param record the record, with its record id when its type has one
 * @returns nothing when the record passes, or RecordRejected
 */
const checkRecord = Effect.fnUntraced(function* (name: string, type: RecordType, record: JsonRecord) {
    yield* Effect.try({
        try: () => Schema.decodeUnknownSync(type.schema, strict)(record),
        catch: (cause) => new RecordRejected({ reason: `${name} does not match its schema: ${String(cause)}` }),
    });
});

/**
 * A record id of one prefix that none of `taken` holds, drawn again on the rare repeat.
 * @param prefix the record type's id prefix
 * @param taken the record ids already held where the record is written, and those given to its batch so far
 * @returns the fresh record id
 */
const freshRecordId = Effect.fnUntraced(function* (prefix: string, taken: ReadonlySet<string>) {
    const ids = yield* RandomIds;
    let [id] = yield* ids.next(prefix, 1, recordIdDigits);
    while (id === undefined || taken.has(id)) {
        [id] = yield* ids.next(prefix, 1, recordIdDigits);
    }
    return id;
});

/**
 * Give each record of a batch its record id. A record that carries one corrects a record already held, so the
 * record id must name one, else an agent could invent one, and the correction must keep that record's declared identity, else
 * an answer could be moved to another question under its record id. A record without one takes the record id of the held record its type's
 * declared identity matches, so correcting an answer by its question keeps the answer's record id under everything
 * citing it, and otherwise gets a fresh one. A type with no id prefix keeps no record id.
 * @param name the record type's name
 * @param type the record type
 * @param records the records as written
 * @param known the records already held: the output file's, and those the writer may correct
 * @returns the records, each with its record id when its type has one; RecordRejected for a record id that names nothing
 */
const assignRecordIds = Effect.fnUntraced(function* (
    name: string,
    type: RecordType,
    records: readonly JsonRecord[],
    known: readonly JsonRecord[],
) {
    const prefix = type.idPrefix;
    if (prefix === undefined) {
        return records;
    }
    const held = known.flatMap((record) =>
        typeof record.id === "string" && prefixOf(record.id) === prefix ? [{ id: record.id, record }] : [],
    );
    const taken = new Set(held.map(({ id }) => id));
    const identityById = new Map(held.map(({ id, record }) => [id, type.keyOf(record)] as const));
    const idByIdentity = new Map(
        held.flatMap(({ id, record }) => {
            const identity = type.keyOf(record);
            return identity === undefined ? [] : [[identity, id] as const];
        }),
    );
    const assigned: JsonRecord[] = [];
    for (const record of records) {
        if (typeof record.id === "string") {
            if (!taken.has(record.id)) {
                return yield* new RecordRejected({
                    reason: `${name} gives the record id ${record.id}, which names no record already written there or among the findings it may correct; leave the record id out on a new record; nothing was written`,
                });
            }
            const before = identityById.get(record.id);
            const after = type.keyOf(record);
            if (before !== after) {
                return yield* new RecordRejected({
                    reason: `${name} gives the record id ${record.id}, which belongs to ${before}, not ${after}: a correction keeps the identity of the record it corrects; nothing was written`,
                });
            }
            assigned.push(record);
            continue;
        }
        const identity = type.keyOf(record);
        const matched = identity === undefined ? undefined : idByIdentity.get(identity);
        const id = matched === undefined ? yield* freshRecordId(prefix, taken) : matched;
        taken.add(id);
        if (identity !== undefined) {
            idByIdentity.set(identity, id);
        }
        assigned.push({ id, ...record });
    }
    return assigned;
});

/**
 * Give a batch its record ids, then check it whole: each record is decoded strictly against its schema, and only when
 * every record passes is anything written. The record ids drawn for a refused batch are simply dropped, since no
 * counter holds them. Cited lines are checked by each stage's gate, once, against the manifest of the moment.
 * @param name the record type's name
 * @param records the records as written, without the record ids the scripts issue
 * @param known the records already held: the output file's, and those the writer may correct
 * @returns the records ready to write, each with its record id when its type has one
 */
export const checkAndIssueRecordIds = Effect.fnUntraced(function* (
    name: string,
    records: readonly JsonRecord[],
    known: readonly JsonRecord[],
) {
    const type = yield* recordTypeOf(name);
    const assigned = yield* assignRecordIds(name, type, records, known);
    for (const record of assigned) {
        yield* checkRecord(name, type, record);
    }
    return assigned;
});

/**
 * The records a file already holds, read as plain JSON records: none when the file does not exist yet, which is the
 * state before a writer's first record.
 * @param path the file
 * @returns its records
 */
const recordsHeld = Effect.fnUntraced(function* (path: string) {
    return (yield* (yield* FileAccess).exists(path)) ? yield* readRecords(path, AnyRecord) : [];
});

/**
 * The record ids of written records, issued or given, in order.
 * @param ready the records as written
 * @returns their record ids
 */
const idsOf = (ready: readonly JsonRecord[]) =>
    ready.flatMap((record) => (typeof record.id === "string" && record.id ? [record.id] : []));

/**
 * Append records of one type to an agent's output file, which must lie under `work/`: the record store is written only by
 * each stage's `finish`. The findings path names an artifact whose records
 * the writer may also correct under their record ids: the findings a reviewer reviews, or the last artifact an owner's
 * feedback names, for a record `carry` left out of the new output; that file must exist. With no record, the output file is created when absent:
 * an agent with nothing to record still leaves its output, which is how its run is known to have ended.
 * @param name the record type's name
 * @param outputPath the agent's output file
 * @param records the records as written, without their record ids
 * @param findingsPath the artifact whose records the writer may correct besides the output's own
 * @returns the record ids of the records written, issued or given, in order
 */
export const appendRecords = Effect.fnUntraced(function* (
    name: string,
    outputPath: string,
    records: readonly JsonRecord[],
    findingsPath?: string,
) {
    const { paths } = yield* AnalysisRoot;
    const target = resolve(outputPath);
    if (!target.startsWith(resolve(paths.work) + sep)) {
        return yield* new RecordRejected({
            reason: `${outputPath} is not under ${paths.work}; agents append to their output file there, nothing was written`,
        });
    }
    if (findingsPath !== undefined && !(yield* (yield* FileAccess).exists(findingsPath))) {
        return yield* new RecordRejected({
            reason: `the findings file ${findingsPath} does not exist; nothing was written`,
        });
    }
    const known = [
        ...(yield* recordsHeld(target)),
        ...(findingsPath === undefined ? [] : yield* readRecords(findingsPath, AnyRecord)),
    ];
    const ready = yield* checkAndIssueRecordIds(name, records, known);
    const fs = yield* FileAccess;
    if (ready.length) {
        yield* fs.appendText(target, ready.map((record) => JSON.stringify(record)).join("\n") + "\n");
    } else if (!(yield* fs.exists(target))) {
        yield* fs.writeText(target, "");
    }
    return idsOf(ready);
});
