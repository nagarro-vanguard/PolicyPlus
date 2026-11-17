import { Effect, Schema } from "effect";
import { AnalysisRequest } from "../../shared/run/analysis-request";
import { analysisPaths, sourceBase } from "../../shared/run/analysis-layout";
import { FileAccess } from "../../shared/source/file-access";
import { assignJobIds } from "../../shared/jobs/job-ids";
import { readDocumentStrictly } from "../../shared/run/json-files";
import { prepareJobRun } from "../../shared/jobs/job-feedback";
import { JobIdPrefix, prefixOf } from "../../shared/model/record-ids";
import { readAgentOutput } from "../../shared/read/record-reading";
import { FeedbackItem } from "../../shared/model/schemas/feedback";
import { FindingId, RecordIdPrefix } from "../../shared/model/shared-fields";
import { CodeKind } from "../../shared/model/schemas/code-kind";
import { ExternalSystem } from "../../shared/model/schemas/external-system";
import { Layer } from "../../shared/model/schemas/layer";
import type { MapRegistryKind } from "../../shared/model/schemas/map-registries";
import { proposingFiles, writeProposingBrief } from "./map-proposing";
import { mapRegistryKinds, readWrittenEntries, type MapRegistriesState } from "./map-registries";

import { Fact } from "../../shared/model/schemas/fact";
import { mapShapes } from "./check-map";

const writtenBy = { map: mapShapes, proposing: { Layer, CodeKind, ExternalSystem, Fact } };

type Entry = typeof Layer.Type | typeof CodeKind.Type | typeof ExternalSystem.Type;

/**
 * The entries one job's output writes (P1.38): a Map job's, the layers, code kinds and external systems none of the
 * registry's fitted; a proposing job's, its registry.
 * @param outputPath the job's output
 * @param writer whose output it is
 * @returns its entries
 */
export const entriesWrittenIn = Effect.fnUntraced(function* (outputPath: string, writer: keyof typeof writtenBy) {
    const read = yield* readAgentOutput(outputPath, writtenBy[writer]);
    const entries: Entry[] = [...read.of("Layer"), ...read.of("CodeKind"), ...read.of("ExternalSystem")];
    return entries;
});

/**
 * The registry an entry belongs to: a layer or a code kind to the code kinds', an external system to the
 * external systems'.
 * @param entry the entry
 * @returns its registry
 */
const registryOf = (entry: Entry): MapRegistryKind =>
    prefixOf(entry.id) === RecordIdPrefix.ExternalSystem ? "externalSystems" : "codeKinds";

/**
 * What a proposing job is given to merge its registry's duplicates once every Map job is decided (P1.38): each entry a
 * Map job wrote, by its name and how it is recognised, for it to keep as written or to merge into the entry it
 * duplicates, naming it in that entry's `mergedFrom`.
 * @param entries the entries the Map's jobs wrote, of the job's registry
 * @returns the items
 */
const foldAsked = (entries: readonly Entry[]) =>
    entries.map((entry) =>
        FeedbackItem.on(
            "assignments",
            `a Map job wrote ${"membershipRule" in entry ? `${entry.name} (${entry.membershipRule})` : `${entry.name} (${entry.purpose})`}, since no entry fitted: keep it as written, or, where it duplicates an entry of yours or another written one, write the entry that stands for both and name it in that entry's mergedFrom`,
            [Schema.decodeUnknownSync(FindingId)(entry.id)],
            entry.evidence,
        ),
    );

/**
 * Begin the merge once every Map job is decided (P1.38): each registry that gained entries while mapping gets one
 * merging job, made now, given the entries to merge against the whole registry as it stands. The entries are those each
 * closed batch added, never withdrawn, so every job that stood on one still finds it (P1.35). The caller holds the
 * record store.
 * @param root the analysis root
 * @param state where the registries stand
 * @returns the next state, and how many merging jobs run
 */
export const beginMerge = Effect.fnUntraced(function* (root: string, state: MapRegistriesState) {
    const fs = yield* FileAccess;
    const entries = yield* readWrittenEntries(root);
    const written: Entry[] = [...entries.layers, ...entries.codeKinds, ...entries.externalSystems];
    const request = yield* readDocumentStrictly(analysisPaths(root).analysisRequest, AnalysisRequest);
    const context = {
        sourceFolder: sourceBase(request.sourceRoots),
        withSupportingMaterial: request.supportingMaterial.length > 0,
    };
    const merging = yield* assignJobIds(
        JobIdPrefix.map,
        mapRegistryKinds
            .filter((registry) => written.some((entry) => registryOf(entry) === registry))
            .map((registry) => ({ registry })),
        (job) => JSON.stringify([job.registry, "merge"]),
        [],
    );
    for (const job of merging.jobs) {
        const files = proposingFiles(root, job.id);
        yield* fs.writeText(files.outputPath, "");
        yield* prepareJobRun(files, foldAsked(written.filter((entry) => registryOf(entry) === job.registry)), [
            files.reviewPath,
        ]);
        yield* writeProposingBrief(root, { registry: job.registry, jobId: job.id }, context);
    }
    const next: MapRegistriesState = {
        ...state,
        proposing: merging.jobs.map((job) => ({ registry: job.registry, jobId: job.id })),
        merging: true,
    };
    return { state: next, asked: merging.jobs.length };
});
