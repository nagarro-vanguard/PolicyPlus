import { Effect } from "effect";
import { analysisPaths, scriptsCommand, shellWord, type Stage } from "../run/analysis-layout";
import { catalogueFolder } from "../run/catalogue";
import {
    checkConclusionJob,
    conclusionReview,
    readConclusionList,
    reviewedConclusionJob,
    type ConclusionJob,
} from "./conclusion-jobs";
import type { Tier } from "./conclusions";
import { startStageRun } from "../store/stage-guards";
import { StageRecords } from "../store/stage-records";
import {
    agentRecords,
    carryForward,
    feedbackArgument,
    instructionsOf,
    personsWords,
    prepareJobRun,
    type PersonsWords,
} from "./job-feedback";
import { rejectedPathOf } from "./job-transitions";
import { decided, reviewedJobState } from "./loop-jobs";
import type { AgentCall } from "./dispatch-prompt";
import { setRoundAside } from "./job-transitions";
import { reviewCall } from "./review-sheet";
import { reviewOutcome, type ReviewOutcome } from "./review-rounds";
import { UsageInvalid } from "../run/script-errors";

export type Concluding = {
    readonly root: string;
    readonly stage: Stage;
    readonly later: readonly Stage[];
    readonly script: string;
    readonly sourceFolder: string;
};

type WithFeedback = ConclusionJob & { readonly customInstructions?: string };

/**
 * The named arguments of a concluding job's agent, in the order write-topic-answers's contract lists them.
 * @param at the stage that concludes: its analysis root, its name, its script and the source folder
 * @param job the job and its feedback's text
 * @returns the arguments
 */
const conclusionArguments = (at: Concluding, job: WithFeedback) => {
    const command = `${scriptsCommand(at.root)}/${at.script}`;
    const paths = analysisPaths(at.root).conclusions(at.stage);
    return {
        scriptsCommand: scriptsCommand(at.root),
        sourceFolder: at.sourceFolder,
        jobPath: paths.topics(job.jobId),
        cataloguePath: catalogueFolder,
        checkCommand: `${command} check ${shellWord(job.jobId)}`,
        carryCommand: `${command} carry ${shellWord(job.jobId)}`,
        outputPath: paths.files(job.jobId).outputPath,
        ...instructionsOf(job),
    };
};

/**
 * What the reviewer of a concluding job is given besides its files: the source folder, the command that checks its
 * review and the job's feedback.
 * @param at the stage that concludes
 * @param job the job and its feedback's text
 * @returns the call
 */
const conclusionReviewCall = (at: Concluding, job: WithFeedback) => ({
    root: at.root,
    sourceFolder: at.sourceFolder,
    checkCommand: `${scriptsCommand(at.root)}/${at.script} check ${shellWord(job.jobId)}`,
    feedback: job,
});

/**
 * One concluding job's files, with the stage and key its state is held under.
 * @param root the analysis root
 * @param stage the stage that concludes
 * @param job the job
 * @returns the files
 */
const filesOf = (root: string, stage: Stage, job: ConclusionJob) => ({
    stage,
    key: job.jobId,
    ...analysisPaths(root).conclusions(stage).files(job.jobId),
});

/**
 * Make one concluding job ready for its next run, as every stage run starts (C11): refused while a later stage has
 * accepted records made from this stage's, the stage's accepted records removed until its next `finish`, so that
 * `finish` writes what the job concludes (plan 0005); its output, review and report cleared, its rounds kept while its
 * feedback is on an output set aside; the person's words, when given, its feedback.
 * @param at the stage that concludes
 * @param job the job
 * @param words the person's words, when given
 * @returns the job with its feedback's text
 */
const prepareConclusionJob = Effect.fnUntraced(function* (
    at: Concluding,
    job: ConclusionJob,
    words: PersonsWords | undefined,
) {
    const files = filesOf(at.root, at.stage, job);
    const stages = yield* StageRecords;
    return yield* startStageRun(
        at.stage,
        at.later,
        Effect.gen(function* () {
            yield* prepareJobRun(files, personsWords(words), [files.reviewPath, rejectedPathOf(files.reviewPath)]);
            yield* stages.removeStageRecords(at.stage);
            return { ...job, ...(yield* feedbackArgument(files)) };
        }),
    );
});

/**
 * One concluding job, by its job id.
 * @param at the stage that concludes
 * @param jobId the job's id
 * @returns the job; UsageInvalid when the list holds none of that id
 */
const conclusionNamed = Effect.fnUntraced(function* (at: Concluding, jobId: string) {
    const job = (yield* readConclusionList(at.root, at.stage)).find((each) => each.jobId === jobId);
    if (job === undefined) {
        return yield* new UsageInvalid({ issue: `no concluding job has the job id ${jobId}` });
    }
    return job;
});

/**
 * Whether every job of a tier is decided: each is accepted or refused in its state.
 * @param root the analysis root
 * @param stage the stage
 * @param tier the tier
 * @returns true once every job of the tier is decided, or it has none
 */
const tierDecided = Effect.fnUntraced(function* (root: string, stage: Stage, tier: Tier) {
    for (const job of (yield* readConclusionList(root, stage)).filter((each) => each.tier === tier)) {
        if (!decided(yield* reviewedJobState({ stage, key: job.jobId }))) {
            return false;
        }
    }
    return true;
});

/**
 * Decide a stage's concluding jobs (D177): each decided job by its review rounds (P1.33, P1.37), one not decided yet
 * pending; each to redo set aside for its one fix with its feedback and its round counted.
 * Inside the stage's write, so a `prepare` beside it waits.
 * @param root the analysis root
 * @param stage the stage
 * @returns the decided outcomes, and whether any job is pending or to redo
 */
export const decideConclusions = Effect.fnUntraced(function* (root: string, stage: Stage) {
    const outcomes: Array<ReviewOutcome<ReturnType<typeof reviewedConclusionJob>>> = [];
    let pending = false;
    for (const job of yield* readConclusionList(root, stage)) {
        const reviewed = reviewedConclusionJob(root, stage, job);
        if (!decided(yield* reviewedJobState(reviewed))) {
            pending = true;
            continue;
        }
        const outcome = yield* reviewOutcome(conclusionReview(root, stage, job), reviewed);
        if (outcome.outcome === "redo") {
            yield* setRoundAside(outcome);
            pending = true;
        }
        outcomes.push(outcome);
    }
    return { outcomes: outcomes.filter((each) => each.outcome !== "redo"), pending };
});

/**
 * The review of one concluding job, as the loop hands it out: its sheet reads the topics it was given and the catalogue.
 * @param at the stage that concludes
 * @param job the job
 * @returns the reviewer's call
 */
const reviewConclusion = Effect.fnUntraced(function* (at: Concluding, job: ConclusionJob) {
    const { root, stage } = at;
    const feedback = yield* feedbackArgument(filesOf(root, stage, job));
    const paths = analysisPaths(root);
    return yield* reviewCall(
        conclusionReview(root, stage, job),
        reviewedConclusionJob(root, stage, job),
        {
            checklist: paths.topicsChecklist,
            reads: [
                ["the topics it was given, each with the facts beneath", paths.conclusions(stage).topics(job.jobId)],
                ["the catalogue", catalogueFolder],
            ],
        },
        conclusionReviewCall(at, { ...job, ...feedback }),
    );
});

/**
 * A stage's concluding jobs as its loop takes them (D177): each step of `StageLoop` for a concluding job's key, so a
 * stage adds them beside its own jobs; and `carry`. A job of the system's tier may run only once the entries' tier is
 * decided.
 * @param at the stage that concludes
 * @returns the steps
 */
export const conclusionSteps = (at: Concluding) => {
    const { root, stage } = at;
    const named = (key: string) => conclusionNamed(at, key);
    const files = (job: ConclusionJob) => filesOf(root, stage, job);
    return {
        keys: Effect.map(readConclusionList(root, stage), (list) => list.map((job) => job.jobId)),
        isConcluding: (key: string) =>
            Effect.map(readConclusionList(root, stage), (list) => list.some((job) => job.jobId === key)),
        job: (key: string) =>
            Effect.map(named(key), (job) => {
                const { outputPath, reviewPath, roundsFolder } = files(job);
                return { key, label: job.name, outputPath, reviewed: { reviewPath, roundsFolder } };
            }),
        mayRun: (key: string) =>
            Effect.flatMap(named(key), (job) =>
                job.tier === "system" ? tierDecided(root, stage, "entries") : Effect.succeed(true),
            ),
        prepare: (key: string, words?: PersonsWords) =>
            Effect.gen(function* () {
                const prepared = yield* prepareConclusionJob(at, yield* named(key), words);
                const call: AgentCall = {
                    agent: "topics/write-topic-answers",
                    arguments: conclusionArguments(at, prepared),
                };
                return { key, call };
            }),
        review: (key: string) => Effect.flatMap(named(key), (job) => reviewConclusion(at, job)),
        check: (key: string) =>
            Effect.gen(function* () {
                return yield* checkConclusionJob(root, stage, yield* named(key));
            }),
        answer: (key: string, words: PersonsWords) =>
            Effect.flatMap(named(key), (job) => Effect.asVoid(prepareConclusionJob(at, job, words))),
        carry: (key: string, leftOut: readonly string[]) =>
            Effect.gen(function* () {
                const job = yield* named(key);
                const shapes = conclusionReview(root, stage, job).shapes;
                return yield* carryForward(files(job), agentRecords(shapes), leftOut);
            }),
    };
};
