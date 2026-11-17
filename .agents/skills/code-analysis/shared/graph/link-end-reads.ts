import { Effect } from "effect";
import type { SqlClient, Statement } from "effect/sql";
import { Link } from "../model/schemas/map";
import type { RecordInvalid } from "../run/script-errors";
import type { Lines } from "../model/shared-fields";
import type { RecordStore, StoreOpenFailure } from "../store/database";
import { graphTypes } from "./graph-writes";
import { joinedEnds, linkEndRows, type LinkEnd } from "./link-ends";
import {
    BlockEntryPointRow,
    BodyRow,
    CountRow,
    IdRow,
    NameRow,
    ResourceIdRow,
    ResourceFileRow,
    UsedResourceRow,
    EntryPointResourceRow,
} from "../store/rows";
import { countOf, decodedBodies, decodedRows, storeNumbersOf } from "../store/stored-bodies";

type GraphReadFailure = StoreOpenFailure | RecordInvalid;

export interface LinkEndReadsOps {
    readonly findLinkEndsTo: (blockIds: readonly string[]) => Effect.Effect<readonly LinkEnd[], GraphReadFailure>;
    readonly findLinkEndsFrom: (blockIds: readonly string[]) => Effect.Effect<readonly LinkEnd[], GraphReadFailure>;
    readonly findEntryPointsRunningEach: (
        blockIds: readonly string[],
    ) => Effect.Effect<ReadonlyArray<typeof BlockEntryPointRow.Type>, StoreOpenFailure>;
    readonly findLinksReached: (linkIds: readonly string[]) => Effect.Effect<readonly string[], StoreOpenFailure>;
    readonly findLinkEndsOfLinks: (linkIds: readonly string[]) => Effect.Effect<readonly LinkEnd[], GraphReadFailure>;
    readonly findResourcesUsedHolding: (
        ranges: readonly Lines[],
    ) => Effect.Effect<
        ReadonlyArray<{ readonly range: Lines; readonly used: ReadonlyArray<typeof UsedResourceRow.Type> }>,
        StoreOpenFailure
    >;
    readonly findLinksUsing: (
        externalSystemId: string,
        resource: string,
    ) => Effect.Effect<ReadonlyArray<typeof Link.Type>, GraphReadFailure>;
    readonly findUnprovenLinkEnds: (kind: string) => Effect.Effect<readonly LinkEnd[], GraphReadFailure>;
    readonly countUnprovenLinkEnds: (kind: string) => Effect.Effect<number, StoreOpenFailure>;
    readonly findResourcesByIds: (
        ids: readonly string[],
    ) => Effect.Effect<ReadonlyArray<typeof ResourceIdRow.Type>, StoreOpenFailure>;
    readonly findFieldsNamedAt: (
        externalSystemId: string,
        resource: string,
    ) => Effect.Effect<readonly string[], StoreOpenFailure>;
    readonly findResourcesReachedFromEach: (
        entryPointIds: readonly string[],
    ) => Effect.Effect<ReadonlyArray<typeof EntryPointResourceRow.Type>, StoreOpenFailure>;
    readonly findFilesOfEntryPointsUsingEach: Effect.Effect<
        ReadonlyArray<typeof ResourceFileRow.Type>,
        StoreOpenFailure
    >;
}

/**
 * The link ends a condition selects, joined with their links.
 * @param store the record store
 * @returns the read, given a condition on `le` (the link end) and `l` (the link's record), in stage order then the
 * order the links were written
 */
const findLinkEndsIn =
    (store: RecordStore["Service"]) => (condition: (sql: SqlClient.SqlClient) => Statement.Fragment) =>
        Effect.flatMap(
            store.query((sql) => linkEndRows(sql, condition(sql))),
            (rows) => joinedEnds(store.path, rows),
        );

/**
 * The links using one resource at one external system (`linkEndByExternalSystem`), in the order written: the uses a resource
 * job's counts summarise, read by that resource alone.
 * @param store the record store
 * @returns the read, given the external system's record id and the resource, spelt as the store holds it
 */
const linksUsingIn =
    (store: RecordStore["Service"]): LinkEndReadsOps["findLinksUsing"] =>
    (externalSystemId: string, resource: string) =>
        Effect.flatMap(
            store.query((sql) =>
                decodedRows(BodyRow)(sql`SELECT l.recordNumber, l.id, l.body
                    FROM linkEnd le JOIN record l ON l.recordNumber = le.linkRecord
                    WHERE le.toExternalSystem IN (${storeNumbersOf(sql, [externalSystemId])}) AND le.resource = ${resource}
                    ORDER BY l.recordNumber`),
            ),
            (rows) => decodedBodies(store.path, rows, Link),
        );

/**
 * For each range, the resources used by the links whose own lines hold it: a citation of a use is checked against the
 * links at its lines, found by position (`recordByPosition`) in its file, never by reading every use of a resource.
 * @param store the record store
 * @returns the read, given the ranges: each range with the external system's record id and the resource of each such link
 */
const resourcesUsedHoldingIn =
    (store: RecordStore["Service"]): LinkEndReadsOps["findResourcesUsedHolding"] =>
    (ranges: readonly Lines[]) =>
        Effect.forEach(ranges, (range) =>
            Effect.map(
                store.query((sql) =>
                    decodedRows(UsedResourceRow)(sql`SELECT DISTINCT i.id AS externalSystem, le.resource
                    FROM file f
                    JOIN record l ON l.type = ${graphTypes.link} AND l.fileNumber = f.fileNumber
                        AND l.firstLine <= ${range.firstLine} AND l.lastLine >= ${range.lastLine}
                    JOIN linkEnd le ON le.linkRecord = l.recordNumber AND le.toExternalSystem IS NOT NULL
                    JOIN record i ON i.recordNumber = le.toExternalSystem
                    WHERE f.path = ${range.file}
                    ORDER BY i.id, le.resource`),
                ),
                (used) => ({ range, used }),
            ),
        );

/**
 * The data fields the links using one resource name (`Link.fieldsUsed`), each once, in name order: gathered from the
 * links' stored bodies by the store (`json_each`), never decoded one link at a time.
 * @param store the record store
 * @returns the read, given the external system's record id and the resource
 */
const fieldsUsedAtIn =
    (store: RecordStore["Service"]): LinkEndReadsOps["findFieldsNamedAt"] =>
    (externalSystemId: string, resource: string) =>
        Effect.map(
            store.query((sql) =>
                decodedRows(NameRow)(sql`SELECT DISTINCT field.value AS name
                    FROM linkEnd le JOIN record l ON l.recordNumber = le.linkRecord,
                        json_each(l.body, '$.fieldsUsed') field
                    WHERE le.toExternalSystem IN (${storeNumbersOf(sql, [externalSystemId])}) AND le.resource = ${resource}
                    ORDER BY field.value`),
            ),
            (rows) => rows.map((row) => row.name),
        );

/**
 * The resources each of some entry points's chains uses, each kind of use once, in the order first used (D218): one
 * statement for them all, their blocks from the reach of every entry point (`entryPointReach`, D214) joined to their links' ends,
 * the chains' links never decoded. A cut asks it a page of entry points at a time.
 * @param store the record store
 * @returns the read, given the entry points's record ids; each row names its entry point
 */
const resourcesReachedFromEachIn =
    (store: RecordStore["Service"]): LinkEndReadsOps["findResourcesReachedFromEach"] =>
    (entryPointIds: readonly string[]) =>
        store.query((sql) =>
            decodedRows(
                EntryPointResourceRow,
            )(sql`SELECT r.id AS entryPoint, i.id AS externalSystem, le.resource, le.kind
                FROM (${storeNumbersOf(sql, entryPointIds)}) wanted
                CROSS JOIN entryPointReach w ON w.entryPoint = wanted.recordNumber
                CROSS JOIN linkEnd le ON le.fromBlock = w.block AND le.toExternalSystem IS NOT NULL
                CROSS JOIN record i ON i.recordNumber = le.toExternalSystem
                CROSS JOIN record r ON r.recordNumber = w.entryPoint
                GROUP BY w.entryPoint, le.toExternalSystem, le.resource, le.kind
                ORDER BY w.entryPoint, min(le.linkRecord)`),
        );

/**
 * For each resource the code saves or reads, the files of the entry points whose chains do (D218): one grouped statement
 * over the reach of every entry point, bounded by the resources times the files entry points sit in, never by the chains. A
 * stage turns the files into parts.
 * @param store the record store
 * @returns the read
 */
const filesOfEntryPointsUsingEachIn = (
    store: RecordStore["Service"],
): LinkEndReadsOps["findFilesOfEntryPointsUsingEach"] =>
    store
        .query((sql) =>
            decodedRows(ResourceFileRow)(sql`SELECT i.id AS externalSystem, le.resource, f.path AS file
                FROM linkEnd le
                CROSS JOIN entryPointReach w ON w.block = le.fromBlock
                CROSS JOIN record r ON r.recordNumber = w.entryPoint
                CROSS JOIN file f ON f.fileNumber = r.fileNumber
                CROSS JOIN record i ON i.recordNumber = le.toExternalSystem
                WHERE le.toExternalSystem IS NOT NULL
                GROUP BY le.toExternalSystem, le.resource, r.fileNumber
                ORDER BY le.toExternalSystem, le.resource, f.path`),
        )
        .pipe(Effect.withSpan("CodeGraph.findFilesOfEntryPointsUsingEach"));

/**
 * The reads around blocks: the link ends leaving them, the entry points running each, and which links an entry point reaches.
 * @param store the record store
 * @returns the reads
 */
const blockEndReads = (
    store: RecordStore["Service"],
): Pick<LinkEndReadsOps, "findLinkEndsFrom" | "findEntryPointsRunningEach" | "findLinksReached"> => {
    const findLinkEnds = findLinkEndsIn(store);
    return {
        findLinkEndsFrom: Effect.fn("CodeGraph.findLinkEndsFrom")(function* (blockIds: readonly string[]) {
            return yield* findLinkEnds((sql) => sql`le.fromBlock IN (${storeNumbersOf(sql, blockIds)})`);
        }),
        findEntryPointsRunningEach: Effect.fn("CodeGraph.findEntryPointsRunningEach")(function* (
            blockIds: readonly string[],
        ) {
            return yield* store.query((sql) =>
                decodedRows(BlockEntryPointRow)(sql`SELECT b.id AS block, r.id AS entryPoint
                    FROM (${storeNumbersOf(sql, blockIds)}) wanted
                    CROSS JOIN entryPointReach w ON w.block = wanted.recordNumber
                    CROSS JOIN record b ON b.recordNumber = w.block
                    CROSS JOIN record r ON r.recordNumber = w.entryPoint
                    ORDER BY w.block, w.entryPoint`),
            );
        }),
        findLinksReached: Effect.fn("CodeGraph.findLinksReached")(function* (linkIds: readonly string[]) {
            return yield* store.query((sql) =>
                Effect.map(
                    decodedRows(IdRow)(sql`SELECT l.id FROM (${storeNumbersOf(sql, linkIds)}) wanted
                        CROSS JOIN linkEnd le ON le.linkRecord = wanted.recordNumber
                        CROSS JOIN record l ON l.recordNumber = le.linkRecord
                        WHERE EXISTS (SELECT 1 FROM entryPointReach w WHERE w.block = le.fromBlock)
                        ORDER BY l.recordNumber`),
                    (rows) => rows.map((row) => row.id),
                ),
            );
        }),
    };
};

/**
 * The link-end reads: the link ends from, to and of what a reader holds, the unproven ones of a kind, the resources
 * used at an external system, the resources used at given lines, and the links using one resource.
 * @param store the record store
 * @returns the reads
 */
export const linkEndReads = (store: RecordStore["Service"]): LinkEndReadsOps => {
    const findLinkEnds = findLinkEndsIn(store);
    return {
        ...blockEndReads(store),
        findLinkEndsTo: Effect.fn("CodeGraph.findLinkEndsTo")(function* (blockIds: readonly string[]) {
            return yield* findLinkEnds((sql) => sql`le.toBlock IN (${storeNumbersOf(sql, blockIds)})`);
        }),
        findLinkEndsOfLinks: Effect.fn("CodeGraph.findLinkEndsOfLinks")(function* (linkIds: readonly string[]) {
            return yield* findLinkEnds((sql) => sql`le.linkRecord IN (${storeNumbersOf(sql, linkIds)})`);
        }),
        findUnprovenLinkEnds: Effect.fn("CodeGraph.findUnprovenLinkEnds")(function* (kind: string) {
            return yield* findLinkEnds(
                (sql) => sql`le.kind = ${kind} AND le.toFile IS NULL AND le.toExternalSystem IS NULL`,
            );
        }),
        countUnprovenLinkEnds: Effect.fn("CodeGraph.countUnprovenLinkEnds")(function* (kind: string) {
            return yield* store.query((sql) =>
                Effect.map(
                    decodedRows(CountRow)(sql`SELECT count(*) AS count FROM linkEnd le
                        WHERE le.kind = ${kind} AND le.toFile IS NULL AND le.toExternalSystem IS NULL`),
                    countOf,
                ),
            );
        }),
        findResourcesByIds: Effect.fn("CodeGraph.findResourcesByIds")(function* (ids: readonly string[]) {
            return yield* store.query((sql) =>
                decodedRows(ResourceIdRow)(sql`SELECT x.id, s.id AS externalSystem, x.resource
                    FROM resource x JOIN record s ON s.recordNumber = x.externalSystem
                    WHERE x.id IN (SELECT value FROM json_each(${JSON.stringify(ids)}))
                    ORDER BY x.resourceNumber`),
            );
        }),
        findFieldsNamedAt: Effect.fn("CodeGraph.findFieldsNamedAt")(function* (
            externalSystemId: string,
            resource: string,
        ) {
            return yield* fieldsUsedAtIn(store)(externalSystemId, resource);
        }),
        findResourcesReachedFromEach: Effect.fn("CodeGraph.findResourcesReachedFromEach")(function* (
            entryPointIds: readonly string[],
        ) {
            return yield* resourcesReachedFromEachIn(store)(entryPointIds);
        }),
        findFilesOfEntryPointsUsingEach: filesOfEntryPointsUsingEachIn(store),
        findResourcesUsedHolding: Effect.fn("CodeGraph.findResourcesUsedHolding")(function* (ranges: readonly Lines[]) {
            return yield* resourcesUsedHoldingIn(store)(ranges);
        }),
        findLinksUsing: linksUsingIn(store),
    };
};
