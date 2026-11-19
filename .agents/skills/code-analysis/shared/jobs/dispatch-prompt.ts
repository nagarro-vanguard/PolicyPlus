import { basename, dirname, join } from "node:path";
import { skillRoot } from "../run/analysis-layout";
import type { Dispatch } from "../model/schemas/stage-actions";

export type AgentCall = { readonly agent: string; readonly arguments: { readonly [name: string]: string | undefined } };

/**
 * An agent's working folder beside its output: its own, so agents running side by side never share one, and a writer
 * and its reviewer never read each other's notes; none for an agent with no output.
 * @param call the agent and its named arguments
 * @returns the folder, or undefined when the agent has no output
 */
export const scratchFolderOf = (call: AgentCall) => {
    const output = call.arguments.outputPath;
    return output === undefined ? undefined : join(dirname(output), `scratch-${basename(call.agent)}`);
};

const agentBriefs: Readonly<Record<string, string>> = {
    "capability-rules/write-business-rules": "stages/capability-rules/agents",
    "capability-rules/write-entity-lifecycle": "stages/capability-rules/agents",
    "how-it-runs/study-how-it-runs": "stages/how-it-runs/agents",
    "inventory/profile-tech-stack": "stages/inventory/agents",
    "map/map-blocks-and-links": "stages/map/agents",
    "publish/brief-the-system": "stages/publish/agents",
    "publish/describe-journeys": "stages/publish/agents",
    "registry/assign-units": "stages/capabilities-and-entities/agents",
    "registry/propose-entries": "shared/agents",
    "review/review-agent-findings": "shared/agents",
    "topics/write-topic-answers": "shared/agents",
};

/**
 * One agent's dispatch, its prompt built in one place so every driver sends the same words: the agent reads its brief,
 * which gives its goal, what good looks like and its interface, and is given its named arguments, in the order its
 * stage prints them (D56); and a working folder of its own beside its output, so agents running side by side never
 * share one, and a writer and its reviewer never read each other's notes.
 * @param job the job, as its stage names it
 * @param call the agent, as `<stage folder>/<name>`, and its named arguments; an optional one left out is not given
 * @returns the dispatch
 */
export function dispatchOf(job: string, call: AgentCall): Dispatch {
    const briefFolder = agentBriefs[call.agent];
    if (briefFolder === undefined) {
        throw new Error(`${call.agent} is no agent of this skill`);
    }
    const brief = join(skillRoot, briefFolder, `${basename(call.agent)}.md`);
    const given = Object.fromEntries(
        Object.entries(call.arguments).flatMap(([name, value]) => (value === undefined ? [] : [[name, value]])),
    );
    const named = Object.entries(given)
        .map(([name, value]) => `${name}=${value}`)
        .join(", ");
    const folder = scratchFolderOf(call);
    const scratch = folder === undefined ? "" : ` Keep any working files in \`${folder}\`.`;
    return {
        job,
        agent: call.agent,
        brief,
        arguments: given,
        prompt: `You are the \`${basename(call.agent)}\` agent. Read your brief at \`${brief}\` first: it gives your goal, what good looks like and your interface; the method is yours. Named arguments: ${named}.${scratch}`,
    };
}
