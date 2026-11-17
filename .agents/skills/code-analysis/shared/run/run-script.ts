import { BunChildProcessSpawner, BunFileSystem, BunPath, BunRuntime, BunStdio } from "@effect/platform-bun";
import { Cause, Context, Effect, Exit, Layer, Logger, Ref, Terminal } from "effect";
import { CliConfig, CliError, Command, GlobalFlag } from "effect/cli";
import { isScriptError, type ScriptError } from "./script-errors";
import { RandomIds } from "./hashing-and-random";
import { AnalysisRoot } from "./analysis-root";
import { FileAccess } from "../source/file-access";
import { Progress } from "../jobs/progress";
import { JobStates } from "../jobs/job-state";
import { recordStoreLayer } from "../read/layers";
import { RecordStore } from "../store/database";

type Status = "done" | "needsAction";

export class ScriptStatus extends Context.Service<ScriptStatus, Ref.Ref<Status>>()("ScriptStatus") {}

export const needsAction: Effect.Effect<void, never, ScriptStatus> = Effect.gen(function* () {
    yield* Ref.set(yield* ScriptStatus, "needsAction");
});

export const scriptServices = Layer.mergeAll(FileAccess.layer, RandomIds.layer, Progress.layer);

export const rootServices = Layer.mergeAll(
    scriptServices,
    AnalysisRoot.layer,
    recordStoreLayer.pipe(Layer.provide(AnalysisRoot.layer)),
    JobStates.layer.pipe(Layer.provide(RecordStore.layer), Layer.provide(AnalysisRoot.layer)),
);

const exitCodes = { done: 0, needsAction: 1, usage: 2, defect: 70, interrupted: 130 } as const;

/**
 * The exit code for a failed run, after printing what the caller needs. The command line library has already
 * printed a usage problem with the command's help.
 * @param cause why the run failed
 * @param verbose whether to print the full cause of a reported failure
 * @returns the exit code
 */
function exitCodeOfFailure(cause: Cause.Cause<unknown>, verbose: boolean): number {
    if (Cause.hasInterruptsOnly(cause)) {
        return exitCodes.interrupted;
    }
    const error = Cause.squash(cause);
    if (CliError.isCliError(error)) {
        return error._tag === "ShowHelp" && error.errors.length === 0 ? exitCodes.done : exitCodes.usage;
    }
    if (isScriptError(error)) {
        console.error(verbose ? Cause.pretty(cause) : error.message);
        return error._tag === "UsageInvalid" ? exitCodes.usage : exitCodes.needsAction;
    }
    console.error(`A defect in the code-analysis scripts:\n${Cause.pretty(cause)}`);
    return exitCodes.defect;
}

/**
 * A terminal that writes to stdout and never reads input. Scripts ask nothing interactively, and Bun's own terminal
 * holds stdin in a way that cuts piped output at 64 KB, so an agent reading a long result through a pipe would get a
 * part of it with exit 0.
 * @returns the terminal
 */
const outputOnly = () =>
    Terminal.make({
        columns: Effect.sync(() => process.stdout.columns || 120),
        rows: Effect.sync(() => process.stdout.rows || 40),
        readInput: Effect.die("scripts read no interactive input"),
        readLine: Effect.die("scripts read no interactive input"),
        display: (text) => Effect.sync(() => void process.stdout.write(text)),
    });

const platform = BunChildProcessSpawner.layer.pipe(
    Layer.provideMerge(
        Layer.mergeAll(BunFileSystem.layer, BunPath.layer, BunStdio.layer, Layer.sync(Terminal.Terminal, outputOnly)),
    ),
);

/**
 * Run an entry script's command on the arguments it was given, with `services`, and set the exit code its caller
 * reads: 0 done, 1 the caller must act, 2 wrong usage, 70 a defect in the scripts, 130 interrupted. The caller must act
 * on a reported failure, and on an outcome the script printed and marked with `needsAction` (gaps, a redo, a missing
 * input); such outcomes are not errors. Ctrl+C interrupts it, so locks are released; otherwise the exit code is set,
 * never forced, so piped output is never cut. Logs never reach the console, whose output the orchestrator reads.
 * `--verbose` prints a failure's full cause.
 * @param command the script's command, with its arguments and handler
 * @param services the services its handler needs: `scriptServices` (the file system and random ids) or
 * `rootServices` (those, and the analysis root that CODE_ANALYSIS_ROOT names)
 */
export function runScript<Name extends string, Input, ContextInput, E, R>(
    command: Command.Command<Name, Input, ContextInput, E, R>,
    services: Layer.Layer<Exclude<R, ScriptStatus | Command.Environment>, ScriptError>,
): void {
    const verbose = process.argv.includes("--verbose");
    const args = process.argv.slice(2).filter((arg) => arg !== "--verbose");
    let finished: Status = "done";
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- `services` and the platform provide every R; TypeScript cannot prove an Exclude over a generic R is never
    const program = Effect.gen(function* () {
        const status = yield* Ref.make<Status>("done");
        yield* Command.runWith(command, { version: "1", renderErrors: true })(args).pipe(
            Effect.provideService(ScriptStatus, status),
        );
        finished = yield* Ref.get(status);
    }).pipe(
        Effect.provide(
            Layer.mergeAll(services, platform, CliConfig.layer({ builtIns: [GlobalFlag.Help] }), Logger.layer([])),
        ),
    ) as Effect.Effect<void, unknown>;
    BunRuntime.runMain(program, {
        disableErrorReporting: true,
        teardown: (exit, onExit) => {
            const code = Exit.isSuccess(exit) ? exitCodes[finished] : exitCodeOfFailure(exit.cause, verbose);
            process.exitCode = code;
            if (code === exitCodes.interrupted) {
                onExit(code);
            }
        },
    });
}
