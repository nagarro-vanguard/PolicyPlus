import { Console, Effect } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { pickVariant } from "./core/pick";
import { runScript } from "./core/run-script";

const command = Command.make(
    "pick-variant",
    {
        story: Argument.String("story-number").pipe(Argument.withDescription("The story's number.")),
        variant: Argument.String("variant").pipe(Argument.withDescription("The variant to keep.")),
        to: Flag.String("to").pipe(Flag.withDescription("Where the picked variant's route folder goes.")),
        codebase: Flag.String("codebase").pipe(
            Flag.withDescription("The codebase's root folder."),
            Flag.withDefault("."),
        ),
    },
    Effect.fn("PickVariant.pickVariant")(function* ({ story, variant, to, codebase }) {
        const commit = yield* pickVariant({ codebase, story, variant, to });
        yield* Console.log(
            `Picked ${variant}: its route is at ${to} and every other variant is gone, in ${commit}. Apply the designer's feedback by hand and commit it, remove the story's prototypes-ready tag as the root AGENTS.md says, then start the story again to build it; after that, feedback goes through --instructions.`,
        );
    }),
).pipe(
    Command.withDescription(
        "Picks a variant of a story's design: moves its route folder to --to, deletes every other variant and the comparison page, runs the commands the screens layer lists under `## Design variants` for after a pick through a shell, and commits once. Refuses with uncommitted files and with a place outside what the layer lists. When a step fails it commits nothing and restores the tree, so the pick can be run again.",
    ),
);

runScript(command);
