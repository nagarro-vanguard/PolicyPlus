import { Effect } from "effect";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { FileAccess } from "../../shared/source/file-access";
import { JobStates } from "../../shared/jobs/job-state";
import { AnyRecord, decodeDocumentText, jsonlText, readOptionalRecords } from "../../shared/run/json-files";
import { ofType } from "../../shared/read/record-reading";
import { CodeKind } from "../../shared/model/schemas/code-kind";
import { ExternalSystem } from "../../shared/model/schemas/external-system";
import { Layer } from "../../shared/model/schemas/layer";
import { MapRegistries, mapRegistryNames, type MapRegistryKind } from "../../shared/model/schemas/map-registries";
import { UsageInvalid } from "../../shared/run/script-errors";
import { RecordIdPrefix } from "../../shared/model/shared-fields";

const registriesDocument = "registries";

export const mapRegistryKinds: readonly MapRegistryKind[] = ["codeKinds", "externalSystems"];

export const registryNames = mapRegistryNames;

export type MapRegistriesState = typeof MapRegistries.Type;

export type ProposingJob = MapRegistriesState["proposing"][number];

/**
 * Where the Map's registries stand, as the job state holds it; none before the Map is first prepared, which is that
 * state.
 * @returns the state, or undefined
 */
export const readMapRegistries = Effect.fnUntraced(function* () {
    const body = yield* (yield* JobStates).document("map", registriesDocument);
    return body === undefined
        ? undefined
        : yield* decodeDocumentText("the Map's registries state", body, MapRegistries);
});

/**
 * Where the Map's registries stand, refused before the Map is prepared.
 * @returns the state; UsageInvalid before the first `prepare`
 */
export const requireMapRegistries = Effect.fnUntraced(function* () {
    const state = yield* readMapRegistries();
    if (state === undefined) {
        return yield* new UsageInvalid({
            issue: "the Map has no jobs yet: run map-codebase.ts prepare, which cuts them, then run next",
        });
    }
    return state;
});

/**
 * Write where the Map's registries stand, into the job state, which a stage's finish never rebuilds.
 * @param state the state
 * @returns nothing once written
 */
export const writeMapRegistries = Effect.fnUntraced(function* (state: MapRegistriesState) {
    yield* (yield* JobStates).setDocument("map", registriesDocument, JSON.stringify(state));
});

/**
 * One proposing job, by its id, when the id is one.
 * @param state where the loop stands
 * @param jobId the job id
 * @returns the proposing job, or undefined for a Map job
 */
export const proposingNamed = (state: MapRegistriesState, jobId: string) =>
    state.proposing.find((job) => job.jobId === jobId);

/**
 * One registry's accepted entries, as its document holds them: a code kind's registry its layers and building
 * blocks, the external systems' its external systems; none before it is first accepted.
 * @param path the registry's document
 * @returns its entries by type
 */
const readEntries = Effect.fnUntraced(function* (path: string) {
    const records = (yield* readOptionalRecords(path, AnyRecord)).flatMap((record) =>
        typeof record.id === "string" ? [{ ...record, id: record.id }] : [],
    );
    return {
        layers: ofType(records, RecordIdPrefix.Layer, Layer),
        codeKinds: ofType(records, RecordIdPrefix.CodeKind, CodeKind),
        externalSystems: ofType(records, RecordIdPrefix.ExternalSystem, ExternalSystem),
    };
});

export type RegistryEntries = Effect.Success<ReturnType<typeof readEntries>>;

/**
 * The Map's registries as they stand (P1.38): both as accepted, and the entries the Map's jobs wrote since, read from
 * their documents.
 * @param root the analysis root
 * @returns the layers, code kinds and external systems
 */
export const readAcceptedRegistries = Effect.fnUntraced(function* (root: string) {
    const paths = analysisPaths(root).mapRegistries;
    const blocks = yield* readEntries(paths.registry("codeKinds"));
    const systems = yield* readEntries(paths.registry("externalSystems"));
    const written = yield* readEntries(paths.written);
    return {
        layers: [...blocks.layers, ...written.layers],
        codeKinds: [...blocks.codeKinds, ...written.codeKinds],
        externalSystems: [...systems.externalSystems, ...written.externalSystems],
    };
});

/**
 * One registry as last accepted, the entries the Map's jobs stand on; none before it is first accepted.
 * @param root the analysis root
 * @param kind the registry
 * @returns its entries by type
 */
export const readRegistryAsAccepted = (root: string, kind: MapRegistryKind) =>
    readEntries(analysisPaths(root).mapRegistries.registry(kind));

/**
 * The entries the Map's jobs wrote, as each closed batch added them (P1.38); none before.
 * @param root the analysis root
 * @returns them by type
 */
export const readWrittenEntries = (root: string) => readEntries(analysisPaths(root).mapRegistries.written);

/**
 * Write every entry together for the Map's jobs: both registries as accepted, then the entries Map jobs wrote, a
 * document derived from their owners' outputs, like the brief, never a second truth.
 * @param root the analysis root
 * @returns nothing once written
 */
const writeBoth = Effect.fnUntraced(function* (root: string) {
    const fs = yield* FileAccess;
    const paths = analysisPaths(root).mapRegistries;
    let both = "";
    for (const path of [...mapRegistryKinds.map((kind) => paths.registry(kind)), paths.written]) {
        both += (yield* fs.exists(path)) ? yield* fs.readText(path) : "";
    }
    yield* fs.writeText(paths.both, both);
});

/**
 * Write one registry's accepted entries, and every entry together for the Map's jobs (`writeBoth`).
 * @param root the analysis root
 * @param kind the registry
 * @param entries its accepted entries, as records
 * @returns nothing once written
 */
export const writeAcceptedRegistry = Effect.fnUntraced(function* (
    root: string,
    kind: MapRegistryKind,
    entries: readonly unknown[],
) {
    yield* (yield* FileAccess).writeText(analysisPaths(root).mapRegistries.registry(kind), jsonlText(entries));
    yield* writeBoth(root);
});

/**
 * Add entries Map jobs wrote to the document of entries written while mapping, and every entry together (P1.38), so
 * the next batch takes them instead of writing them again; an entry written again, by a job's fix, replaces its
 * earlier copy.
 * @param root the analysis root
 * @param entries the new entries, as records
 * @returns nothing once written
 */
export const addWrittenEntries = Effect.fnUntraced(function* (
    root: string,
    entries: ReadonlyArray<{ readonly id: string }>,
) {
    if (!entries.length) {
        return;
    }
    const replaced = new Set(entries.map((entry) => entry.id));
    const earlier = (yield* readOptionalRecords(analysisPaths(root).mapRegistries.written, AnyRecord)).filter(
        (entry) => typeof entry.id !== "string" || !replaced.has(entry.id),
    );
    yield* rewriteWrittenEntries(root, [...earlier, ...entries]);
});

/**
 * Write the document of entries written while mapping whole, and every entry together (P1.38).
 * @param root the analysis root
 * @param entries every entry the Map's jobs wrote, as records
 * @returns nothing once written
 */
const rewriteWrittenEntries = Effect.fnUntraced(function* (root: string, entries: readonly unknown[]) {
    yield* (yield* FileAccess).writeText(analysisPaths(root).mapRegistries.written, jsonlText(entries));
    yield* writeBoth(root);
});

/**
 * A proposing job's last outcome, from its report in the job state; none while it has not run, or runs again.
 * @param jobId the proposing job's id
 * @returns the outcome, or none
 */
export const outcomeOf = Effect.fnUntraced(function* (jobId: string) {
    const row = yield* (yield* JobStates).get("map", jobId);
    return row === undefined || row.report === undefined ? undefined : row.report.outcome;
});

/**
 * Whether both registries are written, so the Map's jobs may run: each proposing job's last outcome is accepted.
 * @param state where the loop stands
 * @returns true once both are
 */
export const registriesAccepted = Effect.fnUntraced(function* (state: MapRegistriesState) {
    for (const job of state.proposing) {
        if ((yield* outcomeOf(job.jobId)) !== "accepted") {
            return false;
        }
    }
    return true;
});

/**
 * Whether the lead Map job is decided, so the rest of the Map's jobs may run: it runs first, alone, and what it writes
 * is what the next batch chooses from. A refused lead is decided too: nothing stalls on one job.
 * @param state where the loop stands
 * @returns true once the lead is decided
 */
export const leadDecided = Effect.fnUntraced(function* (state: MapRegistriesState) {
    const row = yield* (yield* JobStates).get("map", state.lead);
    return row !== undefined && (row.state === "decided" || row.state === "refused");
});
