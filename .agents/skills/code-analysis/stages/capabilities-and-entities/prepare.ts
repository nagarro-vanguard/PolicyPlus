import { Effect } from "effect";
import { analysisPaths, scriptsCommand, sourceBase, type Stage } from "../../shared/run/analysis-layout";
import { AnalysisRequest } from "../../shared/run/analysis-request";
import { FileAccess } from "../../shared/source/file-access";
import { rejectedPathOf } from "../../shared/jobs/job-transitions";
import {
    feedbackArgument,
    personsWords,
    prepareJobRun,
    requireArtifacts,
    instructionsOf,
    type PersonsWords,
} from "../../shared/jobs/job-feedback";
import { jobIdIssuer, refuseDroppedWork } from "../../shared/jobs/job-ids";
import { readDocumentStrictly } from "../../shared/run/json-files";
import { writeJobBrief } from "../../shared/jobs/job-brief";
import { reviewArguments as reviewArgumentsOf } from "../../shared/jobs/review-sheet";
import { requireAcceptedRecords, startStageRun } from "../../shared/store/stage-guards";
import { StageRecords } from "../../shared/store/stage-records";
import { JobIdPrefix } from "../../shared/model/record-ids";
import { GapsRemain, UsageInvalid } from "../../shared/run/script-errors";
import { briefText, staleBrief } from "./brief";
import { cutAssigning } from "./cut";
import {
    definitionOf,
    freshJob,
    isMerging,
    jobFiles,
    jobNamed,
    readJobList,
    registryOf,
    workFilesOf,
    writeJob,
    type Kind,
    type ListEntry,
    type Listed,
    type Units,
} from "./jobs";
import { mayAssign, rebuildWrittenEntries, writeRegistries } from "./registry";

type WithFeedback = { readonly jobId: string; readonly kind: Kind; readonly customInstructions?: string };

const laterStages: readonly Stage[] = ["capability-rules", "publish"];

const agentOf: Readonly<Record<Kind, string>> = {
    assignEntryPoints: "registry/assign-units",
    assignResources: "registry/assign-units",
    assignShapes: "registry/assign-units",
    mergeCapabilities: "registry/propose-entries",
    mergeEntities: "registry/propose-entries",
};

/**
 * Cut today's jobs into the job list (D217): the proposing jobs first, then the assigning jobs, each keeping its id, file and work while its
 * units are the same: a job whose definition an earlier job had keeps its id, a new one gets a fresh id and its first
 * state. The merge's jobs leave, with their folders: the merge is cut again once every assigning job is decided. A job
 * no longer cut leaves with its folder, refused while it holds work, and the folders this cut wrote are then removed.
 * The document of written entries is rebuilt from the kept assigning jobs' outputs. No step holds every unit: the list
 * keeps each job's id, kind and digest. The caller holds the record store.
 * @param root the analysis root
 * @returns the listed jobs, and how many units are larger than the budget
 */
const cutJobs = Effect.fnUntraced(function* (root: string) {
    const fs = yield* FileAccess;
    const paths = analysisPaths(root).capabilitiesAndEntities;
    const earlier = yield* readJobList(root);
    for (const merge of earlier.filter((entry) => isMerging(entry.kind))) {
        yield* fs.remove(paths.job(merge.jobId));
    }
    const issuer = yield* jobIdIssuer(
        JobIdPrefix.capabilitiesAndEntities,
        earlier
            .filter((entry) => !isMerging(entry.kind))
            .map((entry) => ({ id: entry.jobId, definition: entry.definition })),
    );
    const fresh: string[] = [];
    const place = Effect.fnUntraced(function* (units: Units) {
        const definition = definitionOf(units);
        const issued = yield* issuer.idOf(definition);
        if (issued.fresh) {
            yield* writeJob(root, freshJob(issued.id, units));
            fresh.push(issued.id);
        }
        return { jobId: issued.id, kind: units.kind, definition };
    });
    const assigning: ListEntry[] = [];
    const { overBudget } = yield* cutAssigning((units) =>
        Effect.map(place(units), (entry) => {
            assigning.push(entry);
        }),
    );
    const dropped = issuer.dropped();
    yield* refuseDroppedWork(
        "Capabilities and entities",
        dropped.map((job) => ({ job, files: workFilesOf(root, job) })),
    ).pipe(Effect.tapError(() => Effect.forEach(fresh, (jobId) => fs.remove(paths.job(jobId)))));
    for (const jobId of dropped) {
        yield* fs.remove(paths.job(jobId));
    }
    const listed = assigning;
    yield* fs.writeText(paths.jobs, JSON.stringify(listed, null, 1));
    yield* rebuildWrittenEntries(root, listed);
    return { listed, overBudget };
});

/**
 * `prepare` with no target, all while holding the record store: cut today's jobs and resume (`cutJobs`), write the
 * brief and the registries the jobs read, and remove the stage's accepted records, which `finish` writes again once
 * every job is decided (D215). Refused until the Map has accepted records.
 * @param root the analysis root
 * @returns how many jobs there are, how many units are larger than the budget, and what the run does next
 */
export const prepareStage = Effect.fnUntraced(function* (root: string) {
    yield* requireAcceptedRecords("map");
    return yield* startStageRun(
        "capabilities-and-entities",
        laterStages,
        Effect.gen(function* () {
            const { listed, overBudget } = yield* cutJobs(root);
            yield* (yield* FileAccess).writeText(analysisPaths(root).capabilitiesAndEntities.brief, yield* briefText());
            yield* writeRegistries(root);
            return {
                jobs: listed.length,
                overBudget,
                standing: [`${listed.length} jobs, each reviewed; run next`],
            };
        }),
    );
});

/**
 * The named arguments of a job's agent, in the order its contract lists them: `propose-entries` for a proposing or
 * merge job, `assign-units` for an assigning one, the same arguments for both; a merge job's brief is the whole
 * registry as it searches it, each entry with its parts and what its members show (D215); the stage's own commands are given whole, so the
 * agents serve any registry kind (D171).
 * @param root the analysis root
 * @param job the job and its feedback's text
 * @param inputs the folder record paths are relative to, and the request when it lists Supporting Material
 * @param inputs.sourceFolder the folder record paths are relative to
 * @param inputs.analysisRequestPath the request, when it lists Supporting Material
 * @returns the arguments; `analysisRequestPath` and `customInstructions` only when they apply
 */
const agentArguments = (
    root: string,
    job: WithFeedback,
    inputs: { readonly sourceFolder: string; readonly analysisRequestPath?: string },
) => {
    const paths = analysisPaths(root).capabilitiesAndEntities;
    return {
        scriptsCommand: scriptsCommand(root),
        sourceFolder: inputs.sourceFolder,
        jobId: job.jobId,
        jobPath: paths.jobFile(job.jobId),
        briefPath: paths.jobBrief(job.jobId),
        registryPath: paths.registry(registryOf[job.kind]),
        outputPath: jobFiles(root, job.jobId, job.kind).outputPath,
        ...instructionsOf(job),
    };
};

/**
 * Write one job's brief: the commands that check and carry its output, the rules of its kind, and what to read besides
 * it (what earlier stages established, or for a merge job the whole registry as it searches it; the Supporting Material
 * the request lists).
 * @param root the analysis root
 * @param job the job
 * @param inputs the request, when it lists Supporting Material
 * @param inputs.analysisRequestPath the request, when it lists Supporting Material
 * @returns nothing once written
 */
const writeBrief = (root: string, job: WithFeedback, inputs: { readonly analysisRequestPath?: string }) => {
    const paths = analysisPaths(root).capabilitiesAndEntities;
    const command = `${scriptsCommand(root)}/name-capabilities-and-entities.ts`;
    return writeJobBrief(paths.jobBrief(job.jobId), {
        rules: paths.rules,
        commands: { check: `${command} check ${job.jobId}`, carry: `${command} carry ${job.jobId}` },
        reads: [
            isMerging(job.kind)
                ? ([
                      "the whole registry as you search it, each entry with its parts and members",
                      paths.toMerge(registryOf[job.kind]),
                  ] as const)
                : (["what earlier stages established", paths.brief] as const),
        ],
        ...(inputs.analysisRequestPath === undefined ? {} : { supporting: inputs.analysisRequestPath }),
    });
};

/**
 * The named arguments of the review of one job's output, in the order the reviewer's contract lists them.
 * @param root the analysis root
 * @param job the job and its feedback's text
 * @param sourceFolder the folder record paths are relative to
 * @returns the arguments; `customInstructions` only when the job has feedback
 */
const reviewArguments = (root: string, job: WithFeedback, sourceFolder: string) =>
    reviewArgumentsOf(jobFiles(root, job.jobId, job.kind), stageReviewCall(root, job, sourceFolder));

/**
 * What the reviewer of one job is given besides its files: the source folder, the command that checks its review and the
 * job's feedback.
 * @param root the analysis root
 * @param job the job and its feedback's text
 * @param sourceFolder the folder record paths are relative to
 * @returns the call
 */
export const stageReviewCall = (root: string, job: WithFeedback, sourceFolder: string) => ({
    root,
    sourceFolder,
    checkCommand: `${scriptsCommand(root)}/name-capabilities-and-entities.ts check ${job.jobId}`,
    feedback: job,
});

/**
 * Refuse an assigning job while its registry's first job is not decided: it chooses from what that job wrote.
 * @param root the analysis root
 * @param job the job
 * @returns nothing when the job may run; UsageInvalid naming what runs first
 */
const requireItsRegistry = Effect.fnUntraced(function* (root: string, job: Listed) {
    const kind = registryOf[job.kind];
    if (!isMerging(job.kind) && !(yield* mayAssign(root, yield* readJobList(root), job))) {
        return yield* new UsageInvalid({
            issue: `${job.jobId} assigns to the registry of ${kind}, whose first job has not run yet: it runs alone first, then finish`,
        });
    }
});

/**
 * `prepare <job id>`: make one job ready for its next run, while holding the record store. An assigning job waits for
 * its registry. Its output and review are cleared; while its feedback is on an artifact set aside, the run
 * improves that artifact and its round is kept; the person's words, when given, are feedback on its last artifact
 * (refused on a job that produced none, D29). The stage's accepted records are removed. Refused while the brief is
 * stale.
 * @param root the analysis root
 * @param jobId the job id
 * @param words the person's feedback on the job's last artifact, when they give it
 * @returns the job's agent, by its contract's path, and the arguments of the agent and its review
 */
export const prepareJob = Effect.fnUntraced(function* (root: string, jobId: string, words: PersonsWords | undefined) {
    const stale = yield* staleBrief(root);
    if (stale.length) {
        return yield* new GapsRemain({ gaps: stale });
    }
    const paths = analysisPaths(root);
    const request = yield* readDocumentStrictly(paths.analysisRequest, AnalysisRequest);
    const sourceFolder = sourceBase(request.sourceRoots);
    const stages = yield* StageRecords;
    const made = yield* startStageRun(
        "capabilities-and-entities",
        laterStages,
        Effect.gen(function* () {
            const job = yield* jobNamed(root, jobId);
            yield* requireItsRegistry(root, job);
            const files = jobFiles(root, jobId, job.kind);
            if (words !== undefined) {
                yield* requireArtifacts([{ jobId, files }]);
            }
            yield* prepareJobRun(files, personsWords(words), [files.reviewPath, rejectedPathOf(files.reviewPath)]);
            yield* stages.removeStageRecords("capabilities-and-entities");
            return { jobId, kind: job.kind, ...(yield* feedbackArgument(files)) };
        }),
    );
    const inputs = {
        sourceFolder,
        ...(request.supportingMaterial.length ? { analysisRequestPath: paths.analysisRequest } : {}),
    };
    yield* writeBrief(root, made, inputs);
    return {
        jobId,
        agent: agentOf[made.kind],
        run: agentArguments(root, made, inputs),
        review: reviewArguments(root, made, sourceFolder),
    };
});
