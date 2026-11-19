import { Effect, Schema } from "effect";
import type { SqlClient, SqlError } from "effect/sql";
import type { RecordStore } from "../store/database";
import { decodedRows, type Decoder } from "../store/stored-bodies";

const Count = Schema.Number;
const Text = Schema.String;
const MaybeText = Schema.NullOr(Schema.String);

type Statement = (sql: SqlClient.SqlClient) => Effect.Effect<ReadonlyArray<object>, SqlError.SqlError>;

/**
 * Read rows through a schema.
 * @param store the record store, read only
 * @param schema the shape of a row
 * @param statement the statement, given the client
 * @returns the rows
 */
export const read = <S extends Decoder>(store: RecordStore["Service"], schema: S, statement: Statement) =>
    Effect.orDie(store.query((sql) => decodedRows(schema)(statement(sql))));

const NumberRow = Schema.Struct({ number: Count });

/**
 * A count the store gives as `number`: zero when it returns no row.
 * @param store the record store
 * @param statement the statement
 * @returns the number
 */
export const numberOf = Effect.fnUntraced(function* (store: RecordStore["Service"], statement: Statement) {
    const [row] = yield* read(store, NumberRow, statement);
    return row === undefined ? 0 : row.number;
});

const LayerRow = Schema.Struct({ layer: Text, name: Text, blocks: Count, role: Text });
const ToolingRow = Schema.Struct({ layer: Text, entryPoints: Count, scripts: Count });
export const LayerRecordRow = Schema.Struct({ id: Text, purpose: Text, evidence: Text });
export const AreaRow = Schema.Struct({ id: Text, name: Text, purpose: Text, capabilities: Text });
export const CapabilityIndexRow = Schema.Struct({
    id: Text,
    name: Text,
    purpose: Text,
    screens: Count,
    actions: Count,
    rules: Count,
});
export const PurposeRow = Schema.Struct({ statement: Text });
export const EdgeRow = Schema.Struct({ fromLayer: Text, toLayer: Text, kind: Text, links: Count });
export const FieldNames = Schema.fromJsonString(Schema.Array(Schema.Struct({ writtenAs: Text })));
export const ScreenRecordRow = Schema.Struct({
    id: Text,
    name: Text,
    purpose: Text,
    kind: Schema.Literals(["screen", "other"]),
    places: Schema.fromJsonString(Schema.Array(Schema.String)),
});
export const ListOfText = Schema.fromJsonString(Schema.Array(Schema.String));

const CapabilityRow = Schema.Struct({ id: Text, name: Text, purpose: Text });
const LayerUseRow = Schema.Struct({ layer: Text, blocks: Count, sharedBlocks: Count });
const ActionRow = Schema.Struct({
    id: Text,
    name: MaybeText,
    purpose: Text,
    startedBy: Text,
    screen: MaybeText,
    layer: Text,
    file: Text,
    firstLine: Count,
    lastLine: Count,
});
const RuleRow = Schema.Struct({
    id: Text,
    says: Text,
    gates: MaybeText,
    layer: Text,
    file: Text,
    firstLine: Count,
    lastLine: Count,
    evidence: MaybeText,
});
const FileUseRow = Schema.Struct({ file: Text, capabilities: Count });
const ActionFileRow = Schema.Struct({ entryPoint: Text, file: Text });
const LayerFileRow = Schema.Struct({ layer: Text, file: Text });
const ActionDataRow = Schema.Struct({ entryPoint: Text, name: Text, kind: Text });
const LayerDataRow = Schema.Struct({ layer: Text, name: Text, kind: Text });
const OpenPointRow = Schema.Struct({ statement: Text, why: Text, ifWrong: Text });
const PathRow = Schema.Struct({ entryPoint: Text, layer: Text, depth: Count });
const ActionRuleRow = Schema.Struct({ entryPoint: Text, rule: Text });
const ShapeRow = Schema.Struct({ id: Text, name: Text, layer: Text, fields: Text });
const ScreenRow = Schema.Struct({ screen: MaybeText, actions: Count });
const ControlRow = Schema.Struct({ screen: Text, control: Text, declaredAs: Text });
const ConcernRow = Schema.Struct({ id: Text, name: Text, purpose: Text, verdict: Text, blocks: Count });
const DataRow = Schema.Struct({ id: Text, name: Text, kinds: Text });
const GapRow = Schema.Struct({
    kind: Text,
    reason: MaybeText,
    layer: MaybeText,
    file: Text,
    firstLine: Count,
    lastLine: Count,
});

/**
 * The rows of a capability's layers and the entry points and rules in them.
 * @param store the record store, read only
 * @param id the capability's record id
 * @returns the layers' use, the entry points and the rules
 */
const layerRows = Effect.fnUntraced(function* (store: RecordStore["Service"], id: string) {
    const uses = yield* read(
        store,
        LayerUseRow,
        (sql) => sql`SELECT layer, blocks, sharedBlocks FROM v_capability_layers WHERE capability = ${id}`,
    );
    const actions = yield* read(
        store,
        ActionRow,
        (sql) => sql`SELECT b.id AS id, json_extract(b.body, '$.writtenAs') AS name,
                json_extract(b.body, '$.entryPoint.purpose') AS purpose, json_extract(b.body, '$.entryPoint.startedBy') AS startedBy,
                json_extract(b.body, '$.container') AS screen, l.id AS layer, f.path AS file, b.firstLine, b.lastLine
            FROM v_entry_point_capability ec JOIN record b ON b.id = ec.entryPoint JOIN file f ON f.fileNumber = b.fileNumber
            JOIN ref rk ON rk.fromRecord = b.recordNumber AND rk.role = 'codeKind'
            JOIN ref rl ON rl.fromRecord = rk.toRecord AND rl.role = 'layer' JOIN record l ON l.recordNumber = rl.toRecord
            WHERE ec.capability = ${id} ORDER BY b.firstLine`,
    );
    const paths = yield* read(
        store,
        PathRow,
        (sql) => sql`SELECT ec.entryPoint AS entryPoint, p.layer AS layer, p.depth AS depth
            FROM v_entry_point_capability ec JOIN v_entry_point_path p ON p.entryPoint = ec.entryPoint
            WHERE ec.capability = ${id} ORDER BY ec.entryPoint, p.depth, p.layer`,
    );
    const actionRules = yield* read(
        store,
        ActionRuleRow,
        (sql) => sql`SELECT DISTINCT b.id AS entryPoint, r.id AS rule
            FROM v_entry_point_capability ec JOIN record b ON b.id = ec.entryPoint
            JOIN entryPointReach w ON w.entryPoint = b.recordNumber JOIN ruleBlock rb ON rb.block = w.block
            JOIN record r ON r.recordNumber = rb.rule WHERE ec.capability = ${id} ORDER BY b.id, r.id`,
    );
    const rules = yield* read(
        store,
        RuleRow,
        (
            sql,
        ) => sql`SELECT DISTINCT r.id AS id, json_extract(r.body, '$.says') AS says, json_extract(r.body, '$.gates') AS gates,
                l.id AS layer, f.path AS file, r.firstLine, r.lastLine, json_extract(r.body, '$.evidence') AS evidence
            FROM blockCapability bc JOIN ruleBlock rb ON rb.block = bc.block JOIN record r ON r.recordNumber = rb.rule
            JOIN file f ON f.fileNumber = r.fileNumber
            JOIN ref rk ON rk.fromRecord = bc.block AND rk.role = 'codeKind'
            JOIN ref rl ON rl.fromRecord = rk.toRecord AND rl.role = 'layer' JOIN record l ON l.recordNumber = rl.toRecord
            WHERE bc.capability = (SELECT recordNumber FROM record WHERE id = ${id}) ORDER BY r.firstLine`,
    );
    return { uses, actions, rules, paths, actionRules };
});

/**
 * The rows of a capability's screens, controls, shared code, data and gaps.
 * @param store the record store, read only
 * @param id the capability's record id
 * @returns the rows
 */
const surroundingRows = Effect.fnUntraced(function* (store: RecordStore["Service"], id: string) {
    const shapes = yield* read(
        store,
        ShapeRow,
        (sql) => sql`SELECT DISTINCT d.id AS id, json_extract(d.body, '$.writtenAs') AS name, l.id AS layer,
                json_extract(d.body, '$.fields') AS fields
            FROM v_capability_entities ce JOIN v_entity_definitions ed ON ed.entity = ce.entity
            JOIN record d ON d.id = ed.definition
            JOIN ref rk ON rk.fromRecord = d.recordNumber AND rk.role = 'codeKind'
            JOIN ref rl ON rl.fromRecord = rk.toRecord AND rl.role = 'layer' JOIN record l ON l.recordNumber = rl.toRecord
            WHERE ce.capability = ${id}`,
    );
    const screens = yield* read(
        store,
        ScreenRow,
        (sql) => sql`SELECT screen, actions FROM v_capability_screens WHERE capability = ${id} ORDER BY screen`,
    );
    const controls = yield* read(
        store,
        ControlRow,
        (sql) => sql`SELECT sc.screen AS screen, sc.control AS control, sc.declaredAs AS declaredAs
            FROM v_screen_controls sc WHERE sc.screen IN (SELECT screen FROM v_capability_screens WHERE capability = ${id})`,
    );
    const concerns = yield* read(
        store,
        ConcernRow,
        (
            sql,
        ) => sql`SELECT cc.concern AS id, cc.name AS name, json_extract(c.body, '$.purpose') AS purpose, cc.verdict AS verdict,
                cc.blocks AS blocks
            FROM v_capability_concerns cc JOIN record c ON c.id = cc.concern WHERE cc.capability = ${id}`,
    );
    const data = yield* read(
        store,
        DataRow,
        (sql) => sql`SELECT ent.entity AS id, ent.name AS name, group_concat(DISTINCT ea.kind) AS kinds
            FROM v_capability_entities ce JOIN v_entity ent ON ent.entity = ce.entity
            JOIN v_entity_access ea ON ea.entity = ce.entity
            JOIN v_capability_blocks cb ON cb.capability = ce.capability AND cb.block = ea.block
            WHERE ce.capability = ${id} GROUP BY ent.entity, ent.name`,
    );
    const gaps = yield* read(
        store,
        GapRow,
        (
            sql,
        ) => sql`SELECT u.kind AS kind, u.reason AS reason, u.layer AS layer, u.file AS file, u.firstLine, u.lastLine
            FROM v_unresolved_link u WHERE u.capability = ${id} ORDER BY u.file, u.firstLine`,
    );
    return { shapes, screens, controls, concerns, data, gaps };
});

/**
 * The rows the contexts are built from: which files the capability's code is in and how many capabilities reach each,
 * the files of each entry point and of each layer, the data each entry point and layer saves or reads, and the
 * capability's open points.
 * @param store the record store, read only
 * @param id the capability's record id
 * @returns the rows
 */
const contextRows = Effect.fnUntraced(function* (store: RecordStore["Service"], id: string) {
    const fileUse = yield* read(
        store,
        FileUseRow,
        (sql) => sql`SELECT f.path AS file,
                (SELECT count(DISTINCT x.capability) FROM record b2 JOIN blockCapability x ON x.block = b2.recordNumber
                    WHERE b2.type = 'Block' AND b2.fileNumber = f.fileNumber) AS capabilities
            FROM blockCapability bc JOIN record b ON b.recordNumber = bc.block JOIN file f ON f.fileNumber = b.fileNumber
            WHERE bc.capability = (SELECT recordNumber FROM record WHERE id = ${id}) GROUP BY f.fileNumber, f.path`,
    );
    const actionFiles = yield* read(
        store,
        ActionFileRow,
        (sql) => sql`SELECT DISTINCT b.id AS entryPoint, f.path AS file
            FROM v_entry_point_capability ec JOIN record b ON b.id = ec.entryPoint
            JOIN entryPointReach w ON w.entryPoint = b.recordNumber JOIN record rb ON rb.recordNumber = w.block
            JOIN file f ON f.fileNumber = rb.fileNumber WHERE ec.capability = ${id}`,
    );
    const layerFiles = yield* read(
        store,
        LayerFileRow,
        (sql) => sql`SELECT DISTINCT l.id AS layer, f.path AS file
            FROM blockCapability bc JOIN record b ON b.recordNumber = bc.block JOIN file f ON f.fileNumber = b.fileNumber
            JOIN ref rk ON rk.fromRecord = bc.block AND rk.role = 'codeKind'
            JOIN ref rl ON rl.fromRecord = rk.toRecord AND rl.role = 'layer' JOIN record l ON l.recordNumber = rl.toRecord
            WHERE bc.capability = (SELECT recordNumber FROM record WHERE id = ${id})`,
    );
    const actionData = yield* read(
        store,
        ActionDataRow,
        (sql) => sql`SELECT DISTINCT b.id AS entryPoint, ent.name AS name, ea.kind AS kind
            FROM v_entry_point_capability ec JOIN record b ON b.id = ec.entryPoint
            JOIN entryPointReach w ON w.entryPoint = b.recordNumber JOIN record rb ON rb.recordNumber = w.block
            JOIN v_entity_access ea ON ea.block = rb.id JOIN v_entity ent ON ent.entity = ea.entity
            WHERE ec.capability = ${id}`,
    );
    const layerData = yield* read(
        store,
        LayerDataRow,
        (sql) => sql`SELECT DISTINCT l.id AS layer, ent.name AS name, ea.kind AS kind
            FROM blockCapability bc JOIN record rb ON rb.recordNumber = bc.block
            JOIN v_entity_access ea ON ea.block = rb.id JOIN v_entity ent ON ent.entity = ea.entity
            JOIN ref rk ON rk.fromRecord = bc.block AND rk.role = 'codeKind'
            JOIN ref rl ON rl.fromRecord = rk.toRecord AND rl.role = 'layer' JOIN record l ON l.recordNumber = rl.toRecord
            WHERE bc.capability = (SELECT recordNumber FROM record WHERE id = ${id})`,
    );
    const openPoints = yield* read(
        store,
        OpenPointRow,
        (
            sql,
        ) => sql`SELECT json_extract(f.body, '$.statement') AS statement, json_extract(f.body, '$.basis.assumed.why') AS why,
                json_extract(f.body, '$.basis.assumed.ifWrong') AS ifWrong
            FROM record f WHERE f.type = 'Fact' AND json_extract(f.body, '$.subject.key') = ${id}
                AND json_extract(f.body, '$.basis.assumed') IS NOT NULL ORDER BY f.recordNumber`,
    );
    return { fileUse, actionFiles, layerFiles, actionData, layerData, openPoints };
});

/**
 * The layers with the role of each, derived from the code. A layer where at least half the entry points sit in build or
 * install scripts (shell, batch, PowerShell or MSBuild files) is `runsAsTooling`, whoever starts them, so it is never
 * read as a layer that faces a person.
 * @param store the record store, read only
 * @returns each layer's id, name, blocks and role
 */
export const layerRoles = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const roles = yield* read(store, LayerRow, (sql) => sql`SELECT layer, name, blocks, role FROM v_layer_role`);
    const tooling = yield* read(
        store,
        ToolingRow,
        (sql) => sql`SELECT l.id AS layer, count(*) AS entryPoints,
                sum(lower(f.path) GLOB '*.ps1' OR lower(f.path) GLOB '*.psm1' OR lower(f.path) GLOB '*.cmd'
                    OR lower(f.path) GLOB '*.bat' OR lower(f.path) GLOB '*.sh' OR lower(f.path) GLOB '*.targets'
                    OR lower(f.path) GLOB '*.props') AS scripts
            FROM entryPoint ep JOIN record b ON b.recordNumber = ep.recordNumber JOIN file f ON f.fileNumber = b.fileNumber
            JOIN ref rk ON rk.fromRecord = b.recordNumber AND rk.role = 'codeKind'
            JOIN ref rl ON rl.fromRecord = rk.toRecord AND rl.role = 'layer' JOIN record l ON l.recordNumber = rl.toRecord
            GROUP BY l.id`,
    );
    const scripted = new Set(tooling.filter((row) => row.scripts * 2 >= row.entryPoints).map((row) => row.layer));
    return roles.map((row) => (scripted.has(row.layer) ? { ...row, role: "runsAsTooling" } : row));
});

/**
 * Every row one capability's payload is built from, each read by the capability so a store of any size reads only what
 * it needs.
 * @param store the record store, read only
 * @param id the capability's record id
 * @returns the rows; a defect when the capability is not in the store
 */
export const capabilityRows = Effect.fnUntraced(function* (store: RecordStore["Service"], id: string) {
    const [capability] = yield* read(
        store,
        CapabilityRow,
        (sql) => sql`SELECT capability AS id, name, purpose FROM v_capability WHERE capability = ${id}`,
    );
    if (capability === undefined) {
        return yield* Effect.die(new Error(`no capability ${id}`));
    }
    const roles = yield* layerRoles(store);
    const layerRecords = yield* read(
        store,
        LayerRecordRow,
        (
            sql,
        ) => sql`SELECT id, coalesce(json_extract(body, '$.purpose'), '') AS purpose, coalesce(json_extract(body, '$.evidence'), '[]') AS evidence
            FROM record WHERE type = 'Layer'`,
    );
    const blocks = yield* numberOf(
        store,
        (sql) => sql`SELECT count(*) AS number FROM v_capability_blocks WHERE capability = ${id}`,
    );
    return {
        capability,
        roles,
        layerRecords,
        blocks,
        ...(yield* layerRows(store, id)),
        ...(yield* surroundingRows(store, id)),
        ...(yield* contextRows(store, id)),
    };
});
