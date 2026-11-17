import { Effect, Schema } from "effect";
import type { SqlClient } from "effect/sql";
import { resourceIdOf } from "../model/resource-ids";
import { Block, Link } from "../model/schemas/map";
import { decodedRows } from "../store/stored-bodies";
import { ResourcePairRow } from "../store/rows";

const isBlock = Schema.is(Block);
const isLink = Schema.is(Link);

export const graphTypes = {
    block: "Block",
    link: "Link",
    definition: "DataDefinition",
    codeKind: "CodeKind",
    layer: "Layer",
} as const;

/**
 * Put one accepted record into the code graph, when it is part of it: a block becomes an interval of lines in its
 * file, and an entryPoint when it is an entry point; a link gets its kind and what it reaches, its blocks and its outside
 * system resolved once the stage's records are all in (`resolveLinkEnds`), since an external system a Map job wrote may
 * be written after the link reaching it (P1.38). A file a link reaches outside the scope is listed, with no lines.
 * @param sql the client, inside the stage's write
 * @param row the record's store number and file number
 * @param row.recordNumber the record's number in the store
 * @param row.fileNumber the number of the file it sits in, when it sits in one
 * @param record the decoded record
 * @returns nothing once indexed
 */
export const indexGraphRecord = Effect.fnUntraced(function* (
    sql: SqlClient.SqlClient,
    row: { readonly recordNumber: number; readonly fileNumber: number | null },
    record: unknown,
) {
    if (isBlock(record) && row.fileNumber !== null) {
        if (record.entryPoint !== undefined) {
            yield* sql`INSERT INTO entryPoint (recordNumber) VALUES (${row.recordNumber})`;
        }
        return;
    }
    if (!isLink(record)) {
        return;
    }
    const to = record.to;
    if (to !== undefined && "file" in to) {
        yield* sql`INSERT INTO file (path) VALUES (${to.file}) ON CONFLICT (path) DO NOTHING`;
    }
    yield* sql`INSERT INTO linkEnd (linkRecord, kind, toFile, toLine) VALUES (
        ${row.recordNumber},
        ${record.kind},
        ${to !== undefined && "file" in to ? sql`(SELECT fileNumber FROM file WHERE path = ${to.file})` : null},
        ${to !== undefined && "file" in to ? to.line : null}
    )`;
    if (to !== undefined && "externalSystem" in to) {
        yield* sql`INSERT INTO temp.pendingExternalEnd (linkRecord, externalSystem, resource)
            VALUES (${row.recordNumber}, ${to.externalSystem}, ${to.resource})`;
    }
});

/**
 * Issue the id of every data resource the stage's records name that has none yet: each distinct pair of an external
 * system, by its record number once merged entries are followed, and a resource spelling, as a link end uses it or a data
 * definition declares it, in the order the records were written. The id is `resourceIdOf` its pair, so the same pair
 * always has the same id; the table lets a reader turn an id back into its pair, and its order is the location order a
 * cut packs resources in.
 * @param sql the client, inside the stage's write
 * @returns nothing once issued
 */
const issueResourceIds = Effect.fnUntraced(function* (sql: SqlClient.SqlClient) {
    const named = yield* decodedRows(ResourcePairRow)(sql`
        SELECT systemNumber, systemId, resource FROM (
            SELECT le.toExternalSystem AS systemNumber, s.id AS systemId, le.resource AS resource,
                le.linkRecord AS recordNumber
            FROM linkEnd le JOIN record s ON s.recordNumber = le.toExternalSystem
            WHERE le.toExternalSystem IS NOT NULL
            UNION ALL
            SELECT s.recordNumber, s.id, json_extract(d.body, '$.declares.resource'), d.recordNumber
            FROM record d JOIN record s ON s.id = coalesce(
                (SELECT m.toId FROM temp.mergedEntry m WHERE m.fromId = json_extract(d.body, '$.declares.externalSystem')),
                json_extract(d.body, '$.declares.externalSystem'))
            WHERE d.type = ${graphTypes.definition} AND json_extract(d.body, '$.declares.resource') IS NOT NULL
        ) GROUP BY systemNumber, resource ORDER BY min(recordNumber)`);
    for (const pair of named) {
        yield* sql`INSERT INTO resource (id, externalSystem, resource)
            VALUES (${resourceIdOf(pair.systemId, pair.resource)}, ${pair.systemNumber}, ${pair.resource})
            ON CONFLICT DO NOTHING`;
    }
});

/**
 * Give a link that lands inside a data definition the resource that definition declares, so what a flow keeps and uses
 * is read the same whether the code names a resource or names the place that declares it: for each of the stage's link
 * ends with a target position and no block, the innermost data definition holding the position; when it declares a
 * resource, the link end reaches that resource at its external system (followed through the merged entries, as
 * `issueResourceIds` does), and keeps its position. Whatever an earlier resolution set on these ends is cleared first,
 * since the Map resolves its links more than once.
 * @param sql the client, inside the stage's write
 * @param stage the stage
 * @returns nothing once resolved
 */
const resolveDeclaredResources = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, stage: string) {
    yield* sql`UPDATE linkEnd SET toExternalSystem = NULL, resource = NULL
        WHERE toFile IS NOT NULL
            AND linkRecord IN (SELECT recordNumber FROM record WHERE stage = ${stage} AND type = ${graphTypes.link})`;
    yield* sql`DROP TABLE IF EXISTS temp.linkDefinition`;
    yield* sql`CREATE TEMP TABLE linkDefinition AS
        SELECT le.linkRecord, (
                SELECT d.recordNumber FROM record d
                WHERE d.type = ${graphTypes.definition} AND d.fileNumber = le.toFile
                    AND d.firstLine <= le.toLine AND d.lastLine >= le.toLine
                ORDER BY d.lastLine - d.firstLine, d.recordNumber LIMIT 1
            ) AS definition
        FROM linkEnd le
        WHERE le.toBlock IS NULL AND le.toFile IS NOT NULL
            AND le.linkRecord IN (SELECT recordNumber FROM record WHERE stage = ${stage} AND type = ${graphTypes.link})`;
    yield* sql`UPDATE linkEnd SET toExternalSystem = declared.system, resource = declared.resource
        FROM (
            SELECT t.linkRecord, s.recordNumber AS system, json_extract(d.body, '$.declares.resource') AS resource
            FROM temp.linkDefinition t JOIN record d ON d.recordNumber = t.definition
            JOIN record s ON s.id = coalesce(
                (SELECT m.toId FROM temp.mergedEntry m WHERE m.fromId = json_extract(d.body, '$.declares.externalSystem')),
                json_extract(d.body, '$.declares.externalSystem'))
            WHERE json_extract(d.body, '$.declares') IS NOT NULL
        ) AS declared
        WHERE linkEnd.linkRecord = declared.linkRecord`;
});

/**
 * Resolve the ends of a stage's links, set by set (B33, D22): an external system by its record id, or by the entry merging
 * it (`temp.mergedEntry`, P1.38); the target is the block starting on the target line, the first line of its
 * declaration as `references/blocks-and-containers.md` defines it, when exactly one does; none starting there, or two,
 * leave it unresolved, for the stage's checks to report, unless a data definition starts there: such a link reads a
 * shape of data, and its readers find the definition by position (`linkEndRows`). A link whose target line starts no
 * block resolves to the innermost block holding the line, never to a refusal. The from-block is the innermost block holding the link's
 * lines, other than its target. The blocks starting on each target line stay in `temp.linkTarget` for the stage's
 * checks to read.
 * @param sql the client, inside the stage's write
 * @param stage the stage whose links are resolved
 * @returns nothing once resolved
 */
export const resolveLinkEnds = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, stage: string) {
    yield* sql`UPDATE linkEnd SET toExternalSystem = r.recordNumber, resource = p.resource
        FROM temp.pendingExternalEnd p
        JOIN record r ON r.id = coalesce((SELECT f.toId FROM temp.mergedEntry f WHERE f.fromId = p.externalSystem), p.externalSystem)
        WHERE linkEnd.linkRecord = p.linkRecord`;
    yield* issueResourceIds(sql);
    yield* sql`DROP TABLE IF EXISTS temp.linkTarget`;
    yield* sql`CREATE TEMP TABLE linkTarget AS
        SELECT le.linkRecord, b.recordNumber AS block, count(*) OVER (PARTITION BY le.linkRecord) AS startingThere
        FROM linkEnd le
        JOIN record l ON l.recordNumber = le.linkRecord AND l.stage = ${stage}
        JOIN record b ON b.type = ${graphTypes.block} AND b.fileNumber = le.toFile AND b.firstLine = le.toLine`;
    yield* sql`UPDATE linkEnd SET toBlock = NULL, fromBlock = NULL
        WHERE linkRecord IN (SELECT recordNumber FROM record WHERE stage = ${stage} AND type = ${graphTypes.link})`;
    yield* sql`UPDATE linkEnd SET toBlock = t.block
        FROM (SELECT linkRecord, block FROM temp.linkTarget WHERE startingThere = 1) AS t
        WHERE linkEnd.linkRecord = t.linkRecord`;
    yield* sql`UPDATE linkEnd SET toBlock = (
            SELECT s.recordNumber FROM blockSpan s
            WHERE s.fileLow <= linkEnd.toFile AND s.fileHigh >= linkEnd.toFile
                AND s.firstLine <= linkEnd.toLine AND s.lastLine >= linkEnd.toLine
            ORDER BY s.lastLine - s.firstLine, s.recordNumber
            LIMIT 1
        )
        WHERE toFile IS NOT NULL AND toBlock IS NULL
            AND linkRecord IN (SELECT recordNumber FROM record WHERE stage = ${stage} AND type = ${graphTypes.link})
            AND NOT EXISTS (SELECT 1 FROM temp.linkTarget t WHERE t.linkRecord = linkEnd.linkRecord)
            AND NOT EXISTS (SELECT 1 FROM record d WHERE d.type = ${graphTypes.definition}
                AND d.fileNumber = linkEnd.toFile AND d.firstLine = linkEnd.toLine)`;
    yield* resolveDeclaredResources(sql, stage);
    yield* sql`UPDATE linkEnd SET fromBlock = (
            SELECT s.recordNumber FROM record l, blockSpan s
            WHERE l.recordNumber = linkEnd.linkRecord
                AND s.fileLow <= l.fileNumber AND s.fileHigh >= l.fileNumber
                AND s.firstLine <= l.firstLine AND s.lastLine >= l.lastLine
                AND s.recordNumber IS NOT linkEnd.toBlock
            ORDER BY s.lastLine - s.firstLine, s.recordNumber
            LIMIT 1
        )
        WHERE linkRecord IN (SELECT recordNumber FROM record WHERE stage = ${stage} AND type = ${graphTypes.link})`;
});
