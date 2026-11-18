import { Console, Effect } from "effect";
import { Command } from "effect/cli";
import { runFolderArgument } from "./core/arguments";
import { recordWorkItem } from "./core/work-item";
import { render } from "./stages/render-order";
import { runScript } from "./core/run-script";

/**
 * Check the run's work item, write it as work-item.json, print its title, kind and numbered criteria, and draw the
 * run's pages.
 * @param runFolder the run folder
 * @returns nothing; the Effect prints the title line, then one line per criterion
 * Writes: work-item.json, and the run's pages.
 */
const printWorkItem = Effect.fn("ReadWorkItem.printWorkItem")(function* (runFolder: string) {
    const workItem = yield* recordWorkItem(runFolder);
    yield* Console.log(`${workItem.title} (${workItem.kind})`);
    for (const criterion of workItem.criteria) {
        yield* Console.log(`${criterion.ac}: ${criterion.text}`);
    }
    yield* render(runFolder);
});

const command = Command.make("read-work-item", { runFolder: runFolderArgument }, ({ runFolder }) =>
    printWorkItem(runFolder),
).pipe(
    Command.withDescription(
        "Checks that the work item in the run folder holds what its kind needs (a feature or a technical story: Acceptance criteria; a bug: Steps to reproduce, Expected, Actual), numbers its criteria AC-1, AC-2 and so on, and writes them as work-item.json. Prints the title, kind and each criterion, and draws the run's pages. Exit 1 names what is missing.",
    ),
);

runScript(command);
