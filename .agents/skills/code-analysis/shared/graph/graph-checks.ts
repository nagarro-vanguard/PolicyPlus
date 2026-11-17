import { Effect } from "effect";
import type { SqlClient } from "effect/sql";
import { graphTypes } from "./graph-writes";
import { CountRow, PairRow, PlacedLinkRow, PlacedRow } from "../store/rows";
import type { Lines } from "../model/shared-fields";
import { countOf, decodedRows } from "../store/stored-bodies";

export type Placed = typeof PlacedRow.Type;

export type UnresolvedTarget = {
    readonly link: Placed;
    readonly target: { readonly file: string; readonly line: number };
    readonly blocksStartingOnTarget: readonly Placed[];
    readonly blockContainingTarget?: Placed;
};

/**
 * A stage's blocks that partly overlap, neither holding the other, or sit on the same lines: each pair once, by
 * position, with the jobs that wrote them (`blockSpan`).
 * @param sql the client
 * @param stage the stage
 * @returns the pairs
 */
export const clashingBlocksOf = (sql: SqlClient.SqlClient, stage: string) =>
    decodedRows(PairRow)(
        sql`SELECT a.id AS one, b.id AS other
        FROM record b JOIN blockSpan s ON s.fileLow <= b.fileNumber AND s.fileHigh >= b.fileNumber
            AND s.firstLine < b.firstLine AND s.lastLine >= b.firstLine AND s.lastLine < b.lastLine
        JOIN record a ON a.recordNumber = s.recordNumber
        WHERE b.stage = ${stage} AND b.type = ${graphTypes.block}
        UNION ALL
        SELECT a.id AS one, b.id AS other FROM record a JOIN record b
            ON b.type = a.type AND b.fileNumber = a.fileNumber AND b.firstLine = a.firstLine
            AND b.lastLine = a.lastLine AND b.recordNumber > a.recordNumber
        WHERE a.stage = ${stage} AND a.type = ${graphTypes.block}
        ORDER BY one, other`,
    ).pipe(Effect.flatMap((pairs) => placedPairs(sql, pairs)));

/**
 * Pairs of blocks by record id, given their positions and jobs.
 * @param sql the client
 * @param pairs the pairs
 * @returns the pairs, placed
 */
const placedPairs = Effect.fnUntraced(function* (
    sql: SqlClient.SqlClient,
    pairs: ReadonlyArray<{ readonly one: string; readonly other: string }>,
) {
    const placed: Array<readonly [Placed, Placed]> = [];
    for (const pair of pairs) {
        const [one] = yield* placedOf(sql, pair.one);
        const [other] = yield* placedOf(sql, pair.other);
        if (one !== undefined && other !== undefined) {
            placed.push([one, other]);
        }
    }
    return placed;
});

/**
 * One record's position and job, by record id.
 * @param sql the client
 * @param recordId the record id
 * @returns the record, placed
 */
const placedOf = (sql: SqlClient.SqlClient, recordId: string) =>
    decodedRows(PlacedRow)(sql`SELECT r.id AS recordId, j.jobId, f.path AS file, r.firstLine, r.lastLine
        FROM record r JOIN file f ON f.fileNumber = r.fileNumber LEFT JOIN job j ON j.jobNumber = r.jobNumber
        WHERE r.id = ${recordId}`);

/**
 * A stage's links whose target line no one block starts on (D22), and no data definition either (a link reading a
 * shape of data names its first line, and the flow ends there), each with what is there instead, read only by the
 * reason the stage gives: the blocks starting on it when two or more do, or else the innermost block whose lines
 * contain it, when one does, so the reason can name the line the target should name.
 * @param sql the client, inside the stage's write
 * @param stage the stage
 * @returns the links
 */
export const unresolvedTargetsOf = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, stage: string) {
    const links = yield* decodedRows(PlacedLinkRow)(sql`
        SELECT l.recordNumber AS linkRecord, l.id AS recordId, j.jobId, f.path AS file, l.firstLine,
            l.lastLine, tf.path AS targetFile, le.toLine AS targetLine
        FROM linkEnd le JOIN record l ON l.recordNumber = le.linkRecord JOIN file f ON f.fileNumber = l.fileNumber
        JOIN file tf ON tf.fileNumber = le.toFile LEFT JOIN job j ON j.jobNumber = l.jobNumber
        WHERE l.stage = ${stage} AND le.toFile IS NOT NULL AND le.toBlock IS NULL
            AND NOT EXISTS (SELECT 1 FROM record d WHERE d.type = ${graphTypes.definition}
                AND d.fileNumber = le.toFile AND d.firstLine <= le.toLine AND d.lastLine >= le.toLine)
        ORDER BY l.recordNumber`);
    const unresolved: UnresolvedTarget[] = [];
    for (const { linkRecord, targetFile, targetLine, ...link } of links) {
        const blocksStartingOnTarget = yield* decodedRows(PlacedRow)(sql`SELECT b.id AS recordId, j.jobId,
                f.path AS file, b.firstLine, b.lastLine
            FROM temp.linkTarget t JOIN record b ON b.recordNumber = t.block JOIN file f ON f.fileNumber = b.fileNumber
            LEFT JOIN job j ON j.jobNumber = b.jobNumber
            WHERE t.linkRecord = ${linkRecord}
            ORDER BY b.recordNumber`);
        const [blockContainingTarget] = blocksStartingOnTarget.length
            ? []
            : yield* decodedRows(PlacedRow)(sql`SELECT b.id AS recordId, j.jobId, f.path AS file,
                    b.firstLine, b.lastLine
                FROM linkEnd le JOIN blockSpan s ON s.fileLow <= le.toFile AND s.fileHigh >= le.toFile
                    AND s.firstLine <= le.toLine AND s.lastLine >= le.toLine
                JOIN record b ON b.recordNumber = s.recordNumber JOIN file f ON f.fileNumber = b.fileNumber LEFT JOIN job j ON j.jobNumber = b.jobNumber
                WHERE le.linkRecord = ${linkRecord}
                ORDER BY s.lastLine - s.firstLine, s.recordNumber
                LIMIT 1`);
        unresolved.push({
            link,
            target: { file: targetFile, line: targetLine },
            blocksStartingOnTarget,
            ...(blockContainingTarget === undefined ? {} : { blockContainingTarget }),
        });
    }
    return unresolved;
});

/**
 * How many of a stage's blocks and data definitions hold every line of a range: the blocks by their intervals
 * (`blockSpan`), the data definitions by their position (`recordByPosition`), since a shape of data runs on into the
 * lines after it as a block does. Two indexed reads.
 * @param sql the client
 * @param stage the stage
 * @param lines the range
 * @returns the count
 */
export const piecesHoldingOf = (sql: SqlClient.SqlClient, stage: string, lines: Lines) =>
    Effect.map(
        decodedRows(CountRow)(
            sql`SELECT (SELECT count(*) FROM file f JOIN blockSpan s ON s.fileLow <= f.fileNumber AND s.fileHigh >= f.fileNumber
                    AND s.firstLine <= ${lines.firstLine} AND s.lastLine >= ${lines.lastLine}
                JOIN record r ON r.recordNumber = s.recordNumber
                WHERE f.path = ${lines.file} AND r.stage = ${stage} AND r.type = ${graphTypes.block})
            + (SELECT count(*) FROM file f JOIN record d ON d.type = ${graphTypes.definition} AND d.fileNumber = f.fileNumber
                    AND d.firstLine <= ${lines.firstLine} AND d.lastLine >= ${lines.lastLine}
                WHERE f.path = ${lines.file} AND d.stage = ${stage}) AS count`,
        ),
        countOf,
    );
