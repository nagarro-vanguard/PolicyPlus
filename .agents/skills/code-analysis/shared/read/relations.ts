import { factRelations } from "./fact-relations";
import { layerRelations, type Relation } from "./layer-relations";
/**
 * The catalogue of what can be asked of the accepted model: one flat, read-only view for each relation, with the names
 * joined in beside the ids, so a question across capabilities is a grouping and a join over these views. Each is
 * defined once, here, and made with the model's tables; the pages and the analysis database's readers use them by name.
 * A relation `from` a kind lists what that kind relates to; a view `from` `system` lists everything of its kind.
 */
const relations: readonly Relation[] = [
    ...layerRelations,
    {
        view: "v_capability",
        from: "system",
        key: "",
        summary: "each capability: id, name, what it offers",
        sql: `SELECT id AS capability, json_extract(body, '$.name') AS name, json_extract(body, '$.purpose') AS purpose
            FROM record WHERE type = 'Capability'`,
    },
    {
        view: "v_entity",
        from: "system",
        key: "",
        summary: "each kind of data (entity): id, name, what it is",
        sql: `SELECT id AS entity, json_extract(body, '$.name') AS name, json_extract(body, '$.purpose') AS purpose
            FROM record WHERE type = 'Entity'`,
    },
    {
        view: "v_part",
        from: "system",
        key: "",
        summary: "each part of the system: id, name, kind, what it is for",
        sql: `SELECT id AS part, json_extract(body, '$.name') AS name, json_extract(body, '$.kind') AS kind,
                json_extract(body, '$.purpose') AS purpose
            FROM record WHERE type = 'SystemPart'`,
    },
    {
        view: "v_entry_point_capability",
        from: "capability",
        key: "capability",
        summary: "each entry point with the capability it serves",
        sql: `SELECT e.id AS entryPoint, c.id AS capability
            FROM record a JOIN ref re ON re.fromRecord = a.recordNumber AND re.role = 'entryPoint'
            JOIN ref rc ON rc.fromRecord = a.recordNumber AND rc.role = 'capability'
            JOIN record e ON e.recordNumber = re.toRecord JOIN record c ON c.recordNumber = rc.toRecord
            WHERE a.type = 'EntryPointAssignment'`,
    },
    {
        view: "v_entry_point",
        from: "capability",
        key: "capability",
        summary: "each entry point: who starts it, how it is reached, what it does, where it is, its capability",
        sql: `SELECT b.id AS entryPoint, json_extract(b.body, '$.writtenAs') AS name,
                json_extract(b.body, '$.entryPoint.startedBy') AS startedBy,
                json_extract(b.body, '$.entryPoint.reachedBy') AS reachedBy,
                json_extract(b.body, '$.entryPoint.purpose') AS purpose,
                f.path AS file, b.firstLine, b.lastLine, ec.capability
            FROM entryPoint ep JOIN record b ON b.recordNumber = ep.recordNumber
            JOIN file f ON f.fileNumber = b.fileNumber
            LEFT JOIN v_entry_point_capability ec ON ec.entryPoint = b.id`,
    },
    {
        view: "v_entry_point_blocks",
        from: "entryPoint",
        key: "entryPoint",
        summary: "every block an entry point's flow reaches, itself included",
        sql: `SELECT e.id AS entryPoint, b.id AS block
            FROM entryPointReach w JOIN record e ON e.recordNumber = w.entryPoint JOIN record b ON b.recordNumber = w.block`,
    },
    {
        view: "v_block_entry_points",
        from: "block",
        key: "block",
        summary: "every entry point whose flow reaches a block",
        sql: `SELECT block, entryPoint FROM v_entry_point_blocks`,
    },
    {
        view: "v_capability_blocks",
        from: "capability",
        key: "capability",
        summary: "every block the entry points of a capability reach",
        sql: `SELECT c.id AS capability, b.id AS block
            FROM blockCapability bc JOIN record c ON c.recordNumber = bc.capability
            JOIN record b ON b.recordNumber = bc.block`,
    },
    {
        view: "v_block_capabilities",
        from: "block",
        key: "block",
        summary: "every capability whose entry points reach a block",
        sql: `SELECT block, capability FROM v_capability_blocks`,
    },
    {
        view: "v_block_part",
        from: "block",
        key: "block",
        summary: "the part of the system a block's file sits in: the part with the longest folder holding it",
        sql: `SELECT b.id AS block, p.id AS part
            FROM record b JOIN filePart fp ON fp.fileNumber = b.fileNumber JOIN record p ON p.recordNumber = fp.part
            WHERE b.type = 'Block'`,
    },
    {
        view: "v_block",
        from: "system",
        key: "",
        summary:
            "each block: name, container, code kind, layer, position, part, and how many capabilities reach it (1 is reached by one alone, 0 by none)",
        sql: `SELECT b.id AS block, json_extract(b.body, '$.writtenAs') AS name,
                json_extract(b.body, '$.container') AS container, k.id AS codeKind,
                json_extract(k.body, '$.name') AS codeKindName, l.id AS layer, json_extract(l.body, '$.name') AS layerName,
                f.path AS file, b.firstLine, b.lastLine, bp.id AS part,
                (SELECT count(*) FROM blockCapability bc WHERE bc.block = b.recordNumber) AS capabilities
            FROM record b JOIN file f ON f.fileNumber = b.fileNumber
            JOIN ref rk ON rk.fromRecord = b.recordNumber AND rk.role = 'codeKind'
            JOIN record k ON k.recordNumber = rk.toRecord
            LEFT JOIN ref rl ON rl.fromRecord = k.recordNumber AND rl.role = 'layer'
            LEFT JOIN record l ON l.recordNumber = rl.toRecord
            LEFT JOIN filePart fp ON fp.fileNumber = b.fileNumber LEFT JOIN record bp ON bp.recordNumber = fp.part
            WHERE b.type = 'Block'`,
    },
    {
        view: "v_block_calls",
        from: "block",
        key: "block",
        summary:
            "each link between two blocks: the calling block, the block reached, how (call, renders, reads, saves, request, leadsTo, dispatches: the calling block can run in place of the block reached)",
        sql: `SELECT a.id AS fromBlock, b.id AS toBlock, le.kind
            FROM linkEnd le JOIN record a ON a.recordNumber = le.fromBlock JOIN record b ON b.recordNumber = le.toBlock`,
    },
    {
        view: "v_block_callers",
        from: "block",
        key: "block",
        summary: "the blocks that reach a block, and how",
        sql: `SELECT toBlock AS block, fromBlock AS caller, kind FROM v_block_calls`,
    },
    {
        view: "v_block_callees",
        from: "block",
        key: "block",
        summary: "the blocks a block reaches, and how",
        sql: `SELECT fromBlock AS block, toBlock AS callee, kind FROM v_block_calls`,
    },
    {
        view: "v_block_entities",
        from: "block",
        key: "block",
        summary: "the kinds of data a block reads or saves, through the resource it names",
        sql: `SELECT DISTINCT b.id AS block, ent.id AS entity
            FROM linkEnd le JOIN record b ON b.recordNumber = le.fromBlock
            JOIN resource rs ON rs.externalSystem = le.toExternalSystem AND rs.resource = le.resource
            JOIN record ra ON ra.type = 'ResourceAssignment' AND json_extract(ra.body, '$.resource') = rs.id
            JOIN record ent ON ent.id = json_extract(ra.body, '$.entity')
            WHERE le.kind IN ('reads', 'saves')`,
    },
    {
        view: "v_entity_access",
        from: "entity",
        key: "entity",
        summary: "which blocks read and which save each kind of data, through the resource they name",
        sql: `SELECT DISTINCT ent.id AS entity, b.id AS block, le.kind
            FROM linkEnd le JOIN record b ON b.recordNumber = le.fromBlock
            JOIN resource rs ON rs.externalSystem = le.toExternalSystem AND rs.resource = le.resource
            JOIN record ra ON ra.type = 'ResourceAssignment' AND json_extract(ra.body, '$.resource') = rs.id
            JOIN record ent ON ent.id = json_extract(ra.body, '$.entity')
            WHERE le.kind IN ('reads', 'saves')`,
    },
    {
        view: "v_capability_entities",
        from: "capability",
        key: "capability",
        summary: "the kinds of data the blocks of a capability read or save",
        sql: `SELECT DISTINCT cb.capability, be.entity
            FROM v_capability_blocks cb JOIN v_block_entities be ON be.block = cb.block`,
    },
    {
        view: "v_rule",
        from: "system",
        key: "",
        summary:
            "each business rule: what it says, the block deciding it, where, the change of state it gates, how many capabilities reach it",
        sql: `SELECT r.id AS rule, json_extract(r.body, '$.says') AS says, b.id AS block, f.path AS file,
                r.firstLine, r.lastLine, json_extract(r.body, '$.gates') AS gates,
                CASE WHEN b.id IS NULL THEN 0 ELSE (SELECT count(*) FROM blockCapability bc WHERE bc.block = b.recordNumber) END AS capabilities
            FROM record r JOIN file f ON f.fileNumber = r.fileNumber JOIN ruleBlock rb ON rb.rule = r.recordNumber
            LEFT JOIN record b ON b.recordNumber = rb.block
            WHERE r.type = 'BusinessRule'`,
    },
    {
        view: "v_block_rules",
        from: "block",
        key: "block",
        summary: "the rules a block decides",
        sql: `SELECT block, rule FROM v_rule WHERE block IS NOT NULL`,
    },
    {
        view: "v_rule_gates",
        from: "rule",
        key: "rule",
        summary: "the change of state each gating rule allows or refuses",
        sql: `SELECT rule, gates AS transition FROM v_rule WHERE gates IS NOT NULL`,
    },
    {
        view: "v_entity_stores",
        from: "entity",
        key: "entity",
        summary: "where a kind of data is kept: the external system and resource of each assignment",
        sql: `SELECT ent.id AS entity, es.id AS externalSystem, json_extract(es.body, '$.name') AS externalSystemName,
                rs.resource
            FROM record ra JOIN record ent ON ent.id = json_extract(ra.body, '$.entity')
            JOIN resource rs ON rs.id = json_extract(ra.body, '$.resource')
            JOIN record es ON es.recordNumber = rs.externalSystem WHERE ra.type = 'ResourceAssignment'`,
    },
    {
        view: "v_entity_tables",
        from: "entity",
        key: "entity",
        summary:
            "the tables and views (declarations of a stored resource) of a kind of data, through the resource's assignment, with their columns",
        sql: `SELECT ent.id AS entity, d.id AS definition, json_extract(d.body, '$.writtenAs') AS name,
                json_extract(d.body, '$.declares.resource') AS resource, es.id AS externalSystem,
                f.path AS file, d.firstLine, d.lastLine, json_extract(d.body, '$.fields') AS fields
            FROM record d JOIN file f ON f.fileNumber = d.fileNumber
            JOIN record es ON es.id = json_extract(d.body, '$.declares.externalSystem')
            JOIN resource rs ON rs.externalSystem = es.recordNumber AND rs.resource = json_extract(d.body, '$.declares.resource')
            JOIN record ra ON ra.type = 'ResourceAssignment' AND json_extract(ra.body, '$.resource') = rs.id
            JOIN record ent ON ent.id = json_extract(ra.body, '$.entity')
            WHERE d.type = 'DataDefinition'`,
    },
    {
        view: "v_entity_definitions",
        from: "entity",
        key: "entity",
        summary: "the shapes of data (declarations) assigned to a kind of data, with their fields",
        sql: `SELECT ent.id AS entity, d.id AS definition, json_extract(d.body, '$.writtenAs') AS name, f.path AS file,
                d.firstLine, d.lastLine, json_extract(d.body, '$.fields') AS fields
            FROM record sa JOIN record ent ON ent.id = json_extract(sa.body, '$.entity')
            JOIN record d ON d.id = json_extract(sa.body, '$.definition') JOIN file f ON f.fileNumber = d.fileNumber
            WHERE sa.type = 'ShapeAssignment'`,
    },
    ...factRelations,
];

/**
 * The statements that make the catalogue's views, in the order they refer to each other.
 * @returns the statements
 */
export const relationStatements = (): readonly string[] =>
    relations.map((relation) => `CREATE VIEW ${relation.view} AS ${relation.sql}`);
