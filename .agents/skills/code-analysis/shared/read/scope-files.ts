import { Context, Effect, Layer, Option, Schema, Stream } from "effect";
import type { SqlClient } from "effect/sql";
import { ManifestFile } from "../model/schemas/file-listing";
import { RecordInvalid } from "../run/script-errors";
import { RecordStore, type StoreOpenFailure } from "../store/database";
import { FileLinesRow, FileRow, ScopeTotalsRow } from "../store/rows";
import { decodedRows } from "../store/stored-bodies";

const pageSize = 10_000;

type ManifestRow = typeof ManifestFile.Type;

type ListedFile = typeof ManifestFile.Encoded;

type FileRowType = typeof FileRow.Type;

type ScopeFilesFailure = StoreOpenFailure | RecordInvalid;

export interface ScopeFilesOps {
    readonly replaceManifest: (rows: readonly ListedFile[]) => Effect.Effect<void, StoreOpenFailure>;
    readonly manifestRows: Stream.Stream<ManifestRow, ScopeFilesFailure>;
    readonly lineCountsFor: (files: Iterable<string>) => Effect.Effect<ReadonlyMap<string, number>, StoreOpenFailure>;
    readonly findFilesInScope: (text: string) => Effect.Effect<readonly ManifestRow[], ScopeFilesFailure>;
    readonly scopeTotals: Effect.Effect<{ readonly files: number; readonly lines: number }, StoreOpenFailure>;
}

const decodeManifestRow = Schema.decodeUnknownEffect(ManifestFile);

/**
 * The files in scope, as a statement to narrow: those with a line count, each with the path of the file it copies.
 * @param sql the client
 * @returns the statement
 */
const filesInScope = (sql: SqlClient.SqlClient) =>
    sql`SELECT f.path, f.lines, f.bytes, f.hash, f.readsAs, f.encoding, f.readFrom, c.path AS copyOf FROM file f
        LEFT JOIN file c ON c.fileNumber = f.copyOf
        WHERE f.lines IS NOT NULL`;

/**
 * Replace the manifest: every file in scope with its line count, size, hash, how Read sees it and its encoding, then the
 * file each copy copies.
 * @param sql the client
 * @param rows the files in scope
 * @returns nothing once replaced
 */
const replaceManifestWith = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, rows: readonly ListedFile[]) {
    yield* sql`DELETE FROM file`;
    for (const row of rows) {
        yield* sql`INSERT INTO file (path, lines, bytes, hash, readsAs, encoding, readFrom)
            VALUES (${row.path}, ${row.lines}, ${row.bytes}, ${row.hash}, ${row.readsAs}, ${row.encoding},
                ${row.readFrom === undefined ? null : row.readFrom})`;
    }
    for (const row of rows) {
        if (row.copyOf !== undefined) {
            yield* sql`UPDATE file SET copyOf = (SELECT fileNumber FROM file WHERE path = ${row.copyOf}) WHERE path = ${row.path}`;
        }
    }
});

/**
 * The line count of each given file that is in scope, each found by its path.
 * @param sql the client
 * @param files the files
 * @returns each file's line count; a file not in scope has none
 */
const lineCountsWith = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, files: Iterable<string>) {
    const counts = new Map<string, number>();
    for (const file of new Set(files)) {
        const [row] = yield* decodedRows(FileLinesRow)(sql`SELECT lines FROM file WHERE path = ${file}`);
        if (row !== undefined && row.lines !== null) {
            counts.set(file, row.lines);
        }
    }
    return counts;
});

/**
 * Stored files as manifest rows, decoded by `ManifestFile`: `copyOf` only when a file copies another.
 * @param path the store's file, named when a row does not decode
 * @param rows the stored rows
 * @returns the manifest rows; RecordInvalid naming a row that does not decode
 */
const manifestRowsOf = (path: string, rows: readonly FileRowType[]) =>
    Effect.forEach(rows, (row) =>
        decodeManifestRow({
            path: row.path,
            lines: row.lines,
            bytes: row.bytes,
            hash: row.hash,
            readsAs: row.readsAs,
            encoding: row.encoding === null ? "UTF-8" : row.encoding,
            ...(row.readFrom === null ? {} : { readFrom: row.readFrom }),
            ...(row.copyOf === null ? {} : { copyOf: row.copyOf }),
        }).pipe(
            Effect.mapError((error) => new RecordInvalid({ path, line: 0, issue: `${row.path}: ${error.message}` })),
        ),
    );

export class ScopeFiles extends Context.Service<ScopeFiles, ScopeFilesOps>()("code-analysis/core/ScopeFiles") {
    static readonly layer: Layer.Layer<ScopeFiles, never, RecordStore> = Layer.effect(
        ScopeFiles,
        Effect.gen(function* () {
            const store = yield* RecordStore;
            /**
             * One page of the files in scope, in path order, after a path.
             * @param after the last path already read
             * @returns the page, and the path to read after next, or none when it was the last
             */
            const pageAfter = (after: string) =>
                Effect.flatMap(
                    store.query((sql) =>
                        decodedRows(FileRow)(
                            sql`${filesInScope(sql)} AND f.path > ${after} ORDER BY f.path LIMIT ${pageSize}`,
                        ),
                    ),
                    (rows) =>
                        Effect.map(manifestRowsOf(store.path, rows), (decoded) => {
                            const last = rows.at(-1);
                            return [decoded, last === undefined ? Option.none() : Option.some(last.path)] as const;
                        }),
                );
            return ScopeFiles.of({
                /**
                 * Replace the manifest: every file in scope with its line count and the file it copies. Inventory's
                 * finish only, inside its write.
                 * @param rows the files in scope
                 * @returns nothing once replaced
                 */
                replaceManifest: Effect.fn("ScopeFiles.replaceManifest")(function* (rows: readonly ListedFile[]) {
                    return yield* store.query((sql) => replaceManifestWith(sql, rows));
                }),
                manifestRows: Stream.paginate("", pageAfter),
                /**
                 * The line count of each given file that is in scope: the gate's lookup, by index, per file.
                 * @param files the files
                 * @returns each file's line count; a file not in scope has none
                 */
                lineCountsFor: Effect.fn("ScopeFiles.lineCountsFor")(function* (files: Iterable<string>) {
                    return yield* store.query((sql) => lineCountsWith(sql, files));
                }),
                /**
                 * The files in scope whose path holds a text, in path order, with their line counts: what an agent
                 * searches. A whole-set read, over every path in scope.
                 * @param text part of a path
                 * @returns the files
                 */
                findFilesInScope: Effect.fn("ScopeFiles.findFilesInScope")(function* (text: string) {
                    return yield* Effect.flatMap(
                        store.query((sql) =>
                            decodedRows(FileRow)(
                                sql`${filesInScope(sql)} AND instr(f.path, ${text}) > 0 ORDER BY f.path`,
                            ),
                        ),
                        (rows) => manifestRowsOf(store.path, rows),
                    );
                }),
                scopeTotals: store
                    .query((sql) =>
                        Effect.map(
                            decodedRows(ScopeTotalsRow)(sql`SELECT count(*) AS files,
                            coalesce(sum(lines), 0) AS lines FROM file WHERE lines IS NOT NULL`),
                            ([row]) => (row === undefined ? { files: 0, lines: 0 } : row),
                        ),
                    )
                    .pipe(Effect.withSpan("ScopeFiles.scopeTotals")),
            });
        }),
    );
}
