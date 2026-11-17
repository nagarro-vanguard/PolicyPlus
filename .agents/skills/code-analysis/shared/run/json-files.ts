import { Effect, Schema } from "effect";
import { DocumentInvalid, type FileNotFound, type FileUnreadable, RecordInvalid, TornTail } from "./script-errors";
import { FileAccess } from "../source/file-access";

export const AnyRecord = Schema.Record(Schema.String, Schema.Unknown);

type RecordsError = FileNotFound | FileUnreadable | RecordInvalid | TornTail;

/**
 * Decode `value` against `schema`, ignoring fields the schema does not name, so a file written by an older script
 * still reads.
 * @param schema the shape the value must have
 * @returns a function that decodes a value, or throws describing what does not match
 */
const decoderOf = <S extends Schema.ConstraintDecoder<unknown>>(schema: S) =>
    Schema.decodeUnknownSync(schema, { onExcessProperty: "ignore" });

/**
 * Read the JSON file at `path` and decode it against `schema`, so code after it works with typed values, not casts.
 * A missing file is FileNotFound.
 * @param path the file
 * @param schema the shape it must have
 * @returns the decoded value
 */
export const readDocument = Effect.fnUntraced(function* <S extends Schema.ConstraintDecoder<unknown>>(
    path: string,
    schema: S,
) {
    const text = yield* (yield* FileAccess).readText(path);
    const decode = decoderOf(schema);
    return yield* Effect.try({
        try: () => decode(JSON.parse(text)),
        catch: (cause) => new DocumentInvalid({ path, issue: String(cause) }),
    });
});

/**
 * Decode a stored document's text against `schema` with no unknown property let through, as `readDocumentStrictly`
 * does a file's.
 * @param source where the text was held, named in the error
 * @param text the document's JSON text
 * @param schema the shape it must have
 * @returns the decoded value; DocumentInvalid when the text does not match
 */
export const decodeDocumentText = <S extends Schema.ConstraintDecoder<unknown>>(
    source: string,
    text: string,
    schema: S,
) =>
    Effect.try({
        try: () => Schema.decodeUnknownSync(schema, { onExcessProperty: "error" })(JSON.parse(text)),
        catch: (cause) => new DocumentInvalid({ path: source, issue: String(cause) }),
    });

/**
 * Read the JSON file at `path` and decode it against `schema` with no unknown property let through: for code that
 * must not read a document whose shape has drifted from its schema. A missing file is FileNotFound.
 * @param path the file
 * @param schema the shape it must have
 * @returns the decoded value
 */
export const readDocumentStrictly = Effect.fnUntraced(function* <S extends Schema.ConstraintDecoder<unknown>>(
    path: string,
    schema: S,
) {
    const text = yield* (yield* FileAccess).readText(path);
    return yield* Effect.try({
        try: () => Schema.decodeUnknownSync(schema, { onExcessProperty: "error" })(JSON.parse(text)),
        catch: (cause) => new DocumentInvalid({ path, issue: String(cause) }),
    });
});

/**
 * Read every record of the JSONL file at `path`, each decoded against `schema`.
 * @param path the file
 * @param schema the shape of one record
 * @returns the decoded records, in file order
 */
export function readRecords<S extends Schema.ConstraintDecoder<unknown>>(
    path: string,
    schema: S,
): Effect.Effect<S["Type"][], RecordsError, FileAccess> {
    return readJsonl(path, decoderOf(schema));
}

/**
 * Read every record of the JSONL file at `path` when it exists; the caller says why it may not.
 * @param path the file
 * @param schema the shape of one record
 * @returns the decoded records, or none when there is no file
 */
export function readOptionalRecords<S extends Schema.ConstraintDecoder<unknown>>(
    path: string,
    schema: S,
): Effect.Effect<S["Type"][], RecordsError, FileAccess> {
    return readJsonl(path, decoderOf(schema), true);
}

/**
 * Read the JSONL file at `path` and decode each non-empty line. A line that does not decode is a RecordInvalid
 * naming the file and line, so nothing downstream sees a record that does not decode. With no final newline, the last line is
 * the one a crash mid-write would cut off: it is read when it is a whole record, and is a TornTail when it is not.
 * @param path the file
 * @param decode turns one parsed line into a typed record, or throws describing what does not match
 * @param optional whether a missing file reads as empty instead of failing with FileNotFound
 * @returns the decoded records, in file order
 */
const readJsonl = Effect.fnUntraced(function* <A>(path: string, decode: (value: unknown) => A, optional = false) {
    const tree = yield* FileAccess;
    if (optional && !(yield* tree.exists(path))) {
        return [];
    }
    const text = yield* tree.readText(path);
    const lines = text.split("\n");
    const unterminated = text.endsWith("\n") ? 0 : lines.length;
    const records: A[] = [];
    let lineNumber = 0;
    for (const raw of lines) {
        lineNumber += 1;
        if (raw.trim() === "") {
            continue;
        }
        const line = lineNumber;
        const value = yield* Effect.try({
            try: (): unknown => JSON.parse(raw),
            catch: (cause) =>
                line === unterminated
                    ? new TornTail({ path, line })
                    : new RecordInvalid({ path, line, issue: String(cause) }),
        });
        records.push(
            yield* Effect.try({
                try: () => decode(value),
                catch: (cause) => new RecordInvalid({ path, line, issue: String(cause) }),
            }),
        );
    }
    return records;
});

/**
 * Write records as JSONL, replacing the file.
 * @param path the file
 * @param records the records, one per line
 * @returns nothing once the file is written
 */
export const writeJsonl = Effect.fnUntraced(function* (path: string, records: readonly unknown[]) {
    yield* (yield* FileAccess).writeText(path, jsonlText(records));
});

/**
 * Records as JSONL text: one JSON record per line, the last line ended too.
 * @param records the records
 * @returns the text; empty for no records
 */
export const jsonlText = (records: readonly unknown[]) =>
    records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : "");
