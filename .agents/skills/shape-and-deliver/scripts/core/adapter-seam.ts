import type { Dispatch } from "./run-actions";
import { producerNames } from "./run-layout";

/** What a driver that runs shape-and-deliver in code, such as an app's adapter, reads from it: the launch and what is dispatched. */
export type { DeliveryLaunch } from "./delivery-request";

/** What a driver in code writes of an agent run it finished, for `next --after <batch> --run-info <file>`. */
export type { RunInfo } from "./agent-run";

/** Where a run's internal files live, so a driver keeps its run info with the run. */
export { internalPath } from "./run-folder";

/** One agent's dispatch, as `next` hands it out. */
export type Dispatched = Dispatch;

/**
 * Every job `next` can hand out: the work item's fetch, each producing stage, the plan review, the repair and the change review.
 * @public
 */
export const dispatchedJobs = ["work-item", ...producerNames, "plan-review", "code", "change-review"] as const;

export type DispatchedJob = (typeof dispatchedJobs)[number];

/**
 * How a job's agent session lives across its rounds: a job that `continues` keeps one session for the run, so a redo
 * carries on from what the agent wrote; a `fresh` job starts a session for each batch, as a review and the extraction
 * must. Every job is classified, so a new job cannot be left out.
 * @public
 */
export const sessionOfJob = {
    "work-item": "fresh",
    orient: "fresh",
    trace: "continues",
    changes: "continues",
    tests: "continues",
    "plan-review": "fresh",
    code: "continues",
    "change-review": "fresh",
} as const satisfies Record<DispatchedJob, "continues" | "fresh">;

/**
 * Tells whether a job's redo continues the agent that wrote the output.
 * @param job the job, as a dispatch names it
 * @returns true for a job that keeps one session across the run
 */
export const continuesSession = (job: string) => {
    const known = dispatchedJobs.find((each) => each === job);
    return known !== undefined && sessionOfJob[known] === "continues";
};
