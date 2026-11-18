import { resolve } from "node:path";
import { Console, Effect } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { footprintOf } from "./core/footprint";
import { runScript } from "./core/run-script";

const command = Command.make(
    "journey-footprint",
    {
        journey: Argument.String("journey").pipe(
            Argument.withDescription("The journey's name, in the product owner's words, as its screens tag it."),
        ),
        codebase: Flag.String("codebase").pipe(
            Flag.withDescription("The codebase's root folder."),
            Flag.withDefault("."),
        ),
    },
    Effect.fn("JourneyFootprint.journeyFootprint")(function* ({ journey, codebase }) {
        yield* Console.log(JSON.stringify(yield* footprintOf(resolve(codebase), journey), null, 2));
    }),
).pipe(
    Command.withDescription(
        "Prints, as JSON, what one journey is, from the description under its `@user-journey` tag (who, steps, outcome, failures), and what its code reaches: the screens that carry its `@user-journey`, every file they import through the codebase's own layers, the other layers' files of the same capabilities, the business terms defined there with their sentences, the tests beside them and the journey's own suite, and where a trace stopped because an import could not be followed. Nothing is stored: it is derived from the code each time.",
    ),
);

runScript(command);
