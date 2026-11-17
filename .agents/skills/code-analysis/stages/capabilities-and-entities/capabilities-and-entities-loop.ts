import { outcomesInWords } from "../../shared/jobs/review-report";
import { assumptionNotices } from "../../shared/read/assumptions";
import { Effect } from "effect";
import { AnalysisRequest } from "../../shared/run/analysis-request";
import { analysisPaths, sourceBase } from "../../shared/run/analysis-layout";
import { registryDigest } from "../../shared/jobs/registry-digest";
import { feedbackArgument } from "../../shared/jobs/job-feedback";
import { readDocumentStrictly } from "../../shared/run/json-files";
import { AnyRecord, readOptionalRecords } from "../../shared/run/json-files";
import type { LoopJob } from "../../shared/jobs/loop-jobs";
import { stageLoop } from "../../shared/jobs/loop-jobs";
import { checkJob, jobLabel, reviewedStageOf } from "./job-steps";
import { finishStage } from "./finish";
import { isMerging, jobFiles, jobNamed, readJobList, registryOf } from "./jobs";
import { reviewCall } from "../../shared/jobs/review-sheet";
import { prepareJob, prepareStage, stageReviewCall } from "./prepare";
import { addWrittenEntries, entriesAmong, mayAssign } from "./registry";
import { soundnessLines } from "./soundness";

/**
 * One job as the loop takes it: its label and its files.
 * @param root the analysis root
 * @param jobId the job id
 * @returns the job
 */
const loopJob = Effect.fnUntraced(function* (root: string, jobId: string) {
    const job = yield* jobNamed(root, jobId);
    const { outputPath, reviewPath, roundsFolder } = jobFiles(root, jobId, job.kind);
    return { key: jobId, label: jobLabel(job), outputPath, reviewed: { reviewPath, roundsFolder } };
});

/**
 * Add the entries the closed batch's assigning jobs wrote, those whose output stands, to the registries the next
 * batch reads (D215, P1.38).
 * @param root the analysis root
 * @param ran the jobs whose agents the batch ran
 * @returns nothing once added
 */
const addEntriesOf = Effect.fnUntraced(function* (root: string, ran: readonly LoopJob[]) {
    const jobs = yield* readJobList(root);
    for (const job of ran) {
        const listed = jobs.find((entry) => entry.jobId === job.key);
        if (listed !== undefined && !isMerging(listed.kind)) {
            const entries = entriesAmong(yield* readOptionalRecords(job.outputPath, AnyRecord));
            yield* addWrittenEntries(root, jobs, [...entries.capabilities, ...entries.entities]);
        }
    }
});

/**
 * The review of one job, as the loop hands it out: its sheet reads what the job's agent worked from, what it was given,
 * the registry it chose from and the rules it applied.
 * @param root the analysis root
 * @param jobId the job id
 * @param sourceFolder the folder record paths are relative to
 * @returns the reviewer's call
 */
const reviewJobCall = Effect.fnUntraced(function* (root: string, jobId: string, sourceFolder: string) {
    const { stage, job, listed } = yield* reviewedStageOf(root, jobId);
    const feedback = yield* feedbackArgument(jobFiles(root, jobId, listed.kind));
    const paths = analysisPaths(root);
    const own = paths.capabilitiesAndEntities;
    return yield* reviewCall(
        stage,
        job,
        {
            checklist: paths.reviewChecklist("capabilities-and-entities"),
            reads: [
                ["what the job's agent worked from: its rules and what it read", own.jobBrief(jobId)],
                ["what the job was given", own.jobFile(jobId)],
                ["the registry it chose from", own.registry(registryOf[listed.kind])],
            ],
        },
        stageReviewCall(root, { ...listed, ...feedback }, sourceFolder),
    );
});

/**
 * Capabilities and entities as the loop drives it (D56, D215): each proposing job may run at once; an assigning job once
 * its registry's proposing job is decided, whatever its outcome, each closed batch adding the entries its jobs wrote
 * for the next; the merge's jobs once `finish` lists them, every assigning job decided. `finish` takes each phase's
 * outcomes and writes the stage once the merge is decided; nothing waits on an outcome but its own job's.
 * @param root the analysis root
 * @returns the stage's loop
 */
export const capabilitiesAndEntitiesLoop = Effect.fnUntraced(function* (root: string) {
    const sourceFolder = sourceBase(
        (yield* readDocumentStrictly(analysisPaths(root).analysisRequest, AnalysisRequest)).sourceRoots,
    );
    return stageLoop({
        stage: "capabilities-and-entities",
        root,
        begin: Effect.gen(function* () {
            if (!(yield* readJobList(root)).length) {
                yield* prepareStage(root);
            }
        }),
        keys: Effect.map(readJobList(root), (jobs) => jobs.map((job) => job.jobId)),
        job: (jobId) => loopJob(root, jobId),
        mayRun: (job) =>
            Effect.gen(function* () {
                const listed = yield* jobNamed(root, job.key);
                return isMerging(listed.kind) || (yield* mayAssign(root, yield* readJobList(root), listed));
            }),
        prepare: (jobIds) =>
            Effect.forEach(jobIds, (jobId) =>
                Effect.map(prepareJob(root, jobId, undefined), (prepared) => ({
                    key: jobId,
                    call: { agent: prepared.agent, arguments: prepared.run },
                })),
            ),
        review: (job) => reviewJobCall(root, job.key, sourceFolder),
        check: (job) => checkJob(root, job.key),
        answer: (key, answer) => Effect.asVoid(prepareJob(root, key, answer)),
        registry: registryDigest(
            (["capabilities", "entities"] as const).map((kind) =>
                analysisPaths(root).capabilitiesAndEntities.registry(kind),
            ),
        ),
        leftOver: soundnessLines(root),
        afterClose: (ran) => addEntriesOf(root, ran),
        notices: (job) => assumptionNotices(job.label, job.outputPath),
        ownersOf: () => Effect.succeed([]),
        finish: Effect.map(finishStage(root), ({ written, outcomes, said }) => ({
            more: !written,
            said: [...said, ...(outcomes.length ? [outcomesInWords(outcomes)] : [])],
        })),
    });
});
