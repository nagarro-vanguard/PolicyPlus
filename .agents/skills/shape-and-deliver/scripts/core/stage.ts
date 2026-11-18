import { join, relative } from "node:path";
import { Console, Effect, Schema } from "effect";
import { Feedback, FeedbackItem, instructionsOf } from "./feedback";
import { RequestInvalid, StageNotAccepted, StageOutputMissing } from "./script-errors";
import { System } from "./system";
import { Applied, WorkItem } from "./documents";
import { PlanRequest } from "./delivery-request";
import { maxRounds } from "./policy";
import type { DispatchedJob } from "./adapter-seam";
import { planRequestPath, runLayout, skillFolder } from "./run-layout";
import { dispatchOf, type Dispatch } from "./dispatch-prompt";
import { readRecords, recordsOf } from "./record-files";

/**
 * Tells whether an agent has been given every round it gets.
 * @param used the rounds opened so far
 * @returns true when it has no round left
 */
export const roundsSpent = (used: number) => used >= maxRounds;

/**
 * Tells whether the round an agent has just run was the last it gets. It only reads the stage's round folders.
 * @param folder the stage's folder, holding its `rounds/<n>/` folders
 * @returns true when the agent has no round left
 */
export const ranLastRound = Effect.fn("Stage.ranLastRound")(function* (folder: string) {
    return roundsSpent(yield* roundsUsed(folder));
});

/** The folder holding the skill's scripts. */
const scriptsFolder = join(skillFolder, "scripts");

/** The characters the shell leaves alone in a word. */
const shellSafe = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_@%+=:,./-";

/**
 * Words text as one shell word: as it is when it holds only characters the shell leaves alone, else in single quotes
 * with each single quote closed, escaped and reopened. It may be followed by more text, such as `/<script>.ts`.
 * @param text the text
 * @returns the word
 * @public
 */
export const shellWord = (text: string) =>
    text.length > 0 && [...text].every((char) => shellSafe.includes(char))
        ? text
        : `'${text.replaceAll("'", `'\\''`)}'`;

/** The command that runs a script of the skill from any folder: `<scriptsCommand>/<script>.ts`. */
const scriptsCommand = `bun ${shellWord(scriptsFolder)}`;

/**
 * Gives the path of the review checklist that the reviewers are handed.
 * @returns the path of `references/review-checklist.md`
 */
export const checklistPath = () => join(scriptsFolder, "..", "references", "review-checklist.md");

/**
 * Reads a JSON file that an earlier step wrote and decodes it against a schema. Nothing is changed.
 * @param stage the stage that needs the file, named in the errors
 * @param path the JSON file to read
 * @param schema the shape the file must have
 * @returns the decoded value
 * Fails: StageOutputMissing, RequestInvalid.
 */
export const readStageInput = Effect.fn("Stage.readStageInput")(function* <S extends Schema.Decoder<unknown>>(
    stage: string,
    path: string,
    schema: S,
) {
    const system = yield* System;
    if (!(yield* system.exists(path))) {
        return yield* new StageOutputMissing({ stage, path });
    }
    return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(schema))(yield* system.readText(path)).pipe(
        Effect.mapError(
            (error) =>
                new RequestInvalid({ issue: `${path} is not in the shape shape-and-deliver reads: ${error.message}` }),
        ),
    );
});

/**
 * Reads the plan request of a run from its run folder. Nothing is changed.
 * @param stage the stage asking, named in the errors
 * @param runFolder the run's folder
 * @returns the plan request
 * Fails: StageOutputMissing, RequestInvalid.
 */
export const readPlanRequest = Effect.fn("Stage.readPlanRequest")(function* (stage: string, runFolder: string) {
    return yield* readStageInput(stage, planRequestPath(runFolder), PlanRequest);
});

/**
 * Reads the plan request and the work item of a run and works out where its files live. Nothing is changed.
 * @param runFolder the run's folder
 * @param stage the stage asking, named in the errors
 * @returns the run's layout, its plan request and its work item
 */
export const planRun = Effect.fn("Stage.planRun")(function* (runFolder: string, stage: string) {
    const request = yield* readPlanRequest(stage, runFolder);
    const layout = runLayout(request.codebase, request.workItemId);
    const workItem = yield* readStageInput(stage, layout.workItem, WorkItem);
    return { layout, request, workItem };
});

/**
 * Counts the rounds an agent has been given by counting the consecutive `rounds/<n>/` folders of its stage. A round
 * counts even if the agent wrote nothing in it.
 * @param folder the stage's folder
 * @returns the number of rounds opened so far
 */
export const roundsUsed = Effect.fn("Stage.roundsUsed")(function* (folder: string) {
    const system = yield* System;
    let count = 0;
    while (yield* system.exists(join(folder, "rounds", String(count + 1)))) {
        count += 1;
    }
    return count;
});

/**
 * Reads the feedback file of a stage when it exists.
 * @param path the stage's feedback.json
 * @returns the feedback, or undefined when there is no file
 */
const readFeedback = Effect.fnUntraced(function* (path: string) {
    const system = yield* System;
    if (!(yield* system.exists(path))) {
        return undefined;
    }
    return yield* readStageInput("the feedback", path, Feedback);
});

/**
 * Wraps findings into a feedback.
 * @param items what the checks or the review found
 * @returns the feedback, or undefined when there are no items
 */
const firstFeedback = (items: readonly FeedbackItem[]) =>
    items.length > 0 ? new Feedback({ items: [items[0]!, ...items.slice(1)] }) : undefined;

/**
 * Saves the findings as the stage's feedback for its next round, replacing the checks' and the review's earlier ones but
 * keeping the run's and the approver's. With no items it writes nothing and leaves an earlier file in place, because
 * deleting it could lose the approver's own words; every caller skips the call when it has no findings.
 * @param path the stage's feedback.json
 * @param items what the checks or the review found
 * @returns nothing once written
 * Writes: the feedback file.
 */
export const writeFeedback = Effect.fn("Stage.writeFeedback")(function* (path: string, items: readonly FeedbackItem[]) {
    const earlier = yield* readFeedback(path);
    const feedback = earlier ? earlier.next(items) : firstFeedback(items);
    if (feedback !== undefined) {
        // Impossible state: a feedback built from its own items always encodes, so a refusal is a defect.
        const encoded = yield* Schema.encodeEffect(Feedback)(feedback).pipe(Effect.orDie);
        yield* (yield* System).writeText(path, JSON.stringify(encoded, null, 2));
    }
});

/**
 * Turns the approver's Custom Instructions into a feedback, one item per request, so the agent reads them from its
 * first round on. Blank instructions are dropped.
 * @param instructions the Custom Instructions of each request
 * @returns the feedback, or undefined when the approver wrote none
 */
export const approverFeedback = (...instructions: readonly string[]) => {
    const [first, ...rest] = instructions
        .map((text) => text.trim())
        .filter((text) => text.length > 0)
        .map((said) => new FeedbackItem({ from: "approver", said }));
    return first === undefined ? undefined : new Feedback({ items: [first, ...rest] });
};

/**
 * Builds the check command an agent runs before it hands back. Each argument is wrapped in single quotes, with any
 * single quote in it escaped.
 * @param script the stage's script, without `.ts`
 * @param args the arguments that follow `check`
 * @returns the command line
 */
export const checkCommand = (script: string, ...args: readonly string[]) =>
    [`${scriptsCommand}/${script}.ts`, "check", ...args.map((arg) => `'${arg.replaceAll("'", `'\\''`)}'`)].join(" ");

/** What a prepare step gives: a dispatch to send, or the note that the agent's round is already accepted. */
export type Prepared = Dispatch | { readonly agent: string; readonly outcome: "accepted" };

/**
 * Prints what a prepare step gave: a dispatch as indented JSON, an accepted round as one line.
 * @param prepared the dispatch or the accepted round
 * @returns nothing once printed
 */
export const printPrepared = (prepared: Prepared) =>
    Console.log("outcome" in prepared ? JSON.stringify(prepared) : JSON.stringify(prepared, null, 2));

/** One round of an agent to prepare: its job, its files, its check and what it is told. */
type AgentRound = {
    /** The job, as the run names its stage. */
    readonly job: DispatchedJob;
    /** The stage's folder, the agent's output file, its hand-back, and the file the checks or the review leave feedback in. */
    readonly files: {
        readonly folder: string;
        readonly output: string;
        readonly handBack: string;
        readonly feedback?: string;
    };
    readonly agent: string;
    /** The command the agent runs before it is done. */
    readonly check: string;
    /** The agent's named arguments, without customInstructions. */
    readonly args: Readonly<Record<string, string>>;
    /** The approver's own instructions. */
    readonly approver: Feedback | undefined;
    /** What the agent produces, each artifact as it finds it (its records, files, hand-back), named in its instructions. */
    readonly work: readonly string[];
    /** True when this pass starts from no output, as a review does once its owners ran again. */
    readonly fresh?: boolean;
};

/**
 * Gives the path of the file holding what an agent is told in a round.
 * @param folder the stage's folder
 * @param round the round number, from 1
 * @returns the file's path
 */
const instructionsFile = (folder: string, round: number) =>
    join(folder, "rounds", String(round), "custom-instructions.md");

/**
 * Opens a new round: it keeps a copy of the earlier output and hand-back in the round they belong to, removes them for
 * a fresh pass, writes the new round's instructions, and deletes the feedback file now that it is read into them.
 * @param round the round to prepare
 * @param used the rounds opened before this one
 * @param fromChecks the feedback the checks or the review left, if any
 * @returns nothing once the round is open
 * Writes: `rounds/<used>/` copies of the output and hand-back, `rounds/<used+1>/custom-instructions.md`; removes the output and hand-back of a fresh pass, and the feedback file.
 */
const openRound = Effect.fnUntraced(function* (round: AgentRound, used: number, fromChecks: Feedback | undefined) {
    const system = yield* System;
    const { folder, output, handBack, feedback } = round.files;
    for (const kept of [output, handBack]) {
        if (used > 0 && (yield* system.exists(kept))) {
            yield* system.writeText(
                join(folder, "rounds", String(used), relative(folder, kept)),
                yield* system.readText(kept),
            );
        }
        if (round.fresh === true) {
            yield* system.remove(kept);
        }
    }
    const fromOthers = (fromChecks?.items ?? []).filter((item) => item.from !== "approver");
    const given = round.approver === undefined ? fromChecks : (round.approver.next(fromOthers) ?? round.approver);
    const produced = yield* system.exists(output);
    yield* system.writeText(instructionsFile(folder, used + 1), instructionsOf(given, produced ? round.work : []));
    if (feedback !== undefined) {
        yield* system.remove(feedback);
    }
});

/**
 * Tells whether a stage still stands accepted: its last round is marked accepted and no feedback waits for it. A stage
 * sent back by a review stops standing accepted until it runs again and is accepted again.
 * @param files the stage's folder and its feedback file
 * @param files.folder the stage's folder
 * @param files.feedback the file the checks or a review leave feedback in
 * @returns true when the stage stands accepted
 */
export const standsAccepted = Effect.fn("Stage.standsAccepted")(function* (files: {
    readonly folder: string;
    readonly feedback: string;
}) {
    const system = yield* System;
    const round = yield* roundsUsed(files.folder);
    return (
        round > 0 &&
        (yield* system.exists(join(files.folder, "rounds", String(round), "accepted"))) &&
        !(yield* system.exists(files.feedback))
    );
});

/**
 * Refuses a step while a stage it builds on does not stand accepted, so work is never built on an unaccepted stage.
 * @param stage the step, named in the refusal
 * @param needs each stage the step builds on, with its folder and feedback file
 * @returns nothing when every one stands accepted
 * Fails: StageNotAccepted, naming the first stage that does not stand.
 */
export const requireAccepted = Effect.fn("Stage.requireAccepted")(function* (
    stage: string,
    needs: ReadonlyArray<{ readonly name: string; readonly folder: string; readonly feedback: string }>,
) {
    for (const need of needs) {
        if (!(yield* standsAccepted(need))) {
            return yield* new StageNotAccepted({ stage, needs: need.name });
        }
    }
});

/**
 * Marks the agent's current round accepted, so preparing the stage again dispatches nothing. When no round exists it
 * does nothing, silently.
 * @param folder the stage's folder
 * @returns nothing once marked
 * Writes: `rounds/<n>/accepted`.
 */
export const markAccepted = Effect.fn("Stage.markAccepted")(function* (folder: string) {
    const round = yield* roundsUsed(folder);
    if (round > 0) {
        yield* (yield* System).writeText(join(folder, "rounds", String(round), "accepted"), "");
    }
});

/**
 * Prepares an agent's round. A new round opens on first use, when feedback waits, or for every pass of a fresh stage;
 * otherwise the current round is repeated, and one already accepted gives only an accepted note.
 * @param round the round to prepare
 * @returns the dispatch to send, or the accepted note
 * Writes: the round's files and the removal of the feedback file, when a new round opens.
 */
export const prepareAgent = Effect.fn("Stage.prepareAgent")(function* (round: AgentRound) {
    const system = yield* System;
    const used = yield* roundsUsed(round.files.folder);
    const fromChecks = round.files.feedback === undefined ? undefined : yield* readFeedback(round.files.feedback);
    const current = used === 0 || fromChecks !== undefined || round.fresh === true ? used + 1 : used;
    if (current > used) {
        yield* openRound(round, used, fromChecks);
    } else if (yield* system.exists(join(round.files.folder, "rounds", String(current), "accepted"))) {
        const accepted: Prepared = { agent: round.agent, outcome: "accepted" };
        return accepted;
    }
    const customInstructions = yield* system.readText(instructionsFile(round.files.folder, current));
    const printed: Prepared = dispatchOf(round.job, {
        agent: round.agent,
        arguments: {
            scriptsCommand,
            checkCommand: round.check,
            ...round.args,
            handBackPath: round.files.handBack,
            ...(customInstructions.length > 0 ? { customInstructions } : {}),
        },
    });
    return printed;
});

/**
 * Reads what has been applied to the branch so far; an empty record when nothing has been committed yet.
 * @param stage the stage reading it, named when the file is malformed
 * @param path the run's applied.json
 * @returns what has been applied
 */
export const readApplied = Effect.fn("Stage.readApplied")(function* (stage: string, path: string) {
    const nothingYet: Applied = {};
    return (yield* (yield* System).exists(path)) ? yield* readStageInput(stage, path, Applied) : nothingYet;
});

/**
 * Lists the problems with shape-and-deliver itself that an agent recorded, for the operator to see.
 * @param records the agent's records file
 * @returns what each problem says, an empty list when there are none or no file yet
 */
export const skillProblemsIn = Effect.fn("Stage.skillProblemsIn")(function* (records: string) {
    const written = (yield* (yield* System).exists(records)) ? yield* readRecords(records) : [];
    return (yield* recordsOf(written, "SkillProblem")).map((problem) => problem.says);
});

/**
 * Checks that the agent wrote a hand-back, since the reviewer and the operator learn what it did and doubted only there.
 * @param handBack the agent's hand-back file
 * @returns the gap to report, or undefined when the file has words in it
 */
export const handBackGap = Effect.fn("Stage.handBackGap")(function* (handBack: string) {
    const system = yield* System;
    const written = (yield* system.exists(handBack)) && (yield* system.readText(handBack)).trim().length > 0;
    return written
        ? undefined
        : `the agent wrote no hand-back at ${handBack}: what it did, what it guessed and why, and every doubt`;
});
