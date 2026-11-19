import { Console, Effect, Schema } from "effect";
import { Command } from "effect/cli";
import { BundlePayload } from "../shared/model/schemas/bundle-payload";
import { CapabilityPayload } from "../shared/model/schemas/payloads";
import { readSecondReadings } from "../shared/jobs/second-readings";
import { bundlePayload } from "../shared/read/payload-bundle";
import { KnowledgePayload } from "../shared/model/schemas/knowledge-payload";
import { readCatalogue } from "../shared/run/catalogue";
import { knowledgePayload } from "../shared/read/payload-knowledge";
import { knowledgeGaps } from "../shared/read/knowledge-checks";
import { SystemPayload } from "../shared/model/schemas/system-payload";
import { JourneysPayload } from "../shared/model/schemas/journeys-payload";
import { capabilitySlugs, journeyCoverageGaps, journeyRecords, tasksOf } from "../shared/read/payload-journeys";
import type { CapabilityPayload as CapabilityPayloadOf } from "../shared/model/schemas/payloads";
import { capabilityPayload } from "../shared/read/payload-capability";
import { payloadGaps } from "../shared/read/payload-checks";
import { systemPayload } from "../shared/read/payload-system";
import { AnalysisRoot } from "../shared/run/analysis-root";
import { needsAction, rootServices, runScript } from "../shared/run/run-script";
import { FileAccess } from "../shared/source/file-access";
import { RecordStore } from "../shared/store/database";
import { decodedRows } from "../shared/store/stored-bodies";

const IdRow = Schema.Struct({ id: Schema.String });
const AreaRow = Schema.Struct({ name: Schema.String, capabilities: Schema.String });

/**
 * Write the knowledge payload: what the analysis knows of the system as a whole, checked to hold together.
 * @param store the record store, read only
 * @param system the system's payload, for the ids of the outside systems and layers
 * @param folder the payloads' folder
 * @returns how many gaps it printed
 */
const writeKnowledge = Effect.fnUntraced(function* (
    store: RecordStore["Service"],
    system: SystemPayload,
    folder: string,
) {
    const knowledge = yield* knowledgePayload(store, yield* readCatalogue());
    const known = new Set([...system.externals.map((each) => each.id), ...system.layers.map((each) => each.id)]);
    const gaps = knowledgeGaps(knowledge, known);
    for (const gap of gaps) {
        yield* Console.log(`the knowledge payload does not add up: ${gap}`);
    }
    yield* (yield* FileAccess).writeText(
        `${folder}/knowledge.json`,
        `${JSON.stringify(Schema.encodeSync(KnowledgePayload)(knowledge), null, 2)}\n`,
    );
    return gaps.length;
});

/**
 * Write the bundle payload: what a bundle needs beyond the other payloads, with where a second reading left each rule.
 * @param store the record store, read only
 * @param root the analysis root
 * @param folder the payloads' folder
 */
const writeBundle = Effect.fnUntraced(function* (store: RecordStore["Service"], root: string, folder: string) {
    const readings = new Map([
        ...(yield* readSecondReadings(root, "BusinessRule")),
        ...(yield* readSecondReadings(root, "Transition")),
    ]);
    yield* (yield* FileAccess).writeText(
        `${folder}/bundle.json`,
        `${JSON.stringify(Schema.encodeSync(BundlePayload)(yield* bundlePayload(store, readings)), null, 2)}\n`,
    );
});

/**
 * Write the journeys payload: how people get their tasks done today, from the accepted journeys with the merges applied,
 * checked to hold every entry point and rule of every capability exactly once. An analysis made before the journeys were
 * part of Publish has none, and writes no file.
 * @param store the record store, read only
 * @param payloads every capability's payload
 * @param folder the payloads' folder
 * @returns how many gaps it printed, and how many tasks it wrote
 */
const writeJourneys = Effect.fnUntraced(function* (
    store: RecordStore["Service"],
    payloads: readonly CapabilityPayloadOf[],
    folder: string,
) {
    const records = yield* journeyRecords(store);
    if (records.journeys.length === 0) {
        yield* Console.log("no journeys of today are in the analysis: Publish ran before they were part of it");
        return { gaps: 0, tasks: 0 };
    }
    const { tasks, unknown } = tasksOf(records.journeys, records.merges, capabilitySlugs(records.capabilities));
    const gaps = [
        ...journeyCoverageGaps(tasks, payloads),
        ...unknown.map((id) => `a merge names ${id}, which is no task`),
    ];
    for (const gap of gaps) {
        yield* Console.log(`the journeys do not add up: ${gap}`);
    }
    yield* (yield* FileAccess).writeText(
        `${folder}/journeys.json`,
        `${JSON.stringify(Schema.encodeSync(JourneysPayload)({ journeys: tasks }), null, 2)}\n`,
    );
    return { gaps: gaps.length, tasks: tasks.length };
});

/**
 * Write one typed payload per place of a finished analysis: each capability with its layers, screens, shared code,
 * data, open points, gaps and the context of every place in it, then the system with its areas. Each is checked to add
 * up, and each context to have its documented shape, before it is written; a payload that does not is reported and the
 * run needs action.
 * @returns the effect that writes the files and prints one line per payload that does not add up
 */
const writePayloads = Effect.fn("writePayloads")(function* () {
    const store = yield* RecordStore;
    const files = yield* FileAccess;
    const { root } = yield* AnalysisRoot;
    const folder = `${root}/payloads`;
    const ids = yield* Effect.orDie(
        store.query((sql) => decodedRows(IdRow)(sql`SELECT capability AS id FROM v_capability ORDER BY id`)),
    );
    const areas = yield* Effect.orDie(
        store.query((sql) =>
            decodedRows(AreaRow)(
                sql`SELECT json_extract(body, '$.name') AS name, json_extract(body, '$.capabilities') AS capabilities
                    FROM record WHERE type = 'CapabilityGroup'`,
            ),
        ),
    );
    const payloads = [];
    let broken = 0;
    for (const { id } of ids) {
        const area = areas.find((each) => each.capabilities.includes(`"${id}"`));
        const payload = yield* capabilityPayload(store, id, area === undefined ? "" : area.name);
        payloads.push(payload);
        const gaps = payloadGaps(payload);
        if (gaps.length > 0) {
            broken++;
            yield* Console.log(`${payload.capability.name} does not add up: ${gaps.join("; ")}`);
        }
        yield* files.writeText(
            `${folder}/${id}.json`,
            `${JSON.stringify(Schema.encodeSync(CapabilityPayload)(payload), null, 2)}\n`,
        );
    }
    const system = yield* systemPayload(store, payloads);
    yield* files.writeText(
        `${folder}/system.json`,
        `${JSON.stringify(Schema.encodeSync(SystemPayload)(system), null, 2)}\n`,
    );
    broken += yield* writeKnowledge(store, system, folder);
    const journeys = yield* writeJourneys(store, payloads, folder);
    broken += journeys.gaps;
    yield* writeBundle(store, root, folder);
    for (const [name, schema] of [
        ["system", SystemPayload],
        ["capability", CapabilityPayload],
        ["knowledge", KnowledgePayload],
        ["bundle", BundlePayload],
        ["journeys", JourneysPayload],
    ] as const) {
        yield* files.writeText(
            `${folder}/schema/${name}.schema.json`,
            `${JSON.stringify(Schema.toJsonSchemaDocument(schema).schema, null, 2)}\n`,
        );
    }
    yield* Console.log(
        `${ids.length + 3 + (journeys.tasks > 0 ? 1 : 0)} payloads written to ${folder}${broken === 0 ? "" : `; ${broken} do not add up`}`,
    );
    if (broken > 0) {
        yield* needsAction;
    }
});

const command = Command.make("write-payloads", {}, () => writePayloads()).pipe(
    Command.withDescription(
        "Writes one typed JSON payload per place of a finished analysis into <analysis root>/payloads: one file per capability with its layers (what it does and decides in each), screens and their controls, the shared code it passes through, its kinds of data, open points and the links it could not follow, and system.json with the areas, and in payloads/schema the JSON Schema of both kinds of payload, from the same Effect schemas, for consumers that validate in another language. Every place carries its context, compiled once in the documented shape: the scope, where to look first, the data saved and read, the rules decided there, what is unconfirmed, what was not followed and the commit, capped with a count of what was left out and naming no record id. Each capability payload is checked to hold every entry point and rule exactly once and each context to have that shape; the run needs action when one does not. journeys.json holds the tasks people get done today (`{ journeys: [...] }`: each with its outcome, actor, entry points, rules, kinds of data, outside systems and the steps it takes), each entry point and rule of the analysis in exactly one task, with its JSON Schema; an analysis made before Publish wrote journeys has none. Reads the accepted records and the relation views only.",
    ),
);

runScript(command, rootServices);
