import { Effect } from "effect";
import type { SqlClient } from "effect/sql";
import type { RecordStore, StoreOpenFailure } from "../store/database";
import { decodedRows, storeNumbersOf } from "../store/stored-bodies";
import { IdRow, ResourceUseRow } from "../store/rows";

export type EntryPointGroup = { readonly key: string; readonly entryPoints: readonly string[] };

type ResourceUse = typeof ResourceUseRow.Type;

export interface GroupReachOps {
    readonly externalSystemsOfGroup: (key: string) => Effect.Effect<readonly string[], StoreOpenFailure>;
    readonly countResourceUses: Effect.Effect<readonly ResourceUse[], StoreOpenFailure>;
}

/**
 * The temporary tables of one run's groups: each group's key by its place in the order given, and its entry points. What a
 * group runs is read through the reach of every entry point (`entryPointReach`, D214), never walked here.
 * @param sql the client
 * @param groups the groups, in order
 * @returns nothing once every group's entry points are in place
 */
const fillGroups = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, groups: readonly EntryPointGroup[]) {
    yield* sql`CREATE TEMP TABLE groupKey (ordinal INTEGER PRIMARY KEY, key TEXT NOT NULL UNIQUE)`;
    yield* sql`CREATE TEMP TABLE groupEntryPoint (
        ordinal INTEGER NOT NULL,
        entryPoint INTEGER NOT NULL,
        PRIMARY KEY (ordinal, entryPoint)
    ) WITHOUT ROWID`;
    for (const [ordinal, group] of groups.entries()) {
        yield* sql`INSERT INTO groupKey (ordinal, key) VALUES (${ordinal}, ${group.key})`;
        yield* sql`INSERT OR IGNORE INTO groupEntryPoint (ordinal, entryPoint)
            SELECT ${ordinal}, recordNumber FROM (${storeNumbersOf(sql, group.entryPoints)})`;
    }
});

/**
 * Remove one run's group tables.
 * @param sql the client
 * @returns nothing once removed
 */
const dropGroups = (sql: SqlClient.SqlClient) =>
    Effect.all([sql`DROP TABLE IF EXISTS temp.groupEntryPoint`, sql`DROP TABLE IF EXISTS temp.groupKey`]);

/**
 * Each group's blocks, each once, as a statement: its entry points's rows of `entryPointReach`.
 * @param sql the client
 * @returns the statement selecting each group's ordinal and block
 */
const groupBlocks = (sql: SqlClient.SqlClient) =>
    sql`SELECT DISTINCT g.ordinal, w.block FROM groupEntryPoint g CROSS JOIN entryPointReach w ON w.entryPoint = g.entryPoint`;

/**
 * Hold one run's groups of entryPoints while `use` asks about them: a group is a capability, so a page asks what one
 * capability runs and keeps. Each answer is a join on the reach of every way
 * in (`entryPointReach`), so nothing is walked per group or per page. Forgotten when `use` ends.
 * @param store the record store
 * @param groups the groups, in the order their answers come in
 * @param use what to ask
 * @returns what `use` returns
 */
export const holdGroups = <A, E, R>(
    store: RecordStore["Service"],
    groups: readonly EntryPointGroup[],
    use: (reach: GroupReachOps) => Effect.Effect<A, E, R>,
) =>
    Effect.acquireUseRelease(
        store.query((sql) => Effect.andThen(dropGroups(sql), fillGroups(sql, groups))),
        () => use(groupReads(store)),
        () => Effect.orDie(store.query(dropGroups)),
    );

/**
 * What each held group runs: the external systems its links use, and each group's uses of each resource, by link kind, counted, each block's links once per group: the entity index reads
 * what a group's data is through them.
 * @param store the record store
 * @returns the reads
 */
const groupReads = (store: RecordStore["Service"]): GroupReachOps => ({
    externalSystemsOfGroup: Effect.fn("GroupReach.externalSystemsOfGroup")(function* (key: string) {
        return yield* store.query((sql) =>
            Effect.map(
                decodedRows(IdRow)(sql`SELECT i.id FROM (
                        SELECT le.toExternalSystem AS externalSystem, row_number() OVER (ORDER BY s.rank, l.recordNumber) AS seq
                        FROM (
                            SELECT DISTINCT w.block FROM groupKey k
                            JOIN groupEntryPoint g ON g.ordinal = k.ordinal
                            CROSS JOIN entryPointReach w ON w.entryPoint = g.entryPoint
                            WHERE k.key = ${key}
                        ) gb
                        JOIN linkEnd le ON le.fromBlock = gb.block JOIN record l ON l.recordNumber = le.linkRecord
                        JOIN stageWrite s ON s.stage = l.stage
                        WHERE le.toExternalSystem IS NOT NULL
                    ) u JOIN record i ON i.recordNumber = u.externalSystem
                    GROUP BY u.externalSystem
                    ORDER BY min(u.seq)`),
                (rows) => rows.map((row) => row.id),
            ),
        );
    }),
    countResourceUses: store
        .query((sql) =>
            decodedRows(
                ResourceUseRow,
            )(sql`SELECT k.key, i.id AS externalSystem, le.resource, le.kind, count(*) AS count
                FROM (${groupBlocks(sql)}) gb JOIN groupKey k ON k.ordinal = gb.ordinal
                JOIN linkEnd le ON le.fromBlock = gb.block AND le.toExternalSystem IS NOT NULL
                JOIN record i ON i.recordNumber = le.toExternalSystem
                GROUP BY gb.ordinal, le.toExternalSystem, le.resource, le.kind
                ORDER BY gb.ordinal, min(le.linkRecord)`),
        )
        .pipe(Effect.withSpan("GroupReach.countResourceUses")),
});
