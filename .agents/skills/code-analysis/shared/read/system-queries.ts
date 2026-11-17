import { Schema } from "effect";
import type { RecordStore } from "../store/database";
import { ExternalSystem } from "../model/schemas/external-system";
import { read } from "./payload-queries";

const Count = Schema.Number;
const Text = Schema.String;
const MaybeText = Schema.NullOr(Schema.String);

const PartUseRow = Schema.Struct({ id: Text, partKind: MaybeText, blocks: Count });
const ExternalUseRow = Schema.Struct({
    externalSystem: Text,
    name: Text,
    kind: ExternalSystem.fields.kind,
    layer: MaybeText,
    access: Text,
    links: Count,
});
export const StoreRow = Schema.Struct({ entity: Text, store: Text });

/**
 * The parts of the system each layer's blocks lie in, with the part's kind and how many blocks. Read straight from the
 * records: a view would change the accepted model's identity and refuse every analysis already made.
 * @param store the record store, read only
 * @returns one row per layer and part
 */
export const layerPartUse = (store: RecordStore["Service"]) =>
    read(
        store,
        PartUseRow,
        (sql) => sql`SELECT l.id AS id, json_extract(p.body, '$.kind') AS partKind, count(*) AS blocks
            FROM record b JOIN ref rk ON rk.fromRecord = b.recordNumber AND rk.role = 'codeKind'
            JOIN ref rl ON rl.fromRecord = rk.toRecord AND rl.role = 'layer' JOIN record l ON l.recordNumber = rl.toRecord
            JOIN filePart fp ON fp.fileNumber = b.fileNumber JOIN record p ON p.recordNumber = fp.part
            WHERE b.type = 'Block' GROUP BY l.id, p.id`,
    );

/**
 * What the code reaches outside itself other than code with no source: each data store, messaging service and outside
 * service, the layer whose blocks reach it, how, and how many links.
 * @param store the record store, read only
 * @returns one row per external system, layer and kind of link
 */
export const externalUse = (store: RecordStore["Service"]) =>
    read(
        store,
        ExternalUseRow,
        (
            sql,
        ) => sql`SELECT es.id AS externalSystem, json_extract(es.body, '$.name') AS name, json_extract(es.body, '$.kind') AS kind,
                l.id AS layer, le.kind AS access, count(*) AS links
            FROM linkEnd le JOIN record es ON es.recordNumber = le.toExternalSystem
            LEFT JOIN ref rk ON rk.fromRecord = le.fromBlock AND rk.role = 'codeKind'
            LEFT JOIN ref rl ON rl.fromRecord = rk.toRecord AND rl.role = 'layer'
            LEFT JOIN record l ON l.recordNumber = rl.toRecord
            WHERE json_extract(es.body, '$.kind') <> 'library' GROUP BY es.id, l.id, le.kind`,
    );
