import type { Relation } from "./layer-relations";

/**
 * The catalogue's views of the facts, the risks, the jobs, the coupling between capabilities, the lives of the data
 * and what the analysis does not know, in the order `relations.ts` makes them after its own.
 */
export const factRelations: readonly Relation[] = [
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
