import { BunChildProcessSpawner, BunFileSystem, BunPath, BunRuntime, BunStdio } from "@effect/platform-bun";
import { Cause, Console, Context, Effect, Exit, Layer, Logger, Ref, Terminal } from "effect";
import { CliConfig, CliError, Command, GlobalFlag } from "effect/cli";

/** How a script's program ended without failing: with nothing to do, or with something the caller must act on. */
type Status = "done" | "needsAction";

/** The status a script's program leaves for the runner, which turns it into the exit code. */
export class ScriptStatus extends Context.Service<ScriptStatus, Ref.Ref<Status>>()("ScriptStatus") {}

/**
 * Mark the run as one the caller must act on: for an outcome the script printed in full that is not an error, such as
 * a failing check, a blocked codebase or a stop.
 * @returns nothing; the exit code becomes 1
 */
export const needsAction: Effect.Effect<void, never, ScriptStatus> = Effect.gen(function* () {
    yield* Ref.set(yield* ScriptStatus, "needsAction");
});

/**
 * Print a step's outcome as one JSON line; the exit code is 1 unless the outcome is `accepted` or `passed`.
 * @param outcome what the step decided
 * @returns nothing once printed
 */
export const printOutcome = Effect.fnUntraced(function* (outcome: { readonly outcome: string }) {
    yield* Console.log(JSON.stringify(outcome));
    if (outcome.outcome !== "accepted" && outcome.outcome !== "passed") {
        yield* needsAction;
    }
});

const exitCodes = { done: 0, needsAction: 1, usage: 2, defect: 70, interrupted: 130 } as const;

/**
 * The exit code for a run that ended without failing, from the status its program returned.
 * @param status what the program returned: the status the scripts left, `done` or `needsAction`
 * @returns the exit code
 */
const exitCodeOfStatus = (status: unknown): number =>
    status === "needsAction" ? exitCodes.needsAction : exitCodes.done;

/**
 * The exit code for a failed run: interrupted is 130; a help request with no usage error is 0 and a usage error is 2;
 * a reported error is 1 with its message on standard error; any other failure is a defect, 70, with its cause on
 * standard error.
 * @param cause why the run failed
 * @param options which failures are reported, and whose scripts they are
 * @returns the exit code
 */
function exitCodeOfFailure(
    cause: Cause.Cause<unknown>,
    options: Pick<ScriptOptions<unknown>, "name" | "isReported">,
): number {
    if (Cause.hasInterruptsOnly(cause)) {
        return exitCodes.interrupted;
    }
    const error = Cause.squash(cause);
    if (CliError.isCliError(error)) {
        return error._tag === "ShowHelp" && error.errors.length === 0 ? exitCodes.done : exitCodes.usage;
    }
    if (options.isReported(error)) {
        console.error(error.message);
        return exitCodes.needsAction;
    }
    console.error(`A defect in the ${options.name} scripts:\n${Cause.pretty(cause)}`);
    return exitCodes.defect;
}

/**
 * A terminal that writes to stdout and never reads input, so piped output is never cut short.
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

/** The platform every script runs on: files, paths, child processes, stdio and an output-only terminal. */
type Platform = Layer.Success<typeof platform>;

/** What a skill tells the runner: its name for the messages, the services its scripts need, and which failures are reported by their message. */
export interface ScriptOptions<R> {
    readonly name: string;
    readonly layer: Layer.Layer<R>;
    readonly isReported: (error: unknown) => error is { readonly message: string };
}

/**
 * Run an entry script's command on its arguments and set the exit code its caller reads: 0 done (and a help request
 * with no errors), 1 the caller must act (a reported failure, or an outcome marked with `needsAction`), 2 wrong
 * usage, 70 a defect in the scripts, 130 interrupted.
 * @param command the script's command, with its arguments and handler
 * @param options whose scripts these are, the services they need, and which failures are reported
 */
export function runScript<Name extends string, Input, ContextInput, E, R>(
    command: Command.Command<Name, Input, ContextInput, E, R | ScriptStatus | Platform>,
    options: ScriptOptions<R>,
): void {
    const program = Effect.gen(function* () {
        const status = yield* Ref.make<Status>("done");
        yield* Command.runWith(command, { version: "1", renderErrors: true })(process.argv.slice(2)).pipe(
            Effect.provideService(ScriptStatus, status),
        );
        return yield* Ref.get(status);
    }).pipe(
        Effect.provide(
            Layer.mergeAll(options.layer, platform, CliConfig.layer({ builtIns: [GlobalFlag.Help] }), Logger.layer([])),
        ),
    );
    BunRuntime.runMain(program, {
        disableErrorReporting: true,
        teardown: (exit, onExit) => {
            const code = Exit.isSuccess(exit) ? exitCodeOfStatus(exit.value) : exitCodeOfFailure(exit.cause, options);
            process.exitCode = code;
            if (code === exitCodes.interrupted) {
                onExit(code);
            }
        },
    });
}
