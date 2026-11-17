/**
 * One relation of the accepted model: a flat, read-only view with the names joined in beside the ids. `from` is the kind
 * of record the relation starts from (`system` for one that lists everything of its kind) and `key` the column that
 * kind's records are looked up by.
 */
export type Relation = {
    readonly view: string;
    readonly from: string;
    readonly key: string;
    readonly summary: string;
    readonly sql: string;
};

/**
 * The relations over the layers, the screens and the cross-cutting concerns: how the tiers of the system connect, what
 * each does at the system's boundary, how each capability runs through them, and which shared blocks cut across them.
 * They read the tables derived from the graph (`blockCapability`, `layerEdge`, `entryPointLayer`, `blockFanIn`).
 */
export const layerRelations: readonly Relation[] = [
    {
        view: "v_layer",
        from: "system",
        key: "",
        summary: "each layer (tier) of the system: id, name, what it does for the system",
        sql: `SELECT id AS layer, json_extract(body, '$.name') AS name, json_extract(body, '$.purpose') AS purpose
            FROM record WHERE type = 'Layer'`,
    },
    {
        view: "v_layer_edges",
        from: "layer",
        key: "fromLayer",
        summary:
            "the links between layers, by kind: the layer a link leaves, the layer it reaches, how many links; links into shapes of data reach no block and are not counted",
        sql: `SELECT lf.id AS fromLayer, json_extract(lf.body, '$.name') AS fromName, lt.id AS toLayer,
                json_extract(lt.body, '$.name') AS toName, le.kind, le.links
            FROM layerEdge le JOIN record lf ON lf.recordNumber = le.fromLayer JOIN record lt ON lt.recordNumber = le.toLayer`,
    },
    {
        view: "v_layer_role",
        from: "layer",
        key: "layer",
        summary:
            "what each layer does at the system's boundary, from the code alone: its entry points by who starts them, its blocks that read or save a data store, and a role: where at least half its entry points are started by one kind of starter, that (facesPerson, facesOtherSystems, runsOnSchedule); otherwise, where at least a quarter of its blocks reach a data store, reachesStore; otherwise decides (code that only computes and calls). A layer whose entry points split between starters is mixedEntry",
        sql: `SELECT layer, name, blocks, entryPoints, byPerson, byOtherSystem, bySchedule, storeBlocks,
                CASE WHEN entryPoints > 0 AND byPerson * 2 >= entryPoints THEN 'facesPerson'
                    WHEN entryPoints > 0 AND byOtherSystem * 2 >= entryPoints THEN 'facesOtherSystems'
                    WHEN entryPoints > 0 AND bySchedule * 2 >= entryPoints THEN 'runsOnSchedule'
                    WHEN entryPoints > 0 THEN 'mixedEntry'
                    WHEN blocks > 0 AND storeBlocks * 4 >= blocks THEN 'reachesStore'
                    ELSE 'decides' END AS role
            FROM (SELECT l.id AS layer, json_extract(l.body, '$.name') AS name, count(*) AS blocks,
                    sum(ep.recordNumber IS NOT NULL) AS entryPoints,
                    sum(json_extract(b.body, '$.entryPoint.startedBy') = 'person') AS byPerson,
                    sum(json_extract(b.body, '$.entryPoint.startedBy') = 'otherSystem') AS byOtherSystem,
                    sum(json_extract(b.body, '$.entryPoint.startedBy') = 'schedule') AS bySchedule,
                    sum(EXISTS (SELECT 1 FROM linkEnd le JOIN record es ON es.recordNumber = le.toExternalSystem
                        WHERE le.fromBlock = b.recordNumber AND le.kind IN ('reads', 'saves')
                            AND json_extract(es.body, '$.kind') = 'dataStore')) AS storeBlocks
                FROM record l JOIN ref rl ON rl.toRecord = l.recordNumber AND rl.role = 'layer'
                JOIN ref rk ON rk.toRecord = rl.fromRecord AND rk.role = 'codeKind'
                JOIN record b ON b.recordNumber = rk.fromRecord AND b.type = 'Block'
                LEFT JOIN entryPoint ep ON ep.recordNumber = b.recordNumber
                WHERE l.type = 'Layer' GROUP BY l.id)`,
    },
    {
        view: "v_capability_layers",
        from: "capability",
        key: "capability",
        summary:
            "for each capability, the layers its flows run through: the blocks reached there, how many are entry points of it (actions), how many are shared with another capability, and the rules decided there",
        sql: `SELECT c.id AS capability, l.id AS layer, json_extract(l.body, '$.name') AS layerName,
                count(*) AS blocks, sum(ep.recordNumber IS NOT NULL) AS actions,
                sum((SELECT count(*) FROM blockCapability x WHERE x.block = bc.block) > 1) AS sharedBlocks,
                sum((SELECT count(*) FROM ruleBlock rb WHERE rb.block = bc.block)) AS rules
            FROM blockCapability bc JOIN record c ON c.recordNumber = bc.capability
            JOIN ref rk ON rk.fromRecord = bc.block AND rk.role = 'codeKind'
            JOIN ref rl ON rl.fromRecord = rk.toRecord AND rl.role = 'layer'
            JOIN record l ON l.recordNumber = rl.toRecord
            LEFT JOIN entryPoint ep ON ep.recordNumber = bc.block AND EXISTS (
                SELECT 1 FROM ref re JOIN ref rc ON rc.fromRecord = re.fromRecord AND rc.role = 'capability'
                WHERE re.role = 'entryPoint' AND re.toRecord = bc.block AND rc.toRecord = bc.capability)
            GROUP BY c.id, l.id`,
    },
    {
        view: "v_file_layers",
        from: "layer",
        key: "layer",
        summary:
            "the layers each file's blocks sit in, with how many blocks in each: a file spanning two layers shows both",
        sql: `SELECT f.path AS file, l.id AS layer, json_extract(l.body, '$.name') AS layerName, count(*) AS blocks
            FROM record b JOIN file f ON f.fileNumber = b.fileNumber
            JOIN ref rk ON rk.fromRecord = b.recordNumber AND rk.role = 'codeKind'
            JOIN ref rl ON rl.fromRecord = rk.toRecord AND rl.role = 'layer'
            JOIN record l ON l.recordNumber = rl.toRecord
            WHERE b.type = 'Block' GROUP BY f.path, l.id`,
    },
    {
        view: "v_entry_point_path",
        from: "entryPoint",
        key: "entryPoint",
        summary:
            "the layers an entry point's flow reaches, in the order the flow first meets them: depth is the fewest links from the entry point to a block of that layer (0 is its own layer); flows through a `dispatches` link are possible, not certain",
        sql: `SELECT e.id AS entryPoint, l.id AS layer, json_extract(l.body, '$.name') AS layerName, ep.depth
            FROM entryPointLayer ep JOIN record e ON e.recordNumber = ep.entryPoint
            JOIN record l ON l.recordNumber = ep.layer`,
    },
    {
        view: "v_unresolved_link",
        from: "capability",
        key: "capability",
        summary:
            "each link that reaches nothing the code shows, with the reason, where it is, the layer it leaves and the capabilities that reach it (none when no entry point does); a link into lines that run nothing, such as a shape of data, is not one",
        sql: `SELECT r.id AS link, le.kind, json_extract(r.body, '$.unresolvedTarget') AS reason,
                f.path AS file, r.firstLine, r.lastLine, l.id AS layer, c.id AS capability
            FROM linkEnd le JOIN record r ON r.recordNumber = le.linkRecord JOIN file f ON f.fileNumber = r.fileNumber
            LEFT JOIN ref rk ON rk.fromRecord = le.fromBlock AND rk.role = 'codeKind'
            LEFT JOIN ref rl ON rl.fromRecord = rk.toRecord AND rl.role = 'layer'
            LEFT JOIN record l ON l.recordNumber = rl.toRecord
            LEFT JOIN blockCapability bc ON bc.block = le.fromBlock LEFT JOIN record c ON c.recordNumber = bc.capability
            WHERE le.toBlock IS NULL AND le.toExternalSystem IS NULL AND le.toFile IS NULL`,
    },
    {
        view: "v_capability_screens",
        from: "capability",
        key: "capability",
        summary:
            "the screens of a capability: its entry points grouped by the container that holds them (the form, page or view class), with how many actions each has and how many rules are decided in blocks of that container; entry points with no container are grouped as one with no name",
        sql: `SELECT c.id AS capability, json_extract(b.body, '$.container') AS screen, count(*) AS actions,
                sum((SELECT count(*) FROM ruleBlock rb WHERE rb.block = b.recordNumber)) AS rules
            FROM record a JOIN ref re ON re.fromRecord = a.recordNumber AND re.role = 'entryPoint'
            JOIN ref rc ON rc.fromRecord = a.recordNumber AND rc.role = 'capability'
            JOIN record c ON c.recordNumber = rc.toRecord JOIN record b ON b.recordNumber = re.toRecord
            WHERE a.type = 'EntryPointAssignment' GROUP BY c.id, json_extract(b.body, '$.container')`,
    },
    {
        view: "v_screen_controls",
        from: "capability",
        key: "screen",
        summary:
            "the controls of each screen: the fields of the data definition whose name is the name of a container holding blocks, with what the layout declares of each (type, caption, limits)",
        sql: `SELECT json_extract(d.body, '$.writtenAs') AS screen, d.id AS definition,
                json_extract(fd.value, '$.writtenAs') AS control, json_extract(fd.value, '$.declaredAs') AS declaredAs
            FROM record d JOIN json_each(d.body, '$.fields') fd
            WHERE d.type = 'DataDefinition' AND EXISTS (
                SELECT 1 FROM record b WHERE b.type = 'Block'
                    AND json_extract(b.body, '$.container') = json_extract(d.body, '$.writtenAs'))`,
    },
    {
        view: "v_crosscut_candidate",
        from: "system",
        key: "",
        summary:
            "the blocks that may be cross-cutting, found by rule and not by judgement: reached by at least two capabilities and by at least a third of all capabilities, and called from more than one layer; with how many capabilities reach each and from how many layers it is called. Shared business code qualifies as well as mechanisms; telling them apart is the judgement `v_crosscut` records",
        sql: `SELECT b.id AS block, json_extract(b.body, '$.writtenAs') AS name, json_extract(b.body, '$.container') AS container,
                f.path AS file, b.firstLine, b.lastLine, c.capabilities, fi.callerLayers, fi.callers
            FROM (SELECT block, count(*) AS capabilities FROM blockCapability GROUP BY block) c
            JOIN blockFanIn fi ON fi.block = c.block JOIN record b ON b.recordNumber = c.block
            JOIN file f ON f.fileNumber = b.fileNumber
            WHERE c.capabilities >= 2 AND c.capabilities * 3 >= (SELECT count(*) FROM record WHERE type = 'Capability')
                AND fi.callerLayers >= 2`,
    },
    {
        view: "v_crosscut",
        from: "system",
        key: "",
        summary:
            "each judged cluster of shared blocks: its name, what it does, the verdict (crossCutting, sharedDomain or neither) and each block it holds",
        sql: `SELECT c.id AS concern, json_extract(c.body, '$.name') AS name, json_extract(c.body, '$.purpose') AS purpose,
                json_extract(c.body, '$.verdict') AS verdict, b.id AS block
            FROM record c JOIN ref r ON r.fromRecord = c.recordNumber AND r.role = 'blocks'
            JOIN record b ON b.recordNumber = r.toRecord WHERE c.type = 'CrossCuttingConcern'`,
    },
    {
        view: "v_capability_concerns",
        from: "capability",
        key: "capability",
        summary:
            "the cross-cutting concerns each capability's flows pass through, and the shared domain code they lean on: the judged cluster, its verdict and how many of its blocks the capability reaches",
        sql: `SELECT cap.id AS capability, c.id AS concern, json_extract(c.body, '$.name') AS name,
                json_extract(c.body, '$.verdict') AS verdict, count(*) AS blocks
            FROM record c JOIN ref r ON r.fromRecord = c.recordNumber AND r.role = 'blocks'
            JOIN blockCapability bc ON bc.block = r.toRecord JOIN record cap ON cap.recordNumber = bc.capability
            WHERE c.type = 'CrossCuttingConcern' GROUP BY cap.id, c.id`,
    },
];
