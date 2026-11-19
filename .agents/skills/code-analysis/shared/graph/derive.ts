import { Effect, Schema } from "effect";
import type { SqlClient, SqlError } from "effect/sql";
import { recordTypes } from "../model/record-types";
import { AnyRecord } from "../run/json-files";
import { decodedRows, recordsPerPage } from "../store/stored-bodies";

const Count = Schema.Number;

const RecordPage = Schema.Struct({ recordNumber: Count, type: Schema.String, body: Schema.String });

const NumberRow = Schema.Struct({ number: Count });

/**
 * The number a statement selects as `number`: zero when it returns no row.
 * @param statement the statement
 * @returns the number
 */
const numberOf = Effect.fnUntraced(function* (statement: Effect.Effect<ReadonlyArray<object>, SqlError.SqlError>) {
    const [row] = yield* decodedRows(NumberRow)(statement);
    return row === undefined ? 0 : row.number;
});

const decodeBody = Schema.decodeUnknownSync(Schema.fromJsonString(AnyRecord));

/**
 * Rebuild what the catalogue says a record cites and refers to: for every accepted record, each range its notes cite
 * (`span`) and each reference the store resolves (`ref`), a page of records at a time, each page in two statements.
 * @param sql the client, inside the stage's write
 * @returns how many spans and references the catalogue gave, to check the tables against
 */
const rebuildSpansAndRefs = Effect.fnUntraced(function* (sql: SqlClient.SqlClient) {
    const types = recordTypes();
    let after = 0;
    let spans = 0;
    for (;;) {
        const page = yield* decodedRows(RecordPage)(
            sql`SELECT recordNumber, type, body FROM record WHERE recordNumber > ${after}
                ORDER BY recordNumber LIMIT ${recordsPerPage}`,
        );
        const last = page.at(-1);
        if (last === undefined) {
            return spans;
        }
        after = last.recordNumber;
        const spanRows: object[] = [];
        const refRows: object[] = [];
        for (const row of page) {
            const registered = types[row.type];
            if (registered !== undefined) {
                const body = decodeBody(row.body);
                registered.spansOf(body).forEach((span, ordinal) => {
                    spanRows.push({
                        note: row.recordNumber,
                        role: span.role,
                        ordinal,
                        file: span.lines.file,
                        first: span.lines.firstLine,
                        last: span.lines.lastLine,
                    });
                });
                for (const ref of registered.refsOf(body).filter((each) => each.inStore)) {
                    ref.ids.forEach((to) => refRows.push({ from: row.recordNumber, role: ref.role, to }));
                }
            }
        }
        spans += spanRows.length;
        yield* sql`INSERT INTO span (note, role, ordinal, fileNumber, firstLine, lastLine)
            SELECT json_extract(j.value, '$.note'), json_extract(j.value, '$.role'), json_extract(j.value, '$.ordinal'),
                f.fileNumber, json_extract(j.value, '$.first'), json_extract(j.value, '$.last')
            FROM json_each(${JSON.stringify(spanRows)}) j JOIN file f ON f.path = json_extract(j.value, '$.file')`;
        yield* sql`INSERT OR IGNORE INTO ref (fromRecord, role, toRecord)
            SELECT json_extract(j.value, '$.from'), json_extract(j.value, '$.role'), r.recordNumber
            FROM json_each(${JSON.stringify(refRows)}) j JOIN record r ON r.id = json_extract(j.value, '$.to')`;
    }
});

/**
 * Give each rule its innermost block, the one holding its deciding lines (none: the rule sits outside every mapped
 * block). Which capabilities reach a block is not stored: it is read from the entry points' reach in the views.
 * @param sql the client, inside the stage's write
 * @returns nothing once rebuilt
 */
const rebuildRuleBlocks = Effect.fnUntraced(function* (sql: SqlClient.SqlClient) {
    yield* sql`INSERT INTO ruleBlock (rule, block)
        SELECT r.recordNumber, (SELECT s.recordNumber FROM blockSpan s
            WHERE s.fileLow = r.fileNumber AND s.firstLine <= r.firstLine AND s.lastLine >= r.lastLine
            ORDER BY s.lastLine - s.firstLine, s.recordNumber LIMIT 1)
        FROM record r WHERE r.type = 'BusinessRule'`;
});

/**
 * The followed kinds of link, and the kind followed backward, as the reach rule states them. Written here again beside
 * `fillEntryPointReach` because the depth walk below must visit the same blocks; a test compares the two.
 */
const forwardKinds = ["call", "renders", "reads", "saves"];

const backwardKind = "dispatches";

/**
 * Give each file its part: the part with the longest folder holding it. The folders are matched once per file, not per
 * block, so the cost grows with the files and the parts.
 * @param sql the client, inside the stage's write
 * @returns nothing once rebuilt
 */
const rebuildFileParts = Effect.fnUntraced(function* (sql: SqlClient.SqlClient) {
    yield* sql`INSERT INTO filePart (fileNumber, part)
        SELECT fileNumber, part FROM (
            SELECT f.fileNumber, p.recordNumber AS part,
                row_number() OVER (PARTITION BY f.fileNumber ORDER BY length(fo.value) DESC, p.id) AS place
            FROM file f JOIN record p ON p.type = 'SystemPart' JOIN json_each(p.body, '$.folders') fo
                ON fo.value = '.' OR f.path = fo.value OR substr(f.path, 1, length(fo.value) + 1) = fo.value || '/')
        WHERE place = 1`;
});

/**
 * Give each block the capabilities whose entry points reach it: the entry points' assignments joined to their reach.
 * Empty until Capabilities and entities has assigned the entry points.
 * @param sql the client, inside the stage's write
 * @returns nothing once rebuilt
 */
const rebuildBlockCapabilities = Effect.fnUntraced(function* (sql: SqlClient.SqlClient) {
    yield* sql`INSERT INTO blockCapability (block, capability)
        SELECT DISTINCT w.block, rc.toRecord
        FROM record a JOIN ref re ON re.fromRecord = a.recordNumber AND re.role = 'entryPoint'
            JOIN ref rc ON rc.fromRecord = a.recordNumber AND rc.role = 'capability'
            JOIN entryPointReach w ON w.entryPoint = re.toRecord
        WHERE a.type = 'EntryPointAssignment'`;
});

/**
 * Count the links between layers by kind: each link between two blocks, by the layer of the block it leaves and of
 * the block it reaches, each through its code kind. A link into lines that run nothing (a shape of data) reaches no
 * block and is not counted here.
 * @param sql the client, inside the stage's write
 * @returns nothing once rebuilt
 */
const rebuildLayerEdges = Effect.fnUntraced(function* (sql: SqlClient.SqlClient) {
    yield* sql`INSERT INTO layerEdge (fromLayer, toLayer, kind, links)
        SELECT lf.toRecord, lt.toRecord, le.kind, count(*)
        FROM linkEnd le
            JOIN ref kf ON kf.fromRecord = le.fromBlock AND kf.role = 'codeKind'
            JOIN ref lf ON lf.fromRecord = kf.toRecord AND lf.role = 'layer'
            JOIN ref kt ON kt.fromRecord = le.toBlock AND kt.role = 'codeKind'
            JOIN ref lt ON lt.fromRecord = kt.toRecord AND lt.role = 'layer'
        WHERE le.toBlock IS NOT NULL
        GROUP BY lf.toRecord, lt.toRecord, le.kind`;
});

/**
 * For each entry point, each layer its flow reaches, with how many links from the entry point the first block of that
 * layer is: a walk from every entry point at once, one level at a time, so the first time a block is met is its
 * shortest distance. The walk follows the reach rule's kinds, forward and, for `dispatches`, backward, and stops before
 * another entry point. The levels live in a temporary table and the answer keeps one row per entry point and layer.
 * @param sql the client, inside the stage's write
 * @returns nothing once rebuilt
 */
const rebuildEntryPointLayers = Effect.fnUntraced(function* (sql: SqlClient.SqlClient) {
    yield* sql`CREATE TEMP TABLE IF NOT EXISTS depthWalk (
        entryPoint INTEGER NOT NULL, block INTEGER NOT NULL, depth INTEGER NOT NULL,
        PRIMARY KEY (entryPoint, block)) WITHOUT ROWID`;
    yield* sql`DELETE FROM depthWalk`;
    yield* sql`CREATE INDEX IF NOT EXISTS depthWalkByDepth ON depthWalk (depth)`;
    yield* sql`INSERT INTO depthWalk (entryPoint, block, depth) SELECT recordNumber, recordNumber, 0 FROM entryPoint`;
    for (let level = 0; ; level++) {
        yield* sql`INSERT OR IGNORE INTO depthWalk (entryPoint, block, depth)
            SELECT w.entryPoint, le.toBlock, ${level + 1} FROM depthWalk w JOIN linkEnd le ON le.fromBlock = w.block
            WHERE w.depth = ${level} AND le.toBlock IS NOT NULL
                AND le.kind IN (SELECT value FROM json_each(${JSON.stringify(forwardKinds)}))
                AND NOT EXISTS (SELECT 1 FROM entryPoint e WHERE e.recordNumber = le.toBlock)
            UNION ALL
            SELECT w.entryPoint, le.fromBlock, ${level + 1} FROM depthWalk w JOIN linkEnd le ON le.toBlock = w.block
            WHERE w.depth = ${level} AND le.kind = ${backwardKind}
                AND NOT EXISTS (SELECT 1 FROM entryPoint e WHERE e.recordNumber = le.fromBlock)`;
        if ((yield* numberOf(sql`SELECT count(*) AS number FROM depthWalk WHERE depth = ${level + 1}`)) === 0) {
            break;
        }
    }
    yield* sql`INSERT INTO entryPointLayer (entryPoint, layer, depth)
        SELECT w.entryPoint, rl.toRecord, min(w.depth)
        FROM depthWalk w JOIN ref rk ON rk.fromRecord = w.block AND rk.role = 'codeKind'
            JOIN ref rl ON rl.fromRecord = rk.toRecord AND rl.role = 'layer'
        GROUP BY w.entryPoint, rl.toRecord`;
    yield* sql`DROP TABLE depthWalk`;
});

/**
 * Count, for each block, the blocks that reach it and the layers they sit in: the callers over the followed kinds of
 * link, each through its code kind, so a block called from one layer differs from one called from several.
 * @param sql the client, inside the stage's write
 * @returns nothing once rebuilt
 */
const rebuildBlockFanIn = Effect.fnUntraced(function* (sql: SqlClient.SqlClient) {
    yield* sql`INSERT INTO blockFanIn (block, callers, callerLayers)
        SELECT le.toBlock, count(DISTINCT le.fromBlock), count(DISTINCT rl.toRecord)
        FROM linkEnd le JOIN ref rk ON rk.fromRecord = le.fromBlock AND rk.role = 'codeKind'
            JOIN ref rl ON rl.fromRecord = rk.toRecord AND rl.role = 'layer'
        WHERE le.toBlock IS NOT NULL AND le.kind IN (SELECT value FROM json_each(${JSON.stringify(forwardKinds)}))
        GROUP BY le.toBlock`;
});

/**
 * Rebuild the tables derived from the graph: each file's part, each block's capabilities, the links between layers, the
 * callers of each block and the layers each entry point reaches in order. Rebuilt whole, from the references (`ref`), the links and the reach,
 * so they run after those are filled.
 * @param sql the client, inside the stage's write
 * @returns nothing once rebuilt
 * @internal exported for the test fixture, which fills the derived tables of a store it builds by hand
 */
export const deriveGraphTables = Effect.fnUntraced(function* (sql: SqlClient.SqlClient) {
    for (const table of ["filePart", "blockCapability", "layerEdge", "entryPointLayer", "blockFanIn"]) {
        yield* sql.unsafe(`DELETE FROM ${table}`);
    }
    yield* rebuildFileParts(sql);
    yield* rebuildBlockCapabilities(sql);
    yield* rebuildLayerEdges(sql);
    yield* rebuildBlockFanIn(sql);
    yield* rebuildEntryPointLayers(sql);
});

/**
 * The violations of what the derived tables must hold, each described; none when they hold.
 * @param sql the client, inside the stage's write
 * @param spansExpected how many spans the catalogue gave
 * @returns the violations
 */
const violationsOf = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, spansExpected: number) {
    const count = numberOf;
    const found: string[] = [];
    const unmatchedCitations = yield* count(sql`SELECT count(*) AS number FROM (
        SELECT fromRecord, toRecord FROM citation EXCEPT SELECT fromRecord, toRecord FROM ref)`);
    const unmatchedRefs = yield* count(sql`SELECT count(*) AS number FROM (
        SELECT fromRecord, toRecord FROM ref EXCEPT SELECT fromRecord, toRecord FROM citation)`);
    const spans = yield* count(sql`SELECT count(*) AS number FROM span`);
    const rules = yield* count(sql`SELECT count(*) AS number FROM record WHERE type = 'BusinessRule'`);
    const ruleRows = yield* count(sql`SELECT count(*) AS number FROM ruleBlock`);
    if (unmatchedCitations + unmatchedRefs > 0) {
        found.push(`${unmatchedCitations + unmatchedRefs} references differ between the catalogue and the citations`);
    }
    if (spans !== spansExpected) {
        found.push(`${spansExpected - spans} cited ranges sit in a file the store does not list`);
    }
    if (rules !== ruleRows) {
        found.push(`${rules - ruleRows} rules have no block row`);
    }
    return found;
});

/**
 * Rebuild the derived tables from the accepted records, in the stage's write: spans and references from the catalogue,
 * each rule's block. Every row can be made again from the records, so a stage's write
 * clears and builds them whole; what must hold of them is checked here, and a violation is the write's defect.
 * @param sql the client, inside the stage's write
 * @returns what is wrong with the derived tables, none when nothing is
 */
export const deriveModel = Effect.fnUntraced(function* (sql: SqlClient.SqlClient) {
    for (const table of ["span", "ref", "ruleBlock"]) {
        yield* sql.unsafe(`DELETE FROM ${table}`);
    }
    const spansExpected = yield* rebuildSpansAndRefs(sql);
    yield* rebuildRuleBlocks(sql);
    yield* deriveGraphTables(sql);
    return yield* violationsOf(sql, spansExpected);
});
