import { resolve } from "node:path";
import { Console, Effect } from "effect";
import { Argument, Command } from "effect/cli";
import { contractReport, readCodebase } from "./core/codebase";
import { needsAction, runScript } from "./core/run-script";

const command = Command.make(
    "check-codebase",
    {
        codebase: Argument.String("codebase").pipe(
            Argument.withDescription("The codebase's root folder."),
            Argument.withDefault("."),
        ),
    },
    Effect.fn("CheckCodebase.checkCodebase")(function* ({ codebase }) {
        const report = contractReport(yield* readCodebase(resolve(codebase)));
        for (const line of report.lines) {
            yield* Console.log(line);
        }
        if (report.blocked > 0) {
            return yield* needsAction;
        }
    }),
).pipe(
    Command.withDescription(
        "Checks a codebase's AGENTS.md files against what shape-and-deliver reads, and prints `ok` or what blocks it; design is reported as available or not and never blocks. Exits 1 when the run is blocked.",
    ),
);

runScript(command);
