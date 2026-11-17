import { Effect, Schema } from "effect";
import { compareText } from "../run/collections";
import type { RecordStore } from "../store/database";
import { read } from "./payload-queries";

const Text = Schema.String;
const Count = Schema.Number;

const LifecycleRow = Schema.Struct({
    id: Text,
    entityId: Text,
    entityName: Text,
    states: Schema.fromJsonString(Schema.Array(Schema.Struct({ name: Text }))),
});
const TransitionRow = Schema.Struct({
    lifecycle: Text,
    fromStates: Schema.fromJsonString(Schema.Union([Schema.Literal("created"), Schema.Array(Count)])),
    to: Count,
    file: Text,
    line: Count,
});
const PartLinkRow = Schema.Struct({ from: Text, to: Text, kind: Text, links: Count });
const DataUseRow = Schema.Struct({
    capability: Text,
    capabilityName: Text,
    entity: Text,
    entityName: Text,
    kind: Text,
});
const FigureRow = Schema.Struct({
    id: Text,
    kind: Schema.Literals(["parts", "integration", "states", "data", "layers", "other"]),
    question: Text,
    caption: Text,
    wanted: Text,
    records: Schema.fromJsonString(Schema.Array(Text)),
});

/**
 * The lives of the kinds of data that have states, each with the places that move a record between states.
 * @param store the record store, read only
 * @returns the lives
 */
const lifecyclesOf = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const lives = yield* read(
        store,
        LifecycleRow,
        (sql) => sql`SELECT l.id AS id, e.id AS entityId, json_extract(e.body, '$.name') AS entityName,
                json_extract(l.body, '$.states') AS states
            FROM record l JOIN record e ON e.id = json_extract(l.body, '$.entity')
            WHERE l.type = 'Lifecycle' AND json_extract(l.body, '$.states') IS NOT NULL ORDER BY entityName`,
    );
    const transitions = yield* read(
        store,
        TransitionRow,
        (sql) => sql`SELECT json_extract(body, '$.lifecycle') AS lifecycle,
                CASE WHEN json_type(body, '$.fromStates') = 'text' THEN '"created"' ELSE json_extract(body, '$.fromStates') END AS fromStates,
                json_extract(body, '$.to') AS "to", json_extract(body, '$.writtenAt.file') AS file,
                json_extract(body, '$.writtenAt.firstLine') AS line
            FROM record WHERE type = 'Transition' ORDER BY recordNumber`,
    );
    return lives.map((life) => ({
        id: life.id,
        entity: { id: life.entityId, name: life.entityName },
        states: life.states.map((state) => state.name),
        transitions: transitions
            .filter((transition) => transition.lifecycle === life.id)
            .map((transition) => ({
                from: transition.fromStates === "created" ? [] : [...transition.fromStates],
                to: transition.to,
                file: transition.file,
                line: transition.line,
            })),
    }));
});

/**
 * The links between parts, and from parts to outside systems, by kind.
 * @param store the record store, read only
 * @returns one row per pair and kind
 */
const partLinksOf = (store: RecordStore["Service"]) =>
    read(
        store,
        PartLinkRow,
        (sql) => sql`SELECT pa.id AS "from", pb.id AS "to", le.kind AS kind, count(*) AS links
            FROM linkEnd le JOIN record a ON a.recordNumber = le.fromBlock JOIN filePart fa ON fa.fileNumber = a.fileNumber
            JOIN record pa ON pa.recordNumber = fa.part JOIN record b ON b.recordNumber = le.toBlock
            JOIN filePart fb ON fb.fileNumber = b.fileNumber JOIN record pb ON pb.recordNumber = fb.part
            WHERE fa.part <> fb.part GROUP BY pa.id, pb.id, le.kind
            UNION ALL
            SELECT pa.id AS "from", es.id AS "to", le.kind AS kind, count(*) AS links
            FROM linkEnd le JOIN record a ON a.recordNumber = le.fromBlock JOIN filePart fa ON fa.fileNumber = a.fileNumber
            JOIN record pa ON pa.recordNumber = fa.part JOIN record es ON es.recordNumber = le.toExternalSystem
            WHERE json_extract(es.body, '$.kind') <> 'library' GROUP BY pa.id, es.id, le.kind`,
    );

/**
 * Which capability's code saves or reads which kind of data.
 * @param store the record store, read only
 * @returns one row per capability and kind of data, each with whether it saves and whether it reads
 */
const dataUseOf = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const rows = yield* read(
        store,
        DataUseRow,
        (sql) => sql`SELECT cap.id AS capability, json_extract(cap.body, '$.name') AS capabilityName, ent.id AS entity,
                json_extract(ent.body, '$.name') AS entityName, le.kind AS kind
            FROM linkEnd le JOIN blockCapability bc ON bc.block = le.fromBlock JOIN record cap ON cap.recordNumber = bc.capability
            JOIN resource rs ON rs.externalSystem = le.toExternalSystem AND rs.resource = le.resource
            JOIN record ra ON ra.type = 'ResourceAssignment' AND json_extract(ra.body, '$.resource') = rs.id
            JOIN record ent ON ent.id = json_extract(ra.body, '$.entity')
            WHERE le.kind IN ('reads', 'saves') GROUP BY cap.id, ent.id, le.kind`,
    );
    const pairs = new Map<
        string,
        {
            capability: { id: string; name: string };
            entity: { id: string; name: string };
            saves: boolean;
            reads: boolean;
        }
    >();
    for (const row of rows) {
        const key = `${row.capability}|${row.entity}`;
        const own = pairs.get(key);
        const before = own === undefined ? { saves: false, reads: false } : own;
        pairs.set(key, {
            capability: { id: row.capability, name: row.capabilityName },
            entity: { id: row.entity, name: row.entityName },
            saves: before.saves || row.kind === "saves",
            reads: before.reads || row.kind === "reads",
        });
    }
    return [...pairs.values()].toSorted(
        (left, right) =>
            compareText(left.entity.name, right.entity.name) ||
            compareText(left.capability.name, right.capability.name),
    );
});

/**
 * The figures the briefing chose, in the order it chose them.
 * @param store the record store, read only
 * @returns the figures
 */
const figuresOf = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const rows = yield* read(
        store,
        FigureRow,
        (sql) => sql`SELECT id, json_extract(body, '$.kind') AS kind, json_extract(body, '$.question') AS question,
                json_extract(body, '$.caption') AS caption, coalesce(json_extract(body, '$.wanted'), '') AS wanted,
                json_extract(body, '$.records') AS records
            FROM record WHERE type = 'Figure' ORDER BY recordNumber`,
    );
    return rows.map((row) => ({ ...row, records: [...row.records] }));
});

/**
 * The structure the pictures are drawn from: the lives of kinds of data, the links between parts and to outside
 * systems, which capability keeps which kind of data, and the figures the briefing chose.
 * @param store the record store, read only
 * @returns the four lists
 */
export const structureOf = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    return {
        lifecycles: yield* lifecyclesOf(store),
        partLinks: yield* partLinksOf(store),
        dataUse: yield* dataUseOf(store),
        figures: yield* figuresOf(store),
    };
});
