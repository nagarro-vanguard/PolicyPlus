import { join, relative } from "node:path";
import { Console, Effect } from "effect";
import { Command } from "effect/cli";
import { runFolderArgument } from "./arguments";
import { readCodebase, type Codebase } from "./codebase";
import { designNote } from "./design-note";
import { FeedbackItem, withRunNote } from "./feedback";
import { readRecords } from "./record-files";
import { needsAction, printOutcome } from "./run-script";
import {
    approverFeedback,
    checkCommand,
    handBackGap,
    markAccepted,
    planRun,
    prepareAgent,
    printPrepared,
    type Prepared,
    ranLastRound,
    requireAccepted,
    roundsUsed,
    skillProblemsIn,
    writeFeedback,
} from "./stage";
import { maxRounds } from "./policy";
import type { Services } from "./services";
import { System } from "./system";
import type { Render } from "./render-run";
import { renderAfter, renderCommand } from "./render-step";
import { keepCitersInLine, reads } from "./review-routing";
import type { PlanRequest } from "./delivery-request";
import type { WorkItem } from "./documents";
import type { Producer, RunLayout } from "./run-layout";
import type { ScriptError } from "./script-errors";

type StageFiles = RunLayout["orient"];

export type StageContext = {
    readonly layout: RunLayout;
    readonly request: PlanRequest;
    readonly workItem: WorkItem;
    readonly codebase: Codebase;
};

/** A plan stage whose agent writes records: its agent, files, arguments, gate, view and command description. */
export type ProducerStage = {
    readonly stage: Producer;
    readonly agent: string;
    readonly files: (layout: RunLayout) => StageFiles;
    readonly arguments: (context: StageContext) => Effect.Effect<Record<string, string>, ScriptError, Services>;
    readonly gaps: (context: StageContext) => Effect.Effect<readonly string[], ScriptError, Services>;
    /** What the output does not yet account for, counted with no meaning: read before handing back, never a gap. */
    readonly view: (context: StageContext) => Effect.Effect<readonly string[], ScriptError, Services>;
    readonly description: string;
    /** True when the codebase gives the stage nothing to do, so it stands accepted with no agent and no records. */
    readonly skips?: (context: StageContext) => boolean;
};

/**
 * Reads what a stage works from: the run's layout, plan request and work item, and the codebase's layers.
 * @param runFolder the run's folder
 * @param stage the stage, named in the errors
 * @returns the context
 */
const contextOf = Effect.fnUntraced(function* (runFolder: string, stage: ProducerStage) {
    const { layout, request, workItem } = yield* planRun(runFolder, stage.agent);
    const codebase = yield* readCodebase(request.codebase);
    return { layout, request, workItem, codebase };
});

/** What finish prints: accepted, or the gaps with a redo or a stop, and the agent's problems with shape-and-deliver. */
type ProducerOutcome =
    | { readonly stage: string; readonly outcome: "accepted"; readonly skillProblems: readonly string[] }
    | {
          readonly stage: string;
          readonly outcome: "redo" | "stop";
          readonly gaps: readonly string[];
          readonly skillProblems: readonly string[];
      };

/**
 * Lets a stage that the codebase gives nothing to do stand accepted, with an empty records file for the stages that
 * read it, and no agent. Doing it again changes nothing.
 * @param stage the stage
 * @param context what the stage works from
 * @returns the accepted note
 * Writes: the empty records file when it is absent, and `rounds/<n>/accepted`.
 */
const acceptSkipped = Effect.fnUntraced(function* (stage: ProducerStage, context: StageContext) {
    const system = yield* System;
    const files = stage.files(context.layout);
    if (!(yield* system.exists(files.records))) {
        yield* system.writeText(files.records, "");
    }
    yield* system.writeText(
        join(files.folder, "rounds", String(Math.max(1, yield* roundsUsed(files.folder))), "accepted"),
        "",
    );
    const accepted: Prepared = { agent: stage.agent, outcome: "accepted" };
    return accepted;
});

/**
 * Prepares the agent's next round, which opens a new round when none is open or feedback waits. It refuses to run
 * until every stage whose output the agent reads stands accepted.
 * @param stage the stage
 * @param runFolder the run's folder
 * @returns the dispatch to send, or the accepted note
 * Writes: the round's files and the removal of the feedback file, when a new round opens. Fails: StageNotAccepted.
 */
export const prepareProducer = Effect.fn("RecordStage.prepareProducer")(function* (
    stage: ProducerStage,
    runFolder: string,
) {
    const context = yield* contextOf(runFolder, stage);
    const { layout } = context;
    if (stage.skips?.(context) === true) {
        return yield* acceptSkipped(stage, context);
    }
    yield* requireAccepted(
        stage.agent,
        reads[stage.stage].map((read) => ({
            name: read,
            folder: layout[read].folder,
            feedback: layout[read].feedback,
        })),
    );
    const files = stage.files(context.layout);
    return yield* prepareAgent({
        job: stage.stage,
        files: { folder: files.folder, output: files.records, handBack: files.handBack, feedback: files.feedback },
        agent: stage.agent,
        check: checkCommand(stage.agent, runFolder),
        args: yield* stage.arguments(context),
        approver: withRunNote(
            approverFeedback(context.request.customInstructions),
            designNote(stage.stage, context.request),
        ),
        work: [
            `your records, ${files.records}`,
            ...((yield* (yield* System).exists(files.files)) ? [`your files, under ${files.files}`] : []),
            `your hand-back, ${files.handBack}`,
        ],
    });
});

/**
 * Prints the gaps in the agent's output, or `no gap`, then, when there is any, the list headed "Still to account for".
 * The exit code is 1 when there is a gap.
 * @param stage the stage
 * @param runFolder the run's folder
 * @returns nothing once printed
 */
const checkStep = Effect.fnUntraced(function* (stage: ProducerStage, runFolder: string) {
    const context = yield* contextOf(runFolder, stage);
    const gaps = yield* stage.gaps(context);
    yield* Console.log(gaps.length === 0 ? "no gap" : gaps.join("\n"));
    const view = yield* stage.view(context);
    if (view.length > 0) {
        yield* Console.log(
            ["", "Still to account for (not gaps; judge each):", ...view.map((line) => `- ${line}`)].join("\n"),
        );
    }
    if (gaps.length > 0) {
        yield* needsAction;
    }
});

/**
 * Settles a stage that is accepted again after a rework: the stages that cite what it changed are told to keep in
 * line, and a round that changed none of its records is not counted against its rounds.
 * @param stage the stage
 * @param layout the run's layout
 * @returns nothing once settled
 * Writes: feedback for the stages citing a changed record; for an unchanged rework, removes its round and marks the one before accepted.
 */
const settleRework = Effect.fnUntraced(function* (stage: ProducerStage, layout: RunLayout) {
    const system = yield* System;
    const files = stage.files(layout);
    const used = yield* roundsUsed(files.folder);
    const earlier = join(files.folder, "rounds", String(used - 1), relative(files.folder, files.records));
    if (used < 2 || !(yield* system.exists(earlier))) {
        return;
    }
    yield* keepCitersInLine(layout, stage.stage, earlier);
    if ((yield* system.readText(earlier)) === (yield* system.readText(files.records))) {
        yield* system.remove(join(files.folder, "rounds", String(used)));
        yield* markAccepted(files.folder);
    }
});

/**
 * Accepts the agent's output when it has records, a hand-back and passes the gate; otherwise saves the gaps as
 * feedback and answers redo, or stop once the rounds are spent.
 * @param stage the stage
 * @param runFolder the run's folder
 * @returns the outcome with the gaps and the agent's problems with shape-and-deliver
 * Writes: the accepted mark and removal of the feedback file when accepted; the feedback file when there are gaps.
 */
export const finishProducer = Effect.fn("RecordStage.finishProducer")(function* (
    stage: ProducerStage,
    runFolder: string,
) {
    const system = yield* System;
    const context = yield* contextOf(runFolder, stage);
    const files = stage.files(context.layout);
    const written = (yield* system.exists(files.records)) && (yield* readRecords(files.records)).length > 0;
    const handBack = yield* handBackGap(files.handBack);
    const gaps = [
        ...(written ? yield* stage.gaps(context) : [`the agent wrote nothing to ${files.records}`]),
        ...(handBack === undefined ? [] : [handBack]),
    ];
    const skillProblems = yield* skillProblemsIn(files.records);
    if (gaps.length === 0) {
        yield* system.remove(files.feedback);
        yield* markAccepted(files.folder);
        yield* settleRework(stage, context.layout);
        return { stage: stage.agent, outcome: "accepted", skillProblems } satisfies ProducerOutcome;
    }
    const outcome = (yield* ranLastRound(files.folder)) ? "stop" : "redo";
    yield* writeFeedback(
        files.feedback,
        gaps.map((said) => new FeedbackItem({ from: "check", said })),
    );
    return { stage: stage.agent, outcome, gaps, skillProblems } satisfies ProducerOutcome;
});

/**
 * Builds the command of a record-writing stage, with its prepare, check, finish and render subcommands. Prepare and
 * finish redraw the run's pages afterwards.
 * @param stage the stage
 * @param render the run's render step
 * @returns the command
 */
export const producerCommand = (stage: ProducerStage, render: Render) => {
    return Command.make(stage.agent).pipe(
        Command.withDescription(stage.description),
        Command.withSubcommands([
            Command.make(
                "prepare",
                { runFolder: runFolderArgument },
                Effect.fn("RecordStage.prepare")(
                    function* ({ runFolder: folder }) {
                        yield* printPrepared(yield* prepareProducer(stage, folder));
                    },
                    (step, { runFolder: folder }) => renderAfter(render, folder)(step),
                ),
            ).pipe(
                Command.withDescription(
                    'Prints the agent\'s dispatch as JSON, or {"outcome": "accepted"} when its round is already accepted. A new round opens when feedback waits. Refused until every stage whose output the agent reads stands accepted.',
                ),
            ),
            Command.make(
                "check",
                { runFolder: runFolderArgument },
                Effect.fn("RecordStage.check")(function* ({ runFolder: folder }) {
                    yield* checkStep(stage, folder);
                }),
            ).pipe(
                Command.withDescription(
                    "Prints each gap in the agent's output, or `no gap`, then what the output does not yet account for. It checks structure only, so passing is necessary, not sufficient. Exit 1 when there is a gap.",
                ),
            ),
            Command.make(
                "finish",
                { runFolder: runFolderArgument },
                Effect.fn("RecordStage.finish")(
                    function* ({ runFolder: folder }) {
                        yield* printOutcome(yield* finishProducer(stage, folder));
                    },
                    (step, { runFolder: folder }) => renderAfter(render, folder)(step),
                ),
            ).pipe(
                Command.withDescription(
                    `Prints {"outcome": "accepted" | "redo" | "stop"} and the agent's problems with shape-and-deliver. On redo the gaps become the agent's feedback for one more round; after ${maxRounds} rounds the run stops for the operator.`,
                ),
            ),
            renderCommand(render),
        ]),
    );
};

/**
 * Gives the orientation's path to an agent that reads it: only when the codebase has a knowledge base, since without
 * one the orientation stage is skipped and holds nothing.
 * @param context what the stage works from
 * @returns `orientationPath`, or nothing
 */
export const orientationArguments = (context: StageContext): Record<string, string> =>
    context.codebase.kbPath === undefined ? {} : { orientationPath: context.layout.orient.records };

/**
 * Gives the named arguments every plan agent receives.
 * @param context what the stage works from
 * @param context.codebase the codebase
 * @param context.layout the run's layout
 * @param context.request the plan request
 * @returns the codebase root, the paths of the work item and the plan request, and the legacy attachment when the run has one
 */
export const sharedArguments = (context: {
    readonly codebase: Pick<Codebase, "root">;
    readonly layout: RunLayout;
    readonly request: Pick<PlanRequest, "reference">;
}) => ({
    codebase: context.codebase.root,
    workItemPath: context.layout.workItem,
    requestPath: context.layout.planRequest,
    ...(context.request.reference === undefined ? {} : { referencePath: context.request.reference }),
});
