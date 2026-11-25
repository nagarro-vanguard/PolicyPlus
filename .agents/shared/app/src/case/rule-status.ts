import { copy } from "../lib/copy";
import type { Case } from "./read";

// Where each business rule of the analysis stands in the plan, derived once from files the case already holds: the
// plan's stories (`builds`, `reliesOn`), the chosen journeys' drops (`journeys/dropped.json`) and steps (`kept`), and the
// facts' rules (`capabilities`). Nothing is stored and nothing is added to the case: the same inputs give the same words.
//
//   built    a story builds it; the status links to that story on the plan page
//   dropped  no story builds it and a chosen journey leaves it out on purpose; the status gives the journey's reason
//   none     no story builds it and no drop names it; the status says why it was not placed, from the facts
//
// A rule a story only relies on is named on the rule, whatever its state, as a second mention.

export type StoryLink = { n: number; title: string; href: string };

export type RuleStatus = {
    state: "built" | "dropped" | "none";
    /** The state in a word. */
    label: string;
    /** The reason, said in words (a dropped rule names the journey that leaves it out); empty for a built rule. */
    reason: string;
    /** The story that builds the rule, for a built rule. */
    builtBy: StoryLink | null;
    /** The stories that rely on the rule without building it. */
    reliedOnBy: StoryLink[];
};

type Story = { key: string; title: string; sequence: number; builds: string[]; reliesOn: string[] };
type Dropped = { journey: string; rules: string[]; reason: string };
type Journey = { id: string; name: string; steps: { kept: string[] }[] };
type Rule = { id: string; capabilities: string[] };

/** The address of a story on the plan page, below the site's root. */
export const storyHref = (sequence: number) => `plan.html#story=${sequence}`;

export type RuleStatuses = {
    /** The status of a rule; nothing when the case holds no plan. */
    of: (id: string) => RuleStatus | undefined;
    /** The rules no story builds, in the facts' order. */
    inNoStory: string[];
};

/**
 * The status of every rule.
 * @param kase the case
 * @returns the lookup, and the rules no story builds
 */
export const ruleStatusesOf = (kase: Case): RuleStatuses => {
    const read = <T>(path: string): T[] => (kase.has(path) ? (kase.json(path) as T[]) : []);
    const stories = read<Story>("plan/stories.json");
    if (stories.length === 0) return { of: () => undefined, inNoStory: [] };
    const rules = read<Rule>("facts/rules.json");
    const dropped = read<Dropped>("journeys/dropped.json");
    const journeys = read<Journey>("journeys/proposed.json");
    const link = (story: Story): StoryLink => ({ n: story.sequence, title: story.title, href: storyHref(story.sequence) });
    const builtBy = new Map<string, StoryLink>();
    const reliedOnBy = new Map<string, StoryLink[]>();
    for (const story of [...stories].sort((a, b) => a.sequence - b.sequence)) {
        for (const id of story.builds) if (!builtBy.has(id)) builtBy.set(id, link(story));
        for (const id of story.reliesOn) reliedOnBy.set(id, [...(reliedOnBy.get(id) ?? []), link(story)]);
    }
    const journeyName = new Map(journeys.map((journey) => [journey.id, journey.name]));
    const dropOf = new Map<string, { reason: string; journey: string | null }>();
    for (const drop of dropped)
        for (const id of drop.rules)
            if (!dropOf.has(id)) dropOf.set(id, { reason: drop.reason, journey: journeyName.get(drop.journey) ?? null });
    const kept = new Set(journeys.flatMap((journey) => journey.steps.flatMap((step) => step.kept)));
    const capabilitiesOf = new Map(rules.map((rule) => [rule.id, rule.capabilities.length]));
    const words = copy.rules;
    const of = (id: string): RuleStatus | undefined => {
        if (!capabilitiesOf.has(id)) return undefined;
        const relied = reliedOnBy.get(id) ?? [];
        const built = builtBy.get(id);
        if (built !== undefined) return { state: "built", label: words.built, reason: "", builtBy: built, reliedOnBy: relied };
        const drop = dropOf.get(id);
        if (drop !== undefined) return { state: "dropped", label: words.dropped, reason: drop.journey === null ? drop.reason : `${words.droppedBy(drop.journey)}: ${drop.reason}`, builtBy: null, reliedOnBy: relied };
        const reason =
            capabilitiesOf.get(id) === 0 ? words.noCapability : kept.has(id) ? words.keptButNoStory : words.noStepNoDrop;
        return { state: "none", label: words.none, reason, builtBy: null, reliedOnBy: relied };
    };
    return { of, inNoStory: rules.map((rule) => rule.id).filter((id) => builtBy.get(id) === undefined) };
};
