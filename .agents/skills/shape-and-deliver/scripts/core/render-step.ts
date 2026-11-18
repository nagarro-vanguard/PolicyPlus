import { Command } from "effect/cli";
import { runFolderArgument } from "./arguments";
import { Effect } from "effect";
import type { Render } from "./render-run";

/**
 * Wraps a state-changing step so the run is redrawn after it, and every page shows what the step changed. The render
 * runs only if the step succeeds; a failure of either one is passed on unchanged.
 * @param render the run's render step
 * @param runFolder the run folder to redraw
 * @returns a function that takes a step and gives back that step followed by the render
 */
export const renderAfter =
    (render: Render, runFolder: string) =>
    <A, E, R>(step: Effect.Effect<A, E, R>) =>
        Effect.tap(step, () => render(runFolder));

/**
 * The `render <runFolder>` subcommand: redraws every stage's model and page and the start page from what is on disk.
 * @param render the run's render step
 * @returns the subcommand
 * Writes: what the render step writes, in the run folder.
 */
export const renderCommand = (render: Render) =>
    Command.make(
        "render",
        { runFolder: runFolderArgument },
        Effect.fn("RenderStep.render")(function* ({ runFolder }) {
            yield* render(runFolder);
        }),
    ).pipe(
        Command.withDescription(
            "Draws what is now true of the run: each stage's model and page in its own folder, and the run page, index.html, at the run folder's root. Every step that changes a stage runs it; run it alone to redraw after a render that failed.",
        ),
    );
