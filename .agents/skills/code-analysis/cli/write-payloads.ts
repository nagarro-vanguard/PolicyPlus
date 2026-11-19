import { Console, Effect, Layer, Schema } from "effect";
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
import { known } from "../shared/run/collections";
import { PayloadManifest } from "../shared/model/schemas/payload-manifest";
import {
    capabilityFiles,
    manifestOf,
    payloadText,
    stalePayloads,
    type WrittenPayload,
} from "../shared/read/payload-files";
import { provenanceOf, settleSource } from "../shared/read/provenance";
import { GitRepository } from "../shared/source/git-repository";
import { needsAction, rootServices, runScript } from "../shared/run/run-script";
import { FileAccess } from "../shared/source/file-access";
import { RecordStore } from "../shared/store/database";
import { decodedRows } from "../shared/store/stored-bodies";

const IdRow = Schema.Struct({ id: Schema.String });
const AreaRow = Schema.Struct({ name: Schema.String, capabilities: Schema.String });

/**
 * Write one payload file and say what was written.
 * @param folder the payloads' folder
 * @param payload the file's path, kind and text
 * @returns the payload, as written
 */
const writeFile = Effect.fnUntraced(function* (folder: string, payload: WrittenPayload) {
    yield* (yield* FileAccess).writeText(`${folder}/${payload.path}`, payload.text);
    return payload;
});

/**
 * Write the knowledge payload: what the analysis knows of the system as a whole, checked to hold together.
 * @param store the record store, read only
 * @param system the system's payload, for the ids of the outside systems and layers
 * @param folder the payloads' folder
 * @returns how many gaps it printed, and the file written
 */
const writeKnowledge = Effect.fnUntraced(function* (
    store: RecordStore["Service"],
    system: SystemPayload,
    folder: string,
) {
    const knowledge = yield* knowledgePayload(store, yield* readCatalogue());
    const ids = new Set([...system.externals.map((each) => each.id), ...system.layers.map((each) => each.id)]);
    const gaps = knowledgeGaps(knowledge, ids);
    for (const gap of gaps) {
        yield* Console.log(`the knowledge payload does not add up: ${gap}`);
    }
    const text = payloadText(KnowledgePayload, knowledge);
    return {
        gaps: gaps.length,
        written: yield* writeFile(folder, { path: "knowledge.json", kind: "knowledge", text }),
    };
});

/**
 * Write the bundle payload: what a bundle needs beyond the other payloads, with where a second reading left each rule.
 * @param store the record store, read only
 * @param root the analysis root
 * @param folder the payloads' folder
 * @returns the file written
 */
const writeBundle = Effect.fnUntraced(function* (store: RecordStore["Service"], root: string, folder: string) {
    const readings = new Map([
        ...(yield* readSecondReadings(root, "BusinessRule")),
        ...(yield* readSecondReadings(root, "Transition")),
    ]);
    const text = payloadText(BundlePayload, yield* bundlePayload(store, readings));
    return yield* writeFile(folder, { path: "bundle.json", kind: "bundle", text });
});

/**
 * Write the journeys payload: how people get their tasks done today, from the accepted journeys with the merges applied,
 * checked to hold every entry point and rule of every capability exactly once. An analysis made before the journeys were
 * part of Publish has none, and writes no file.
 * @param store the record store, read only
 * @param payloads every capability's payload
 * @param folder the payloads' folder
 * @returns how many gaps it printed, and the files it wrote
 */
const writeJourneys = Effect.fnUntraced(function* (
    store: RecordStore["Service"],
    payloads: readonly CapabilityPayloadOf[],
    folder: string,
) {
    const records = yield* journeyRecords(store);
    if (records.journeys.length === 0) {
        yield* Console.log("no journeys of today are in the analysis: Publish ran before they were part of it");
        return { gaps: 0, written: [] };
    }
    const { tasks, unknown } = tasksOf(records.journeys, records.merges, capabilitySlugs(records.capabilities));
    const gaps = [
        ...journeyCoverageGaps(tasks, payloads),
        ...unknown.map((id) => `a merge names ${id}, which is no task`),
    ];
    for (const gap of gaps) {
        yield* Console.log(`the journeys do not add up: ${gap}`);
    }
    const text = payloadText(JourneysPayload, { journeys: tasks });
    return {
        gaps: gaps.length,
        written: [yield* writeFile(folder, { path: "journeys.json", kind: "journeys", text })],
    };
});

/**
 * Write each capability's payload, in its file named for the capability, checked to add up.
 * @param store the record store, read only
 * @param folder the payloads' folder
 * @returns the payloads, the files written and how many do not add up
 */
const writeCapabilities = Effect.fnUntraced(function* (store: RecordStore["Service"], folder: string) {
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
    const payloads: CapabilityPayloadOf[] = [];
    for (const { id } of ids) {
        const area = areas.find((each) => each.capabilities.includes(`"${id}"`));
        payloads.push(yield* capabilityPayload(store, id, area === undefined ? "" : area.name));
    }
    const fileOf = capabilityFiles(payloads.map((payload) => payload.capability));
    const written: WrittenPayload[] = [];
    let broken = 0;
    for (const payload of payloads) {
        const gaps = payloadGaps(payload);
        if (gaps.length > 0) {
            broken++;
            yield* Console.log(`${payload.capability.name} does not add up: ${gaps.join("; ")}`);
        }
        const path = known(fileOf, payload.capability.id, "every capability has a file");
        written.push(
            yield* writeFile(folder, { path, kind: "capability", text: payloadText(CapabilityPayload, payload) }),
        );
    }
    return { payloads, written, broken, fileOf };
});

const schemas = [
    ["system", SystemPayload],
    ["capability", CapabilityPayload],
    ["knowledge", KnowledgePayload],
    ["bundle", BundlePayload],
    ["journeys", JourneysPayload],
] as const;

/**
 * Write the JSON Schema of every kind of payload and of the manifest, then the manifest itself, last, so a folder with
 * a manifest was written whole; and remove the capability files of an earlier run that this one did not write again.
 * @param folder the payloads' folder
 * @param written every payload file this run wrote
 * @returns nothing once written
 */
const writeManifest = Effect.fnUntraced(function* (folder: string, written: readonly WrittenPayload[]) {
    const files = yield* FileAccess;
    const documents = schemas.map(
        ([kind, schema]) => [kind, `${JSON.stringify(Schema.toJsonSchemaDocument(schema).schema, null, 2)}\n`] as const,
    );
    for (const [kind, text] of [
        ...documents,
        ["manifest", `${JSON.stringify(Schema.toJsonSchemaDocument(PayloadManifest).schema, null, 2)}\n`] as const,
    ]) {
        yield* files.writeText(`${folder}/schema/${kind}.schema.json`, text);
    }
    for (const name of stalePayloads(yield* files.entriesOf(folder), written)) {
        yield* files.remove(`${folder}/${name}`);
        yield* Console.log(`removed ${name}, written by an earlier run under another name`);
    }
    yield* files.writeText(`${folder}/manifest.json`, payloadText(PayloadManifest, manifestOf(written, documents)));
});

/**
 * Write one typed payload per place of a finished analysis: each capability with its layers, screens, shared code,
 * data, open points, gaps and the context of every place in it, then the system with its areas, its name, its
 * repository and the commit read. Each is checked to add up, and each context to have its documented shape, before it
 * is written; a payload that does not is reported and the run needs action. A store made before the commit was kept
 * gets it first, from Inventory's file list.
 * @returns the effect that writes the files and prints one line per payload that does not add up
 */
const writePayloads = Effect.fn("writePayloads")(function* () {
    const store = yield* RecordStore;
    const { root } = yield* AnalysisRoot;
    const folder = `${root}/payloads`;
    yield* settleSource(store, root);
    const capabilities = yield* writeCapabilities(store, folder);
    const { payloads, fileOf } = capabilities;
    const made = yield* systemPayload(store, payloads, yield* provenanceOf(store, root));
    const system: SystemPayload = {
        ...made,
        capabilities: made.capabilities.map((each) => ({ ...each, file: known(fileOf, each.id, "written above") })),
    };
    const systemFile = yield* writeFile(folder, {
        path: "system.json",
        kind: "system",
        text: payloadText(SystemPayload, system),
    });
    const knowledge = yield* writeKnowledge(store, system, folder);
    const journeys = yield* writeJourneys(store, payloads, folder);
    const written = [
        systemFile,
        ...capabilities.written,
        knowledge.written,
        ...journeys.written,
        yield* writeBundle(store, root, folder),
    ];
    yield* writeManifest(folder, written);
    const broken = capabilities.broken + knowledge.gaps + journeys.gaps;
    yield* Console.log(
        `${written.length} payloads written to ${folder}${broken === 0 ? "" : `; ${broken} do not add up`}`,
    );
    if (broken > 0) {
        yield* needsAction;
    }
});

const command = Command.make("write-payloads", {}, () => writePayloads()).pipe(
    Command.withDescription(
        "Writes one typed JSON payload per place of a finished analysis into <analysis root>/payloads: one file per capability, `capability-<slug>.json` named from the capability's name so it stays the same when a stage is run again from nothing, with its layers (what it does and decides in each), screens and their controls, the shared code it passes through, its kinds of data, open points and the links it could not follow, and system.json with the system's name, the repository its code is in and the commit read (as Inventory listed it), the areas and each capability's file; in payloads/schema the JSON Schema of every kind of payload, from the same Effect schemas, for consumers that validate in another language; and, last, manifest.json: the contract version readers check, the writer's version and every file written with its digest. Capability files of an earlier run under another name are removed. Every place carries its context, compiled once in the documented shape: the scope, where to look first, the data saved and read, the rules decided there, what is unconfirmed, what was not followed and the commit, capped with a count of what was left out and naming no record id. Each capability payload is checked to hold every entry point and rule exactly once and each context to have that shape; the run needs action when one does not. journeys.json holds the tasks people get done today (`{ journeys: [...] }`: each with its outcome, actor, entry points, rules, kinds of data, outside systems and the steps it takes), each entry point and rule of the analysis in exactly one task, with its JSON Schema; an analysis made before Publish wrote journeys has none. Reads the accepted records and the relation views; a store made before the commit was kept gets it first, from Inventory's file list, and nothing else in it changes.",
    ),
);

runScript(command, Layer.mergeAll(rootServices, GitRepository.layer));
