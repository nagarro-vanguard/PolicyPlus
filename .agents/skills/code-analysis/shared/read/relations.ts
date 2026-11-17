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
    {
        view: "v_fact",
        from: "system",
        key: "",
        summary: "each fact: its subject, the question it answers, what it rests on, the statement and its risk",
        sql: `SELECT r.id AS fact, CASE WHEN json_type(r.body, '$.subject') = 'text' THEN 'system'
                    ELSE json_extract(r.body, '$.subject.registry') END AS subjectRegistry,
                CASE WHEN json_type(r.body, '$.subject') = 'text' THEN NULL ELSE json_extract(r.body, '$.subject.key') END AS subject,
                json_extract(r.body, '$.aspect') AS aspect,
                CASE WHEN json_extract(r.body, '$.basis.observed') IS NOT NULL THEN 'observed'
                    WHEN json_extract(r.body, '$.basis.assumed') IS NOT NULL THEN 'assumed' ELSE 'concluded' END AS basis,
                json_extract(r.body, '$.statement') AS statement, json_extract(r.body, '$.risk.category') AS riskCategory,
                json_extract(r.body, '$.risk.severity') AS severity
            FROM record r WHERE r.type = 'Fact'`,
    },
    {
        view: "v_fact_evidence",
        from: "fact",
        key: "fact",
        summary: "the lines a fact rests on",
        sql: `SELECT r.id AS fact, f.path AS file, s.firstLine, s.lastLine
            FROM span s JOIN record r ON r.recordNumber = s.note JOIN file f ON f.fileNumber = s.fileNumber
            WHERE r.type = 'Fact' AND s.role = 'evidence'`,
    },
    {
        view: "v_part_blocks",
        from: "part",
        key: "part",
        summary: "the blocks in a part of the system",
        sql: `SELECT part, block FROM v_block_part`,
    },
    {
        view: "v_job_affects",
        from: "job",
        key: "job",
        summary: "the records each job wrote, by stage and job key",
        sql: `SELECT j.stage, j.jobId AS job, r.id AS record, r.type
            FROM record r JOIN job j ON j.jobNumber = r.jobNumber`,
    },
    {
        view: "v_capability_coupling",
        from: "system",
        key: "",
        summary:
            "each pair of capabilities that reach the same blocks (once, first id below second): blocks and rules in common, and how many blocks each reaches",
        sql: `SELECT ca.id AS capability, ca.name AS capabilityName, cb.id AS other, cb.name AS otherName,
                count(*) AS blocks, sum((SELECT count(*) FROM v_block_rules br WHERE br.block = a.block)) AS rules,
                (SELECT count(*) FROM v_capability_blocks x WHERE x.capability = a.capability) AS capabilityBlocks,
                (SELECT count(*) FROM v_capability_blocks x WHERE x.capability = b.capability) AS otherBlocks
            FROM v_capability_blocks a JOIN v_capability_blocks b ON b.block = a.block AND a.capability < b.capability
            JOIN (SELECT capability AS id, name FROM v_capability) ca ON ca.id = a.capability
            JOIN (SELECT capability AS id, name FROM v_capability) cb ON cb.id = b.capability
            GROUP BY a.capability, b.capability`,
    },
    {
        view: "v_risk",
        from: "system",
        key: "",
        summary:
            "each risk once: a finding that only supports another risk's conclusion is folded into it; its statement, severity, subject, how many risk findings it rests on, and the capabilities it sits in (a JSON list, empty when its lines are in no mapped code)",
        sql: `SELECT r.id AS fact, json_extract(r.body, '$.statement') AS statement,
                json_extract(r.body, '$.risk.severity') AS severity, json_extract(r.body, '$.risk.category') AS category,
                CASE WHEN json_type(r.body, '$.subject') = 'text' THEN NULL ELSE json_extract(r.body, '$.subject.registry') END AS subjectRegistry,
                CASE WHEN json_type(r.body, '$.subject') = 'text' THEN NULL ELSE json_extract(sj.body, '$.name') END AS subjectName,
                (SELECT count(*) FROM json_each(r.body, '$.basis.concluded.from') je
                    WHERE je.value IN (SELECT id FROM record WHERE type = 'Fact' AND json_extract(body, '$.risk') IS NOT NULL)) AS supportingRisks,
                (SELECT json_group_array(DISTINCT bc.capability)
                    FROM v_fact_evidence fe JOIN file ff ON ff.path = fe.file
                    JOIN blockSpan s ON s.fileLow = ff.fileNumber AND s.firstLine <= fe.lastLine AND s.lastLine >= fe.firstLine
                    JOIN record blk ON blk.recordNumber = s.recordNumber
                    JOIN v_block_capabilities bc ON bc.block = blk.id
                    WHERE fe.fact = r.id OR fe.fact IN (SELECT value FROM json_each(r.body, '$.basis.concluded.from'))) AS capabilities
            FROM record r LEFT JOIN record sj ON sj.id = json_extract(r.body, '$.subject.key')
            WHERE r.type = 'Fact' AND json_extract(r.body, '$.risk') IS NOT NULL
                AND r.id NOT IN (SELECT je.value FROM record c, json_each(c.body, '$.basis.concluded.from') je
                    WHERE c.type = 'Fact' AND json_extract(c.body, '$.risk') IS NOT NULL)`,
    },
    {
        view: "v_transition",
        from: "system",
        key: "",
        summary:
            "each change of state with the kind of data, the states it leaves and the state it reaches by name, and where the code writes it",
        sql: `SELECT t.id AS transition, l.id AS lifecycle, ent.id AS entity, json_extract(ent.body, '$.name') AS entityName,
                CASE WHEN json_type(t.body, '$.fromStates') = 'text' THEN '(created)'
                    ELSE (SELECT group_concat(json_extract(s.value, '$.name'), ' | ') FROM json_each(l.body, '$.states') s
                        WHERE s.key + 1 IN (SELECT value FROM json_each(t.body, '$.fromStates'))) END AS fromStates,
                (SELECT json_extract(s.value, '$.name') FROM json_each(l.body, '$.states') s
                    WHERE s.key + 1 = json_extract(t.body, '$.to')) AS toState,
                json_extract(t.body, '$.writtenAt.file') AS file, json_extract(t.body, '$.writtenAt.firstLine') AS firstLine,
                json_extract(t.body, '$.writtenAt.lastLine') AS lastLine
            FROM record t JOIN record l ON l.id = json_extract(t.body, '$.lifecycle')
            JOIN record ent ON ent.id = json_extract(l.body, '$.entity')
            WHERE t.type = 'Transition'`,
    },
    {
        view: "v_unknown",
        from: "system",
        key: "",
        summary:
            "what the analysis does not know, one row each: code no followed call reaches, links whose target the code does not show (with the reason), and assumptions (with how to confirm and what changes if wrong)",
        sql: `SELECT 'notReached' AS kind, b.container || '.' || b.name AS what, 'No call the analysis could follow reaches this code' AS why,
                NULL AS confirmWith, NULL AS ifWrong, b.file, b.firstLine, b.lastLine
            FROM v_block b WHERE b.capabilities = 0
            UNION ALL
            SELECT 'unresolvedLink', CASE json_extract(r.body, '$.kind')
                    WHEN 'call' THEN 'A call to'
                    WHEN 'reads' THEN 'A read of'
                    WHEN 'saves' THEN 'A save to'
                    WHEN 'renders' THEN 'A screen shown from'
                    WHEN 'dispatches' THEN 'A stand-in for'
                    ELSE 'A link to' END || ' somewhere the code does not show',
                json_extract(r.body, '$.unresolvedTarget'), NULL, NULL, json_extract(r.body, '$.lines.file'),
                json_extract(r.body, '$.lines.firstLine'), json_extract(r.body, '$.lines.lastLine')
            FROM record r WHERE r.type = 'Link' AND json_extract(r.body, '$.unresolvedTarget') IS NOT NULL
            UNION ALL
            SELECT 'assumption', json_extract(r.body, '$.statement'), json_extract(r.body, '$.basis.assumed.why'),
                json_extract(r.body, '$.basis.assumed.confirmWith'), json_extract(r.body, '$.basis.assumed.ifWrong'),
                json_extract(r.body, '$.basis.assumed.evidence[0].lines.file'),
                json_extract(r.body, '$.basis.assumed.evidence[0].lines.firstLine'),
                json_extract(r.body, '$.basis.assumed.evidence[0].lines.lastLine')
            FROM record r WHERE r.type = 'Fact' AND json_extract(r.body, '$.basis.assumed') IS NOT NULL`,
    },
];

/**
 * The statements that make the catalogue's views, in the order they refer to each other.
 * @returns the statements
 */
export const relationStatements = (): readonly string[] =>
    relations.map((relation) => `CREATE VIEW ${relation.view} AS ${relation.sql}`);
