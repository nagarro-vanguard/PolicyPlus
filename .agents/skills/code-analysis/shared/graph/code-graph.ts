import { Context, Effect, Layer, Option, Stream } from "effect";
import { Block } from "../model/schemas/map";
import type { RecordInvalid } from "../run/script-errors";
import { RecordStore, type StoreOpenFailure } from "../store/database";
import {
    piecesHoldingOf,
    clashingBlocksOf,
    unresolvedTargetsOf,
    type Placed,
    type UnresolvedTarget,
} from "./graph-checks";
import type { Lines } from "../model/shared-fields";
import { graphTypes } from "./graph-writes";
import { reachingEach, requestsBetweenEntryPoints } from "./graph-walks";
import { holdGroups, type EntryPointGroup, type GroupReachOps } from "./group-reach";
import { countsBetweenFiles, countsThroughCodeKinds } from "../read/layer-counts";
import { linkEndReads, type LinkEndReadsOps } from "./link-end-reads";
import { countOf, decodedBodies, decodedRows, recordsPerPage, storeNumbersOf } from "../store/stored-bodies";
import {
    CountRow,
    FileCountRow,
    IdRow,
    NoWayInRow,
    type EntryFileCountRow,
    type FilePairCountRow,
    type LayerFileCountRow,
    type LayerUseRow,
    RankedBodyRow,
    type ReachedByRow,
    DataAtRow,
} from "../store/rows";

export type { UnresolvedTarget };

type GraphReadFailure = StoreOpenFailure | RecordInvalid;

export interface CodeGraphOps extends LinkEndReadsOps {
    readonly findClashingBlocks: (
        stage: string,
    ) => Effect.Effect<ReadonlyArray<readonly [Placed, Placed]>, StoreOpenFailure>;
    readonly findUnresolvedTargets: (stage: string) => Effect.Effect<readonly UnresolvedTarget[], StoreOpenFailure>;
    readonly countPiecesHolding: (stage: string, lines: Lines) => Effect.Effect<number, StoreOpenFailure>;
    readonly countBlocksNothingReaches: Effect.Effect<number, StoreOpenFailure>;
    readonly countBlocks: Effect.Effect<number, StoreOpenFailure>;
    readonly findBlocksWithNoWayIn: Effect.Effect<ReadonlyArray<typeof NoWayInRow.Type>, StoreOpenFailure>;
    readonly blocksNothingReachesByFile: Effect.Effect<
        ReadonlyArray<{ readonly file: string; readonly count: number }>,
        StoreOpenFailure
    >;
    readonly entryPointBlocks: Stream.Stream<typeof Block.Type, GraphReadFailure>;
    readonly findRequestsBetweenEntryPoints: Effect.Effect<
        ReadonlyArray<{ readonly one: string; readonly other: string }>,
        StoreOpenFailure
    >;
    readonly countResourceUsesByLayer: Effect.Effect<ReadonlyArray<typeof LayerUseRow.Type>, StoreOpenFailure>;
    readonly countInLayersByFile: Effect.Effect<ReadonlyArray<typeof LayerFileCountRow.Type>, StoreOpenFailure>;
    readonly countCodeKindsByFile: Effect.Effect<ReadonlyArray<typeof EntryFileCountRow.Type>, StoreOpenFailure>;
    readonly countExternalSystemUsesByFile: Effect.Effect<
        ReadonlyArray<typeof EntryFileCountRow.Type>,
        StoreOpenFailure
    >;
    readonly countLinksBetweenFiles: Effect.Effect<ReadonlyArray<typeof FilePairCountRow.Type>, StoreOpenFailure>;
    readonly findEntryPointsUsing: (externalSystemId: string) => Effect.Effect<readonly string[], StoreOpenFailure>;
    readonly findBlocksReachedBy: (
        entryPointIds: readonly string[],
    ) => Effect.Effect<readonly string[], StoreOpenFailure>;
    readonly findDataAtEach: (
        wanted: readonly Lines[],
    ) => Effect.Effect<ReadonlyArray<typeof DataAtRow.Type>, StoreOpenFailure>;
    readonly findEntryPointsReachingEach: (
        wanted: readonly Lines[],
    ) => Effect.Effect<ReadonlyArray<typeof ReachedByRow.Type>, StoreOpenFailure>;
    readonly holdGroups: <A, E, R>(
        groups: readonly EntryPointGroup[],
        use: (reach: GroupReachOps) => Effect.Effect<A, E, R>,
    ) => Effect.Effect<A, E | StoreOpenFailure, R>;
}

/**
 * The next place to read from after a page, or none once a page comes back empty.
 * @param rows the page
 * @param keyOf where a row sits in the read order
 * @returns the page, and where the next one starts
 */
const nextAfter = <A, K>(rows: readonly A[], keyOf: (row: A) => K) => {
    const last = rows.at(-1);
    return last === undefined ? Option.none<K>() : Option.some(keyOf(last));
};

/**
 * One page of entryPoint blocks, in stage order then the order they were written (`entryPoint`).
 * @param store the record store
 * @returns the read of the page after a stage rank and store number, decoded, with where the next starts
 */
const entryPointsAfterIn = (store: RecordStore["Service"]) => (after: readonly [number, number]) =>
    store
        .query((sql) =>
            decodedRows(RankedBodyRow)(sql`SELECT s.rank, r.recordNumber, r.id, r.body
                FROM entryPoint e JOIN record r ON r.recordNumber = e.recordNumber JOIN stageWrite s ON s.stage = r.stage
                WHERE (s.rank, r.recordNumber) > (${after[0]}, ${after[1]})
                ORDER BY s.rank, r.recordNumber
                LIMIT ${recordsPerPage}`),
        )
        .pipe(
            Effect.flatMap((rows) =>
                Effect.map(
                    decodedBodies(store.path, rows, Block),
                    (blocks) => [blocks, nextAfter(rows, (row) => [row.rank, row.recordNumber] as const)] as const,
                ),
            ),
        );

/**
 * The questions about reach: what no entry point reaches, and what one entry point reaches.
 * @param store the record store
 * @returns the reads
 */
const reachReads = (
    store: RecordStore["Service"],
): Pick<
    CodeGraphOps,
    "countBlocksNothingReaches" | "blocksNothingReachesByFile" | "countBlocks" | "findBlocksWithNoWayIn"
> => ({
    countBlocks: store
        .query((sql) =>
            Effect.map(
                decodedRows(CountRow)(sql`SELECT count(*) AS count FROM record b WHERE b.type = ${graphTypes.block}`),
                countOf,
            ),
        )
        .pipe(Effect.withSpan("CodeGraph.countBlocks")),
    findBlocksWithNoWayIn: store
        .query((sql) =>
            decodedRows(
                NoWayInRow,
            )(sql`SELECT b.id AS id, f.path AS file, b.firstLine AS firstLine, b.lastLine AS lastLine, b.body ->> 'writtenAs' AS writtenAs
            FROM record b JOIN file f ON f.fileNumber = b.fileNumber
            WHERE b.type = ${graphTypes.block}
                AND NOT EXISTS (SELECT 1 FROM entryPoint e WHERE e.recordNumber = b.recordNumber)
                AND NOT EXISTS (SELECT 1 FROM linkEnd le WHERE le.toBlock = b.recordNumber)
            ORDER BY f.path, b.firstLine`),
        )
        .pipe(Effect.withSpan("CodeGraph.findBlocksWithNoWayIn")),
    countBlocksNothingReaches: store
        .query((sql) =>
            Effect.map(
                decodedRows(CountRow)(sql`SELECT count(*) AS count FROM record b
                WHERE b.type = ${graphTypes.block}
                    AND NOT EXISTS (SELECT 1 FROM entryPointReach w WHERE w.block = b.recordNumber)`),
                countOf,
            ),
        )
        .pipe(Effect.withSpan("CodeGraph.countBlocksNothingReaches")),
    blocksNothingReachesByFile: store
        .query((sql) =>
            decodedRows(FileCountRow)(sql`SELECT f.path AS file, count(*) AS count
            FROM record b JOIN file f ON f.fileNumber = b.fileNumber
            WHERE b.type = ${graphTypes.block}
                AND NOT EXISTS (SELECT 1 FROM entryPointReach w WHERE w.block = b.recordNumber)
            GROUP BY b.fileNumber
            ORDER BY f.path`),
        )
        .pipe(Effect.withSpan("CodeGraph.blocksNothingReachesByFile")),
});

/**
 * The lookups around a block: which entry points reach a use of an external system, and which reach the blocks holding some
 * lines (P10: the entry points applying a rule, or making a transition); and the names the Map's blocks holding some lines
 * are written with, each block's own and the unit it sits in, which a later stage's named piece must be one of.
 * @param store the record store
 * @returns the lookups
 */
const blockLookups = (
    store: RecordStore["Service"],
): Pick<CodeGraphOps, "findEntryPointsUsing" | "findEntryPointsReachingEach" | "findBlocksReachedBy"> => ({
    findBlocksReachedBy: Effect.fn("CodeGraph.findBlocksReachedBy")(function* (entryPointIds: readonly string[]) {
        return yield* store.query((sql) =>
            Effect.map(
                decodedRows(IdRow)(sql`SELECT b.id
                    FROM (${storeNumbersOf(sql, entryPointIds)}) wanted
                    CROSS JOIN entryPointReach w ON w.entryPoint = wanted.recordNumber
                    CROSS JOIN record b ON b.recordNumber = w.block
                    GROUP BY w.block
                    ORDER BY b.fileNumber, b.firstLine, b.recordNumber`),
                (rows) => rows.map((row) => row.id),
            ),
        );
    }),
    findEntryPointsReachingEach: Effect.fn("CodeGraph.findEntryPointsReachingEach")(function* (
        wanted: readonly Lines[],
    ) {
        return yield* store.query((sql) => reachingEach(sql, wanted));
    }),
    findEntryPointsUsing: Effect.fn("CodeGraph.findEntryPointsUsing")(function* (externalSystemId: string) {
        return yield* store.query((sql) =>
            Effect.map(
                decodedRows(IdRow)(sql`SELECT r.id
                    FROM linkEnd le CROSS JOIN entryPointReach w ON w.block = le.fromBlock
                    JOIN record r ON r.recordNumber = w.entryPoint JOIN stageWrite s ON s.stage = r.stage
                    WHERE le.toExternalSystem IN (${storeNumbersOf(sql, [externalSystemId])})
                    GROUP BY w.entryPoint
                    ORDER BY s.rank, r.recordNumber`),
                (rows) => rows.map((row) => row.id),
            ),
        );
    }),
});

/**
 * What the innermost block holding each of some lines does with data (D228): its links' ends at external systems, each
 * kind of use once, one statement for every range.
 * @param store the record store
 * @returns the read
 */
const placeReads = (store: RecordStore["Service"]): Pick<CodeGraphOps, "findDataAtEach"> => ({
    findDataAtEach: Effect.fn("CodeGraph.findDataAtEach")(function* (wanted: readonly Lines[]) {
        return yield* store.query((sql) =>
            decodedRows(DataAtRow)(sql`WITH want(position, file, firstLine, lastLine) AS (
                    SELECT json_each.key, json_extract(json_each.value, '$.file'), json_extract(json_each.value, '$.firstLine'),
                        json_extract(json_each.value, '$.lastLine')
                    FROM json_each(${JSON.stringify(wanted)})
                ),
                held AS (
                    SELECT want.position, s.recordNumber AS block,
                        row_number() OVER (PARTITION BY want.position ORDER BY s.lastLine - s.firstLine, s.recordNumber) AS rank
                    FROM want JOIN file f ON f.path = want.file
                        JOIN blockSpan s ON s.fileLow <= f.fileNumber AND s.fileHigh >= f.fileNumber
                            AND s.firstLine <= want.firstLine AND s.lastLine >= want.lastLine
                )
                SELECT held.position AS wanted, b.id AS block, le.kind, i.id AS externalSystem, le.resource
                FROM held CROSS JOIN record b ON b.recordNumber = held.block
                    LEFT JOIN linkEnd le ON le.fromBlock = held.block AND le.toExternalSystem IS NOT NULL
                    LEFT JOIN record i ON i.recordNumber = le.toExternalSystem
                WHERE held.rank = 1
                GROUP BY held.position, le.toExternalSystem, le.resource, le.kind
                ORDER BY held.position, min(le.linkRecord)`),
        );
    }),
});

export class CodeGraph extends Context.Service<CodeGraph, CodeGraphOps>()("code-analysis/core/CodeGraph") {
    static readonly layer: Layer.Layer<CodeGraph, never, RecordStore> = Layer.effect(
        CodeGraph,
        Effect.gen(function* () {
            const store = yield* RecordStore;
            return CodeGraph.of({
                findClashingBlocks: Effect.fn("CodeGraph.findClashingBlocks")(function* (stage: string) {
                    return yield* store.query((sql) => clashingBlocksOf(sql, stage));
                }),
                findUnresolvedTargets: Effect.fn("CodeGraph.findUnresolvedTargets")(function* (stage: string) {
                    return yield* store.query((sql) => unresolvedTargetsOf(sql, stage));
                }),
                countPiecesHolding: Effect.fn("CodeGraph.countPiecesHolding")(function* (stage: string, lines: Lines) {
                    return yield* store.query((sql) => piecesHoldingOf(sql, stage, lines));
                }),
                entryPointBlocks: Stream.paginate<readonly [number, number], typeof Block.Type, GraphReadFailure>(
                    [-1, 0],
                    entryPointsAfterIn(store),
                ),
                findRequestsBetweenEntryPoints: store
                    .query(requestsBetweenEntryPoints)
                    .pipe(Effect.withSpan("CodeGraph.findRequestsBetweenEntryPoints")),
                holdGroups: Effect.fn("CodeGraph.holdGroups")(function* <A, E, R>(
                    groups: readonly EntryPointGroup[],
                    use: (reach: GroupReachOps) => Effect.Effect<A, E, R>,
                ) {
                    return yield* holdGroups(store, groups, use);
                }),
                ...reachReads(store),
                ...blockLookups(store),
                ...placeReads(store),
                ...linkEndReads(store),
                ...countsThroughCodeKinds(store),
                ...countsBetweenFiles(store),
            });
        }),
    );
}
