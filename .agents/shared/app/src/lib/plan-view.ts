import { epicsInOrder, phasesWithStories, statusOf, storiesInOrder, storiesOfEpic } from "./plan";
import type { Ledger, Plan, PlanEpic, PlanStory, Status } from "./plan";

// What the plan pages show, worked out from the plan and the ledger and nothing else: every count, share and state is
// derived here, so a page never types a number. No page logic and no file access.

/** Where a group of stories stands: a pill's word and an accent. */
export type State = "planned" | "progress" | "done" | "blocked";

export const stateWords: Readonly<Record<State, string>> = {
    planned: "planned",
    progress: "in progress",
    done: "done",
    blocked: "blocked",
};

/**
 * The state of a story by its ledger status: planned stays planned, anything on its way to merged is in progress.
 * @param status the story's status
 * @returns the state
 */
export const stateOfStatus = (status: Status): State => {
    if (status === "planned") return "planned";
    if (status === "merged") return "done";
    if (status === "blocked" || status === "failed") return "blocked";
    return "progress";
};

/**
 * The state of a group (a phase, an epic): blocked when any story is blocked or failed, done when every story is merged,
 * in progress when any has moved past planned, otherwise planned.
 * @param statuses the statuses of its stories
 * @returns the state
 */
export const stateOfGroup = (statuses: readonly Status[]): State => {
    if (statuses.some((status) => status === "blocked" || status === "failed")) return "blocked";
    if (statuses.length > 0 && statuses.every((status) => status === "merged")) return "done";
    if (statuses.some((status) => status !== "planned")) return "progress";
    return "planned";
};

/**
 * Numbers as words with runs joined: 2, 3, 4, 6 reads "2–4, 6".
 * @param numbers the numbers
 * @returns the text
 */
export const runsOf = (numbers: readonly number[]) => {
    const sorted = [...new Set(numbers)].toSorted((one, other) => one - other);
    const parts: string[] = [];
    for (let i = 0; i < sorted.length; ) {
        let j = i;
        while (j + 1 < sorted.length && (sorted[j + 1] as number) === (sorted[j] as number) + 1) j += 1;
        const from = sorted[i] as number;
        const to = sorted[j] as number;
        parts.push(j - i >= 2 ? `${from}–${to}` : sorted.slice(i, j + 1).join(", "));
        i = j + 1;
    }
    return parts.join(", ");
};

/**
 * The earlier phases whose stories a phase's stories wait for, ascending.
 * @param plan the plan
 * @param number the phase's number
 * @returns the phase numbers
 */
export const phaseNeeds = (plan: Pick<Plan, "stories">, number: number) => {
    const phaseOfKey = new Map(plan.stories.map((story) => [story.key, story.phase] as const));
    const needs = new Set<number>();
    for (const story of plan.stories) {
        if (story.phase !== number) continue;
        for (const key of story.blockedBy) {
            const other = phaseOfKey.get(key);
            if (other !== undefined && other !== number) needs.add(other);
        }
    }
    return [...needs].toSorted((one, other) => one - other);
};

export type PhaseEpic = { readonly epic: PlanEpic; readonly stories: number };

export type PhaseCardModel = {
    readonly number: number;
    readonly name: string;
    /** The sentence on what the phase unlocks; empty when the previous phase says the same. */
    readonly unlocks: string;
    readonly stories: number;
    readonly epics: readonly PhaseEpic[];
    readonly state: State;
    readonly needs: readonly number[];
    /** The width of its segment in the order strip, 0 to 1. */
    readonly share: number;
};

/**
 * The phases as cards, in order: their epics (those with a story in the phase, in epic order, with how many of their
 * stories are in it), their state from the ledger, the phases they wait for and their share of all stories.
 * @param plan the plan
 * @param ledger the ledger, when there is one
 * @returns one model per phase
 */
export const phaseCards = (plan: Plan, ledger: Ledger | undefined): PhaseCardModel[] => {
    const epics = epicsInOrder(plan);
    const total = plan.stories.length;
    let previous = "";
    return phasesWithStories(plan).map((phase) => {
        const counts = Map.groupBy(phase.stories, (story) => story.epic);
        const unlocks = phase.why === previous ? "" : phase.why;
        previous = phase.why;
        return {
            number: phase.number,
            name: phase.name,
            unlocks,
            stories: phase.stories.length,
            epics: epics.flatMap((epic) => {
                const own = counts.get(epic.key);
                return own === undefined ? [] : [{ epic, stories: own.length }];
            }),
            state: stateOfGroup(phase.stories.map((story) => statusOf(ledger, story.key))),
            needs: phaseNeeds(plan, phase.number),
            share: total === 0 ? 0 : phase.stories.length / total,
        };
    });
};

/**
 * The epics an epic is created after, without the ones another of them already implies: when epic C comes after B and B
 * after A, an epic that comes after A, B and C names only C.
 * @param plan the plan
 * @param epic the epic
 * @returns the epics to name, in creation order
 */
export const epicNeeds = (plan: Pick<Plan, "epics">, epic: Pick<PlanEpic, "comesAfter">) => {
    const byKey = new Map(plan.epics.map((each) => [each.key, each] as const));
    const implied = (key: string, seen = new Set<string>()): Set<string> => {
        for (const next of byKey.get(key)?.comesAfter ?? []) {
            if (!seen.has(next)) {
                seen.add(next);
                implied(next, seen);
            }
        }
        return seen;
    };
    const covered = new Set(epic.comesAfter.flatMap((key) => [...implied(key)]));
    return epicsInOrder(plan).filter((each) => epic.comesAfter.includes(each.key) && !covered.has(each.key));
};

/**
 * The phases an epic's stories are in, ascending.
 * @param plan the plan
 * @param epic the epic
 * @returns the phase numbers
 */
export const epicPhases = (plan: Pick<Plan, "stories">, epic: Pick<PlanEpic, "key">) =>
    [...new Set(storiesOfEpic(plan, epic).map((story) => story.phase))].toSorted((one, other) => one - other);

/**
 * What an epic implements, in the analysis's words: the distinct capabilities or tasks its stories name.
 * @param plan the plan
 * @param epic the epic
 * @returns the names
 */
export const epicImplements = (plan: Pick<Plan, "stories">, epic: Pick<PlanEpic, "key">) => [
    ...new Set(storiesOfEpic(plan, epic).flatMap((story) => (story.capability === undefined || story.capability === "" ? [] : [story.capability]))),
];

/**
 * The state of an epic from its stories.
 * @param plan the plan
 * @param ledger the ledger, when there is one
 * @param epic the epic
 * @returns the state
 */
export const epicState = (plan: Pick<Plan, "stories">, ledger: Ledger | undefined, epic: Pick<PlanEpic, "key">) =>
    stateOfGroup(storiesOfEpic(plan, epic).map((story) => statusOf(ledger, story.key)));

/**
 * The words of a story's kind: its tags without the generic "story", each once.
 * @param story the story
 * @returns the kinds, such as functional, modernize
 */
export const kindsOf = (story: Pick<PlanStory, "tags" | "kind">) => [...new Set([story.kind, ...story.tags.filter((tag) => tag !== "story")])];

/**
 * What a story waits for, as one list: the stories it is blocked by and the stories whose rules it relies on, each once,
 * with the number of rules it relies on (0 when it only waits).
 * @param plan the plan
 * @param story the story
 * @returns the stories in sequence
 */
export const waitsFor = (plan: Pick<Plan, "stories">, story: Pick<PlanStory, "blockedBy" | "reliesOn">) => {
    const rules = Map.groupBy(story.reliesOn, (each) => each.builtBy);
    return storiesInOrder(plan).flatMap((each) =>
        story.blockedBy.includes(each.key) || rules.has(each.key) ? [{ story: each, rules: rules.get(each.key)?.length ?? 0 }] : [],
    );
};

/**
 * The statuses present among stories, in the order of a delivery's life, with their counts; planned is left out because
 * it is what is left.
 * @param byStatus the count per status
 * @returns the non-empty statuses past planned
 */
export const movedStatuses = (byStatus: Readonly<Record<Status, number>>) =>
    (["merged", "built", "approved", "branched", "created", "blocked", "failed"] as const).flatMap((status) =>
        byStatus[status] > 0 ? [{ status, count: byStatus[status] }] : [],
    );
