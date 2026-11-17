import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { AnalysisRoot } from "../run/analysis-root";
import { needsAction } from "../run/run-script";
import { reviewedJobState, stageStatus, type LoopServices, type StageLoop } from "./loop-jobs";
import { JobStates } from "./job-state";
import { UsageInvalid, type ScriptError } from "../run/script-errors";
import { advance } from "./stage-loop";
import { stageTitle, stageWorkFolder, type Stage } from "../run/analysis-layout";
import { FileAccess } from "../source/file-access";
import { acceptRegister, giveWordOnAssumption } from "../read/assumptions";
import { stageStatusOf } from "./stage-status";
import type { StageStatus } from "../model/schemas/stage-status";

const standingWords = {
    notStarted: "not started",
    running: "running",
    waitingForYou: "waiting for you",
    stopped: "stopped",
    done: "done",
} as const;

/**
 * A stage's standing as `show` prints it (D100, D103): its state, why it stopped, its jobs, what its last batch did,
 *
 * @param loop the stage
 * @param standing where it stands
 * @returns the lines
 */
const standingLines = (loop: StageLoop, standing: StageStatus) => {
    const { progress } = standing;
    return [
        `${stageTitle(loop.stage)}: ${standingWords[standing._tag]}${standing._tag === "stopped" ? `, ${standing.reason}` : ""}`,
        `Jobs: ${progress.reviewed} reviewed, ${progress.fixed} fixed after review, ${progress.refused} refused, ${progress.toReview} to review, ${progress.toRun} to run`,
        ...(standing._tag === "running"
            ? standing.justRan.map((job) =>
                  job._tag === "agentWrote"
                      ? `  just ran: ${job.label}, its agent wrote ${job.wrote.reduce((sum, each) => sum + each.count, 0)} records`
                      : `  just ran: ${job.label}, its review challenged ${job.verdicts.partlyCorrect + job.verdicts.wrong + job.verdicts.unsettled}`,
              )
            : []),
    ];
};

/**
 * The jobs a stage refused, each by its label, for whoever runs the analysis: their checks still fail after their fix
 * (P1.33). The pages hold facts about the system only, never how its jobs stand (plan 0004, D189).
 * @param loop the stage
 * @returns one line per refused job
 */
const refusedLines = Effect.fnUntraced(function* (loop: StageLoop) {
    const lines: string[] = [];
    for (const key of yield* loop.keys) {
        const job = yield* loop.job(key);
        if ((yield* reviewedJobState({ stage: loop.stage, key })) === "refused") {
            lines.push(
                `  refused: ${job.label}; its feedback says what its checks still find, and prepare <job> --custom-instructions runs it again`,
            );
        }
    }
    return lines;
});

export const freshFlag = Flag.Boolean("fresh").pipe(Flag.withDefault(false));

/**
 * `prepare --fresh`: begin a stage's run again from nothing, as one operation on the job state: every job's state, the
 * stage's batches, the reason it stopped and its documents are deleted in one transaction, and the stage's work folder
 * with them, so no earlier run's artifact, feedback or round survives into the new one. The stage's accepted records
 * stay until the `prepare` that follows removes them, as it does for any run.
 * @param stage the stage
 * @param root the analysis root
 * @returns nothing once cleared
 */
const freshStage = Effect.fnUntraced(function* (stage: Stage, root: string) {
    yield* (yield* JobStates).clearStage(stage);
    yield* (yield* FileAccess).remove(stageWorkFolder(root, stage));
});

/**
 * `prepare`'s steps, beginning with `freshStage` when `--fresh` is given.
 * @param stage the stage
 * @param fresh whether `--fresh` was given
 * @param step the `prepare` step itself
 * @returns the steps in order
 */
export const withFresh = <A, E, R>(stage: Stage, fresh: boolean, step: Effect.Effect<A, E, R>) =>
    fresh ? Effect.flatMap(AnalysisRoot, ({ root }) => Effect.andThen(freshStage(stage, root), step)) : step;

type LoopOf = (root: string) => Effect.Effect<StageLoop, ScriptError, LoopServices>;

/**
 * `show`: the stage's standing, or as JSON (D100); it writes nothing.
 * @param loopOf the stage's loop, made for one analysis root
 * @returns the subcommand
 */
const showCommand = (loopOf: LoopOf) =>
    Command.make("show", { json: Flag.Boolean("json").pipe(Flag.withDefault(false)) }, ({ json }) =>
        Effect.gen(function* () {
            const loop = yield* loopOf((yield* AnalysisRoot).root);
            const standing = yield* stageStatusOf(loop);
            yield* Console.log(
                json
                    ? JSON.stringify(standing, null, 2)
                    : [
                          ...standingLines(loop, standing),
                          ...(yield* refusedLines(loop)),
                          ...(yield* loop.leftOver),
                      ].join("\n"),
            );
        }),
    ).pipe(
        Command.withDescription(
            "Prints where the stage stands: its state, why it stopped, its jobs, what its last batch did, each job refused, and, for the operator, what the stage's audit left that no job could take; --json prints its standing as JSON. It writes nothing: render writes the standing and the pages.",
        ),
    );

/**
 * The person's word on the assumptions register (P1.32, P4e.11): `challenge` an assumption, or `attach` material that
 * settles it, each given to the job that wrote it as feedback, the job prepared again; or `accept-assumptions`, the
 * register as a whole. Each renders after.
 * @param loopOf the stage's loop, made for one analysis root
 * @returns the three subcommands
 */
const assumptionCommands = (loopOf: LoopOf) => {
    const word = (factId: string, said: (statement: string) => string) =>
        Effect.gen(function* () {
            const loop = yield* loopOf((yield* AnalysisRoot).root);
            const label = yield* giveWordOnAssumption(loop, factId, said);
            yield* Console.log(`${label} is ready to run again with your word: run next`);
        });
    return [
        Command.make(
            "challenge",
            { fact: Argument.String("factId"), words: Argument.String("words") },
            ({ fact, words }) =>
                word(fact, (statement) => `The person challenges the assumption "${statement}": ${words}`),
        ).pipe(
            Command.withDescription(
                "Challenges one assumption, by its record id, as the person's feedback to the job that wrote it: the job is prepared again, so its next run keeps, corrects or drops it. Refused while a batch is open.",
            ),
        ),
        Command.make("attach", { fact: Argument.String("factId"), path: Argument.String("path") }, ({ fact, path }) =>
            word(
                fact,
                (statement) =>
                    `The person attaches material that settles the assumption "${statement}": read ${path}, then keep, correct or drop it.`,
            ),
        ).pipe(
            Command.withDescription(
                "Attaches material that settles one assumption, by its record id and the material's path, as feedback to the job that wrote it; the job is prepared again. Refused while a batch is open.",
            ),
        ),
        Command.make("accept-assumptions", {}, () =>
            Effect.gen(function* () {
                const loop = yield* loopOf((yield* AnalysisRoot).root);
                const count = yield* acceptRegister(loop.root);
                yield* Console.log(
                    `the register's ${count} assumptions are accepted; one written later waits for you again`,
                );
            }),
        ).pipe(
            Command.withDescription(
                "Accepts the assumptions register as a whole: every assumption stored now, with when. One written later waits for the person's review again.",
            ),
        ),
    ];
};

/**
 * The harness's word on its agents: `done <job>` marks a job's agent finished, so `next --after <batch>` closes it, with
 * how long it ran when the harness says; `abandon <job>` releases a job whose agent crashed back to the stage, so a
 * half-written output is never gated and never spends the job's one fix. A script cannot know when an agent starts or
 * ends, so the harness reports it.
 * @param loopOf the stage's loop, made for one analysis root
 * @returns the two subcommands
 */
const agentReportCommands = (loopOf: LoopOf) => [
    Command.make(
        "done",
        { job: Argument.String("job"), seconds: Flag.Int("seconds").pipe(Flag.optional) },
        ({ job, seconds }) =>
            Effect.gen(function* () {
                const { stage } = yield* loopOf((yield* AnalysisRoot).root);
                const marked = yield* (yield* JobStates).markDone(stage, job, Option.getOrUndefined(seconds));
                if (!marked) {
                    return yield* new UsageInvalid({ issue: `no open batch of ${stage} holds an agent for ${job}` });
                }
                yield* Console.log(`${job} is done: its batch closes it at the next --after`);
            }),
    ).pipe(
        Command.withDescription(
            "Reports that the agent of a job of the open batch has finished, by the job's name as the dispatch gave it; --seconds <n> says how long it ran. next --after <batch> closes only the jobs reported done and leaves the rest in the batch.",
        ),
    ),
    Command.make("abandon", { job: Argument.String("job") }, ({ job }) =>
        Effect.gen(function* () {
            const { stage } = yield* loopOf((yield* AnalysisRoot).root);
            const released = yield* (yield* JobStates).abandon(stage, job);
            if (!released) {
                return yield* new UsageInvalid({ issue: `no open batch of ${stage} holds an agent for ${job}` });
            }
            yield* Console.log(`${job} is released: the next next hands it out again`);
        }),
    ).pipe(
        Command.withDescription(
            "Releases a job whose agent crashed back to the stage: it leaves the open batch, keeps its state, and is handed out again by the next next; its output, written or not, is never gated.",
        ),
    ),
];

/**
 * Every reviewed stage's `next`, `status`, `show`, `render`, `challenge`, `attach` and `accept-assumptions`
 * subcommands, over its loop (D56, D103, P1.32):
 * `next` prints the next action as JSON, having rendered the stage, and marks the run as needing action when it stops;
 * `status` prints where every job stands and marks the run as needing action until the loop is complete; `show` prints
 * the stage's standing, writing nothing; `render` writes the standing and draws every page; the other three give the
 * person's word on the assumptions register, then render.
 * @param loopOf the stage's loop, made for one analysis root
 * @returns the seven subcommands
 */
export const loopCommands = (loopOf: LoopOf) => [
    Command.make(
        "next",
        { limit: Flag.Int("limit"), after: Flag.String("after").pipe(Flag.optional) },
        ({ limit, after }) =>
            Effect.gen(function* () {
                const loop = yield* loopOf((yield* AnalysisRoot).root);
                const action = yield* advance(loop, limit, Option.getOrUndefined(after));
                yield* Console.log(JSON.stringify(action, null, 2));
                if (action.next === "stop") {
                    yield* needsAction;
                }
            }),
    ).pipe(
        Command.withDescription(
            "Advances the stage as far as the scripts can (list or cut, prepare, the gate after each agent, a redo with the gate's gaps, the reviews, finish, the next round), then prints the next action as JSON: agents to run in parallel as one batch, each with its prompt word for word; wait, while a batch is open; done; or stop, with the step's own message. --limit <n> is the most agents one batch holds; --after <batch> closes the jobs of the batch the harness reported done (done <job>), and leaves the rest in it. One driver at a time.",
        ),
    ),
    ...agentReportCommands(loopOf),
    ...assumptionCommands(loopOf),
    showCommand(loopOf),
    Command.make("status", {}, () =>
        Effect.gen(function* () {
            const status = yield* stageStatus(yield* loopOf((yield* AnalysisRoot).root));
            yield* Console.log(status.lines.join("\n"));
            if (!status.complete) {
                yield* needsAction;
            }
        }),
    ).pipe(
        Command.withDescription(
            "Prints where every job stands (reviewed, fixed after review, refused, to review, to run), any open batch, and whether the stage's loop is complete; exits 0 only when it is. It changes nothing.",
        ),
    ),
];
