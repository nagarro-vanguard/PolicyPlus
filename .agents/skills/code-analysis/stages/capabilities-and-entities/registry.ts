import { Effect, Schema } from "effect";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { FileAccess } from "../../shared/source/file-access";
import { AnyRecord, jsonlText, readOptionalRecords } from "../../shared/run/json-files";
import { ofType } from "../../shared/read/record-reading";
import { JobStates } from "../../shared/jobs/job-state";
import { Capability } from "../../shared/model/schemas/capability";
import { Entity } from "../../shared/model/schemas/entity";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import { isMerging, jobFiles, leadJobOf, registryOf, type ListEntry, type RegistryKind } from "./jobs";

export type Entries = { readonly capabilities: readonly Capability[]; readonly entities: readonly Entity[] };

/**
 * The capabilities and entities among some records, each by its type, each record id once: an agent corrects a record
 * by appending it again with its id, so the newest copy counts, in the place of the first.
 * @param records the records, as JSON, in the order written
 * @returns the entries, by registry
 */
export const entriesAmong = (records: readonly unknown[]): Entries => {
    const newest = new Map<string, Record<string, unknown> & { readonly id: string }>();
    for (const record of records) {
        if (typeof record === "object" && record !== null && "id" in record && typeof record.id === "string") {
            newest.set(record.id, { ...record, id: record.id });
        }
    }
    const withIds = [...newest.values()];
    return {
        capabilities: ofType(withIds, RecordIdPrefix.Capability, Capability),
        entities: ofType(withIds, RecordIdPrefix.Entity, Entity),
    };
};

/**
 * An entry as a record: its JSON, encoded through its schema.
 * @param entry the capability or entity
 * @returns the record
 */
export const entryRecord = (entry: Capability | Entity) =>
    entry instanceof Capability ? Schema.encodeSync(Capability)(entry) : Schema.encodeSync(Entity)(entry);

/**
 * A job's last outcome, from its report in the job state; none while it has not run, or runs again.
 * @param job the job
 * @returns the outcome, or none
 */
export const outcomeOf = Effect.fnUntraced(function* (job: Pick<ListEntry, "jobId">) {
    const row = yield* (yield* JobStates).get("capabilities-and-entities", job.jobId);
    return row === undefined || row.report === undefined ? undefined : row.report.outcome;
});

/**
 * Whether the jobs assigning to a registry may run: the registry's lead job runs first, alone, and once its outcome is
 * accepted or refused the others run, choosing from what it wrote. A refused lead leaves the registry to what the
 * others write, never a stall; a registry with no assigning job has nothing to wait for.
 * @param root the analysis root
 * @param jobs every listed job
 * @param job the job that asks to run
 * @returns true when it may run
 */
export const mayAssign = Effect.fnUntraced(function* (
    root: string,
    jobs: readonly ListEntry[],
    job: Pick<ListEntry, "jobId" | "kind">,
) {
    const lead = leadJobOf(jobs, registryOf[job.kind]);
    if (lead === undefined || lead.jobId === job.jobId) {
        return true;
    }
    const outcome = yield* outcomeOf(lead);
    return outcome === "accepted" || outcome === "refused";
});

/**
 * The entries the assigning jobs wrote, as each closed batch added them (D215): never withdrawn, so a job standing on
 * one finds it whatever became of the job that wrote it; none before.
 * @param root the analysis root
 * @returns them, by registry
 */
export const readWrittenEntries = Effect.fnUntraced(function* (root: string) {
    return entriesAmong(yield* readOptionalRecords(analysisPaths(root).capabilitiesAndEntities.written, AnyRecord));
});

/**
 * Write each registry as its agents read it: the entries the assigning jobs wrote, one JSON line each. A document derived from the jobs' outputs, like the brief, never a second truth.
 * @param root the analysis root
 * @returns nothing once written
 */
export const writeRegistries = Effect.fnUntraced(function* (root: string) {
    const fs = yield* FileAccess;
    const written = yield* readWrittenEntries(root);
    for (const kind of ["capabilities", "entities"] as const) {
        const own = kind === "capabilities" ? written.capabilities : written.entities;
        const lines = own.map((entry) => `${entry.toString()}\n`);
        yield* fs.writeText(analysisPaths(root).capabilitiesAndEntities.registry(kind), lines.join(""));
    }
});

/**
 * Write each registry as a reader reads it once merged (D241): the entries standing, each with every entry it stands
 * for in `mergedFrom`, beside the registry the checks read, which stays as written so a later check never breaks.
 * @param root the analysis root
 * @param standing the entries standing, as `mergedRegistries` resolves them
 * @returns nothing once written
 */
export const writeStandingRegistries = Effect.fnUntraced(function* (
    root: string,
    standing: ReadonlyArray<Capability | Entity>,
) {
    const entries = entriesAmong(standing.map(entryRecord));
    const fs = yield* FileAccess;
    for (const kind of ["capabilities", "entities"] as const) {
        const own = kind === "capabilities" ? entries.capabilities : entries.entities;
        yield* fs.writeText(
            analysisPaths(root).capabilitiesAndEntities.standing(kind),
            jsonlText(own.map(entryRecord)),
        );
    }
});

/**
 * Add the entries a closed batch's assigning jobs wrote to the document of written entries, then rewrite the
 * registries the next batch reads (D215); an entry written again, by a job's fix, replaces its earlier copy.
 * @param root the analysis root
 * @param jobs every listed job
 * @param entries the new entries
 * @returns nothing once written
 */
export const addWrittenEntries = Effect.fnUntraced(function* (
    root: string,
    jobs: readonly ListEntry[],
    entries: ReadonlyArray<Capability | Entity>,
) {
    if (!entries.length) {
        return;
    }
    const path = analysisPaths(root).capabilitiesAndEntities.written;
    const replaced = new Set<string>(entries.map((entry) => entry.id));
    const earlier = (yield* readOptionalRecords(path, AnyRecord)).filter(
        (entry) => typeof entry.id !== "string" || !replaced.has(entry.id),
    );
    yield* (yield* FileAccess).writeText(path, jsonlText([...earlier, ...entries.map(entryRecord)]));
    yield* writeRegistries(root);
});

/**
 * One registry's entries, as its agents read them: none before it is first written, which is that state.
 * @param root the analysis root
 * @param kind the registry
 * @returns the entries
 */
export const readRegistry = Effect.fnUntraced(function* (root: string, kind: RegistryKind) {
    const path = analysisPaths(root).capabilitiesAndEntities.registry(kind);
    const entries = entriesAmong(yield* readOptionalRecords(path, AnyRecord));
    return kind === "capabilities" ? entries.capabilities : entries.entities;
});

/**
 * Rebuild the document of written entries from the outputs of the listed assigning jobs, in list order: what a new cut
 * keeps of the entries written so far, a dropped job's leaving with it.
 * @param root the analysis root
 * @param jobs every listed job
 * @returns nothing once written
 */
export const rebuildWrittenEntries = Effect.fnUntraced(function* (root: string, jobs: readonly ListEntry[]) {
    const written: Array<Capability | Entity> = [];
    for (const job of jobs.filter((entry) => !isMerging(entry.kind))) {
        const entries = entriesAmong(
            yield* readOptionalRecords(jobFiles(root, job.jobId, job.kind).outputPath, AnyRecord),
        );
        written.push(...entries.capabilities, ...entries.entities);
    }
    yield* (yield* FileAccess).writeText(
        analysisPaths(root).capabilitiesAndEntities.written,
        jsonlText(written.map(entryRecord)),
    );
});
