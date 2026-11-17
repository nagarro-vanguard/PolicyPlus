import { Effect } from "effect";
import { CodeGraph } from "../../shared/graph/code-graph";
import { refuseWhileLaterStagesHaveRecords, requireAcceptedRecords } from "../../shared/store/stage-guards";
import { StageRecords, type StageWriteDecision, type StageWriter } from "../../shared/store/stage-records";
import { reviewOutcome, type ReviewOutcome } from "../../shared/jobs/review-rounds";
import { decideEveryJob, refusedAfterReview, setRoundsAside, settleOutcomes } from "../../shared/read/reviewed-jobs";
import { FeedbackItem } from "../../shared/model/schemas/feedback";
import { known } from "../../shared/run/collections";
import { GapsRemain, UsageInvalid } from "../../shared/run/script-errors";
import { RecordIdPrefix, type Lines } from "../../shared/model/shared-fields";
import { prefixOf } from "../../shared/model/record-ids";
import { mapReview, readMapEntries } from "./check-map";
import { reviewedMapJob } from "./map-jobs";
import { leadingRunsOf } from "./coverage";
import { gapsAcrossJobs, reasonsByJob, windowsByLine, type LeadingRun } from "./check-across-jobs";
import { staleMapBrief } from "./map-brief";
import { finishPhase } from "./map-phases";
import { mapAssumptions } from "./map-assumptions";
import { proposingReview, reviewedProposingJob } from "./map-proposing";
import {
    readWrittenEntries,
    registryNames,
    requireMapRegistries,
    type MapRegistriesState,
    type ProposingJob,
} from "./map-registries";
import { compareText } from "../../shared/run/collections";
import { mergesOf, resolveMerges } from "../../shared/jobs/merging";
import { entriesWrittenIn } from "./map-merge";
import { FileAccess } from "../../shared/source/file-access";

type Reviewed = Effect.Success<ReturnType<typeof reviewedMapJob>>;
type MapJob = Reviewed["job"] & { readonly proposing: ProposingJob | undefined };

export type MapOutcome = ReviewOutcome<MapJob>;

export type ReachCounts = { readonly blocks: number; readonly unreached: number; readonly noWayIn: number };

const noReach: ReachCounts = { blocks: 0, unreached: 0, noWayIn: 0 };

type FinishResult = {
    readonly written: boolean;
    readonly outcomes: readonly MapOutcome[];
    readonly unreached: number;
    readonly reach: ReachCounts;
    readonly said: readonly string[];
};

/**
 * Refuse while the jobs no longer stand for today's inputs: the brief built today differs, since Inventory or How it
 * runs wrote again after the jobs were cut (their write numbers are in the brief).
 * @param root the analysis root
 * @returns nothing when the jobs are current; GapsRemain naming what to run
 */
const refuseStaleJobs = Effect.fnUntraced(function* (root: string) {
    const gaps = yield* staleMapBrief(root);
    if (gaps.length) {
        return yield* new GapsRemain({ gaps });
    }
});

/**
 * Check the written jobs across jobs, in the store, and route each gap to every job it names, as feedback from the
 * checks across jobs (D29): a written job a gap names runs its gate fix once, else is refused (P1.37). A refused job's
 * records leave the write and the check runs again, since its lines leave the map and a target resolved into them may
 * now find no block; it ends when no gap remains or a job is to be fixed. Every pass turns at least one written job to
 * fix or refused, since a gap is found only in written records, so the check ends; a pass that turns none is a defect,
 * never a loop.
 * @param writer the stage's write
 * @param results every job's outcome
 * @param windowsOf each job's windows
 * @param leadingOf each accepted job's leading runs
 * @returns the outcomes after the checks
 */
const checkAcrossJobs = Effect.fnUntraced(function* (
    writer: StageWriter,
    results: readonly MapOutcome[],
    windowsOf: ReadonlyMap<string, readonly Lines[]>,
    leadingOf: ReadonlyMap<string, readonly LeadingRun[]>,
) {
    const written = (each: MapOutcome) => each.outcome === "accepted";
    let outcomes = [...results];
    for (;;) {
        yield* writer.resolveReferences;
        const windows = outcomes
            .filter((each) => written(each) && windowsOf.has(each.job.jobId))
            .flatMap((each) =>
                known(windowsOf, each.job.jobId, "every listed job has its windows").map((window) => ({
                    jobId: each.job.jobId,
                    ...window,
                })),
            );
        const leading = outcomes
            .filter((each) => written(each) && windowsOf.has(each.job.jobId))
            .flatMap((each) =>
                known(leadingOf, each.job.jobId, "every accepted job's leading runs are read as it is decided"),
            );
        const reasons = reasonsByJob(yield* gapsAcrossJobs(windowsByLine(windows), leading));
        if (reasons.size === 0) {
            return outcomes;
        }
        const standing = outcomes.filter(written).length;
        outcomes = outcomes.map((each) => {
            const own = reasons.get(each.job.jobId);
            return own === undefined ? each : refusedAfterReview(each, FeedbackItem.fromGaps("acrossJobs", own));
        });
        if (outcomes.filter(written).length === standing) {
            return yield* Effect.die(
                new Error(
                    `gaps across jobs name no written job, so checking again finds them again: ${[...reasons.keys()].join(", ")}`,
                ),
            );
        }
        if (outcomes.some((each) => each.outcome === "redo")) {
            return outcomes;
        }
        for (const each of outcomes.filter(
            (outcome) => outcome.outcome === "refused" && reasons.has(outcome.job.jobId),
        )) {
            yield* writer.removeJobRecords(each.job.jobId);
        }
    }
});

/**
 * What the proposing jobs' outputs say of the entries the Map's jobs wrote (P1.38), as the outputs stand: each record id
 * named in an entry's `mergedFrom`, to that entry's record id, and every record id the outputs hold, which the stage
 * must not write a second time (the output is its writer).
 * @param root the analysis root
 * @param state where the registries stand
 * @returns the merged record ids, each to the entry merging it, and the entries the outputs hold
 */
const mergedByProposing = Effect.fnUntraced(function* (root: string, state: MapRegistriesState) {
    const fs = yield* FileAccess;
    const entries = [];
    for (const job of state.proposing) {
        const { outputPath } = reviewedProposingJob(root, job);
        if (yield* fs.exists(outputPath)) {
            entries.push(...(yield* entriesWrittenIn(outputPath, "proposing")));
        }
    }
    return {
        merged: resolveMerges(mergesOf(entries), compareText).resolved,
        held: new Set(entries.map((entry) => entry.id)),
    };
});

const entryPrefixes = new Set<string>([RecordIdPrefix.Layer, RecordIdPrefix.CodeKind, RecordIdPrefix.ExternalSystem]);

/**
 * Write the entries the Map's jobs wrote while mapping beside the jobs' records (P1.38): every one each closed batch
 * added, never withdrawn, so a job standing on one finds it whatever became of the job that wrote it; a merged one is
 * left out, every reference to it written as one to the entry merging it (`mergeEntries`); one a proposing job keeps
 * as written is left out too, since that job's output writes it.
 * @param writer the stage's write
 * @param written the entries written while mapping
 * @param merged each merged entry's record id, to the entry merging it
 * @param held the entries the proposing jobs' outputs hold
 * @returns nothing once inserted
 */
const insertWrittenEntries = Effect.fnUntraced(function* (
    writer: StageWriter,
    written: Effect.Success<ReturnType<typeof readWrittenEntries>>,
    merged: ReadonlyMap<string, string>,
    held: ReadonlySet<string>,
) {
    const standing = <E extends { readonly id: string }>(entries: readonly E[]) =>
        entries.filter((entry) => !merged.has(entry.id) && !held.has(entry.id));
    yield* writer.insertRecords("Layer", standing(written.layers));
    yield* writer.insertRecords("CodeKind", standing(written.codeKinds));
    yield* writer.insertRecords("ExternalSystem", standing(written.externalSystems));
});

/**
 * What `finish` decided: whether the Map's accepted records were written, every job's outcome, and the blocks no way
 * in reaches. The store keeps the write only when they were; the reports and feedback to settle once it commits (D74).
 * @param written whether the records were written
 * @param outcomes every job's outcome
 * @param reach the blocks, those no entry point reaches, and those with no way in at all
 * @param settled each job's outcome to settle after the commit; a Map job raises no question
 * @returns the decision
 */
const decided = (
    written: boolean,
    outcomes: readonly MapOutcome[],
    reach: ReachCounts,
    settled: ReadonlyArray<MapOutcome>,
): StageWriteDecision<Omit<FinishResult, "said"> & { readonly settled: typeof settled }> => ({
    commit: written,
    result: { written, outcomes, unreached: reach.unreached, reach, settled },
});

/**
 * Every job the Map writes from, as the review rounds take it: the two proposing jobs, then each Map job with its
 * windows.
 * @param root the analysis root
 * @returns the jobs, and each Map job's windows
 */
const finishJobs = Effect.fnUntraced(function* (root: string) {
    const state = yield* requireMapRegistries();
    const proposing = state.proposing.map((job): MapJob => ({ ...reviewedProposingJob(root, job), proposing: job }));
    const mapped = yield* Effect.forEach(state.order, (jobId) => reviewedMapJob(root, jobId));
    const windowsOf = new Map<string, readonly Lines[]>(mapped.map((each) => [each.job.jobId, each.windows]));
    return {
        state,
        jobs: [...proposing, ...mapped.map((each): MapJob => ({ ...each.job, proposing: undefined }))],
        windowsOf,
    };
});

/**
 * `finish`: first the Map's phases (`finishPhase`): take what was decided since; nothing is written until every Map job
 * is decided and the proposing jobs have merged the entries the Map's jobs wrote (P1.38). Then decide every job, insert
 * the written records with their review labels (the registries' entries, then every Map job's, a merged entry left out
 * and every reference to it written as one to the entry merging it), check them across jobs, and write the Map's
 * records with the assumptions per part for what the Map cannot see (`mapAssumptions`), all in one transaction of the
 * record store. No step holds more than one job's records. Refused until How it runs has accepted records, and while
 * the brief or today's cut no longer matches the jobs. A job to fix, from its review, the checks across jobs or the
 * store's rules, is set aside with its feedback and the store is left as it was; otherwise the written records are
 * kept, and a refused job raises no question (D165): its report says so, and the pages show its lines as not mapped;
 * each job's report is written and its feedback settled once the write commits, never for a commit that did not
 * happen (D74).
 * @param root the analysis root
 * @returns every job's outcome, whether the accepted records were written, the blocks no entry point reaches, and what the
 * phases said
 */
export const finishMap = Effect.fnUntraced(function* (root: string) {
    yield* requireAcceptedRecords("how-it-runs");
    yield* refuseWhileLaterStagesHaveRecords(["capabilities-and-entities", "capability-rules", "publish"]);
    yield* refuseStaleJobs(root);
    const phase = yield* finishPhase(root, yield* requireMapRegistries());
    if (!phase.ready) {
        const waiting: FinishResult = { written: false, outcomes: [], unreached: 0, reach: noReach, said: phase.said };
        return waiting;
    }
    const { state, jobs, windowsOf } = yield* finishJobs(root);
    const graph = yield* CodeGraph;
    const result = yield* (yield* StageRecords).writeStageRecords("map", (writer) =>
        Effect.gen(function* () {
            const registered = yield* readMapEntries(root);
            const { merged, held } = yield* mergedByProposing(root, state);
            yield* writer.mergeEntries(merged);
            yield* insertWrittenEntries(writer, yield* readWrittenEntries(root), merged, held);
            const leadingOf = new Map<string, readonly LeadingRun[]>();
            const reviewed = yield* decideEveryJob(writer, "map", jobs, (job) =>
                job.proposing === undefined
                    ? decideMapJob(root, job, known(windowsOf, job.jobId, "every Map job has its windows"), {
                          registered,
                          leadingOf,
                      })
                    : reviewOutcome(proposingReview(root, job.proposing), job),
            );
            for (const each of reviewed) {
                if (each.job.proposing !== undefined && each.outcome === "refused") {
                    return yield* new UsageInvalid({
                        issue: `${registryNames[each.job.proposing.registry]} could not be written: their checks still fail after their fix, so every Map record citing one of their entries would name none (show says why); prepare ${each.job.jobId} runs their owner again`,
                    });
                }
            }
            const outcomes = reviewed.some((each) => each.outcome === "redo")
                ? reviewed
                : yield* checkAcrossJobs(writer, reviewed, windowsOf, leadingOf);
            const redo = outcomes.filter((each) => each.outcome === "redo");
            if (redo.length) {
                yield* setRoundsAside(redo);
                return decided(false, outcomes, noReach, []);
            }
            yield* writer.insertRecords("Fact", yield* mapAssumptions(root, state));
            yield* writer.indexEntryPointReach;
            return decided(true, outcomes, yield* reachOf(graph), outcomes);
        }),
    );
    yield* settleOutcomes(result.settled);
    const finished: FinishResult = {
        written: result.written,
        outcomes: result.outcomes,
        unreached: result.unreached,
        reach: result.reach,
        said: phase.said,
    };
    return finished;
});

/**
 * One Map job's outcome as the write decides it: its review held to the gate, and, once written, its leading runs kept
 * for the checks across jobs, and its spans left out, since they are never stored, and the entries it wrote, which the
 * stage writes beside its jobs' records (P1.38).
 * @param root the analysis root
 * @param job the job
 * @param windows its windows
 * @param read what the write reads once, and fills in
 * @param read.registered the registries' entries
 * @param read.leadingOf each written job's leading runs, filled in

 * @returns the outcome
 */
const decideMapJob = Effect.fnUntraced(function* (
    root: string,
    job: MapJob,
    windows: readonly Lines[],
    read: {
        readonly registered: Effect.Success<ReturnType<typeof readMapEntries>>;
        readonly leadingOf: Map<string, readonly LeadingRun[]>;
    },
) {
    const { registered, leadingOf } = read;
    const outcome = yield* reviewOutcome(mapReview(root, windows, registered), job);
    if (outcome.outcome !== "accepted") {
        return outcome;
    }
    const runs = yield* leadingRunsOf(root, windows, outcome.accepted);
    leadingOf.set(
        job.jobId,
        runs.map((each) => ({ jobId: job.jobId, ...each })),
    );
    const kept = outcome.accepted.filter(
        (record) => prefixOf(record.id) !== RecordIdPrefix.Span && !entryPrefixes.has(prefixOf(record.id)),
    );
    return { ...outcome, accepted: kept };
});

/**
 * The Map's reach as written: its blocks, those no entry point reaches, and those with no way in at all.
 * @param graph the code graph
 * @returns the counts
 */
const reachOf = Effect.fnUntraced(function* (graph: Effect.Success<typeof CodeGraph>) {
    return {
        blocks: yield* graph.countBlocks,
        unreached: yield* graph.countBlocksNothingReaches,
        noWayIn: (yield* graph.findBlocksWithNoWayIn).length,
    };
});

/**
 * What the Map says of its reach once written: the share of blocks an entry point reaches, and the blocks with no way
 * in at all, which are neither entry points nor reached by any link.
 * @param reach the counts
 * @returns the line
 */
export const reachSummary = (reach: ReachCounts) =>
    `accepted records written; ${reach.blocks ? Math.round((1000 * (reach.blocks - reach.unreached)) / reach.blocks) / 10 : 0}% of blocks reached (${reach.unreached} of ${reach.blocks} no entry point reaches); ${reach.noWayIn} blocks have no way in at all`;
