import { Effect } from "effect";
import { FileAccess } from "../../shared/source/file-access";
import { decided as isDecided, reviewedJobState } from "../../shared/jobs/loop-jobs";
import { decideNew } from "../../shared/jobs/phased-decisions";
import { prefixOf } from "../../shared/model/record-ids";
import { decideEveryJob, settleOutcomes } from "../../shared/read/reviewed-jobs";
import { requireAcceptedRecords } from "../../shared/store/stage-guards";
import { StageRecords, type StageWriteDecision } from "../../shared/store/stage-records";
import { reviewOutcome, type ReviewOutcome } from "../../shared/jobs/review-rounds";
import { GapsRemain } from "../../shared/run/script-errors";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import { staleBrief } from "./brief";
import { readRegistryRead, stageReview } from "./check";
import { reviewedJob } from "./job-steps";
import { definitionOf, isMerging, jobNamed, readJobList, type ListEntry } from "./jobs";
import { beginMerge, mergedRegistries } from "./merge";
import { entryRecord, writeRegistries, writeStandingRegistries } from "./registry";

type Reviewed = Effect.Success<ReturnType<typeof reviewedJob>>;

type StageOutcome = ReviewOutcome<Reviewed["job"]>;

const entryPrefixes = new Set<string>([RecordIdPrefix.Capability, RecordIdPrefix.Entity]);

/**
 * The refusal while the jobs no longer stand for today's inputs: the brief built today differs, since How it runs or
 * the Map wrote again after the jobs were cut (the brief carries their digests), or a job's file changed.
 * @param root the analysis root
 * @param jobs every listed job
 * @returns nothing when they stand; GapsRemain naming why not
 */
const refuseStaleJobs = Effect.fnUntraced(function* (root: string, jobs: readonly ListEntry[]) {
    const gaps = [...(yield* staleBrief(root))];
    for (const { jobId, definition } of jobs) {
        if (definitionOf(yield* jobNamed(root, jobId)) !== definition) {
            gaps.push(
                `${jobId}'s file is no longer the job that was cut: run name-capabilities-and-entities.ts prepare`,
            );
        }
    }
    if (gaps.length) {
        return yield* new GapsRemain({ gaps });
    }
});

/**
 * Some listed jobs as the review rounds take them, each with its own outcome rule.
 * @param root the analysis root
 * @param jobs the jobs, as listed
 * @returns the jobs
 */
const reviewedJobsOf = (root: string, jobs: readonly ListEntry[]) =>
    Effect.forEach(jobs, (entry) =>
        Effect.map(reviewedJob(root, entry.jobId), (each) => ({ ...each.job, state: each.state })),
    );

/**
 * Take the jobs of one phase decided since (`decideNew`), and count those not decided yet.
 * @param root the analysis root
 * @param jobs the phase's jobs, as listed
 * @returns how many were set aside to redo, and how many are not decided
 */
const takePhase = Effect.fnUntraced(function* (root: string, jobs: readonly ListEntry[]) {
    const reviewed = yield* reviewedJobsOf(root, jobs);
    const taken = yield* decideNew(reviewed, (job) =>
        reviewOutcome(
            stageReview(job.state, (kind) => readRegistryRead(root, kind)),
            job,
        ),
    );
    let undecided = 0;
    for (const job of reviewed) {
        undecided += isDecided(yield* reviewedJobState(job)) ? 0 : 1;
    }
    return { redo: taken.redo, undecided };
});

/**
 * Where the stage's phases stand, before it writes (D215, P1.38): the proposing jobs seed the registries; once each is
 * decided, whatever its outcome, the jobs assigning to it run, writing the entries they need; once every assigning job
 * is decided, the merge's jobs merge the written entries in slices; once they are decided, the stage is ready to write.
 * Nothing waits for an outcome but its own job's: a refused job stops nothing.
 * @param root the analysis root
 * @returns what to say, and whether the stage is ready to write
 */
const finishPhase = Effect.fnUntraced(function* (root: string) {
    const jobs = yield* readJobList(root);
    yield* writeRegistries(root);
    const assigning = yield* takePhase(
        root,
        jobs.filter((job) => !isMerging(job.kind)),
    );
    if (assigning.redo || assigning.undecided) {
        return { ready: false, said: ["the assigning jobs run first"] };
    }
    if (!jobs.some((job) => isMerging(job.kind))) {
        const merge = yield* beginMerge(root, jobs);
        if (merge.added) {
            return { ready: false, said: [`${merge.added} merge jobs merge the entries the assigning jobs wrote`] };
        }
        return { ready: true, said: ["no assigning job wrote an entry, so nothing is merged"] };
    }
    const merging = yield* takePhase(
        root,
        jobs.filter((job) => isMerging(job.kind)),
    );
    if (merging.redo || merging.undecided) {
        return { ready: false, said: ["the merge's jobs run first"] };
    }
    return { ready: true, said: [] };
});

/**
 * The stage's one write (D215): the registries as the merge left them, merges first so every record inserted after
 * names the entry standing for a merged one; then each decided job's records, its entries left out (they are the
 * registries'), with their review labels.
 * @param root the analysis root
 * @param ran the jobs that ran, as the review rounds take them
 * @param merged the registries as the merge left them
 * @returns every decided job's outcome
 */
const writeStage = Effect.fnUntraced(function* (
    root: string,
    ran: ReadonlyArray<Reviewed["job"] & { readonly state: Reviewed["state"] }>,
    merged: Effect.Success<ReturnType<typeof mergedRegistries>>,
) {
    return yield* (yield* StageRecords).writeStageRecords("capabilities-and-entities", (writer) =>
        Effect.gen(function* () {
            yield* writer.mergeEntries(merged.resolved);
            for (const [type, prefix] of [
                ["Capability", RecordIdPrefix.Capability],
                ["Entity", RecordIdPrefix.Entity],
            ] as const) {
                yield* writer.insertRecords(
                    type,
                    merged.standing.filter((entry) => prefixOf(entry.id) === prefix).map(entryRecord),
                );
            }
            const outcomes = yield* decideEveryJob(writer, "capabilities-and-entities", ran, (job) =>
                Effect.map(
                    reviewOutcome(
                        stageReview(job.state, (kind) => readRegistryRead(root, kind)),
                        job,
                    ),
                    (outcome) => ({
                        ...outcome,
                        accepted: outcome.accepted.filter(
                            (record) => typeof record.id !== "string" || !entryPrefixes.has(prefixOf(record.id)),
                        ),
                    }),
                ),
            );
            const decision: StageWriteDecision<readonly StageOutcome[]> = { commit: true, result: outcomes };
            return decision;
        }),
    );
});

/**
 * `finish`: take what each phase decided since (`finishPhase`); once the stage is ready, decide every job and write the
 * stage's accepted records in one transaction of the record store: every entry the registries hold (seeded, written,
 * and as the merge left it, a merged one left out and every reference to it written as one to the entry standing for
 * it), then each job's assignments and facts, with their review labels (D215, P1.33). A job's records are never removed
 * for another job's outcome: an entry is never withdrawn, so an assignment always finds the entry it chose. Refused
 * until the Map has accepted records, and while the brief or today's cut no longer matches the jobs.
 * @param root the analysis root
 * @returns every decided job's outcome, whether the accepted records were written, and what to say
 */
export const finishStage = Effect.fnUntraced(function* (root: string) {
    yield* requireAcceptedRecords("map");
    yield* refuseStaleJobs(root, yield* readJobList(root));
    const phase = yield* finishPhase(root);
    if (!phase.ready) {
        const waiting: { written: boolean; outcomes: readonly StageOutcome[]; said: readonly string[] } = {
            written: false,
            outcomes: [],
            said: phase.said,
        };
        return waiting;
    }
    const jobs = yield* readJobList(root);
    const fs = yield* FileAccess;
    const ran: Array<Reviewed["job"] & { readonly state: Reviewed["state"] }> = [];
    for (const each of yield* reviewedJobsOf(root, jobs)) {
        if (yield* fs.exists(each.outputPath)) {
            ran.push(each);
        }
    }
    const merged = yield* mergedRegistries(root, jobs);
    yield* writeStandingRegistries(root, merged.standing);
    const result = yield* writeStage(root, ran, merged);
    yield* settleOutcomes(result.filter((each) => each.outcome !== "redo"));
    const rings = merged.rings.map(
        (ring) => `the merge merged ${ring.join(" and ")} into one another; they stand as one`,
    );
    const notCompared = merged.notCompared.length
        ? [`${merged.notCompared.length} written entries were not compared: their merge job was refused`]
        : [];
    return { written: true, outcomes: result, said: [...phase.said, ...rings, ...notCompared] };
});
