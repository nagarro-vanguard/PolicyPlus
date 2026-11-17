import { Effect } from "effect";
import type { SqlClient, Statement } from "effect/sql";
import { Link } from "../model/schemas/map";
import { decodedBody, decodedRows } from "../store/stored-bodies";
import { graphTypes } from "./graph-writes";
import { LinkEndRow } from "../store/rows";

type LinkRecord = typeof Link.Type;

export type LinkEnd = {
    readonly link: string;
    readonly kind: LinkRecord["kind"];
    readonly fromBlock?: string;
    readonly toBlock?: string;
    readonly toDefinition?: string;
    readonly externalSystem?: string;
    readonly resource?: string;
    readonly unproven?: true;
    readonly outside?: string;
};

type LinkEndRowType = typeof LinkEndRow.Type;

/**
 * A link end as readers use it: the blocks it joins, and from the link itself its kind, the external system and resource
 * it uses, whether it has no target (no external system fits, or the code does not show it), the data definition it
 * reaches when its target line starts one and no block, or, for a target in code nothing holds, where it points.
 * @param link the link
 * @param ends the blocks and the data definition the store resolved it to
 * @param ends.fromBlock the block holding its lines, when one does
 * @param ends.toBlock the block it reaches, when one does
 * @param ends.toDefinition the data definition starting on its target line, when no block does
 * @returns the link end
 */
const joinedEnd = (
    link: LinkRecord,
    ends: { fromBlock: string | null; toBlock: string | null; toDefinition: string | null },
): LinkEnd => {
    const target =
        link.to === undefined
            ? { unproven: true as const }
            : "externalSystem" in link.to
              ? { externalSystem: link.to.externalSystem, resource: link.to.resource }
              : ends.toBlock !== null
                ? {}
                : ends.toDefinition !== null
                  ? { toDefinition: ends.toDefinition }
                  : { outside: `${link.to.file}:${link.to.line}` };
    return {
        link: link.id,
        ...(ends.fromBlock === null ? {} : { fromBlock: ends.fromBlock }),
        ...(ends.toBlock === null ? {} : { toBlock: ends.toBlock }),
        kind: link.kind,
        ...target,
    };
};

/**
 * The rows of the link ends a condition on `le` (the link end) and `l` (the link's record) selects, in stage order,
 * then the order the links were written; a link no block answers is given the data definition starting on its target
 * line, by position (`recordByPosition`).
 * @param sql the client
 * @param condition the condition, as a fragment
 * @returns the statement selecting the rows
 */
export const linkEndRows = (sql: SqlClient.SqlClient, condition: Statement.Fragment) =>
    decodedRows(LinkEndRow)(sql`SELECT l.recordNumber, l.id, l.body, f.id AS fromBlock, t.id AS toBlock,
            CASE WHEN le.toBlock IS NULL THEN (SELECT d.id FROM record d WHERE d.type = ${graphTypes.definition}
                AND d.fileNumber = le.toFile AND d.firstLine <= le.toLine AND d.lastLine >= le.toLine
                ORDER BY d.lastLine - d.firstLine, d.recordNumber LIMIT 1) END AS toDefinition
        FROM linkEnd le JOIN record l ON l.recordNumber = le.linkRecord JOIN stageWrite s ON s.stage = l.stage
        LEFT JOIN record f ON f.recordNumber = le.fromBlock LEFT JOIN record t ON t.recordNumber = le.toBlock
        WHERE ${condition}
        ORDER BY s.rank, l.recordNumber`);

/**
 * Link ends, each joined with its link's body.
 * @param path the store's file, named when a link's body does not decode
 * @param rows the rows
 * @returns the link ends, in the rows' order
 */
export const joinedEnds = (path: string, rows: readonly LinkEndRowType[]) =>
    Effect.forEach(rows, (row) => Effect.map(decodedBody(path, row, Link), (link) => joinedEnd(link, row)));
