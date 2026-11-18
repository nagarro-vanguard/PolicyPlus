import { Effect } from "effect";
import { FindingsNotReady } from "../../core/script-errors";
import type { Run } from "../../core/run-context";
import type { Standing } from "../../core/stage-run-frame";
import type { WorkItemFound } from "./render-model";

/**
 * Says the work item is done once it is read, stopped with the problem found when it could not be read, and not started
 * otherwise.
 * @param run the run
 * @returns the standing
 */
export function workItemStanding(run: Run): Standing {
    if (run.workItem !== undefined) {
        return { state: "done" };
    }
    if (run.problem !== undefined) {
        return { state: "stopped", reason: run.problem };
    }
    return { state: "notStarted" };
}

/**
 * Gives the work item with its tracker key and, when it came from a tracker, its link; fails if it is not read yet.
 * @param run the run, its work item read
 * @returns the findings
 */
export const workItemFound = Effect.fn("WorkItemRead.workItemFound")(function* (run: Run) {
    if (run.workItem === undefined) {
        return yield* new FindingsNotReady({ stage: "work item", until: "its work item is read" });
    }
    const url = run.plan.workItemUrl;
    const found: typeof WorkItemFound.Type = {
        workItem: run.workItem,
        key: run.plan.workItemId,
        ...(url === undefined ? {} : { url }),
    };
    return found;
});
