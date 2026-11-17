import { resolve } from "node:path";
import { Effect } from "effect";
import { analysisPaths, isInsideFolder, scriptsCommand, sourceBase } from "../../shared/run/analysis-layout";
import { AnalysisRequest } from "../../shared/run/analysis-request";
import { StageRecords } from "../../shared/store/stage-records";
import { FileAccess } from "../../shared/source/file-access";
import { rejectedPathOf } from "../../shared/jobs/job-transitions";
import { readDocumentStrictly } from "../../shared/run/json-files";
import { reviewArguments as reviewArgumentsOf } from "../../shared/jobs/review-sheet";
import { mapJobLabel, readMapJob, readMapJobList } from "../../shared/jobs/map-job-list";
import {
    feedbackArgument,
    personsWords,
    prepareJobRun,
    requireArtifacts,
    instructionsOf,
    type PersonsWords,
} from "../../shared/jobs/job-feedback";
import { GapsRemain, UsageInvalid } from "../../shared/run/script-errors";
import type { MapJob } from "../../shared/model/schemas/map-jobs";
import type { Lines } from "../../shared/model/shared-fields";
import { startStageRun } from "../../shared/store/stage-guards";
import { mapJobBriefText, staleMapBrief } from "./map-brief";
import { proposingArguments, proposingFiles, proposingReviewArguments, writeProposingBrief } from "./map-proposing";
import { proposingNamed, registriesAccepted, requireMapRegistries, type ProposingJob } from "./map-registries";

type Listed = typeof MapJob.Type & { readonly jobId: string };

type JobGap = { readonly jobId: string; readonly customInstructions?: string };

const laterStages = ["capabilities-and-entities"] as const;

/**
 * Where one job's agents and rounds write, and the stage and key its state is held under, as the review rounds take
 * them.
 * @param root the analysis root
 * @param jobId the job id
 * @returns the job's files
 */
export const mapJobFiles = (root: string, jobId: string) => {
    const paths = analysisPaths(root);
    return {
        stage: "map" as const,
        key: jobId,
        outputPath: paths.mapOutput(jobId),
        reviewPath: paths.mapReview(jobId),
        roundsFolder: paths.mapRounds(jobId),
    };
};

/**
 * The named arguments of map-blocks-and-links on one job, in the order its contract lists them.
 * @param root the analysis root
 * @param job the listed job
 * @param sourceFolder the folder record paths are relative to
 * @returns the arguments; `customInstructions` only when stored
 */
const mapArguments = (root: string, job: JobGap, sourceFolder: string) => {
    const paths = analysisPaths(root);
    return {
        scriptsCommand: scriptsCommand(root),
        sourceFolder,
        jobId: job.jobId,
        jobPath: paths.mapJobFile(job.jobId),
        briefPath: paths.mapJobBrief(job.jobId),
        registryPath: paths.mapRegistries.both,
        outputPath: paths.mapOutput(job.jobId),
        ...instructionsOf(job),
    };
};

/**
 * The named arguments of the review of one job's map, in the order the reviewer's contract lists them: it searches the
 * job's own lines for what is missing, not the whole manifest.
 * @param root the analysis root
 * @param job the listed job
 * @param sourceFolder the folder record paths are relative to
 * @returns the arguments; `customInstructions` only when stored
 */
const mapReviewArguments = (root: string, job: JobGap, sourceFolder: string) =>
    reviewArgumentsOf(mapJobFiles(root, job.jobId), mapReviewCall(root, job, sourceFolder));

/**
 * What the reviewer of one job's map is given besides its files: the source folder, the command that checks its review
 * and the job's feedback.
 * @param root the analysis root
 * @param job the listed job
 * @param sourceFolder the folder record paths are relative to
 * @returns the call
 */
export const mapReviewCall = (root: string, job: JobGap, sourceFolder: string) => ({
    root,
    sourceFolder,
    checkCommand: `${scriptsCommand(root)}/map-codebase.ts check ${job.jobId}`,
    feedback: job,
});

/**
 * Write one job's own file: its windows. It is written once, by the cut, so no step on one job rewrites anything that
 * grows with the codebase. The caller holds the record store.
 * @param root the analysis root
 * @param job the job, with its job id
 * @returns nothing once written
 */
export const writeMapJob = Effect.fnUntraced(function* (
    root: string,
    job: {
        readonly jobId: string;
        readonly lines: readonly Lines[];
    },
) {
    const { jobId, ...state } = job;
    yield* (yield* FileAccess).writeText(analysisPaths(root).mapJobFile(jobId), JSON.stringify(state));
});

export type MapTarget =
    { readonly kind: "jobs"; readonly jobIds: readonly string[] } | { readonly kind: "path"; readonly path: string };

/**
 * One job by its id, from its own file; refused for an id no job holds.
 * @param root the analysis root
 * @param jobId the job id
 * @returns the job; UsageInvalid when there is no such job
 */
export const mapJobNamed = Effect.fnUntraced(function* (root: string, jobId: string) {
    if (!(yield* (yield* FileAccess).exists(analysisPaths(root).mapJobFile(jobId)))) {
        return yield* new UsageInvalid({
            issue: `${jobId} is not one of the Map's jobs: map-codebase.ts status counts them`,
        });
    }
    const job: Listed = { jobId, ...(yield* readMapJob(root, jobId)) };
    return job;
});

/**
 * The jobs a target names: jobs by their ids, each read alone, or every job with a window in a file under a path,
 * compared by path segment with the host's path rules (`.` is every job).
 * @param root the analysis root
 * @param target the job id or the path
 * @returns the jobs; UsageInvalid when none matches
 */
const jobsNamed = Effect.fnUntraced(function* (root: string, target: MapTarget) {
    if (target.kind === "jobs") {
        return yield* Effect.forEach(target.jobIds, (jobId) => mapJobNamed(root, jobId));
    }
    const named: Listed[] = [];
    for (const jobId of yield* readMapJobList(root)) {
        const job = yield* mapJobNamed(root, jobId);
        if (job.lines.some((window) => isInsideFolder(resolve(target.path), resolve(window.file)))) {
            named.push(job);
        }
    }
    if (named.length === 0) {
        return yield* new UsageInvalid({ issue: `no Map job holds a file under ${target.path}` });
    }
    return named;
});

/**
 * Make one job ready for its next run: its output and review cleared; while its feedback is on an artifact set aside (a
 * redo), its run improves that artifact and its round is kept; the person's words, when given, are its feedback and
 * start a new cycle of rounds (D29). The caller holds the record store.
 * @param files the job's files
 * @param words the person's words, when given
 * @returns the job's feedback as its customInstructions
 */
const readyJob = Effect.fnUntraced(function* (files: ReturnType<typeof mapJobFiles>, words: PersonsWords | undefined) {
    yield* prepareJobRun(files, personsWords(words), [files.reviewPath, rejectedPathOf(files.reviewPath)]);
    return yield* feedbackArgument(files);
});

/**
 * `prepare <job id>` on a proposing job: make it ready for its next run (`readyJob`); the person's words start a new
 * cycle of its runs (D29). The caller holds the record store.
 * @param root the analysis root
 * @param job the proposing job
 * @param words the person's words, when given
 * @returns the job with its feedback
 */
const readyProposing = Effect.fnUntraced(function* (root: string, job: ProposingJob, words: PersonsWords | undefined) {
    const files = proposingFiles(root, job.jobId);
    if (words !== undefined) {
        yield* requireArtifacts([{ jobId: job.jobId, files }]);
    }
    return { ...job, ...(yield* readyJob(files, words)) };
});

/**
 * Make the Map jobs a target names ready for their next run (`readyJob`), each with its brief (`mapJobBriefText`);
 * the person's words are refused, naming them, for jobs that produced no artifact. The caller holds the record store.
 * @param root the analysis root
 * @param target the job ids, or the path whose jobs are run again
 * @param words the person's words, when given
 * @returns each job with its feedback
 */
const readyMapJobs = Effect.fnUntraced(function* (root: string, target: MapTarget, words: PersonsWords | undefined) {
    const named = yield* jobsNamed(root, target);
    if (words !== undefined) {
        yield* requireArtifacts(named.map((job) => ({ jobId: job.jobId, files: mapJobFiles(root, job.jobId) })));
    }
    const ready: Array<{ readonly jobId: string; readonly customInstructions?: string }> = [];
    const fs = yield* FileAccess;
    for (const job of named) {
        const feedback = yield* readyJob(mapJobFiles(root, job.jobId), words);
        yield* fs.writeText(analysisPaths(root).mapJobBrief(job.jobId), yield* mapJobBriefText(root, job.lines));
        ready.push({ jobId: job.jobId, ...feedback });
    }
    return ready;
});

/**
 * `prepare <job id>` or `prepare --path <path>`: make the named jobs ready for their next run (`readyJob`), while
 * holding the record store; a proposing job by its id. The person's words are refused, naming them, for jobs that
 * produced no artifact. The Map's accepted records are removed. Refused while the brief is stale, while a Map job is
 * named before both registries are accepted, and while Capabilities and entities has accepted records.
 * @param root the analysis root
 * @param target the job id, or the path whose jobs are run again
 * @param words the person's feedback on the jobs' last artifacts, when they give it
 * @returns each prepared job, with its agent, its arguments and its review's
 */
export const prepareMapJobs = Effect.fnUntraced(function* (
    root: string,
    target: MapTarget,
    words: PersonsWords | undefined,
) {
    const stale = yield* staleMapBrief(root);
    if (stale.length) {
        return yield* new GapsRemain({ gaps: stale });
    }
    const request = yield* readDocumentStrictly(analysisPaths(root).analysisRequest, AnalysisRequest);
    const context = {
        sourceFolder: sourceBase(request.sourceRoots),
        withSupportingMaterial: request.supportingMaterial.length > 0,
    };
    const state = yield* requireMapRegistries();
    const [only] = target.kind === "jobs" ? target.jobIds : [];
    const proposing = only === undefined ? undefined : proposingNamed(state, only);
    const stages = yield* StageRecords;
    if (proposing !== undefined) {
        const ready = yield* startStageRun(
            "map",
            laterStages,
            Effect.tap(readyProposing(root, proposing, words), () => stages.removeStageRecords("map")),
        );
        yield* writeProposingBrief(root, ready, context);
        return [
            {
                jobId: ready.jobId,
                agent: "registry/propose-entries",
                run: proposingArguments(root, ready, context),
                review: proposingReviewArguments(root, ready, context.sourceFolder),
            },
        ];
    }
    if (!(yield* registriesAccepted(state))) {
        return yield* new UsageInvalid({
            issue: "the registries are proposed first: no Map job can choose from them yet",
        });
    }
    const prepared = yield* startStageRun(
        "map",
        laterStages,
        Effect.tap(readyMapJobs(root, target, words), () => stages.removeStageRecords("map")),
    );
    return prepared.map((job) => ({
        jobId: job.jobId,
        agent: "map/map-blocks-and-links",
        run: mapArguments(root, job, context.sourceFolder),
        review: mapReviewArguments(root, job, context.sourceFolder),
    }));
});

/**
 * One Map job as the review rounds take it, with its windows: the job's own file, read alone, so nothing it reads
 * grows with the codebase.
 * @param root the analysis root
 * @param jobId the job id
 * @returns its windows and the job; UsageInvalid for an id no job holds
 */
export const reviewedMapJob = Effect.fnUntraced(function* (root: string, jobId: string) {
    const { lines } = yield* mapJobNamed(root, jobId);
    return { windows: lines, job: { ...mapJobFiles(root, jobId), jobId, label: mapJobLabel(lines) } };
});
