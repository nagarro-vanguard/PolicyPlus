import { Cause, Console, Effect, Exit } from "effect";
import type { DeliveryLaunch } from "./core/delivery-request";
import { recordDeliveryRequest } from "./core/launch";
import type { RunActions } from "./core/run-actions";
import { lineConsole } from "./core/line-console";
import { isScriptError } from "./core/script-errors";
import { servicesLayer, type Services } from "./core/services";
import { render } from "./stages/render-order";
import { advance, heldBatch } from "./stages/run-loop";

export type { RunActions } from "./core/run-actions";

/** Where a step's progress lines go: each line the step prints, such as a layer's check passing. */
export type Progress = (line: string) => void;

/**
 * Run one step in-process with the real System, its printed lines sent to `progress` (the console methods that print a
 * line are routed, the rest do nothing). A refusal in words rejects with an Error carrying its message; any other
 * failure is a defect in the scripts and rejects as it is.
 * @param step the step
 * @param progress where its progress lines go
 * @returns the step's result
 */
const run = async <A, E>(step: Effect.Effect<A, E, Services>, progress: Progress): Promise<A> => {
    const exit = await Effect.runPromiseExit(
        step.pipe(Effect.provide(servicesLayer), Effect.provideService(Console.Console, lineConsole(progress))),
    );
    if (Exit.isSuccess(exit)) {
        return exit.value;
    }
    const error = Cause.squash(exit.cause);
    throw isScriptError(error) ? new Error(error.message) : error;
};

/**
 * Launch a run: check the typed launch, record its request and mode in its run folder, and lift a stop the run held.
 * Writes the same files as recording a launch from the command line.
 * @param request the typed launch
 * @param progress where progress lines go
 * @returns the run folder
 */
export const launch = (request: DeliveryLaunch, progress: Progress) =>
    run(recordDeliveryRequest(render, request), progress);

/**
 * Advance a run in-process: close the batch the driver finished, walk the launched mode, and give the next action.
 * Writes the run's batch, stop and pages as the action needs.
 * @param runFolder the run folder
 * @param after the batch the driver has finished, if any
 * @param progress where the steps' progress lines go
 * @param runInfo the file of what the driver knows of the agent run it finished, if any
 * @returns the action for the driver
 */
export const nextAction = (
    runFolder: string,
    after: string | undefined,
    progress: Progress,
    runInfo?: string,
): Promise<RunActions> => run(advance(render, runFolder, after, runInfo), progress);

/**
 * The batch the run holds open, with its dispatch, read without printing any progress.
 * @param runFolder the run folder
 * @returns the open batch, or undefined when none is open
 */
export const openBatch = (runFolder: string) => run(heldBatch(runFolder), () => undefined);
