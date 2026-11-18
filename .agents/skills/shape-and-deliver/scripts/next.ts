import { Console, Effect, Option } from "effect";
import { Command, Flag } from "effect/cli";
import { runFolderArgument } from "./core/arguments";
import { lineConsole } from "./core/line-console";
import { needsAction, runScript } from "./core/run-script";
import { render } from "./stages/render-order";
import { advance } from "./stages/run-loop";

/** A console that writes every line a step prints to standard error, so progress never mixes with the action on standard output. */
const progressConsole = lineConsole((line) => process.stderr.write(`${line}\n`));

const command = Command.make(
    "next",
    {
        runFolder: runFolderArgument,
        after: Flag.optional(
            Flag.String("after").pipe(Flag.withDescription("The batch the driver finished, to close first.")),
        ),
        runInfo: Flag.optional(
            Flag.String("run-info").pipe(
                Flag.withDescription("A file with what the driver knows of the finished agent: model, cost, outcome."),
            ),
        ),
    },
    Effect.fn("Next.next")(function* ({ runFolder, after, runInfo }) {
        const action = yield* advance(
            render,
            runFolder,
            Option.getOrUndefined(after),
            Option.getOrUndefined(runInfo),
        ).pipe(Effect.provideService(Console.Console, progressConsole));
        yield* Effect.forEach(action.tell, (line) => Console.log(line)).pipe(
            Effect.provideService(Console.Console, progressConsole),
        );
        yield* Console.log(JSON.stringify(action, null, 2));
        if (action.next === "stop") {
            yield* needsAction;
        }
    }),
).pipe(
    Command.withDescription(
        "Advances the run as far as the scripts can and prints, as JSON, the one action its driver takes now: dispatch an agent, wait on an open batch, done when the launched mode has finished, or stop. With --after <batch> it first closes the batch the driver finished (a batch closed already is a no-op), recording the agent run; --run-info <file> adds what the driver knows of it: model, tokens, cost, transcript, outcome and reason. The operator's `tell` lines are also printed to standard error. Progress goes to standard error, and the exit code is 1 on a stop.",
    ),
);

runScript(command);
