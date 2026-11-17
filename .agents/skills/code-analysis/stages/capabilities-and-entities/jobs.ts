import { Effect } from "effect";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { FileAccess } from "../../shared/source/file-access";
import { sha1Hex } from "../../shared/run/hashing-and-random";
import { readDocumentStrictly } from "../../shared/run/json-files";
import { UsageInvalid } from "../../shared/run/script-errors";
import { StageJob, StageJobList } from "../../shared/model/schemas/capabilities-and-entities-jobs";

type Job = typeof StageJob.Type;

export type Kind = Job["kind"];

export type Listed = Job & { readonly jobId: string };

export type RegistryKind = "capabilities" | "entities";

export type Units = Job;

export const registryOf: Readonly<Record<Kind, RegistryKind>> = {
    assignEntryPoints: "capabilities",
    assignResources: "entities",
    assignShapes: "entities",
    mergeCapabilities: "capabilities",
    mergeEntities: "entities",
};

export const mergeKind: Readonly<Record<RegistryKind, Kind>> = {
    capabilities: "mergeCapabilities",
    entities: "mergeEntities",
};

const roleOf: Readonly<Record<Kind, "assigns" | "merges">> = {
    assignEntryPoints: "assigns",
    assignResources: "assigns",
    assignShapes: "assigns",
    mergeCapabilities: "merges",
    mergeEntities: "merges",
};

/**
 * Whether a job merges a slice of a registry's written entries, once every assigning job is decided (D215).
 * @param kind the job's kind
 * @returns true for a merge job
 */
export const isMerging = (kind: Kind) => roleOf[kind] === "merges";

/**
 * A job's units by their record ids, never their words (D217): its entry points's blocks, its resources by external system
 * and text, its data shapes' definitions, its entries; sorted, so the order a cut met them in changes nothing.
 * @param job the job
 * @returns its kind and its units' keys
 */
function unitKeysOf(job: Units): readonly string[] {
    switch (job.kind) {
        case "assignEntryPoints":
            return job.entryPoints.map((unit) => unit.id);
        case "assignResources":
            return job.resources.map((unit) => unit.id);
        case "assignShapes":
            return job.shapes.map((unit) => unit.definition);
        case "mergeCapabilities":
        case "mergeEntities":
            return job.entries.map((entry) => entry.id);
    }
}

/**
 * A job as first cut: its units.
 * @param jobId the job id
 * @param units the job's kind and units
 * @returns the job
 */
export const freshJob = (jobId: string, units: Units): Listed => ({ jobId, ...units });

/**
 * A job's identity (D217): a digest of its kind and its units' record ids, sorted, never their words or facts, so a
 * merge that sharpens words, or a cut that keeps a job's units, keeps its id and its work. A job whose units' facts
 * changed keeps it too: the brief, which carries the digests of the stages it is built from, is what goes stale then.
 * @param job the job
 * @returns the digest
 */
export const definitionOf = (job: Units) => sha1Hex(JSON.stringify([job.kind, [...unitKeysOf(job)].sort()]));

export type ListEntry = (typeof StageJobList.Type)[number];

/**
 * The stage's jobs as listed, each with its kind. Before it is first prepared there is none, which is that state: no
 * job.
 * @param root the analysis root
 * @returns the listed jobs, in cut order
 */
export const readJobList = Effect.fnUntraced(function* (root: string) {
    const path = analysisPaths(root).capabilitiesAndEntities.jobs;
    return (yield* (yield* FileAccess).exists(path)) ? yield* readDocumentStrictly(path, StageJobList) : [];
});

/**
 * One job by its id, from its own file; refused for an id no job holds.
 * @param root the analysis root
 * @param jobId the job id
 * @returns the job; UsageInvalid when there is no such job
 */
export const jobNamed = Effect.fnUntraced(function* (root: string, jobId: string) {
    const path = analysisPaths(root).capabilitiesAndEntities.jobFile(jobId);
    if (!(yield* (yield* FileAccess).exists(path))) {
        return yield* new UsageInvalid({
            issue: `${jobId} is not one of the stage's jobs: name-capabilities-and-entities.ts status counts them`,
        });
    }
    const job: Listed = { jobId, ...(yield* readDocumentStrictly(path, StageJob)) };
    return job;
});

/**
 * Write one job's own file: its units with their facts. The caller holds the record store.
 * @param root the analysis root
 * @param job the job, with its job id
 * @returns nothing once written
 */
export const writeJob = Effect.fnUntraced(function* (root: string, job: Listed) {
    const { jobId, ...state } = job;
    yield* (yield* FileAccess).writeText(
        analysisPaths(root).capabilitiesAndEntities.jobFile(jobId),
        JSON.stringify(state),
    );
});

/**
 * Where one job's agents and rounds write, and the stage and key its state is held under, as the review rounds take
 * them.
 * @param root the analysis root
 * @param jobId the job id
 * @param kind the job's kind, which decides what its agent writes
 * @returns the job's files
 */
export const jobFiles = (root: string, jobId: string, kind: Kind) => {
    const paths = analysisPaths(root).capabilitiesAndEntities;
    return {
        stage: "capabilities-and-entities" as const,
        key: jobId,
        outputPath: roleOf[kind] === "assigns" ? paths.assignments(jobId) : paths.entries(jobId),
        reviewPath: paths.review(jobId),
        roundsFolder: paths.rounds(jobId),
    };
};

/**
 * Every file a job may hold work in, whatever its kind: what a cut dropping it must not lose silently.
 * @param root the analysis root
 * @param jobId the job id
 * @returns the files
 */
export const workFilesOf = (root: string, jobId: string) => {
    const paths = analysisPaths(root).capabilitiesAndEntities;
    return [paths.entries(jobId), paths.assignments(jobId), paths.review(jobId), paths.rounds(jobId)];
};

/**
 * The job that runs first, alone, on its registry: the first assigning job of the registry in cut order. Its closed
 * batch writes the entries the jobs after it choose from, which is what a proposed seed was for; every job is read, so
 * none is sampled.
 * @param jobs every listed job
 * @param kind the registry
 * @returns the lead job, or none when no assigning job has the registry
 */
export const leadJobOf = (jobs: readonly ListEntry[], kind: RegistryKind) =>
    jobs.find((job) => roleOf[job.kind] === "assigns" && registryOf[job.kind] === kind);
