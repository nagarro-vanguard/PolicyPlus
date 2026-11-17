import type { RecordStore } from "../store/database";
import { BlockNameRow, ExternalNameLinkRow, RepeatedCopyRow } from "../store/rows";
import { decodedRows } from "../store/stored-bodies";

/**
 * What the Map's reports read, each one query over the accepted records: every block whose name and container are
 * written by blocks in two or more files, with each copy's lines; the links to an external system whose resource, in
 * lower case, is the name of a block (a link to a place by position carries no such link, so it is left out); and the
 * blocks those names belong to. Names are compared as written, in lower case, and nothing else is changed.
 * @param store the record store
 * @returns the reads
 */
export const mapReportReads = (store: RecordStore["Service"]) => ({
    repeatedCopies: store.query((sql) =>
        decodedRows(RepeatedCopyRow)(sql`WITH named AS (
                SELECT lower(json_extract(b.body, '$.writtenAs')) AS name,
                    coalesce(json_extract(b.body, '$.container'), '') AS container,
                    b.fileNumber, b.firstLine, b.lastLine
                FROM record b
                WHERE b.type = 'Block' AND coalesce(json_extract(b.body, '$.writtenAs'), '') <> ''
            ), repeated AS (
                SELECT name, container FROM named GROUP BY name, container HAVING count(DISTINCT fileNumber) > 1
            )
            SELECT n.name, n.container, f.path AS file, n.firstLine, n.lastLine
            FROM named n JOIN repeated r ON r.name = n.name AND r.container = n.container
            JOIN file f ON f.fileNumber = n.fileNumber
            ORDER BY n.name, n.container, f.path, n.firstLine`),
    ),
    externalLinksNamingBlocks: store.query((sql) =>
        decodedRows(ExternalNameLinkRow)(sql`SELECT json_extract(i.body, '$.name') AS system, le.resource,
                f.path AS file, l.firstLine AS line
            FROM linkEnd le JOIN record l ON l.recordNumber = le.linkRecord
            JOIN file f ON f.fileNumber = l.fileNumber JOIN record i ON i.recordNumber = le.toExternalSystem
            WHERE le.toExternalSystem IS NOT NULL AND le.toFile IS NULL
                AND lower(le.resource) IN (
                    SELECT lower(json_extract(b.body, '$.writtenAs')) FROM record b
                    WHERE b.type = 'Block' AND coalesce(json_extract(b.body, '$.writtenAs'), '') <> '')
            ORDER BY le.resource, f.path, l.firstLine`),
    ),
    blocksNamedByExternalLinks: store.query((sql) =>
        decodedRows(BlockNameRow)(sql`SELECT lower(json_extract(b.body, '$.writtenAs')) AS name, f.path AS file,
                b.firstLine, b.lastLine
            FROM record b JOIN file f ON f.fileNumber = b.fileNumber
            WHERE b.type = 'Block' AND lower(json_extract(b.body, '$.writtenAs')) IN (
                SELECT lower(le.resource) FROM linkEnd le
                WHERE le.toExternalSystem IS NOT NULL AND le.toFile IS NULL)
            ORDER BY name, f.path, b.firstLine`),
    ),
});
