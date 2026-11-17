import { Console, Effect } from "effect";
import { Argument, Command } from "effect/cli";
import { filesInScopeLines } from "../shared/read/files-in-scope";
import { rootServices, runScript } from "../shared/run/run-script";

/**
 * Print the files in scope whose path holds a text (`filesInScopeLines`).
 * @param text part of a path, such as a folder or a file name
 * @returns the effect that prints them
 */
const printFilesInScope = Effect.fn("printFilesInScope")(function* (text: string) {
    yield* Console.log((yield* filesInScopeLines(text)).join("\n"));
});

const command = Command.make("find-files-in-scope", { text: Argument.String("partOfAPath") }, ({ text }) =>
    printFilesInScope(text),
).pipe(
    Command.withDescription(
        "Prints the files in scope whose path holds the given text, each with its line count, in path order: the only files an agent may cite. Refused until Inventory has accepted its records, and, giving the count, when more than pathsPrintedMax files hold the text: ask with a longer part of a path.",
    ),
);

runScript(command, rootServices);
