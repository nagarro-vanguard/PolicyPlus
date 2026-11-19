import { touchedFacts } from "./target-views";
import { journeySlugs } from "./journey-join";
import { chosenOf } from "./target-text";
import { gates } from "./confirmation";
import type { Gate } from "./confirmation";
import type { TargetData, Task } from "./target-types";
import { plural } from "./text";

// What the target's pages say, worked out from the records and nothing else: which pages exist, which task has data, how tasks
// are grouped and what each decision decided. No page logic, so each can be tested alone.

/**
 * The pages of a build with a target, as paths below the site's root without the extension: the decisions and their review pages,
 * the journeys, and the architecture. One list for the routes and for the tests; the redirects are listed apart.
 * @param data the target's records
 * @returns the paths
 */
export const targetRoutes = (data: TargetData): readonly string[] => {
    const slugs = journeySlugs(data.tasks.map((task) => task.id));
    return ["decisions", "journeys", ...gates.map((gate) => `gate/${gate}`), "architecture", ...data.tasks.map((task) => `journey/${slugs.get(task.id) ?? ""}`)];
};

/** What a task does with stored data: it touches some, none, or cannot be told yet. */
export type TaskData =
    | { readonly kind: "facts"; readonly facts: readonly { readonly name: string; readonly owner: string; readonly keys: readonly string[] }[]; readonly related: readonly { readonly name: string; readonly owner: string }[] }
    | { readonly kind: "none"; readonly reason: string }
    | { readonly kind: "pending"; readonly reason: string };

/**
 * The data the chosen way of doing a task touches.
 * @param data the target's records
 * @param task the task
 * @returns the kinds of data and their owners, or why there are none
 */
export const dataOf = (data: TargetData, task: Task): TaskData => {
    const journey = chosenOf(data.journeys, task);
    if (data.architecture === undefined) return { kind: "pending", reason: "The architecture is not confirmed yet, so the owner of each kind of data is not known." };
    if (journey === undefined) return { kind: "pending", reason: "No way of doing this task is chosen yet, so what it touches is not known." };
    const { mine, related } = touchedFacts(data.architecture, journey);
    if (mine.length === 0) return { kind: "none", reason: `The chosen way (${journey.name}) reads and writes no kind of data that the system keeps.` };
    return { kind: "facts", facts: mine.map((each) => ({ name: each.fact.name, owner: each.domain, keys: each.fact.keys })), related: related.map((each) => ({ name: each.fact.name, owner: each.domain })) };
};

/** Whether the data page of a task adds anything: only a task that touches stored data is linked from a list. */
export const hasData = (data: TargetData, task: Task) => dataOf(data, task).kind === "facts";

/** The group a task belongs to, from its id (`tasks-using-the-product.open-it` is "Using the product"). */
export const groupOf = (task: Task) => {
    const head = task.id.split(".")[0] ?? "";
    const words = head.replace(/^tasks-/, "").replaceAll("-", " ").trim();
    return words === "" ? "Tasks" : words[0]?.toUpperCase() + words.slice(1);
};

/** The tasks in groups, in the order the records hold them. */
export const groupTasks = (tasks: readonly Task[]) => {
    const groups = new Map<string, Task[]>();
    for (const task of tasks) groups.set(groupOf(task), [...(groups.get(groupOf(task)) ?? []), task]);
    return [...groups.entries()].map(([name, own]) => ({ name, tasks: own }));
};

/** The first decision before this one that is not confirmed, which is what blocks it. */
export const blockedBy = (gate: Gate, data: TargetData): Gate | undefined => gates.slice(0, gates.indexOf(gate)).find((earlier) => data.gates[earlier].state !== "confirmed");

const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

/**
 * One sentence on what a decision decided, or on what it is about while it waits.
 * @param gate the decision
 * @param data the target's records
 * @returns the sentence
 */
export const decidedLine = (gate: Gate, data: TargetData): string => {
    const confirmed = data.gates[gate].state === "confirmed";
    if (gate === "as-is") {
        const steps = data.tasks.reduce((sum, task) => sum + task.current.length, 0);
        return sentence(`${plural(data.tasks.length, "journey")} and ${plural(steps, "step")} that people go through today`);
    }
    if (gate === "journeys") {
        const recommended = data.variants.filter((variant) => variant.recommended !== undefined).length;
        return confirmed ? sentence(`A way chosen for each of ${plural(data.tasks.length, "journey")}, ${plural(data.journeys.reduce((sum, journey) => sum + journey.steps.length, 0), "step")} in all`) : sentence(`${plural(data.variants.length, "way")} to do ${plural(data.tasks.length, "journey")}, ${recommended} recommended`);
    }
    if (gate === "architecture") {
        const pick = data.architectureVariants.find((variant) => variant.recommended !== undefined);
        const chosen = confirmed ? data.choiceArchitecture?.picks[0]?.variant : undefined;
        return chosen !== undefined ? sentence(`Chosen: ${chosen}`) : sentence(`${plural(data.architectureVariants.length, "architecture")} compared${pick === undefined ? "" : `, one recommended: ${pick.name}`}`);
    }
    const architecture = data.architecture;
    if (architecture === undefined) return "The components are not made yet.";
    const components = architecture.components ?? [];
    const steps = data.journeys.flatMap((journey) => journey.steps.map((step) => step.id));
    const served = steps.filter((id) => components.some((component) => component.serves.includes(id))).length;
    return sentence(`${plural(components.length, "component")} in ${plural(architecture.domains.length, "domain")}${steps.length === 0 ? "" : `, serving ${served} of ${plural(steps.length, "step")}`}`);
};

/** The stories that deliver steps, each once, in the order of the plan. */
export const storiesOf = <S extends { readonly sequence: number; readonly steps?: readonly string[] | undefined }>(stories: readonly S[], stepIds: readonly string[]) => {
    const wanted = new Set(stepIds);
    return stories.filter((story) => (story.steps ?? []).some((id) => wanted.has(id))).sort((a, b) => a.sequence - b.sequence);
};

/** Which story delivers each step, by the step's id. */
export const storyByStep = <S extends { readonly steps?: readonly string[] | undefined }>(stories: readonly S[]) => {
    const found = new Map<string, S>();
    for (const story of stories) for (const id of story.steps ?? []) if (!found.has(id)) found.set(id, story);
    return found;
};

/** The components that carry a step out. */
export const carriersOf = (components: readonly { readonly name: string; readonly serves: readonly string[] }[], stepId: string) => components.filter((component) => component.serves.includes(stepId)).map((component) => component.name);
