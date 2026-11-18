import { basename, join } from "node:path";
import type { Dispatch } from "./run-actions";

export type AgentCall = {
    readonly agent: string;
    readonly arguments: { readonly [name: string]: string | undefined };
};

/** A brief every agent of a skill reads before its own, by its path in the agents folder. */
export type SharedBrief = string;

export type { Dispatch };

/**
 * One agent's dispatch, with the prompt every driver sends: the agent reads the shared brief, when there is one, then its own and is given its named
 * arguments, in the order they were passed.
 * @param agentsFolder the folder of the skill's briefs, one `<agent>.md` each
 * @param job the job, as its stage names it
 * @param call the agent, by its brief's name, and its named arguments; an optional one left out is not given
 * @param shared the path, in that folder, of the brief every agent reads before its own; left out when there is none
 * @returns the dispatch
 */
export function dispatchOf(agentsFolder: string, job: string, call: AgentCall, shared?: SharedBrief): Dispatch {
    const brief = join(agentsFolder, `${call.agent}.md`);
    const given = Object.fromEntries(
        Object.entries(call.arguments).flatMap(([name, value]) => (value === undefined ? [] : [[name, value]])),
    );
    const named = Object.entries(given)
        .map(([name, value]) => `${name}=${value}`)
        .join(", ");
    const reading =
        shared === undefined
            ? `Read your brief at \`${brief}\``
            : `Read the shared brief at \`${join(agentsFolder, shared)}\`, then your brief at \`${brief}\``;
    return {
        job,
        agent: call.agent,
        brief,
        arguments: given,
        prompt: `You are the \`${basename(call.agent)}\` agent. ${reading}. Named arguments: ${named}`,
    };
}
