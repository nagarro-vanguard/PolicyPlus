import { Effect } from "effect";
import type { SqlClient, SqlError } from "effect/sql";
import type { RecordStore } from "../store/database";
import { CountRow } from "../store/rows";
import { countOf, decodedRows } from "../store/stored-bodies";

type Outcome = {
    readonly name: string;
    readonly status: "pass" | "fail" | "gap";
    readonly detail: string;
};

export type Baseline = {
    readonly unresolvedLinkRate?: number | undefined;
    readonly unattributedBlockRate?: number | undefined;
    readonly linksOutsideBlocksRate?: number | undefined;
};

/**
 * The reach rule, restated here on purpose: the checks must not import the code that fills `entryPointReach`, so a
 * change to either side is caught. From an entry point, follow these kinds of link that land on a block, each block
 * once, stopping before another entry point.
 */
const followedKinds = ["call", "renders", "reads", "saves"];

/**
 * The link kind followed from its target to its source: the block holding the link's lines can run in place of the
 * block it points at.
 */
const reversedKind = "dispatches";

/**
 * Run one statement that selects a single `count` and return the number.
 * @param store the record store
 * @param statement the statement, given the client
 * @returns the number
 */
const counted = (
    store: RecordStore["Service"],
    statement: (sql: SqlClient.SqlClient) => Effect.Effect<ReadonlyArray<object>, SqlError.SqlError>,
) => Effect.orDie(store.query((sql) => decodedRows(CountRow)(statement(sql)))).pipe(Effect.map(countOf));

/**
 * An invariant: it passes when nothing breaks it.
 * @param name the invariant, numbered as the plan numbers it
 * @param offenders how many things break it
 * @param detail what the offenders are
 * @returns the outcome
 */
const invariant = (name: string, offenders: number, detail: string): Outcome => ({
    name,
    status: offenders === 0 ? "pass" : "fail",
    detail: offenders === 0 ? "" : `${offenders} ${detail}`,
});

/**
 * A known gap: a rate that may not get worse than its baseline.
 * @param name the gap
 * @param counts how many are affected, among how many
 * @param counts.part the number affected
 * @param counts.whole the number it is counted among
 * @param limit the baseline rate; none when no baseline is given
 * @param detail what is counted
 * @returns the outcome
 */
const knownGap = (
    name: string,
    counts: { readonly part: number; readonly whole: number },
    limit: number | undefined,
    detail: string,
): Outcome => {
    const rate = counts.whole === 0 ? 0 : counts.part / counts.whole;
    const worse = limit !== undefined && rate > limit + 1e-9;
    const percent = `${(rate * 100).toFixed(1)}%`;
    const against = limit === undefined || !worse ? "" : `, worse than the baseline ${(limit * 100).toFixed(1)}%`;
    return {
        name,
        status: worse ? "fail" : "gap",
        detail: `${counts.part} of ${counts.whole} ${detail} (${percent})${against}`,
    };
};

type Statement = (sql: SqlClient.SqlClient) => Effect.Effect<ReadonlyArray<object>, SqlError.SqlError>;

/**
 * The checks of blocks: they lie in their files, have a layer, and nest.
 * @param store the record store, read only
 * @returns the outcomes
 */
const blockChecks = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const one = (statement: Statement) => counted(store, statement);
    const outsideFile = yield* one(
        (sql) => sql`SELECT count(*) AS count FROM record b JOIN file f ON f.fileNumber = b.fileNumber
            WHERE b.type = 'Block' AND (b.firstLine < 1 OR b.lastLine < b.firstLine OR b.lastLine > f.lines)`,
    );
    const noLayer = yield* one(
        (sql) => sql`SELECT count(*) AS count FROM record b
            LEFT JOIN record k ON k.id = json_extract(b.body, '$.codeKind')
            LEFT JOIN record l ON l.id = json_extract(k.body, '$.layer')
            WHERE b.type = 'Block' AND l.id IS NULL`,
    );
    const clashing = yield* one(
        (sql) => sql`SELECT count(*) AS count FROM record a JOIN record b
            ON a.type = 'Block' AND b.type = 'Block' AND a.fileNumber = b.fileNumber AND a.recordNumber < b.recordNumber
            AND a.firstLine <= b.lastLine AND b.firstLine <= a.lastLine
            WHERE NOT ((a.firstLine <= b.firstLine AND a.lastLine >= b.lastLine
                    AND (a.firstLine < b.firstLine OR a.lastLine > b.lastLine))
                OR (b.firstLine <= a.firstLine AND b.lastLine >= a.lastLine
                    AND (b.firstLine < a.firstLine OR b.lastLine > a.lastLine)))`,
    );
    return [
        invariant(
            "1 blocks in range with a layer",
            outsideFile + noLayer,
            "blocks outside their file, or whose code kind has no layer",
        ),
        invariant("2 blocks nest", clashing, "pairs of blocks that overlap partly or sit on the same lines"),
    ];
});

/**
 * The checks of links, entry points and rules: every link has a source and a target or a reason; every entry point has
 * one capability; every rule has a block. And the known gap of links that reach nothing.
 * @param store the record store, read only
 * @param baseline the rates the known gaps may not exceed
 * @returns the outcomes
 */
const linkChecks = Effect.fnUntraced(function* (store: RecordStore["Service"], baseline: Baseline) {
    const one = (statement: Statement) => counted(store, statement);
    const outsideBlocks = yield* one((sql) => sql`SELECT count(*) AS count FROM linkEnd WHERE fromBlock IS NULL`);
    const noTarget = yield* one(
        (sql) => sql`SELECT count(*) AS count FROM linkEnd le JOIN record r ON r.recordNumber = le.linkRecord
            WHERE le.toBlock IS NULL AND le.toExternalSystem IS NULL AND le.toFile IS NULL
                AND json_extract(r.body, '$.unresolvedTarget') IS NULL`,
    );
    const unresolved = yield* one(
        (sql) => sql`SELECT count(*) AS count FROM linkEnd
            WHERE toBlock IS NULL AND toExternalSystem IS NULL AND toFile IS NULL`,
    );
    const links = yield* one((sql) => sql`SELECT count(*) AS count FROM linkEnd`);
    const entryPointsWithoutOne = yield* one(
        (sql) => sql`SELECT count(*) AS count FROM (
            SELECT (SELECT count(*) FROM record a WHERE a.type = 'EntryPointAssignment'
                    AND json_extract(a.body, '$.entryPoint') = r.id) AS n
            FROM entryPoint e JOIN record r ON r.recordNumber = e.recordNumber) WHERE n <> 1`,
    );
    const rulesWithoutBlock = yield* one(
        (sql) => sql`SELECT count(*) AS count FROM record r LEFT JOIN ruleBlock rb ON rb.rule = r.recordNumber
            WHERE r.type = 'BusinessRule' AND rb.block IS NULL`,
    );
    return [
        invariant("3 links have a target or a reason", noTarget, "links with no target and no recorded reason"),
        knownGap(
            "3 links outside blocks",
            { part: outsideBlocks, whole: links },
            baseline.linksOutsideBlocksRate,
            "links are written on lines no block holds (registrations that wire code to what starts it)",
        ),
        knownGap(
            "3 unresolved links",
            { part: unresolved, whole: links },
            baseline.unresolvedLinkRate,
            "links reach nothing the code shows",
        ),
        invariant(
            "4 entry points have one capability",
            entryPointsWithoutOne,
            "entry points without exactly one capability",
        ),
        invariant("5 rules have a block", rulesWithoutBlock, "rules with no block"),
    ];
});

/**
 * The checks of the registries: every layer is used, none is held twice, and no code kind is.
 * @param store the record store, read only
 * @returns the outcomes
 */
const registryChecks = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const one = (statement: Statement) => counted(store, statement);
    const unusedLayers = yield* one(
        (sql) => sql`SELECT count(*) AS count FROM record l WHERE l.type = 'Layer' AND NOT EXISTS (
            SELECT 1 FROM record k JOIN record b
                ON b.type IN ('Block', 'DataDefinition') AND json_extract(b.body, '$.codeKind') = k.id
            WHERE k.type = 'CodeKind' AND json_extract(k.body, '$.layer') = l.id)`,
    );
    const heldTwiceLayers = yield* one(
        (sql) => sql`SELECT count(*) AS count FROM (SELECT lower(json_extract(body, '$.name')) AS n
            FROM record WHERE type = 'Layer' GROUP BY n HAVING count(*) > 1)`,
    );
    const heldTwiceKinds = yield* one(
        (sql) => sql`SELECT count(*) AS count FROM (SELECT lower(json_extract(body, '$.name')) AS n,
                json_extract(body, '$.kind') AS k FROM record WHERE type = 'CodeKind'
            GROUP BY n, k HAVING count(*) > 1)`,
    );
    return [
        invariant("6 layers are used", unusedLayers, "layers no block or data definition sits in"),
        invariant(
            "7 no duplicate layers or code kinds",
            heldTwiceLayers + heldTwiceKinds,
            "layer names or code kind names are held more than once",
        ),
    ];
});

/**
 * The reach recomputed by the rule, as a statement fragment: from each entry point, the blocks its chain runs.
 * @param sql the client
 * @returns the fragment naming `walk(entryPoint, block)`
 */
const recomputedReach = (sql: SqlClient.SqlClient) => sql`WITH RECURSIVE walk(entryPoint, block) AS (
        SELECT recordNumber, recordNumber FROM entryPoint
        UNION
        SELECT walk.entryPoint, le.toBlock FROM walk JOIN linkEnd le ON le.fromBlock = walk.block
        WHERE le.kind IN (SELECT value FROM json_each(${JSON.stringify(followedKinds)}))
            AND le.toBlock IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM entryPoint e WHERE e.recordNumber = le.toBlock)
        UNION
        SELECT walk.entryPoint, le.fromBlock FROM walk JOIN linkEnd le ON le.toBlock = walk.block
        WHERE le.kind = ${reversedKind}
            AND NOT EXISTS (SELECT 1 FROM entryPoint e WHERE e.recordNumber = le.fromBlock)
    )`;

/**
 * The checks of reach: the stored reach equals the recomputed one, and the known gap of blocks no entry point reaches.
 * @param store the record store, read only
 * @param baseline the rates the known gaps may not exceed
 * @returns the outcomes
 */
const reachChecks = Effect.fnUntraced(function* (store: RecordStore["Service"], baseline: Baseline) {
    const one = (statement: Statement) => counted(store, statement);
    const missingFromStored = yield* one(
        (sql) => sql`${recomputedReach(sql)} SELECT count(*) AS count FROM (
            SELECT entryPoint, block FROM walk EXCEPT SELECT entryPoint, block FROM entryPointReach)`,
    );
    const extraInStored = yield* one(
        (sql) => sql`${recomputedReach(sql)} SELECT count(*) AS count FROM (
            SELECT entryPoint, block FROM entryPointReach EXCEPT SELECT entryPoint, block FROM walk)`,
    );
    const unreached = yield* one(
        (sql) => sql`SELECT count(*) AS count FROM record b WHERE b.type = 'Block' AND NOT EXISTS (
            SELECT 1 FROM entryPointReach w WHERE w.block = b.recordNumber)`,
    );
    const blocks = yield* one((sql) => sql`SELECT count(*) AS count FROM record WHERE type = 'Block'`);
    return [
        invariant(
            "8 stored reach equals recomputed reach",
            missingFromStored + extraInStored,
            "reach rows differ from the recomputed reach",
        ),
        knownGap(
            "9 unattributed blocks",
            { part: unreached, whole: blocks },
            baseline.unattributedBlockRate,
            "blocks are reached by no entry point",
        ),
    ];
});

/**
 * The check of the derived tables: the capabilities of each block, and the layers of each entry point's flow, equal what
 * the references and the stored reach say.
 * @param store the record store, read only
 * @returns the outcomes
 */
const derivedChecks = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const one = (statement: Statement) => counted(store, statement);
    const capabilityRows = (sql: SqlClient.SqlClient) => sql`SELECT DISTINCT w.block AS block, rc.toRecord AS capability
        FROM record a JOIN ref re ON re.fromRecord = a.recordNumber AND re.role = 'entryPoint'
            JOIN ref rc ON rc.fromRecord = a.recordNumber AND rc.role = 'capability'
            JOIN entryPointReach w ON w.entryPoint = re.toRecord
        WHERE a.type = 'EntryPointAssignment'`;
    const layerRows = (sql: SqlClient.SqlClient) => sql`SELECT DISTINCT w.entryPoint AS entryPoint, rl.toRecord AS layer
        FROM entryPointReach w JOIN ref rk ON rk.fromRecord = w.block AND rk.role = 'codeKind'
            JOIN ref rl ON rl.fromRecord = rk.toRecord AND rl.role = 'layer'`;
    const capabilityDiffers = yield* one(
        (sql) => sql`SELECT count(*) AS count FROM (
            SELECT * FROM (SELECT block, capability FROM (${capabilityRows(sql)})
                EXCEPT SELECT block, capability FROM blockCapability)
            UNION ALL
            SELECT * FROM (SELECT block, capability FROM blockCapability
                EXCEPT SELECT block, capability FROM (${capabilityRows(sql)})))`,
    );
    const layerDiffers = yield* one(
        (sql) => sql`SELECT count(*) AS count FROM (
            SELECT * FROM (SELECT entryPoint, layer FROM (${layerRows(sql)})
                EXCEPT SELECT entryPoint, layer FROM entryPointLayer)
            UNION ALL
            SELECT * FROM (SELECT entryPoint, layer FROM entryPointLayer
                EXCEPT SELECT entryPoint, layer FROM (${layerRows(sql)})))`,
    );
    return [
        invariant(
            "10 derived tables agree with the graph",
            capabilityDiffers + layerDiffers,
            "rows of the block-capability or entry-point-layer tables differ from the graph",
        ),
    ];
});

/**
 * The invariants of the code graph in a finished analysis, each stated independently of the code that writes the
 * tables: blocks lie in their files and have a layer; blocks nest; links have a source and a target or a reason;
 * every entry point has one capability; every rule has a block; every layer is used; no layer or code kind is held
 * twice; and the stored reach equals the reach recomputed by the rule. Two known gaps are counted against a
 * baseline: links that reach nothing, and blocks no entry point reaches.
 * @param store the record store, read only
 * @param baseline the rates the known gaps may not exceed
 * @returns one outcome per check, in the plan's numbering
 */
export const graphInvariants = Effect.fnUntraced(function* (store: RecordStore["Service"], baseline: Baseline) {
    const outcomes: Outcome[] = [
        ...(yield* blockChecks(store)),
        ...(yield* linkChecks(store, baseline)),
        ...(yield* registryChecks(store)),
        ...(yield* reachChecks(store, baseline)),
        ...(yield* derivedChecks(store)),
    ];
    return outcomes;
});
