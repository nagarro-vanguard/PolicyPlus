import { resolve } from "node:path";
import { Console, Effect } from "effect";
import { Command, Flag } from "effect/cli";
import { routesOf } from "./core/footprint";
import { runScript } from "./core/run-script";

const command = Command.make(
    "journey-routes",
    {
        codebase: Flag.String("codebase").pipe(
            Flag.withDescription("The codebase's root folder."),
            Flag.withDefault("."),
        ),
    },
    Effect.fn("JourneyRoutes.journeyRoutes")(function* ({ codebase }) {
        yield* Console.log(JSON.stringify(yield* routesOf(resolve(codebase)), null, 2));
    }),
).pipe(
    Command.withDescription(
        "Prints, as JSON, every journey the codebase's screens name with `@user-journey` and the screens that carry it, and the screens that carry none, so a journey with no tag is seen as a gap. Nothing is stored.",
    ),
);

runScript(command);
