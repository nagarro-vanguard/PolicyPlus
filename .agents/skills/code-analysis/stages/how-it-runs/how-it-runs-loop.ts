import { assumptionNotices } from "../../shared/read/assumptions";
import { Effect } from "effect";
import { conclusionSteps } from "../../shared/jobs/conclusion-steps";
import { feedbackArgument } from "../../shared/jobs/job-feedback";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { stageLoop, type LoopJob } from "../../shared/jobs/loop-jobs";
import { FileAccess } from "../../shared/source/file-access";
import { UsageInvalid } from "../../shared/run/script-errors";
import { stageAuditJob, stageAuditKey } from "../../shared/jobs/stage-audit";
import { auditCall, auditLeftOver, auditLoopJob, checkStageAudit, decideStageAudit } from "./audit-stage";
import { catalogueFolder } from "../../shared/run/catalogue";
import { reviewCall } from "../../shared/jobs/review-sheet";
import { checkJob, howItRunsReview, reviewedJobOf } from "./check-study";
import { finishStudy, nextAfterFinish } from "./finish-study";
import { requestContext, studyJobFiles, studyReviewCall } from "./study-arguments";
import { listedJobNamed, prepareJob, prepareStage, readJobList } from "./study-jobs";

const script = "explain-how-it-runs.ts";

/**
 * The concluding jobs' steps of How it runs (D177).
 * @param root the analysis root
 * @param sourceFolder the folder record paths are relative to
 * @returns the steps
 */
export const howItRunsConclusions = (root: string, sourceFolder: string) =>
    conclusionSteps({ root, stage: "how-it-runs", later: ["map"], script, sourceFolder });

/**
 * One study as the loop takes it, with its review.
 * @param root the analysis root
 * @param key the job's key
 * @returns the job
 */
const studyJob = Effect.fnUntraced(function* (root: string, key: string) {
    const { label, outputPath, reviewPath, roundsFolder } = reviewedJobOf(root, yield* listedJobNamed(root, key));
    return { key, label, outputPath, reviewed: { reviewPath, roundsFolder } };
});

/**
 * The steps of How it runs' studies, by key, as the loop takes them.
 * @param root the analysis root
 * @param context the source folder, and whether the request lists Supporting Material
 * @returns the steps
 */
const studySteps = (root: string, context: Effect.Success<ReturnType<typeof requestContext>>) => ({
    job: (key: string) => studyJob(root, key),
    prepare: (key: string) =>
        Effect.map(prepareJob(root, key, undefined), (prepared) => ({
            key,
            call: { agent: "how-it-runs/study-how-it-runs", arguments: prepared.study },
        })),
    review: (key: string) =>
        Effect.gen(function* () {
            const listed = yield* listedJobNamed(root, key);
            const feedback = yield* feedbackArgument(studyJobFiles(root, listed));
            const paths = analysisPaths(root);
            return yield* reviewCall(
                howItRunsReview(root, listed),
                reviewedJobOf(root, listed),
                {
                    checklist: paths.reviewChecklist("how-it-runs"),
                    reads: [
                        ["what the study was given: its topics", paths.studyTopics(listed.jobId)],
                        ["its parts and technologies", paths.studyRegistry(listed.jobId)],
                        ["the catalogue", catalogueFolder],
                    ],
                },
                studyReviewCall(root, { ...listed, ...feedback }, context),
            );
        }),
    check: (key: string) => Effect.flatMap(listedJobNamed(root, key), (listed) => checkJob(root, listed)),
});

/**
 * How it runs' jobs, in the loop's order: the studies, the concluding jobs, and the stage's audit once it is open.
 * @param root the analysis root
 * @param concluding the concluding jobs' keys
 * @returns the keys
 */
const stageKeys = <E, R>(root: string, concluding: Effect.Effect<readonly string[], E, R>) =>
    Effect.gen(function* () {
        const audited = yield* (yield* FileAccess).exists(stageAuditJob(root, "how-it-runs").outputPath);
        return [
            ...(yield* readJobList(root)).map((job) => job.jobId),
            ...(yield* concluding),
            ...(audited ? [stageAuditKey] : []),
        ];
    });

/**
 * How it runs as the loop drives it (D56, D169, D177): the job list first; every study side by side, each reviewed;
 * once every study is decided, the concluding jobs `finish` lists, the parts' tier then the system's; then `finish`
 * writes the accepted studies and conclusions in one commit and opens the stage's audit, whose items reopen the jobs
 * owning them at the next `begin` (plan 0004). It draws the subject pages (D176).
 * @param root the analysis root
 * @returns the stage's loop
 */
export const howItRunsLoop = Effect.fnUntraced(function* (root: string) {
    const context = yield* requestContext(root);
    const conclusions = howItRunsConclusions(root, context.sourceFolder);
    const studies = studySteps(root, context);
    const either = <A, E, R>(key: string, study: Effect.Effect<A, E, R>, concluding: Effect.Effect<A, E, R>) =>
        Effect.flatMap(conclusions.isConcluding(key), (isConcluding) => (isConcluding ? concluding : study));
    const unlessAudit = <A, E, R>(job: LoopJob, audit: Effect.Effect<A, E, R>, other: Effect.Effect<A, E, R>) =>
        job.key === stageAuditKey ? audit : other;
    const notTheAudit = (step: string) =>
        new UsageInvalid({ issue: `the stage audit has no ${step}: its findings are the stage's accepted facts` });
    const reopen = (key: string, items: Parameters<typeof conclusions.answer>[1]) =>
        either(key, Effect.asVoid(prepareJob(root, key, items)), conclusions.answer(key, items));
    return stageLoop({
        stage: "how-it-runs",
        root,
        begin: Effect.gen(function* () {
            if (!(yield* readJobList(root)).length) {
                yield* prepareStage(root);
            }
            yield* decideStageAudit(root, reopen);
        }),
        keys: stageKeys(root, conclusions.keys),
        job: (key) =>
            key === stageAuditKey
                ? Effect.succeed(auditLoopJob(root))
                : either(key, studies.job(key), conclusions.job(key)),
        mayRun: (job) =>
            unlessAudit(job, Effect.succeed(true), either(job.key, Effect.succeed(true), conclusions.mayRun(job.key))),
        prepare: (keys) =>
            Effect.forEach(keys, (key) =>
                key === stageAuditKey
                    ? Effect.fail(notTheAudit("prepare"))
                    : either(key, studies.prepare(key), conclusions.prepare(key)),
            ),
        review: (job) =>
            unlessAudit(job, auditCall(root), either(job.key, studies.review(job.key), conclusions.review(job.key))),
        check: (job) =>
            unlessAudit(
                job,
                checkStageAudit(root),
                either(job.key, studies.check(job.key), conclusions.check(job.key)),
            ),
        answer: (key, answer) => (key === stageAuditKey ? Effect.fail(notTheAudit("feedback")) : reopen(key, answer)),
        finish: Effect.map(finishStudy(root), nextAfterFinish),
        registry: Effect.succeed(undefined),
        leftOver: auditLeftOver(root),
        afterClose: () => Effect.void,
        notices: (job) => assumptionNotices(job.label, job.outputPath),
        ownersOf: () => Effect.succeed([]),
    });
});
