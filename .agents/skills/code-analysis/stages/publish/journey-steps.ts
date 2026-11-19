import { Effect } from "effect";
import { analysisPaths, scriptsCommand, shellWord } from "../../shared/run/analysis-layout";
import type { AgentCall } from "../../shared/jobs/dispatch-prompt";
import {
    agentRecords,
    carryForward,
    feedbackArgument,
    instructionsOf,
    personsWords,
    prepareJobRun,
    requireArtifacts,
    type PersonsWords,
} from "../../shared/jobs/job-feedback";
import { rejectedPathOf, setRoundAside } from "../../shared/jobs/job-transitions";
import { decided, reviewedJobState } from "../../shared/jobs/loop-jobs";
import { reviewOutcome, type ReviewOutcome } from "../../shared/jobs/review-rounds";
import { reviewCall } from "../../shared/jobs/review-sheet";
import { requireAcceptedRecords, startStageRun } from "../../shared/store/stage-guards";
import { StageRecords } from "../../shared/store/stage-records";
import { UsageInvalid } from "../../shared/run/script-errors";
import { Journey, JourneyMerge } from "../../shared/model/schemas/journeys";
import { checkJourneyJob, mergeReview, reviewedJourneyJob, tasksReview } from "./check-journeys";
import { journeyJobNamed, mergeJobId, readJourneyList, writeJourneyBrief, type JourneyJob } from "./journeys-brief";

const script = "publish-pages.ts";

/**
 * One job's files, with the stage and key its state is held under.
 * @param root the analysis root
 * @param job the job
 * @returns the files
 */
const filesOf = (root: string, job: JourneyJob) => ({
    stage: "publish" as const,
    key: job.jobId,
    ...analysisPaths(root).journeys.files(job.jobId),
});

/**
 * The named arguments of the journeys agent, in the order its contract lists them.
 * @param root the analysis root
 * @param sourceFolder the folder every file in a record is relative to
 * @param job the job, with its feedback's text when it has some
 * @returns the arguments
 */
const journeyArguments = (root: string, sourceFolder: string, job: JourneyJob & { customInstructions?: string }) => {
    const command = `${scriptsCommand(root)}/${script}`;
    return {
        scriptsCommand: scriptsCommand(root),
        sourceFolder,
        briefPath: analysisPaths(root).journeys.brief(job.jobId),
        kind: job.kind,
        checkCommand: `${command} check ${shellWord(job.jobId)}`,
        carryCommand: `${command} carry ${shellWord(job.jobId)}`,
        outputPath: filesOf(root, job).outputPath,
        ...instructionsOf(job),
    };
};

/**
 * Whether every job that writes tasks is decided, which the job that joins them waits for.
 * @param root the analysis root
 * @returns true once each is decided
 */
const tasksDecided = Effect.fnUntraced(function* (root: string) {
    for (const job of (yield* readJourneyList(root)).filter((each) => each.kind === "tasks")) {
        if (!decided(yield* reviewedJobState({ stage: "publish", key: job.jobId }))) {
            return false;
        }
    }
    return true;
});

/**
 * Make one job ready for its next run, as every stage run starts: its brief written from the accepted records, the
 * stage's accepted records removed until its next `finish`, its output and review cleared, its rounds kept while its
 * feedback is on an output set aside, and the person's words, when given, its feedback.
 * @param root the analysis root
 * @param job the job
 * @param words the person's words, when given
 * @returns the job with its feedback's text
 */
const prepareJourneyJob = Effect.fnUntraced(function* (root: string, job: JourneyJob, words: PersonsWords | undefined) {
    yield* requireAcceptedRecords("capabilities-and-entities");
    const files = filesOf(root, job);
    if (words !== undefined) {
        yield* requireArtifacts([{ jobId: job.jobId, files }]);
    }
    const stages = yield* StageRecords;
    yield* writeJourneyBrief(root, job);
    return yield* startStageRun(
        "publish",
        [],
        Effect.gen(function* () {
            yield* prepareJobRun(files, personsWords(words), [files.reviewPath, rejectedPathOf(files.reviewPath)]);
            yield* stages.removeStageRecords("publish");
            return { ...job, ...(yield* feedbackArgument(files)) };
        }),
    );
});

const named = Effect.fnUntraced(function* (root: string, key: string) {
    const job = yield* journeyJobNamed(root, key);
    if (job === undefined) {
        return yield* new UsageInvalid({ issue: `no job of the journeys has the job id ${key}` });
    }
    return job;
});

/**
 * Decide the jobs of the journeys: each decided job by its review rounds, one not decided yet pending, one to redo
 * set aside for its one fix with its feedback and its round counted. Inside the stage's write, so a `prepare` beside it
 * waits.
 * @param root the analysis root
 * @returns the outcomes of the jobs decided, and whether any is pending or to redo
 */
export const decideJourneys = Effect.fnUntraced(function* (root: string) {
    const outcomes: Array<ReviewOutcome<ReturnType<typeof reviewedJourneyJob>>> = [];
    let pending = false;
    for (const job of yield* readJourneyList(root)) {
        const reviewed = reviewedJourneyJob(root, job);
        if (!decided(yield* reviewedJobState(reviewed))) {
            pending = true;
            continue;
        }
        const outcome =
            job.kind === "tasks"
                ? yield* reviewOutcome(tasksReview(root, job), reviewed)
                : yield* reviewOutcome(mergeReview(root, job), reviewed);
        if (outcome.outcome === "redo") {
            yield* setRoundAside(outcome);
            pending = true;
        } else {
            outcomes.push(outcome);
        }
    }
    return { outcomes, pending };
});

/**
 * The jobs of the journeys as Publish's loop takes them: each step of `StageLoop` for such a job's key, so Publish adds
 * them beside its briefing and its concluding jobs; and `carry`. The job that joins the tasks may run only once every
 * job that writes them is decided.
 * @param root the analysis root
 * @param sourceFolder the folder every file in a record is relative to
 * @returns the steps
 */
export const journeySteps = (root: string, sourceFolder: string) => ({
    keys: Effect.map(readJourneyList(root), (list) => list.map((job) => job.jobId)),
    isJourney: (key: string) => Effect.map(readJourneyList(root), (list) => list.some((job) => job.jobId === key)),
    job: (key: string) =>
        Effect.map(named(root, key), (job) => {
            const { outputPath, reviewPath, roundsFolder } = filesOf(root, job);
            return { key, label: job.name, outputPath, reviewed: { reviewPath, roundsFolder } };
        }),
    mayRun: (key: string) =>
        Effect.flatMap(named(root, key), (job) =>
            job.jobId === mergeJobId ? tasksDecided(root) : Effect.succeed(true),
        ),
    prepare: (key: string, words?: PersonsWords) =>
        Effect.gen(function* () {
            const prepared = yield* prepareJourneyJob(root, yield* named(root, key), words);
            const call: AgentCall = {
                agent: "publish/describe-journeys",
                arguments: journeyArguments(root, sourceFolder, prepared),
            };
            return { key, call };
        }),
    review: (key: string) =>
        Effect.gen(function* () {
            const job = yield* named(root, key);
            const paths = analysisPaths(root);
            const sheet = {
                checklist: paths.journeys.checklist,
                reads: [["what the writer worked from", paths.journeys.brief(job.jobId)]] as const,
            };
            const call = {
                root,
                sourceFolder,
                checkCommand: `${scriptsCommand(root)}/${script} check ${shellWord(job.jobId)}`,
                feedback: yield* feedbackArgument(filesOf(root, job)),
            };
            const reviewed = reviewedJourneyJob(root, job);
            return job.kind === "tasks"
                ? yield* reviewCall(tasksReview(root, job), reviewed, sheet, call)
                : yield* reviewCall(mergeReview(root, job), reviewed, sheet, call);
        }),
    check: (key: string) => Effect.flatMap(named(root, key), (job) => checkJourneyJob(root, job)),
    answer: (key: string, words: PersonsWords) =>
        Effect.flatMap(named(root, key), (job) => Effect.asVoid(prepareJourneyJob(root, job, words))),
    carry: (key: string, leftOut: readonly string[]) =>
        Effect.gen(function* () {
            const job = yield* named(root, key);
            return yield* carryForward(
                filesOf(root, job),
                job.kind === "tasks" ? agentRecords({ Journey }) : agentRecords({ JourneyMerge }),
                leftOut,
            );
        }),
});
