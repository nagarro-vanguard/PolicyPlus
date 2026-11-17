import { outcomesInWords } from "../../shared/jobs/review-report";
import { Effect } from "effect";
import { AnalysisRequest } from "../../shared/run/analysis-request";
import { analysisPaths, sourceBase } from "../../shared/run/analysis-layout";
import { feedbackArgument } from "../../shared/jobs/job-feedback";
import { readDocumentStrictly } from "../../shared/run/json-files";
import { mapJobLabel, readMapJob } from "../../shared/jobs/map-job-list";
import { stageLoop } from "../../shared/jobs/loop-jobs";
import { checkAnyMapJob } from "./map-job-steps";
import { finishMap, reachSummary } from "./finish-map";
import { reviewCall } from "../../shared/jobs/review-sheet";
import { mapJobFiles, mapReviewCall, prepareMapJobs, reviewedMapJob } from "./map-jobs";
import { linkSheet } from "./link-sheet";
import { mapReview, readMapEntries } from "./check-map";
import { proposingFiles, proposingReview, proposingReviewCall, reviewedProposingJob } from "./map-proposing";
import {
    addWrittenEntries,
    leadDecided,
    proposingNamed,
    registriesAccepted,
    requireMapRegistries,
} from "./map-registries";
import { entriesWrittenIn } from "./map-merge";
import { FileAccess } from "../../shared/source/file-access";
import { registryDigest } from "../../shared/jobs/registry-digest";
import type { LoopJob } from "../../shared/jobs/loop-jobs";
import { mapAssumptionOwners, mapNotices } from "./map-notices";

/**
 * One job as the loop takes it: a proposing job or a Map job, with its label, its round, whether it is reviewed, and
 * its files.
 * @param root the analysis root
 * @param jobId the job id
 * @returns the job
 */
const loopJob = Effect.fnUntraced(function* (root: string, jobId: string) {
    const proposing = proposingNamed(yield* requireMapRegistries(), jobId);
    if (proposing !== undefined) {
        const { outputPath, label, reviewPath, roundsFolder } = reviewedProposingJob(root, proposing);
        return { key: jobId, label, outputPath, reviewed: { reviewPath, roundsFolder } };
    }
    const { lines } = yield* readMapJob(root, jobId);
    const { outputPath, reviewPath, roundsFolder } = mapJobFiles(root, jobId);
    return { key: jobId, label: mapJobLabel(lines), outputPath, reviewed: { reviewPath, roundsFolder } };
});

/**
 * Whether a job may run now (P1.38): a merging job always; the lead Map job at once, alone; the other Map jobs once the
 * lead is decided and no registry is being merged.
 * @param jobId the job id
 * @returns true when it may run
 */
const mayRun = Effect.fnUntraced(function* (jobId: string) {
    const state = yield* requireMapRegistries();
    if (proposingNamed(state, jobId) !== undefined) {
        return true;
    }
    return (jobId === state.lead || (yield* leadDecided(state))) && (yield* registriesAccepted(state));
});

/**
 * Add the entries the closed batch's Map jobs wrote, those whose output stands, to the registry the next batch reads
 * (P1.38).
 * @param root the analysis root
 * @param ran the jobs whose agents the batch ran
 * @returns nothing once added
 */
const addEntriesOf = Effect.fnUntraced(function* (root: string, ran: readonly LoopJob[]) {
    const fs = yield* FileAccess;
    const state = yield* requireMapRegistries();
    for (const job of ran) {
        if (proposingNamed(state, job.key) === undefined && (yield* fs.exists(job.outputPath))) {
            yield* addWrittenEntries(root, yield* entriesWrittenIn(job.outputPath, "map"));
        }
    }
});

/**
 * The review of one job, as the loop hands it out: a merging job's reads its brief, the entries written and its registry; a Map job's
 * its brief, the registry and the rules, and the sheet of its links.
 * @param root the analysis root
 * @param jobId the job id
 * @param sourceFolder the folder record paths are relative to
 * @returns the reviewer's call
 */
const reviewJobCall = Effect.fnUntraced(function* (root: string, jobId: string, sourceFolder: string) {
    const paths = analysisPaths(root);
    const state = yield* requireMapRegistries();
    const proposing = proposingNamed(state, jobId);
    if (proposing !== undefined) {
        const feedback = yield* feedbackArgument(proposingFiles(root, jobId));
        return yield* reviewCall(
            proposingReview(root, proposing),
            reviewedProposingJob(root, proposing),
            {
                checklist: paths.registryChecklist,
                reads: [
                    ["what the agent worked from: its rules and what it read", paths.mapRegistries.brief(jobId)],
                    ["the entries the Map jobs wrote", paths.mapRegistries.written],
                    ["the registry as written", paths.mapRegistries.registry(proposing.registry)],
                ],
            },
            proposingReviewCall(root, { ...proposing, ...feedback }, sourceFolder),
        );
    }
    const feedback = yield* feedbackArgument(mapJobFiles(root, jobId));
    const { windows, job } = yield* reviewedMapJob(root, jobId);
    return yield* reviewCall(
        mapReview(root, windows, yield* readMapEntries(root)),
        job,
        {
            checklist: paths.reviewChecklist("map"),
            reads: [
                [
                    "the rules for a block, and the facts on the parts and technologies the lines touch",
                    paths.mapJobBrief(jobId),
                ],
                ["the code kinds, layers and external systems to choose from", paths.mapRegistries.both],
            ],
            beside: yield* linkSheet(root, job.outputPath),
        },
        mapReviewCall(root, { jobId, ...feedback }, sourceFolder),
    );
});

/**
 * The Map as the loop drives it (D56, P1.38): the lead job first, alone; then every other Map job, the
 * reviewed ones first, each taking an entry from the registries or writing the one it needs, each closed batch adding
 * the entries its jobs wrote for the next; once every Map job is decided, merging jobs merge duplicates; then
 * `finish` writes the registries and the map in one commit. The jobs must be cut first by `prepare`.
 * @param root the analysis root
 * @returns the stage's loop
 */
export const mapLoop = Effect.fnUntraced(function* (root: string) {
    const sourceFolder = sourceBase(
        (yield* readDocumentStrictly(analysisPaths(root).analysisRequest, AnalysisRequest)).sourceRoots,
    );
    return stageLoop({
        stage: "map",
        root,
        begin: Effect.asVoid(requireMapRegistries()),
        keys: Effect.map(requireMapRegistries(), (now) => [...now.proposing.map((job) => job.jobId), ...now.order]),
        job: (jobId) => loopJob(root, jobId),
        mayRun: (job) => mayRun(job.key),
        prepare: (jobIds) =>
            Effect.map(
                Effect.forEach(jobIds, (jobId) => prepareMapJobs(root, { kind: "jobs", jobIds: [jobId] }, undefined)),
                (prepared) =>
                    prepared.flat().map((job) => ({ key: job.jobId, call: { agent: job.agent, arguments: job.run } })),
            ),
        review: (job) => reviewJobCall(root, job.key, sourceFolder),
        check: (job) => checkAnyMapJob(root, job.key),
        answer: (key, answer) => Effect.asVoid(prepareMapJobs(root, { kind: "jobs", jobIds: [key] }, answer)),
        registry: registryDigest([analysisPaths(root).mapRegistries.both]),
        leftOver: Effect.succeed([]),
        afterClose: (ran) => addEntriesOf(root, ran),
        notices: (job) => mapNotices(root, job),
        ownersOf: (fact) => mapAssumptionOwners(root, fact),
        finish: Effect.map(finishMap(root), ({ written, outcomes, reach, said }) => {
            return {
                more: !written,
                said: [
                    ...said,
                    ...(outcomes.length ? [outcomesInWords(outcomes)] : []),
                    ...(written ? [reachSummary(reach)] : []),
                ],
            };
        }),
    });
});
