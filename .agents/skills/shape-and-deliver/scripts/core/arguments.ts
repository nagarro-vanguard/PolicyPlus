import { Argument } from "effect/cli";

/** The run folder every stage script takes: the folder `start.ts` printed, where the run's request and records live. */
export const runFolderArgument = Argument.String("runFolder").pipe(
    Argument.withDescription("The run folder that start.ts printed."),
);
