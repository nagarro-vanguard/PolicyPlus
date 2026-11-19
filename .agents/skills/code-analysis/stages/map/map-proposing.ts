import { Effect } from "effect";
import { analysisPaths, scriptsCommand } from "../../shared/run/analysis-layout";
import { agentRecords, carryForward, instructionsOf } from "../../shared/jobs/job-feedback";
import { writeJobBrief } from "../../shared/jobs/job-brief";
import type { JsonRecord } from "../../shared/model/json-record";
import { ofType } from "../../shared/read/record-reading";
import { citedFiles, scopeGaps } from "../../shared/read/record-writing";
import { ScopeFiles } from "../../shared/read/scope-files";
import { checkReviewedJob } from "../../shared/jobs/review-rounds";
import { reviewArguments } from "../../shared/jobs/review-sheet";
import { CodeKind } from "../../shared/model/schemas/code-kind";
import { Fact } from "../../shared/model/schemas/fact";
import { ExternalSystem } from "../../shared/model/schemas/external-system";
import { Layer } from "../../shared/model/schemas/layer";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import { readFactBase, stageFactGaps } from "../../shared/read/stage-facts";
import {
    readRegistryAsAccepted,
    readWrittenEntries,
    registryNames,
    type ProposingJob,
    type RegistryEntries,
} from "./map-registries";

type Finding = JsonRecord & { readonly id: string };

const proposingShapes = {
    codeKinds: { Layer, CodeKind, Fact },
    externalSystems: { ExternalSystem, Fact },
};

type WithFeedback = ProposingJob & { readonly customInstructions?: string };

type RequestContext = { readonly sourceFolder: string; readonly withSupportingMaterial: boolean };

/**
 * The named arguments of one proposing job's agent, in the order propose-entries's contract lists them.
 * @param root the analysis root
 * @param job the proposing job and its feedback's text
 * @param context the source folder, and whether the request lists Supporting Material
 * @returns the arguments
 */
export const proposingArguments = (root: string, job: WithFeedback, context: RequestContext) => {
    const paths = analysisPaths(root);
    return {
        scriptsCommand: scriptsCommand(root),
        sourceFolder: context.sourceFolder,
        jobId: job.jobId,
        jobPath: paths.mapRegistries.both,
        briefPath: paths.mapRegistries.brief(job.jobId),
        registryPath: paths.mapRegistries.registry(job.registry),
        outputPath: paths.mapRegistries.files(job.jobId).outputPath,
        ...instructionsOf(job),
    };
};

/**
 * Write one proposing job's brief: the commands that check and carry its registry, the rules of its kind, and what to
 * read besides it (what earlier stages established, the Supporting Material the request lists).
 * @param root the analysis root
 * @param job the proposing job
 * @param context whether the request lists Supporting Material
 * @returns nothing once written
 */
export const writeProposingBrief = (root: string, job: ProposingJob, context: RequestContext) => {
    const paths = analysisPaths(root);
    const command = `${scriptsCommand(root)}/map-codebase.ts`;
    return writeJobBrief(paths.mapRegistries.brief(job.jobId), {
        rules: paths.mapRegistries.rules(job.registry),
        commands: { check: `${command} check ${job.jobId}`, carry: `${command} carry ${job.jobId}` },
        reads: [["what earlier stages established", paths.mapBrief]],
        ...(context.withSupportingMaterial ? { supporting: paths.analysisRequest } : {}),
    });
};

/**
 * The named arguments of the review of one proposing job, in the order the reviewer's contract lists them.
 * @param root the analysis root
 * @param job the proposing job and its feedback's text
 * @param sourceFolder the folder record paths are relative to
 * @returns the arguments
 */
export const proposingReviewArguments = (root: string, job: WithFeedback, sourceFolder: string) =>
    reviewArguments(proposingFiles(root, job.jobId), proposingReviewCall(root, job, sourceFolder));

/**
 * What the reviewer of one proposing job is given besides its files: the source folder, the command that checks its
 * review and the job's feedback.
 * @param root the analysis root
 * @param job the proposing job and its feedback's text
 * @param sourceFolder the folder record paths are relative to
 * @returns the call
 */
export const proposingReviewCall = (root: string, job: WithFeedback, sourceFolder: string) => ({
    root,
    sourceFolder,
    checkCommand: `${scriptsCommand(root)}/map-codebase.ts check ${job.jobId}`,
    feedback: job,
});

/**
 * The layers a registry's merging folds into others: each merged layer's record id, to the layer that stands for it.
 * @param layers the layers a job keeps
 * @returns the layer merged away, to the layer standing
 */
const mergedLayers = (layers: readonly (typeof Layer.Type)[]): ReadonlyMap<string, string> =>
    new Map(
        layers.flatMap((layer) =>
            layer.mergedFrom === undefined ? [] : layer.mergedFrom.map((merged) => [merged, layer.id] as const),
        ),
    );

/**
 * The layer that stands for a layer: itself, or the one it was merged into.
 * @param layer the layer's record id
 * @param merged the layers merged away, to the layer standing
 * @returns the record id of the layer standing
 */
const layerStanding = (layer: string, merged: ReadonlyMap<string, string>) => {
    const into = merged.get(layer);
    return into === undefined ? layer : into;
};

/**
 * The shape of a code kind the Map's jobs stand on (P1.35): its kind and layer, which its words may sharpen around but
 * never change. A layer merged into another counts as that other, so merging two layers that held one tier does not
 * make the code kinds on them look reshaped, and two code kinds on layers that became one can merge.
 * @param block the code kind
 * @param merged the layers merged away, to the layer standing
 * @returns its shape, comparable as text
 */
const shapeOf = (block: typeof CodeKind.Type, merged: ReadonlyMap<string, string>) =>
    JSON.stringify([block.kind, layerStanding(block.layer, merged)]);

/**
 * The gaps of a proposing job's merging (P1.38): each record id an entry's `mergedFrom` names is an entry a Map job
 * wrote, of the same type, merged once, and not one this job keeps as it is; a code kind merging a written one
 * keeps its kind and layer, since the job that wrote it was checked against them (P1.35). Whether two entries are one
 * thing is the merge's to choose, never decided by their names.
 * @param kept the entries this job writes
 * @param written the entries the Map's jobs wrote
 * @returns one line per gap
 */
function foldGaps(kept: RegistryEntries, written: RegistryEntries): string[] {
    const typed = (entries: RegistryEntries) => [
        ...entries.layers.map((entry) => ({ entry, type: "layer" })),
        ...entries.codeKinds.map((entry) => ({ entry, type: "code kind" })),
        ...entries.externalSystems.map((entry) => ({ entry, type: "external system" })),
    ];
    const writtenOf = new Map(typed(written).map((each) => [each.entry.id, each] as const));
    const writtenBlock = new Map<string, typeof CodeKind.Type>(written.codeKinds.map((block) => [block.id, block]));
    const keptBlock = new Map<string, typeof CodeKind.Type>(kept.codeKinds.map((block) => [block.id, block]));
    const folded = mergedLayers(kept.layers);
    const reshaped = (merging: string, id: string) => {
        const was = writtenBlock.get(id);
        const now = keptBlock.get(merging);
        return was !== undefined && now !== undefined && shapeOf(was, folded) !== shapeOf(now, folded);
    };
    const keptIds = new Set(typed(kept).map((each) => each.entry.id));
    const merged = new Map<string, string>();
    const gaps = typed(kept).flatMap(({ entry, type }) =>
        (entry.mergedFrom === undefined ? [] : entry.mergedFrom).flatMap((id) => {
            const target = writtenOf.get(id);
            const earlier = merged.get(id);
            merged.set(id, entry.id);
            if (target === undefined || target.type !== type) {
                return [`${entry.id} merges ${id}, which is no ${type} a Map job wrote`];
            }
            if (keptIds.has(id)) {
                return [`${entry.id} merges ${id}, which this registry also keeps: merge it, or keep it, not both`];
            }
            if (reshaped(entry.id, id)) {
                return [
                    `${entry.id} merges ${id}, which was written with another kind or layer, which the Map's jobs stand on: merge only an entry alike in these, or keep it as written under a name of its own`,
                ];
            }
            return earlier === undefined ? [] : [`${id} is merged into both ${earlier} and ${entry.id}: merge it once`];
        }),
    );
    return gaps;
}

/**
 * The gaps of a registry against the one the Map's jobs stand on (P1.35, P1.38): an entry it drops, and a building
 * block whose kind or layer it changes; its words may sharpen.
 * @param kept the entries this job writes
 * @param standing the registry as last accepted; none before it is
 * @returns one line per gap
 */
function standingGaps(kept: RegistryEntries, standing: RegistryEntries): string[] {
    const keptIds = new Set([...kept.layers, ...kept.codeKinds, ...kept.externalSystems].map((entry) => entry.id));
    const keptBlock = new Map(kept.codeKinds.map((block) => [block.id, block]));
    return [
        ...[...standing.layers, ...standing.codeKinds, ...standing.externalSystems]
            .filter((entry) => !keptIds.has(entry.id))
            .map(
                (entry) => `${entry.id} is dropped, but the Map's jobs stand on it: keep it, or merge another into it`,
            ),
        ...standing.codeKinds.flatMap((block) => {
            const now = keptBlock.get(block.id);
            const folded = mergedLayers(kept.layers);
            return now === undefined || shapeOf(now, folded) === shapeOf(block, folded)
                ? []
                : [`${block.id} changes its kind or layer, which the Map's jobs stand on: change only its words`];
        }),
    ];
}

/**
 * The gaps of entries held twice (invariant 7 of the graph check, held while the registry is written): two layers
 * of one name, and two code kinds of one name and kind on one layer, so one tier or one kind of code is never split
 * in two. A layer merged into another counts as that other.
 * @param kept the entries this job writes
 * @param folded the layers merged away, to the layer standing
 * @returns one line per gap
 */
function heldTwiceGaps(kept: RegistryEntries, folded: ReadonlyMap<string, string>): string[] {
    const groups = (keyed: ReadonlyArray<readonly [string, string]>) => {
        const byKey = new Map<string, string[]>();
        for (const [key, id] of keyed) {
            const held = byKey.get(key);
            byKey.set(key, held === undefined ? [id] : [...held, id]);
        }
        return [...byKey.values()].filter((ids) => ids.length > 1);
    };
    return [
        ...groups(kept.layers.map((layer) => [layer.name.toLowerCase(), layer.id] as const)).map(
            (ids) =>
                `${ids.join(", ")} are layers of one name: merge them into one, naming the others in its mergedFrom`,
        ),
        ...groups(
            kept.codeKinds.map(
                (block) =>
                    [
                        JSON.stringify([block.name.toLowerCase(), block.kind, layerStanding(block.layer, folded)]),
                        block.id,
                    ] as const,
            ),
        ).map(
            (ids) =>
                `${ids.join(", ")} are code kinds of one name and kind in one layer: merge them into one, naming the others in its mergedFrom`,
        ),
    ];
}

/**
 * The gaps of a proposing job's output beside the shared rules: lines out of scope; a
 * layer no code kind sits in; an entry the Map's jobs stand on dropped or redefined (`standingGaps`); and, once
 * the Map's jobs have written entries, its merging (`foldGaps`).
 * @param records the job's records
 * @param lineCounts the manifest's line counts of the files they cite
 * @param registries what it is held to
 * @param registries.standing the registry as last accepted; none before it is
 * @param registries.written the entries the Map's jobs wrote; none before they run
 * @returns one line per gap
 */
function proposingGaps(
    records: readonly Finding[],
    lineCounts: ReadonlyMap<string, number>,
    registries: { readonly standing: RegistryEntries; readonly written: RegistryEntries },
): string[] {
    const kept: RegistryEntries = {
        layers: ofType(records, RecordIdPrefix.Layer, Layer),
        codeKinds: ofType(records, RecordIdPrefix.CodeKind, CodeKind),
        externalSystems: ofType(records, RecordIdPrefix.ExternalSystem, ExternalSystem),
    };
    return [...scopeGaps(records, lineCounts, "manifest", (record) => record.id), ...registryGaps(kept, registries)];
}

/**
 * The gaps of the entries a proposing job keeps, beside the registries it stands on: a layer no code kind sits in, an
 * entry the Map's jobs stand on dropped or redefined (`standingGaps`), its merging (`foldGaps`), and entries held twice
 * (`heldTwiceGaps`). A layer merged into another counts as that other throughout.
 * @param kept the entries the job writes
 * @param registries what it is held to
 * @param registries.standing the registry as last accepted; none before it is
 * @param registries.written the entries the Map's jobs wrote; none before they run
 * @returns one line per gap
 * @internal exported for the tests, which check this gate on its own
 */
export function registryGaps(
    kept: RegistryEntries,
    registries: { readonly standing: RegistryEntries; readonly written: RegistryEntries },
): string[] {
    const { standing, written } = registries;
    const folded = mergedLayers(kept.layers);
    const held = new Set<string>(
        [...kept.codeKinds, ...written.codeKinds].map((block) => layerStanding(block.layer, folded)),
    );
    return [
        ...kept.layers
            .filter((layer) => !held.has(layer.id))
            .map((layer) => `${layer.id} holds no code kind: leave it out, or place a code kind in it`),
        ...standingGaps(kept, standing),
        ...foldGaps(kept, written),
        ...heldTwiceGaps(kept, folded),
    ];
}

/**
 * One proposing job under review: the records its registry holds, held to the shared rules and its own
 * (`proposingGaps`), against the registry the Map's jobs stand on and the entries they wrote; and what it assumes, as
 * facts, held to the facts' rules (`stageFactGaps`). Nothing it writes is dropped for a verdict (P1.33).
 * @param root the analysis root
 * @param job the proposing job
 * @returns the stage as the review rounds take it
 */
export const proposingReview = (root: string, job: ProposingJob) => ({
    stage: "map" as const,
    shapes: proposingShapes[job.registry],
    checksFor: (cited: readonly Finding[]) =>
        Effect.gen(function* () {
            const lineCounts = yield* (yield* ScopeFiles).lineCountsFor(citedFiles(cited));
            const written = yield* readWrittenEntries(root);
            const standing = yield* readRegistryAsAccepted(root, job.registry);
            const facts = { ...(yield* readFactBase()), lineCounts };
            return {
                records: (records: readonly Finding[]) => [
                    ...proposingGaps(records, lineCounts, { standing, written }),
                    ...stageFactGaps(records, facts),
                ],
                placement: () => [],
                writtenBeside: new Set<string>([
                    ...written.layers.map((entry) => entry.id),
                    ...written.codeKinds.map((entry) => entry.id),
                ]),
            };
        }),
});

/**
 * One proposing job's files, with the stage and key its state is held under.
 * @param root the analysis root
 * @param jobId the proposing job's id
 * @returns the files
 */
export const proposingFiles = (root: string, jobId: string) => ({
    stage: "map" as const,
    key: jobId,
    ...analysisPaths(root).mapRegistries.files(jobId),
});

/**
 * One proposing job as the review rounds take it.
 * @param root the analysis root
 * @param job the proposing job
 * @returns the job, with where its agents write
 */
export const reviewedProposingJob = (root: string, job: ProposingJob) => ({
    ...proposingFiles(root, job.jobId),
    jobId: job.jobId,
    label: registryNames[job.registry],
});

/**
 * `check` on a proposing job: its gate, and once reviewed, the review's verdicts.
 * @param root the analysis root
 * @param job the proposing job
 * @returns one line per gap
 */
export const checkProposing = (root: string, job: ProposingJob) =>
    checkReviewedJob(proposingReview(root, job), reviewedProposingJob(root, job));

/**
 * `carry` on a proposing job: start its run from the registry its feedback is about.
 * @param root the analysis root
 * @param job the proposing job
 * @param leftOut the record ids that do not stand
 * @returns how many records were carried and left out
 */
export const carryProposing = (root: string, job: ProposingJob, leftOut: readonly string[]) =>
    carryForward(proposingFiles(root, job.jobId), agentRecords(proposingShapes[job.registry]), leftOut);
