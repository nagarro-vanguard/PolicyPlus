import { Effect } from "effect";
import type { RecordStore } from "../store/database";
import { graphTypes } from "../graph/graph-writes";
import { EntryFileCountRow, FilePairCountRow, LayerFileCountRow, LayerUseRow } from "../store/rows";
import { decodedRows } from "../store/stored-bodies";

/**
 * The counts of the code read through what its pieces cite: the links between the records blocks cite (their layer
 * components), the links from those to external systems, each resource's uses by link kind and by the layer of the code
 * using it (none for code in no code kind, or in no block), and where each layer's code lies, read through each
 * block's and data definition's code kind to its layer; and, by file, each code kind's pieces with how many
 * are entry points, and each external system's uses, the registries' standing (4.4). Each is one aggregate, as large as the
 * registries and the files.
 * @param store the record store
 * @returns the counts
 */
export const countsThroughCodeKinds = (store: RecordStore["Service"]) => ({
    countResourceUsesByLayer: store
        .query((sql) =>
            decodedRows(LayerUseRow)(sql`SELECT i.id AS externalSystem, le.resource, le.kind, (
                    SELECT min(l.id) FROM citation bc
                    JOIN record lc ON lc.recordNumber = bc.toRecord AND lc.type = ${graphTypes.codeKind}
                    JOIN citation lcc ON lcc.fromRecord = lc.recordNumber
                    JOIN record l ON l.recordNumber = lcc.toRecord AND l.type = ${graphTypes.layer}
                    WHERE bc.fromRecord = le.fromBlock
                ) AS layer, count(*) AS count
            FROM linkEnd le JOIN record i ON i.recordNumber = le.toExternalSystem
            WHERE le.toExternalSystem IS NOT NULL
            GROUP BY le.toExternalSystem, le.resource, le.kind, layer
            ORDER BY le.toExternalSystem, le.resource, le.kind, layer`),
        )
        .pipe(Effect.withSpan("CodeGraph.countResourceUsesByLayer")),
    countInLayersByFile: store
        .query((sql) =>
            decodedRows(
                LayerFileCountRow,
            )(sql`SELECT l.id AS layer, f.path AS file, count(DISTINCT p.recordNumber) AS count
            FROM record p JOIN file f ON f.fileNumber = p.fileNumber
            JOIN citation pc ON pc.fromRecord = p.recordNumber
            JOIN record lc ON lc.recordNumber = pc.toRecord AND lc.type = ${graphTypes.codeKind}
            JOIN citation lcc ON lcc.fromRecord = lc.recordNumber
            JOIN record l ON l.recordNumber = lcc.toRecord AND l.type = ${graphTypes.layer}
            WHERE p.type IN (${graphTypes.block}, ${graphTypes.definition})
            GROUP BY l.recordNumber, p.fileNumber
            ORDER BY l.recordNumber, f.path`),
        )
        .pipe(Effect.withSpan("CodeGraph.countInLayersByFile")),
    countCodeKindsByFile: store
        .query((sql) =>
            decodedRows(EntryFileCountRow)(sql`SELECT bb.id AS entry, f.path AS file, count(*) AS count,
                count(e.recordNumber) AS entryPoints
            FROM record p JOIN file f ON f.fileNumber = p.fileNumber
            JOIN citation pc ON pc.fromRecord = p.recordNumber
            JOIN record bb ON bb.recordNumber = pc.toRecord AND bb.type = ${graphTypes.codeKind}
            LEFT JOIN entryPoint e ON e.recordNumber = p.recordNumber
            WHERE p.type IN (${graphTypes.block}, ${graphTypes.definition})
            GROUP BY bb.recordNumber, p.fileNumber
            ORDER BY bb.recordNumber, f.path`),
        )
        .pipe(Effect.withSpan("CodeGraph.countCodeKindsByFile")),
    countExternalSystemUsesByFile: store
        .query((sql) =>
            decodedRows(EntryFileCountRow)(sql`SELECT x.id AS entry, f.path AS file, count(*) AS count, 0 AS entryPoints
            FROM linkEnd le JOIN record l ON l.recordNumber = le.linkRecord
            JOIN file f ON f.fileNumber = l.fileNumber
            JOIN record x ON x.recordNumber = le.toExternalSystem
            WHERE le.toExternalSystem IS NOT NULL
            GROUP BY le.toExternalSystem, l.fileNumber
            ORDER BY le.toExternalSystem, f.path`),
        )
        .pipe(Effect.withSpan("CodeGraph.countExternalSystemUsesByFile")),
});

/**
 * The links of code between files (T50): by pair of files and kind, the `call`, `renders`, `request` and `dispatches` links whose two
 * ends lie in different files, from which the connections between parts are merged. One aggregate, as large as the
 * pairs of files a link joins.
 * @param store the record store
 * @returns the count
 */
export const countsBetweenFiles = (store: RecordStore["Service"]) => ({
    countLinksBetweenFiles: store
        .query((sql) =>
            decodedRows(FilePairCountRow)(sql`SELECT ff.path AS fromFile, tf.path AS toFile, le.kind, count(*) AS count
            FROM linkEnd le JOIN record fb ON fb.recordNumber = le.fromBlock
            JOIN record tb ON tb.recordNumber = le.toBlock
            JOIN file ff ON ff.fileNumber = fb.fileNumber JOIN file tf ON tf.fileNumber = tb.fileNumber
            WHERE le.kind IN ('call', 'renders', 'request', 'dispatches') AND fb.fileNumber <> tb.fileNumber
            GROUP BY fb.fileNumber, tb.fileNumber, le.kind
            ORDER BY ff.path, tf.path, le.kind`),
        )
        .pipe(Effect.withSpan("CodeGraph.countLinksBetweenFiles")),
});
