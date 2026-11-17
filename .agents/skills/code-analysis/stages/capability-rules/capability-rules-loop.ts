import { assumptionNotices } from "../../shared/read/assumptions";
import { Effect } from "effect";
import { AnalysisRequest } from "../../shared/run/analysis-request";
import { analysisPaths, sourceBase } from "../../shared/run/analysis-layout";
import { feedbackArgument } from "../../shared/jobs/job-feedback";
import { readDocumentStrictly } from "../../shared/run/json-files";
import { stageLoop } from "../../shared/jobs/loop-jobs";
import { UsageInvalid } from "../../shared/run/script-errors";
import { checkJob, reviewedStageOf } from "./check";
import { finishCapabilityRules, nextAfterFinish } from "./finish";
import { jobFiles, jobLabel, jobNamed, readJobList } from "./jobs";
import { livesDecided } from "./lives";
import { reviewCall } from "../../shared/jobs/review-sheet";
import { droppedSheetOf } from "./drop";
import { prepareJob, rulesReviewCall } from "./prepare";

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
 * Capability rules as the loop drives it (D56, D124): every lifecycle job at once; once each life is decided by
 * `finish`, every rules job, gating the accepted lives' transitions; then `finish`, which writes the stage's accepted
 * records once. `next` refuses until the person has named the capabilities to study, since only they choose (D122).
 * @param root the analysis root
 * @returns the stage's loop
 */
export const capabilityRulesLoop = Effect.fnUntraced(function* (root: string) {
    const sourceFolder = sourceBase(
        (yield* readDocumentStrictly(analysisPaths(root).analysisRequest, AnalysisRequest)).sourceRoots,
    );
    return stageLoop({
        stage: "capability-rules",
        root,
        begin: Effect.gen(function* () {
            if (!(yield* readJobList(root)).length) {
                return yield* new UsageInvalid({
                    issue: 'no capability is chosen to study: run explain-capability-rules.ts prepare --capability "<name>" first',
                });
            }
        }),
        keys: Effect.map(readJobList(root), (jobs) => jobs.map((job) => job.jobId)),
        job: (jobId) => loopJob(root, jobId),
        mayRun: (job) =>
            Effect.gen(function* () {
                const listed = yield* jobNamed(root, job.key);
                return listed.kind === "lifecycle" || (yield* livesDecided(root));
            }),
        prepare: (jobIds) =>
            Effect.forEach(jobIds, (jobId) =>
                Effect.map(prepareJob(root, jobId, undefined), (prepared) => ({
                    key: jobId,
                    call: { agent: prepared.agent, arguments: prepared.run },
                })),
            ),
        review: (job) =>
            Effect.gen(function* () {
                const { stage, job: reviewed, listed } = yield* reviewedStageOf(root, job.key);
                const feedback = yield* feedbackArgument(jobFiles(root, job.key, listed.kind));
                const paths = analysisPaths(root).capabilityRules;
                return yield* reviewCall(
                    stage,
                    reviewed,
                    {
                        checklist: listed.kind === "lifecycle" ? paths.lifecycleChecklist : paths.rulesChecklist,
                        reads: [
                            ["what the job's agent worked from", paths.brief],
                            ["what the job was given", paths.jobFile(listed.jobId)],
                            ...(listed.kind === "rules"
                                ? ([["the accepted lives it chose from", paths.lifecycles]] as const)
                                : []),
                        ],
                        ...(yield* droppedSheetOf(root, listed.jobId)),
                    },
                    rulesReviewCall(root, { ...listed, ...feedback }, sourceFolder),
                );
            }),
        check: (job) => checkJob(root, job.key),
        answer: (key, answer) => Effect.asVoid(prepareJob(root, key, answer)),
        registry: Effect.succeed(undefined),
        leftOver: Effect.succeed([]),
        afterClose: () => Effect.void,
        notices: (job) => assumptionNotices(job.label, job.outputPath),
        ownersOf: () => Effect.succeed([]),
        finish: Effect.map(finishCapabilityRules(root), nextAfterFinish),
    });
});
