import { resolve } from "node:path";
import { Console, Effect } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { recordDeliveryRequest } from "./core/launch";
import { runScript } from "./core/run-script";
import { launchStory } from "./core/story";
import { render } from "./stages/render-order";
import { System } from "./core/system";

const command = Command.make(
    "start",
    {
        story: Argument.String("story-url").pipe(Argument.withDescription("The story's address on its tracker.")),
        instructions: Flag.optional(
            Flag.String("instructions").pipe(Flag.withDescription("The approver's words, as text or a file path.")),
        ),
        storyFile: Flag.optional(
            Flag.String("story").pipe(
                Flag.withDescription("A file with `# <title>` and the story's body, read from the tracker."),
            ),
        ),
        epicFile: Flag.optional(
            Flag.String("epic").pipe(Flag.withDescription("The same file for the story's parent epic.")),
        ),
        referenceFile: Flag.optional(
            Flag.String("reference").pipe(
                Flag.withDescription("The story's legacy attachment, a file; required for a modernize story."),
            ),
        ),
        approve: Flag.Boolean("approve").pipe(
            Flag.withDescription("Agree to a plan that passed review and build it."),
            Flag.withDefault(false),
        ),
        codebase: Flag.String("codebase").pipe(
            Flag.withDescription("The codebase's root folder."),
            Flag.withDefault("."),
        ),
    },
    Effect.fn("Start.start")(function* (input) {
        const system = yield* System;
        const given = input.instructions._tag === "Some" ? input.instructions.value : undefined;
        const instructions =
            given !== undefined && (yield* system.exists(given)) ? yield* system.readText(given) : given;
        const launched = yield* launchStory({
            url: input.story,
            storyFile: input.storyFile._tag === "Some" ? input.storyFile.value : undefined,
            epicFile: input.epicFile._tag === "Some" ? input.epicFile.value : undefined,
            referenceFile: input.referenceFile._tag === "Some" ? input.referenceFile.value : undefined,
            instructions,
            approve: input.approve,
            codebase: resolve(input.codebase),
        });
        yield* Console.log(`branch ${launched.branch}, profile ${launched.kind}`);
        yield* Console.log(yield* recordDeliveryRequest(render, launched.launch, process.cwd()));
    }),
).pipe(
    Command.withDescription(
        "Launches the run for a story from the files the driver wrote from the tracker: --story is the story's `tags:` front matter, `# <title>` and its body, and --epic the story's epic the same way; the tags alone pick the workflow, and --reference is the legacy attachment of a `modernize` story, required for it and refused for any other. Checks the codebase's contract, writes the run's request and prints the run folder; running it again with the same address resumes the run. --approve agrees to a plan that has passed review and builds it, and --instructions is the approver's words, as text or a file path.",
    ),
);

runScript(command);
