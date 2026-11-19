import { posix } from "node:path";
import { Effect, Schema } from "effect";
import { compareText } from "../run/collections";
import type { RecordStore } from "../store/database";
import { read } from "./payload-queries";

const Text = Schema.String;
const Count = Schema.Number;

const BlockRow = Schema.Struct({
    id: Text,
    name: Text,
    container: Text,
    layer: Text,
    file: Text,
    firstLine: Count,
    lastLine: Count,
    capabilities: Schema.fromJsonString(Schema.Array(Text)),
});
const LinkRow = Schema.Struct({ from: Text, to: Text, kind: Text });
const AccessRow = Schema.Struct({
    block: Text,
    entityId: Text,
    entityName: Text,
    kind: Schema.Literals(["reads", "saves"]),
});
const RuleRow = Schema.Struct({
    id: Text,
    block: Schema.NullOr(Text),
    gates: Schema.NullOr(Text),
    capabilities: Schema.fromJsonString(Schema.Array(Text)),
});
const LifeRow = Schema.Struct({
    id: Text,
    entityId: Text,
    entityName: Text,
    states: Schema.fromJsonString(Schema.Array(Schema.Struct({ name: Text }))),
});
const TransitionRow = Schema.Struct({
    id: Text,
    lifecycle: Text,
    fromStates: Schema.fromJsonString(Schema.Union([Schema.Literal("created"), Schema.Array(Count)])),
    to: Count,
    file: Text,
    firstLine: Count,
    lastLine: Count,
});
const ControlRow = Schema.Struct({ container: Text, name: Text, declaredAs: Text });
const UnreachedRow = Schema.Struct({
    name: Schema.NullOr(Text),
    container: Schema.NullOr(Text),
    file: Text,
    firstLine: Count,
    lastLine: Count,
});

export type Readings = ReadonlyMap<string, { readonly label: string; readonly reason?: string }>;

/**
 * Where a second reading left a record, and the reviewer's words when it is disputed.
 * @param readings the labels by record id
 * @param id the record id
 * @returns the reading and the words
 */
export const readingOf = (readings: Readings, id: string) => {
    const found = readings.get(id);
    const label = found === undefined ? "unread" : found.label;
    return {
        reading: label === "reviewed" || label === "corrected" || label === "disputed" ? label : "unread",
        why: found === undefined || found.reason === undefined ? "" : found.reason,
    } as const;
};

/**
 * Every block with where it is and which capabilities reach it.
 * @param store the record store, read only
 * @returns the blocks
 */
const blocksOf = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const rows = yield* read(
        store,
        BlockRow,
        (sql) => sql`SELECT b.block AS id, coalesce(b.name, '') AS name, coalesce(b.container, '') AS container,
                b.layer AS layer, b.file AS file, b.firstLine AS firstLine, b.lastLine AS lastLine,
                coalesce((SELECT json_group_array(c.id) FROM blockCapability bc JOIN record c ON c.recordNumber = bc.capability
                    JOIN record br ON br.recordNumber = bc.block WHERE br.id = b.block), '[]') AS capabilities
            FROM v_block b ORDER BY b.file, b.firstLine, b.block`,
    );
    return rows.map((block) => ({ ...block, capabilities: [...block.capabilities].toSorted(compareText) }));
});

/**
 * The links between blocks and which blocks read or save which kind of data.
 * @param store the record store, read only
 * @returns the links and the accesses
 */
const linksAndAccess = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const links = yield* read(
        store,
        LinkRow,
        (sql) =>
            sql`SELECT fromBlock AS "from", toBlock AS "to", kind FROM v_block_calls ORDER BY fromBlock, toBlock, kind`,
    );
    const access = yield* read(
        store,
        AccessRow,
        (
            sql,
        ) => sql`SELECT ea.block AS block, e.id AS entityId, json_extract(e.body, '$.name') AS entityName, ea.kind AS kind
            FROM v_entity_access ea JOIN record e ON e.id = ea.entity
            WHERE ea.kind IN ('reads', 'saves') ORDER BY ea.block, e.id, ea.kind`,
    );
    return {
        links: [...links],
        access: access.map((row) => ({
            block: row.block,
            entity: { id: row.entityId, name: row.entityName },
            kind: row.kind,
        })),
    };
});

/**
 * Every business rule with who reaches the block that decides it and where a second reading left it.
 * @param store the record store, read only
 * @param readings where a second reading left each rule, by record id
 * @returns the rules
 */
const rulesOf = Effect.fnUntraced(function* (store: RecordStore["Service"], readings: Readings) {
    const rows = yield* read(
        store,
        RuleRow,
        (sql) => sql`SELECT r.rule AS id, r.block AS block, r.gates AS gates,
                coalesce((SELECT json_group_array(c.id) FROM blockCapability bc JOIN record c ON c.recordNumber = bc.capability
                    JOIN record br ON br.recordNumber = bc.block WHERE br.id = r.block), '[]') AS capabilities
            FROM v_rule r ORDER BY r.rule`,
    );
    return rows.map((rule) => ({
        id: rule.id,
        block: rule.block === null ? "" : rule.block,
        capabilities: [...rule.capabilities].toSorted(compareText),
        ...readingOf(readings, rule.id),
        gates: rule.gates === null ? "" : rule.gates,
    }));
});

/**
 * The lives of the kinds of data that have states, each change of state with where a second reading left it.
 * @param store the record store, read only
 * @param readings where a second reading left each change of state, by record id
 * @returns the lives
 */
const lifecyclesOf = Effect.fnUntraced(function* (store: RecordStore["Service"], readings: Readings) {
    const lives = yield* read(
        store,
        LifeRow,
        (sql) => sql`SELECT l.id AS id, e.id AS entityId, json_extract(e.body, '$.name') AS entityName,
                json_extract(l.body, '$.states') AS states
            FROM record l JOIN record e ON e.id = json_extract(l.body, '$.entity')
            WHERE l.type = 'Lifecycle' AND json_extract(l.body, '$.states') IS NOT NULL ORDER BY entityName`,
    );
    const transitions = yield* read(
        store,
        TransitionRow,
        (sql) => sql`SELECT id, json_extract(body, '$.lifecycle') AS lifecycle,
                CASE WHEN json_type(body, '$.fromStates') = 'text' THEN '"created"' ELSE json_extract(body, '$.fromStates') END AS fromStates,
                json_extract(body, '$.to') AS "to", json_extract(body, '$.writtenAt.file') AS file,
                json_extract(body, '$.writtenAt.firstLine') AS firstLine, json_extract(body, '$.writtenAt.lastLine') AS lastLine
            FROM record WHERE type = 'Transition' ORDER BY recordNumber`,
    );
    return lives.map((life) => ({
        id: life.id,
        entity: { id: life.entityId, name: life.entityName },
        states: life.states.map((state) => state.name),
        transitions: transitions
            .filter((transition) => transition.lifecycle === life.id)
            .map((transition) => ({
                id: transition.id,
                from: transition.fromStates === "created" ? [] : [...transition.fromStates],
                to: transition.to,
                file: transition.file,
                firstLine: transition.firstLine,
                lastLine: transition.lastLine,
                ...readingOf(readings, transition.id),
            })),
    }));
});

/**
 * What a routine is called where a reader sees it: its class and name as the code writes them. A block the map wrote
 * with no name (a static initialiser, a page's markup) or no class (a page template) is called by the part it has and
 * its first line, and a block with neither by its file's name and first line, so no routine goes unnamed. The view
 * `v_unknown` joins class and name and leaves such a block without one; reading the blocks here keeps the stored view,
 * and with it the store's identity, as it is.
 * @param row the unreached block
 * @returns its name
 */
const unreachedName = (row: typeof UnreachedRow.Type) => {
    if (row.container !== null && row.name !== null) {
        return `${row.container}.${row.name}`;
    }
    if (row.name !== null) {
        return row.name;
    }
    const holder = row.container === null ? posix.basename(row.file) : row.container;
    return `${holder}, line ${row.firstLine}`;
};

/**
 * The controls each window declares and the routines nothing reaches, which are the blocks no capability reaches, as
 * `v_unknown` lists them under `notReached`.
 * @param store the record store, read only
 * @returns the controls and the unreached routines
 */
const controlsAndUnreached = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const controls = yield* read(
        store,
        ControlRow,
        (sql) =>
            sql`SELECT screen AS container, control AS name, declaredAs FROM v_screen_controls ORDER BY screen, control`,
    );
    const unreached = yield* read(
        store,
        UnreachedRow,
        (sql) => sql`SELECT name, container, file, firstLine, lastLine FROM v_block
            WHERE capabilities = 0 ORDER BY file, firstLine, block`,
    );
    return {
        controls: [...controls],
        unreached: unreached.map((row) => ({
            what: unreachedName(row),
            file: row.file,
            firstLine: row.firstLine,
            lastLine: row.lastLine,
        })),
    };
});

/**
 * What a bundle needs beyond the capability and system payloads, from the accepted records and the relation views.
 * @param store the record store, read only
 * @param readings where a second reading left each rule and change of state, by record id
 * @returns the bundle index
 */
export const bundlePayload = Effect.fnUntraced(function* (store: RecordStore["Service"], readings: Readings) {
    return {
        blocks: yield* blocksOf(store),
        ...(yield* linksAndAccess(store)),
        rules: yield* rulesOf(store, readings),
        lifecycles: yield* lifecyclesOf(store, readings),
        ...(yield* controlsAndUnreached(store)),
    };
});
