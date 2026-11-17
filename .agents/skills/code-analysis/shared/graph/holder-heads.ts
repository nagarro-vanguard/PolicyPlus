import { Effect } from "effect";
import { Block } from "../model/schemas/map";
import { RecordStore } from "../store/database";
import { HeadRow, HeadStartRow } from "../store/rows";
import { decodedBody, decodedRows, valuesOf } from "../store/stored-bodies";

/**
 * The blocks holding the blocks reached and not reached themselves, each cut to its head: its first line up to the
 * line before the first block it holds (D241). A class's attributes, declarations and fields decide rules for every
 * method it holds (who may call them, what they check), so the rules jobs read the head, never the rest, whose
 * blocks are read where they are reached. A holder whose first held block starts on its own first line has no head.
 * @param reached the reached blocks, by record id
 * @returns the holders' blocks with their lines cut to the head, in file and line order
 */
export const readHolderHeads = Effect.fnUntraced(function* (reached: readonly string[]) {
    const store = yield* RecordStore;
    const rows = yield* store.query((sql) =>
        decodedRows(
            HeadRow,
        )(sql`WITH reached AS (SELECT recordNumber AS n FROM record WHERE id IN (${valuesOf(sql, reached)})),
            holders AS (
                SELECT DISTINCT h.recordNumber AS n FROM reached
                JOIN record rb ON rb.recordNumber = reached.n
                JOIN blockSpan h ON h.fileLow = rb.fileNumber AND h.firstLine <= rb.firstLine AND h.lastLine >= rb.lastLine
                    AND h.recordNumber <> rb.recordNumber
                WHERE h.recordNumber NOT IN (SELECT n FROM reached))
            SELECT r.recordNumber, r.id, r.body, heads.headLast FROM (
                SELECT h.recordNumber AS n, (SELECT min(i.firstLine) FROM blockSpan i
                    WHERE i.fileLow = h.fileLow AND i.firstLine >= h.firstLine AND i.lastLine <= h.lastLine
                        AND i.recordNumber <> h.recordNumber) - 1 AS headLast, h.fileLow, h.firstLine
                FROM holders JOIN blockSpan h ON h.recordNumber = holders.n) heads
            JOIN record r ON r.recordNumber = heads.n
            WHERE r.stage = 'map' AND heads.headLast >= heads.firstLine
            ORDER BY heads.fileLow, heads.firstLine, r.recordNumber`),
    );
    return yield* Effect.forEach(rows, (row) =>
        Effect.map(decodedBody(store.path, row, Block), (block) => ({
            ...block,
            lines: { ...block.lines, lastLine: row.headLast },
        })),
    );
});

/**
 * Where the first reached block of each file starts reading, when it sits in a class, module or program the Map
 * names (`container`) and lines no block holds lie before it (D241): its file's head, from the line after the block
 * before it, or the file's first line. Where the Map maps a class's members and not the class, its attributes,
 * declaration and fields lie there, and decide rules for every member.
 * @param reached the reached blocks, by record id
 * @returns the first line each such block reads from, by record id
 */
export const readFileHeads = Effect.fnUntraced(function* (reached: readonly string[]) {
    const store = yield* RecordStore;
    const rows = yield* store.query((sql) =>
        decodedRows(HeadStartRow)(sql`WITH reached AS (
                SELECT r.id, r.fileNumber, r.firstLine FROM record r WHERE r.id IN (${valuesOf(sql, reached)})
                    AND json_extract(r.body, '$.container') IS NOT NULL),
            firsts AS (SELECT id, fileNumber, min(firstLine) AS firstLine FROM reached GROUP BY fileNumber)
            SELECT f.id, coalesce((SELECT max(s.lastLine) FROM blockSpan s
                WHERE s.fileLow = f.fileNumber AND s.lastLine < f.firstLine), 0) + 1 AS headFirst, f.firstLine
            FROM firsts f ORDER BY f.fileNumber`),
    );
    return new Map(rows.filter((row) => row.headFirst < row.firstLine).map((row) => [row.id, row.headFirst] as const));
});
