import { basename, join } from "node:path";
import { Effect, Option, Schema } from "effect";
import { keysOf } from "../run/collections";
import { FileAccess } from "../source/file-access";
import { jsonlText } from "../run/json-files";
import type { JsonRecord } from "../model/json-record";
import { readAgentOutput } from "../read/record-reading";
import type { Stage } from "../run/analysis-layout";
import { JobStates } from "./job-state";
import { Feedback, FeedbackItem } from "../model/schemas/feedback";
import { UsageInvalid } from "../run/script-errors";

export type JobRef = { readonly stage: Stage; readonly key: string };

export type FeedbackFiles = JobRef & {
    readonly outputPath: string;
    readonly roundsFolder: string;
};

type Shapes<T> = { readonly [K in keyof T & string]: Schema.ConstraintDecoder<JsonRecord & { readonly id: string }> };

/**
 * A job's feedback: none before its first artifact has been judged, or once an artifact was accepted.
 * @param job the job's stage and key
 * @returns the feedback, or none
 */
export const readFeedback = Effect.fnUntraced(function* (job: JobRef) {
    const row = yield* (yield* JobStates).get(job.stage, job.key);
    return row === undefined || row.feedback === undefined ? Option.none<Feedback>() : Option.some(row.feedback);
});

/**
 * Write a job's feedback, replacing any earlier one.
 * @param job the job's stage and key
 * @param feedback the feedback
 * @returns nothing once written
 */
const writeFeedback = Effect.fnUntraced(function* (job: JobRef, feedback: Feedback) {
    const states = yield* JobStates;
    yield* states.ensure(job.stage, job.key);
    yield* states.update(job.stage, job.key, { feedback });
});

/**
 * The feedback on an artifact after it was judged: the earlier feedback carried to it (the person's words stay in
 * force), or the checks alone on a first artifact.
 * @param earlier the job's feedback before, if any
 * @param artifact the judged artifact, where it is kept
 * @param checks what the review and the scripts found in it, never empty: an artifact with nothing to change is
 * accepted
 * @returns the feedback
 */
function feedbackAfter(earlier: Option.Option<Feedback>, artifact: string, checks: readonly FeedbackItem[]) {
    if (Option.isSome(earlier)) {
        return earlier.value.next(artifact, checks);
    }
    const [first, ...rest] = checks;
    if (first === undefined) {
        throw new Error("an artifact judged with nothing to change is accepted, never given feedback");
    }
    return new Feedback({ artifact, items: [first, ...rest] });
}

/**
 * Keep a judged artifact's feedback where its next run reads it: an artifact set aside for its fix from the round it
 * was set aside in, a refused one's in place, for the operator.
 * @param job the job's files
 * @param artifact where the judged artifact is kept
 * @param checks what was found in it
 * @returns nothing once written
 */
export const keepFeedback = Effect.fnUntraced(function* (
    job: FeedbackFiles,
    artifact: string,
    checks: readonly FeedbackItem[],
) {
    yield* writeFeedback(job, feedbackAfter(yield* readFeedback(job), artifact, checks));
});

/**
 * Clear a job's feedback once its artifact is accepted: the accepted artifact holds what it asked for.
 * @param job the job's files
 * @returns nothing once cleared
 */
export const clearFeedback = Effect.fnUntraced(function* (job: JobRef) {
    const states = yield* JobStates;
    yield* states.ensure(job.stage, job.key);
    yield* states.update(job.stage, job.key, { feedback: null });
});

/**
 * Refuse the person's words on jobs that have produced nothing yet: feedback is always on an artifact.
 * @param jobs each job's id and files
 * @returns nothing when every job has an artifact; UsageInvalid naming those that have none
 */
export const requireArtifacts = Effect.fnUntraced(function* (
    jobs: ReadonlyArray<{ readonly jobId: string; readonly files: FeedbackFiles }>,
) {
    const fs = yield* FileAccess;
    const without: string[] = [];
    for (const { jobId, files } of jobs) {
        if (!(yield* fs.exists(files.outputPath)) && Option.isNone(yield* readFeedback(files))) {
            without.push(jobId);
        }
    }
    if (without.length) {
        return yield* new UsageInvalid({
            issue: `${without.join(", ")} produced nothing yet, so there is nothing to give feedback on: run them first`,
        });
    }
});

export type PersonsWords = string | FeedbackItem | readonly FeedbackItem[];

/**
 * The feedback given to a job as items: none when none is given. Words typed with `--custom-instructions` become an
 * item of the person's; a challenge to an assumption, or material that settles it, comes as its own item, naming the
 * assumption (D165); what the stage's audit routes to the job comes as its items (plan 0004).
 * @param words the feedback given, if any
 * @returns the items
 */
export const personsWords = (words: PersonsWords | undefined): readonly FeedbackItem[] => {
    if (words === undefined) {
        return [];
    }
    if (typeof words === "string") {
        return [FeedbackItem.fromPerson(words)];
    }
    return words instanceof FeedbackItem ? [words] : words;
};

/**
 * Make a job ready for its next run. While its feedback is on an artifact set aside, a cycle of review rounds is under
 * way: the run starts from that artifact, the feedback given joins it, and the rounds are kept. Otherwise a new cycle
 * starts: the earlier rounds are removed, and when there is feedback to give (the person's words, what the assigning
 * jobs found, a changed registry, or a refused job's checks) the job's artifact is set aside as round 0, the one the
 * feedback is about; with none, the run starts from nothing. The output and what the job's last run left besides it
 * (its review, as the caller names it) are removed either way, so a cut-off run leaves nothing behind. The caller refuses feedback
 * on a job with no artifact first (`requireArtifacts`).
 * @param job the job's files
 * @param given the feedback given now, if any
 * @param cleared the other files the job's last run left, such as its review and report
 * @returns whether a cycle is under way, so the caller keeps the job's round count
 */
export const prepareJobRun = Effect.fnUntraced(function* (
    job: FeedbackFiles,
    given: readonly FeedbackItem[],
    cleared: readonly string[],
) {
    const fs = yield* FileAccess;
    const states = yield* JobStates;
    yield* states.ensure(job.stage, job.key);
    const earlier = yield* readFeedback(job);
    const underWay = Option.isSome(earlier) && earlier.value.artifact !== job.outputPath;
    const [first, ...rest] = given;
    if (underWay) {
        if (first !== undefined) {
            yield* writeFeedback(job, earlier.value.adding(given));
        }
    } else {
        yield* fs.remove(job.roundsFolder);
        const artifact = join(job.roundsFolder, "0", basename(job.outputPath));
        if (Option.isSome(earlier)) {
            yield* fs.move(job.outputPath, artifact);
            yield* writeFeedback(job, earlier.value.movedTo(artifact).adding(given));
        } else if (first !== undefined) {
            yield* fs.move(job.outputPath, artifact);
            yield* writeFeedback(job, new Feedback({ artifact, items: [first, ...rest] }));
        }
    }
    for (const path of [job.outputPath, ...cleared]) {
        yield* fs.remove(path);
    }
    yield* states.update(job.stage, job.key, {
        report: null,
        reviewAttempts: 0,
        ...(underWay ? {} : { state: "toRun" as const, round: 0, fixes: { gate: false, review: false } }),
    });
    return underWay;
});

/**
 * The argument a job's agent and its reviewer receive for its feedback: `customInstructions`, its text, when it has
 * feedback; nothing on a first run.
 * @param job the job's files
 * @returns the argument, or nothing
 */
export const feedbackArgument = Effect.fnUntraced(function* (job: FeedbackFiles) {
    return Option.match(yield* readFeedback(job), {
        onNone: () => ({}),
        onSome: (feedback) => ({ customInstructions: String(feedback) }),
    });
});

export type ArtifactRecord = { readonly key: string; readonly record: unknown };

/**
 * How a reviewed stage reads an artifact for `carry`: every record of the agent's output, each as last written, keyed
 * by its record id.
 * @param shapes the record types the output may hold
 * @returns the read, given the artifact's path
 */
export const agentRecords =
    <T extends Shapes<T>>(shapes: T) =>
    (path: string) =>
        Effect.map(readAgentOutput(path, shapes), (read) =>
            keysOf<keyof T & string>(shapes)
                .filter((name) => name !== "Receipt")
                .flatMap((name) => read.of(name))
                .map((record): ArtifactRecord => ({ key: record.id, record })),
        );

/**
 * `carry`: start a run from the artifact its feedback is about: every record of it that stands is copied into the
 * new output as it was last written, its identity kept, so the agent writes only what the feedback changes and the
 * review traces each record across rounds. Refused on a first run (no feedback), once the agent has written, and for
 * a record the artifact does not hold.
 * @param job the job's files
 * @param readArtifact how the stage reads the artifact's records, each with the key the agent names it by
 * @param leftOut the keys of the records that do not stand
 * @returns how many records were carried and left out
 */
export const carryForward = Effect.fnUntraced(function* <E, R>(
    job: FeedbackFiles,
    readArtifact: (path: string) => Effect.Effect<readonly ArtifactRecord[], E, R>,
    leftOut: readonly string[],
) {
    const fs = yield* FileAccess;
    const feedback = yield* readFeedback(job);
    if (Option.isNone(feedback)) {
        return yield* new UsageInvalid({ issue: "this job has no feedback, so this run starts from nothing" });
    }
    if (yield* fs.exists(job.outputPath)) {
        return yield* new UsageInvalid({ issue: `${job.outputPath} is written already: carry before writing` });
    }
    const records = yield* readArtifact(feedback.value.artifact);
    const held = new Set(records.map((each) => each.key));
    const unknown = leftOut.filter((key) => !held.has(key));
    if (unknown.length) {
        return yield* new UsageInvalid({
            issue: `${unknown.join(", ")} is no record of ${feedback.value.artifact}: leave out only its records`,
        });
    }
    const leaving = new Set(leftOut);
    const carried = records.filter((each) => !leaving.has(each.key)).map((each) => each.record);
    yield* fs.writeText(job.outputPath, jsonlText(carried));
    return {
        carried: carried.length,
        leftOut: leaving.size,
        leftOutRecords: records.filter((each) => leaving.has(each.key)),
    };
});

/**
 * A job's feedback as the last argument of each of its agents; nothing on a first run.
 * @param job the job, with its feedback's text when it has feedback
 * @param job.customInstructions the feedback's text
 * @returns the argument, or nothing
 */
export const instructionsOf = (job: { readonly customInstructions?: string }) =>
    job.customInstructions === undefined ? {} : { customInstructions: job.customInstructions };
