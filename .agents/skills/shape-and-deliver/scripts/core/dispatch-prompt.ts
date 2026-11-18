import { join } from "node:path";
import { dispatchOf as dispatchFrom, type AgentCall, type Dispatch } from "./dispatch";
import type { DispatchedJob } from "./adapter-seam";
import { skillFolder } from "./run-layout";

export type { Dispatch };

/** The folder of the agents' briefs, beside the scripts. */
const agentsFolder = join(skillFolder, "agents");

/**
 * The brief every agent reads before its own, in the agents folder.
 * @public
 */
export const sharedBrief = "shared.md";

/** The agent that repairs the checks that failed, by its brief's name. */
export const fixAgent = "fix-failing-checks";

/** The agent that reviews the plan or the change, by its brief's name. */
export const reviewAgent = "review-delivery";

/**
 * One agent's dispatch, its brief taken from this skill's agents folder.
 * @param job the stage the agent works for
 * @param call the agent, by its brief's name, and its named arguments; an optional one left out is not given
 * @returns the dispatch: the agent, its brief, its arguments and the prompt to send it
 */
export const dispatchOf = (job: DispatchedJob, call: AgentCall): Dispatch =>
    dispatchFrom(agentsFolder, job, call, sharedBrief);
