import { createHash } from "node:crypto";
import { Schema } from "effect";
import { StoryKey } from "../model/fields";
import type { Coverage, Epic, Phase, Plan, StoryView } from "../model/plan";
import type { Decision, Story, TargetLayer } from "../model/records";
import type { Target, TargetComponent, TargetJourney } from "../read/target";
import type { Built } from "./plan";
import { scaffoldStory } from "./plan";
import type { Facts } from "./facts";

export type TargetPlanInput = {
    readonly analysis: { readonly root: string; readonly fingerprint: string };
    readonly facts: Facts;
    readonly layers: readonly TargetLayer[];
    readonly decisions: readonly Decision[];
    readonly stories: readonly Story[];
    readonly target: Target;
};

const hashOf = (value: unknown) => createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 12);
const keyOf = (value: unknown) => Schema.decodeUnknownSync(StoryKey)(`story-${hashOf(value)}`);
const lowerFirst = (text: string) => (text.length === 0 ? text : text[0]!.toLowerCase() + text.slice(1));
const DANGLING = new Set(
    "a an the to of and or for in on with by from that which as at into so but if is are be".split(" "),
);

/**
 * A short headline of a sentence: its first clause, at most `words` words, ending on a word that closes it.
 * @param text the sentence
 * @param words the most words to keep
 * @param chars the most characters to keep, dropping whole words
 * @returns the headline, without a trailing mark or a dangling word
 */
export const headline = (text: string, words = 8, chars = Infinity): string => {
    const clause = text.split(/\s*(?:[,;:()\u2014]|\s-\s|\.\s)\s*/)[0] ?? text;
    const kept = clause.trim().split(/\s+/).filter(Boolean).slice(0, words);
    while (kept.length > 1 && kept.join(" ").length > chars) kept.pop();
    while (kept.length > 1 && DANGLING.has((kept[kept.length - 1] ?? "").toLowerCase().replace(/\W/g, ""))) kept.pop();
    return kept.join(" ").replace(/[\s.,;:!?-]+$/, "");
};

export const SCAFFOLD_EPIC = "area:codebase";
export const SHARED_COMPONENTS_EPIC = "area:shared components";

/** The epic of a journey: one per task, since one journey is chosen for each. */
export const journeyEpic = (journey: TargetJourney) => `journey:${journey.task}`;

/**
 * Who builds each component: the journey it serves alone, or a shared story when it serves several journeys, is
 * platform, or adapts an outside system.
 * @param target the confirmed target
 * @returns the journey id or `shared`, by component name
 */
export const componentOwners = (target: Target): Map<string, string> => {
    const journeyOfStep = new Map(
        target.journeys.flatMap((journey) => journey.steps.map((step) => [step.id, journey.id] as const)),
    );
    return new Map(
        target.architecture.components.map((component) => {
            const served = new Set(component.serves.flatMap((id) => journeyOfStep.get(id) ?? []));
            const alone = component.platform === undefined && component.adapts === undefined && served.size === 1;
            return [component.name, alone ? [...served][0]! : "shared"] as const;
        }),
    );
};

/**
 * The components built in the shared tier: those no journey serves alone, and every component a shared one calls, since
 * a component is built before what calls it and a shared story comes before every journey.
 * @param target the confirmed target
 * @returns the names
 */
export const sharedTier = (target: Target): Set<string> => {
    const owners = componentOwners(target);
    const uses = new Map(target.architecture.components.map((component) => [component.name, component.uses] as const));
    const shared = new Set([...owners.entries()].filter(([, owner]) => owner === "shared").map(([name]) => name));
    const queue = [...shared];
    for (let name = queue.pop(); name !== undefined; name = queue.pop())
        for (const used of uses.get(name) ?? [])
            if (!shared.has(used)) {
                shared.add(used);
                queue.push(used);
            }
    return shared;
};

/** Every rule a journey's steps keep, which the components built for it enforce. */
export const keptRules = (target: Target) =>
    new Set(
        target.journeys.flatMap((journey) =>
            journey.steps.flatMap((step) => (step.link._tag === "legacy" ? step.link.keeps : [])),
        ),
    );

/** The acceptance story of a journey, written by the plan, not by an agent: one criterion per step. */
export const journeyTestStory = (journey: TargetJourney, outcome: string): Story => {
    const steps = journey.steps;
    const groups: (typeof steps)[] = [];
    const per = Math.max(1, Math.ceil(steps.length / 11));
    for (let at = 0; at < steps.length; at += per) groups.push(steps.slice(at, at + per));
    return {
        title: `Prove the journey: ${headline(outcome, 8, 46)}`,
        what: "an acceptance test that does the journey from its first step to its last, as people will do it",
        why: "the journey keeps working as the product changes, in the interface the team ships",
        actions: [],
        terms: [],
        criteria: [
            ...groups.map((group, at) => ({
                says: `Given the product is ready, when the test does ${group.map((step) => `"${step.intent}"`).join(" and then ")}${per > 1 ? ` (steps ${at * per + 1} to ${at * per + group.length})` : ""}, then ${group.map((step) => lowerFirst(step.system)).join(" and then ")}.`,
                from: [],
            })),
        ] as unknown as Story["criteria"],
    };
};

const citedRules = (story: Story) =>
    story.criteria.flatMap((criterion) =>
        criterion.from.flatMap((ref) => (ref._tag === "rule" ? [ref.id as string] : [])),
    );
const citedDecisions = (story: Story) =>
    story.criteria.flatMap((criterion) =>
        criterion.from.flatMap((ref) => (ref._tag === "decision" ? [ref.id as string] : [])),
    );

/**
 * Derives the strictly ordered, phase-wise plan of a confirmed target: epics are the chosen journeys, a story is a slice
 * of a journey with the components that carry it, phases are the levels of the component graph and blockers are the
 * calls between components. The legacy supplies coverage only. Pure.
 * @param input the records, the facts and the target
 * @returns the plan and the structural problems found while deriving it
 */
export const buildTargetPlan = (input: TargetPlanInput): Built => {
    const { facts, layers, decisions, target } = input;
    const problems: string[] = [];
    const components = new Map(target.architecture.components.map((component) => [component.name, component] as const));
    const journeyOfStep = new Map(
        target.journeys.flatMap((journey) => journey.steps.map((step) => [step.id, journey] as const)),
    );
    const decisionById = new Map(decisions.map((decision) => [decision.id as string, decision]));
    const tier = sharedTier(target);
    // The tier at story level: a story that builds a tier component is delivered with the tier, and so is every story
    // that builds a component such a story calls, since a shared story comes before every journey.
    const usesOf = new Map(
        target.architecture.components.map((component) => [component.name, component.uses] as const),
    );
    const builderOf = new Map<string, number>();
    input.stories.forEach((story, at) => (story.components ?? []).forEach((name) => builderOf.set(name, at)));
    const tierStories = new Set<number>(
        input.stories.flatMap((story, at) => ((story.components ?? []).some((name) => tier.has(name)) ? [at] : [])),
    );
    const pending = [...tierStories];
    for (let at = pending.pop(); at !== undefined; at = pending.pop())
        for (const name of input.stories[at]?.components ?? [])
            for (const used of usesOf.get(name) ?? []) {
                const other = builderOf.get(used);
                if (other !== undefined && !tierStories.has(other)) {
                    tierStories.add(other);
                    pending.push(other);
                }
            }
    const all = [
        { story: scaffoldStory(layers), scaffold: true, test: undefined as TargetJourney | undefined, index: -1 },
        ...input.stories.map((story, index) => ({
            story,
            scaffold: false,
            test: undefined as TargetJourney | undefined,
            index,
        })),
        ...target.journeys.map((journey, at) => ({
            story: journeyTestStory(journey, target.outcomes.get(journey.task) ?? journey.name),
            scaffold: false,
            test: journey,
            index: 100000 + at,
        })),
    ];
    // Two journeys can have the same headline: the later ones take a number, so titles stay unique.
    const titles = new Set<string>();
    for (const entry of all) {
        let title = entry.story.title;
        for (let n = 2; titles.has(title); n++) title = `${entry.story.title} (${n})`;
        titles.add(title);
        if (title !== entry.story.title) entry.story = { ...entry.story, title };
    }
    const views = all.map(({ story, scaffold, test, index }) => {
        const stepIds = story.steps ?? [];
        const functional = story.actions.length > 0;
        const built = story.components ?? [];
        // A piece that carries no step of its own still belongs to the journey its component serves.
        const journey =
            test ??
            [...stepIds, ...built.flatMap((name) => components.get(name)?.serves ?? [])]
                .map((id) => journeyOfStep.get(id))
                .find((each) => each !== undefined);
        const builds = [...new Set(citedRules(story))];
        const area = scaffold
            ? "codebase"
            : (() => {
                  const topic = citedDecisions(story)
                      .map((id) => decisionById.get(id)?.topic)
                      .find((each) => each?._tag === "area");
                  return topic?._tag === "area" ? topic.name : built.length > 0 ? "shared components" : "platform";
              })();
        // A story that builds a component of the shared tier is delivered with the shared tier, whatever journey it serves.
        const inTier = test === undefined && !scaffold && index >= 0 && tierStories.has(index);
        const klass = scaffold ? 0 : inTier ? 2 : journey !== undefined ? 3 : built.length > 0 ? 2 : 1;
        const epic = inTier
            ? SHARED_COMPONENTS_EPIC
            : journey !== undefined && !scaffold
              ? journeyEpic(journey)
              : `area:${area}`;
        const signature = scaffold
            ? "scaffold"
            : test !== undefined
              ? ["journey-test", test.id]
              : functional
                ? [...stepIds].sort()
                : built.length > 0
                  ? [...built].sort()
                  : [...story.criteria.flatMap((c) => c.from.map((r) => `${r._tag}:${r.id}`))].sort();
        return { story, scaffold, test, index, functional, journey, built, builds, klass, epic, key: keyOf(signature) };
    });

    const ruleBuilder = new Map<string, string>();
    const componentBuilder = new Map<string, string>();
    for (const view of views) {
        for (const rule of view.builds) {
            if (ruleBuilder.has(rule))
                problems.push(`rule "${facts.rules.get(rule)?.says.slice(0, 60) ?? rule}" is built by two stories`);
            ruleBuilder.set(rule, view.key);
        }
        for (const name of view.built) {
            if (componentBuilder.has(name)) problems.push(`component ${name} is built by two stories`);
            componentBuilder.set(name, view.key);
        }
    }
    const titleOf = new Map(views.map((view) => [view.key as string, view.story.title]));
    const byKey = new Map(views.map((view) => [view.key as string, view]));

    const derived = views.map((view) => {
        const used = [...new Set(view.built.flatMap((name) => components.get(name)?.uses ?? []))];
        const usedBuilders = used.flatMap((name) => {
            const builder = componentBuilder.get(name);
            return builder === undefined || builder === view.key ? [] : [{ name, builder }];
        });
        const reliesOn = usedBuilders.flatMap(({ name, builder }) =>
            (components.get(name)?.enforces ?? []).map((rule) => ({ rule, builtBy: builder })),
        );
        const proves =
            view.test === undefined
                ? []
                : views
                      .filter(
                          (each) => each.test === undefined && each.journey?.id === view.test?.id && each.functional,
                      )
                      .map((each) => each.key as string);
        const blockedBy = [...new Set([...usedBuilders.map((each) => each.builder), ...proves])];
        return { ...view, reliesOn, blockedBy };
    });

    // Epics and their barriers: everything comes after the codebase; journeys after the foundation and shared components.
    const epicKeys: string[] = [SCAFFOLD_EPIC];
    for (const klass of [1, 2, 3])
        for (const view of derived.filter((each) => each.klass === klass))
            if (!epicKeys.includes(view.epic)) epicKeys.push(view.epic);
    const classOfEpic = (epic: string) => derived.find((view) => view.epic === epic)?.klass ?? 3;
    const comesAfter = (epic: string) => {
        const rank = classOfEpic(epic);
        return epicKeys.filter((other) => other !== epic && classOfEpic(other) < rank);
    };
    const epicSequence = new Map(epicKeys.map((epic, at) => [epic, at + 1]));

    const after = new Map<string, Set<string>>();
    for (const view of derived) {
        const needs = new Set<string>(view.blockedBy);
        for (const epic of comesAfter(view.epic))
            for (const other of derived.filter((each) => each.epic === epic)) needs.add(other.key);
        after.set(view.key, needs);
    }
    const sequence = new Map<string, number>();
    const waiting = new Set(derived.map((view) => view.key as string));
    while (waiting.size > 0) {
        const ready = [...waiting]
            .map((key) => byKey.get(key)!)
            .filter((view) => [...(after.get(view.key) ?? [])].every((key) => sequence.has(key)));
        if (ready.length === 0) {
            problems.push(
                `the stories depend on each other in a cycle: ${[...waiting].map((key) => titleOf.get(key)).join(", ")}`,
            );
            break;
        }
        ready.sort(
            (a, b) =>
                a.klass - b.klass ||
                (epicSequence.get(a.epic) ?? 0) - (epicSequence.get(b.epic) ?? 0) ||
                a.index - b.index,
        );
        const next = ready[0]!;
        sequence.set(next.key, sequence.size + 1);
        waiting.delete(next.key);
    }
    const level = new Map<string, number>();
    for (const view of [...derived].sort((a, b) => (sequence.get(a.key) ?? 0) - (sequence.get(b.key) ?? 0))) {
        const inClass = view.blockedBy.filter((key) => byKey.get(key)?.klass === view.klass);
        level.set(view.key, inClass.length === 0 ? 0 : 1 + Math.max(...inClass.map((key) => level.get(key) ?? 0)));
    }

    const stories: StoryView[] = derived
        .map((view): StoryView => {
            const first =
                view.story.actions[0] === undefined
                    ? undefined
                    : facts.capabilities
                          .flatMap((c) => c.surfaces.flatMap((s) => s.actions.map((a) => ({ a, s, c }))))
                          .find((x) => x.a.id === view.story.actions[0]);
            return {
                ...view.story,
                key: view.key,
                sequence: sequence.get(view.key) ?? 0,
                phase: view.klass === 3 ? 3 + (level.get(view.key) ?? 0) : view.klass,
                epic: view.epic,
                kind: view.functional ? "functional" : "technical",
                builder: view.scaffold ? "scaffold-codebase" : "shape-and-deliver",
                tags: [
                    "story",
                    view.functional ? "functional" : "technical",
                    ...(view.builds.length > 0 ? (["modernize"] as const) : []),
                ],
                blockedBy: view.blockedBy as unknown as StoryView["blockedBy"],
                builds: view.builds as unknown as StoryView["builds"],
                reliesOn: view.reliesOn as unknown as StoryView["reliesOn"],
                ...(first ? { capability: first.c.name, surface: first.s.name } : {}),
            };
        })
        .sort((a, b) => a.sequence - b.sequence);

    const epics: Epic[] = epicKeys.map((key) => {
        const mine = stories.filter((story) => story.epic === key);
        const journey = target.journeys.find((each) => journeyEpic(each) === key);
        const area = key.startsWith("area:") ? key.slice(5) : undefined;
        const outcome = journey
            ? journey.idea
            : key === SCAFFOLD_EPIC
              ? "The target codebase exists with every planned layer, each with a working check, ready for stories to be built in."
              : key === SHARED_COMPONENTS_EPIC
                ? "The components several journeys rest on are built once, so every journey can rely on them."
                : `Developers have ${area} in place, as decided, before any journey is built on it.`;
        return {
            key,
            kind: journey ? "functional" : "technical",
            title: journey
                ? (target.outcomes.get(journey.task) ?? journey.name)
                : key === SCAFFOLD_EPIC
                  ? "Set up the codebase"
                  : key === SHARED_COMPONENTS_EPIC
                    ? "Build the shared components"
                    : `Set up ${area}`,
            outcome,
            ...(area !== undefined ? { area } : {}),
            ...(journey ? { task: journey.task } : {}),
            comesAfter: comesAfter(key),
            stories: mine.map((story) => story.key),
            sequence: epicSequence.get(key) ?? 0,
        };
    });

    const phaseNumbers = [...new Set(stories.map((story) => story.phase))].sort((a, b) => a - b);
    const phases: Phase[] = phaseNumbers.map((number) => ({
        number,
        name:
            number === 0
                ? "Set up the codebase"
                : number === 1
                  ? "Platform"
                  : number === 2
                    ? "Shared components"
                    : `Journeys, level ${number - 2}`,
        why:
            number === 0
                ? "Nothing can be built until the codebase has its layers and each layer's check runs."
                : number === 1
                  ? "The decisions about libraries, data, outside systems and conventions are made real before any journey."
                  : number === 2
                    ? "Components several journeys call are built once, ahead of the journeys that rely on them."
                    : "Stories whose blockers are all in earlier phases; the components a story calls are built before it.",
        stories: stories.filter((story) => story.phase === number).map((story) => story.key),
    }));

    const storyOfAction = new Map<string, string>();
    for (const story of stories) for (const id of story.actions) storyOfAction.set(id as string, story.key);
    const dropped = new Map(
        target.journeys.flatMap((journey) =>
            journey.drops.flatMap((drop) => drop.actions.map((id) => [id, drop.reason] as const)),
        ),
    );
    const droppedRules = new Set(target.journeys.flatMap((journey) => journey.drops.flatMap((drop) => drop.rules)));
    const builtCount = [...facts.rules.keys()].filter((rule) => ruleBuilder.has(rule)).length;
    const coverage: Coverage = {
        capabilities: facts.capabilities.map((capability) => ({
            name: capability.name,
            scope: "carry" as const,
            surfaces: capability.surfaces.map((surface) => ({
                name: surface.name,
                actions: surface.actions.map((action) => ({
                    id: action.id as never,
                    name:
                        (action.name || action.purpose || "an entry point the code does not name") +
                        (dropped.has(action.id) ? ` (not carried: ${dropped.get(action.id)})` : ""),
                    story: (storyOfAction.get(action.id) ?? null) as never,
                })),
            })),
        })),
        rulesBuilt: builtCount,
        rulesTotal: facts.rules.size - [...droppedRules].filter((rule) => facts.rules.has(rule)).length,
        unplanned: facts.unreached.map((each) => ({
            what: each.what,
            file: each.place.file,
            firstLine: each.place.firstLine,
            lastLine: each.place.lastLine,
        })),
    };
    const plan: Plan = {
        analysis: { root: input.analysis.root, fingerprint: input.analysis.fingerprint },
        layers: [...layers],
        decisions: [...decisions],
        epics,
        phases,
        stories,
        coverage,
    };
    return { plan, problems };
};

export type { TargetComponent };
