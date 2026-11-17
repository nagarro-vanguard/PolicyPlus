import { Effect } from "effect";
import type { SqlClient } from "effect/sql";
import { decodedRows, valuesOf } from "../store/stored-bodies";
import { PairRow, ReachedByRow } from "../store/rows";

const followedKinds = ["call", "renders", "reads", "saves"] as const;

const requestKind = "request";

/**
 * The link kind written in the block that can run in place of the block it points at: a flow that reaches the target
 * goes on into the block holding the link (`dispatches`, P2).
 */
const dispatchKind = "dispatches";

/**
 * Fill the reach of every entry point (D214, P1.25): `entryPointReach` holds each entry point with every block its chain runs, itself
 * included, by one set walk from all of them at once (the followed kinds, each block once, stopping before
 * another entry point). The followed kinds are a call, a render, and a read or save landing on a
 * block (a database view, a stored query), so the tables behind it stay in the flow (P12.4); and a `dispatches` link, followed from its target to the block holding it (P2). Run once in the Map's write, after its links are resolved and every refused
 * job's records removed, so it holds the final chains; the rows go with the Map's records (`ON DELETE CASCADE`).
 * @param sql the client, inside the Map's write
 * @returns nothing once filled
 */
export const fillEntryPointReach = Effect.fnUntraced(function* (sql: SqlClient.SqlClient) {
    yield* sql`DELETE FROM entryPointReach`;
    yield* sql`INSERT INTO entryPointReach (entryPoint, block)
        WITH RECURSIVE walk(entryPoint, block) AS (
            SELECT recordNumber, recordNumber FROM entryPoint
            UNION
            SELECT walk.entryPoint, le.toBlock FROM walk CROSS JOIN linkEnd le ON le.fromBlock = walk.block
            WHERE le.kind IN (${valuesOf(sql, followedKinds)}) AND le.toBlock IS NOT NULL
                AND NOT EXISTS (SELECT 1 FROM entryPoint e WHERE e.recordNumber = le.toBlock)
            UNION
            SELECT walk.entryPoint, le.fromBlock FROM walk CROSS JOIN linkEnd le ON le.toBlock = walk.block
            WHERE le.kind = ${dispatchKind}
                AND NOT EXISTS (SELECT 1 FROM entryPoint e WHERE e.recordNumber = le.fromBlock)
        )
        SELECT entryPoint, block FROM walk`;
});

/**
 * The entry points whose chains run the blocks holding each of some lines (P10: the entry points applying a rule or making a
 * transition), all in one statement: the blocks holding each line range (`blockSpan`), joined to the reach of every
 * entry point (`entryPointReachByBlock`). Each range's answer is read by its position in the list.
 * @param sql the client
 * @param wanted the line ranges, each with its file, first and last line
 * @returns each range's position and each entry point running a block that holds it, in the order they were accepted
 */
export const reachingEach = (
    sql: SqlClient.SqlClient,
    wanted: ReadonlyArray<{ readonly file: string; readonly firstLine: number; readonly lastLine: number }>,
) =>
    decodedRows(ReachedByRow)(
        sql`WITH want(position, file, firstLine, lastLine) AS (
                SELECT json_each.key, json_extract(json_each.value, '$.file'), json_extract(json_each.value, '$.firstLine'),
                    json_extract(json_each.value, '$.lastLine')
                FROM json_each(${JSON.stringify(wanted)})
            )
            SELECT want.position AS wanted, r.id
            FROM want JOIN file f ON f.path = want.file
                JOIN blockSpan s ON s.fileLow <= f.fileNumber AND s.fileHigh >= f.fileNumber
                    AND s.firstLine <= want.firstLine AND s.lastLine >= want.lastLine
                CROSS JOIN entryPointReach w ON w.block = s.recordNumber
                JOIN record r ON r.recordNumber = w.entryPoint JOIN stageWrite sw ON sw.stage = r.stage
            GROUP BY want.position, w.entryPoint
            ORDER BY want.position, sw.rank, r.recordNumber`,
    );

/**
 * Which entry points request which (P10, the requests between entry points): each pair of entry points where a `request` link leaves a block of the first's
 * chain and reaches the second. One statement: from every request link reaching an entry point, a walk up over the followed
 * kinds to the entry points whose chains hold its lines, stopping at an entry point, as a chain stops before one (`reachedFrom`);
 * the walk drives the joins (`CROSS JOIN`), each record found by its key.
 * @param sql the client
 * @returns each pair once, the requesting entry point first, in the order the entry points were written
 */
export const requestsBetweenEntryPoints = (sql: SqlClient.SqlClient) =>
    decodedRows(PairRow)(sql`SELECT a.id AS one, b.id AS other
        FROM (${requestPairs(sql)}) p
        CROSS JOIN record a ON a.recordNumber = p.one CROSS JOIN record b ON b.recordNumber = p.other
        ORDER BY p.one, p.other`);

/**
 * The pairs of entry points where one's chain requests the other, as a statement of store numbers (`one` requests
 * `other`), each pair once: from every request link reaching an entry point, one walk up over the followed kinds to the ways
 * in whose chains hold its lines, stopping at an entry point, as a chain stops before one (`reachedFrom`).
 * @param sql the client
 * @returns the statement
 */
const requestPairs = (sql: SqlClient.SqlClient) =>
    sql`WITH RECURSIVE up(target, recordNumber) AS (
            SELECT le.toBlock, le.fromBlock FROM linkEnd le JOIN entryPoint t ON t.recordNumber = le.toBlock
            WHERE le.kind = ${requestKind} AND le.fromBlock IS NOT NULL
            UNION
            SELECT up.target, le.fromBlock FROM up JOIN linkEnd le ON le.toBlock = up.recordNumber
            WHERE le.kind IN (${valuesOf(sql, followedKinds)}) AND le.fromBlock IS NOT NULL
                AND NOT EXISTS (SELECT 1 FROM entryPoint e WHERE e.recordNumber = up.recordNumber)
            UNION
            SELECT up.target, le.toBlock FROM up JOIN linkEnd le ON le.fromBlock = up.recordNumber
            WHERE le.kind = ${dispatchKind} AND le.toBlock IS NOT NULL
                AND NOT EXISTS (SELECT 1 FROM entryPoint e WHERE e.recordNumber = up.recordNumber)
        )
        SELECT up.recordNumber AS one, up.target AS other FROM up
        WHERE EXISTS (SELECT 1 FROM entryPoint e WHERE e.recordNumber = up.recordNumber)
        GROUP BY up.recordNumber, up.target`;
