import { createHash } from "node:crypto";
import { Schema } from "effect";
import type { ModernizationRequest } from "../model/request";
import type { Decision, Story, TargetLayer } from "../model/records";
import { StoryKey } from "../model/fields";
import type { Coverage, Epic, Phase, Plan, StoryView } from "../model/plan";
import { SHARED, type Facts } from "./facts";
import { scopeOf } from "./scope";

export type PlanInput = {
    readonly analysis: { readonly root: string; readonly fingerprint: string };
    readonly facts: Facts;
    readonly request: ModernizationRequest;
    readonly layers: readonly TargetLayer[];
    readonly decisions: readonly Decision[];
    readonly stories: readonly Story[];
};

export type Built = { readonly plan: Plan; readonly problems: readonly string[] };

const hashOf = (value: unknown) => createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 12);
const keyOf = (value: unknown) => Schema.decodeUnknownSync(StoryKey)(`story-${hashOf(value)}`);
const lower = (text: string) => (text.length === 0 ? text : text[0]!.toLowerCase() + text.slice(1));

export const SCAFFOLD_EPIC = "area:codebase";
export const SHARED_EPIC = "area:shared rules";

/** The scaffold story is written by the plan, not by an agent: one criterion per layer. */
export const scaffoldStory = (layers: readonly TargetLayer[]): Story => {
    const per = Math.max(1, Math.ceil(layers.length / 11));
    const groups: TargetLayer[][] = [];
    for (let i = 0; i < layers.length; i += per) groups.push(layers.slice(i, i + per));
    return {
        title: "Set up the codebase and its layers",
        what: "The codebase has every planned layer, each with a check that runs and passes.",
        why: "Every later story can be built, checked and proven in a layer of its own.",
        actions: [],
        terms: [],
        criteria: [
            ...groups.map((group) => ({
                says: `Given a fresh checkout, when the check of ${group.map((layer) => `the ${layer.name} layer`).join(" and ")} runs, then it passes and leaves its results where the delivery reads them.`,
                from: group.map((layer) => ({ _tag: "layer" as const, id: layer.id })),
            })),
            {
                says: "Given the codebase, when its layers are listed, then every planned layer appears with its folder and the layers it may reach.",
                from: layers.map((layer) => ({ _tag: "layer" as const, id: layer.id })),
            },
        ] as unknown as Story["criteria"],
    };
};

/** A story's stable key: a signature of what it builds, so it survives a re-plan. */
export const storyKeyOf = (story: Story) =>
    keyOf(
        story.actions.length > 0
            ? [...story.actions].sort()
            : [...story.criteria.flatMap((c) => c.from.map((r) => `${r._tag}:${r.id}`))].sort(),
    );

const citedRules = (story: Story) =>
    story.criteria.flatMap((criterion) =>
        criterion.from.flatMap((ref) => (ref._tag === "rule" ? [ref.id as string] : [])),
    );
const citedDecisions = (story: Story) =>
    story.criteria.flatMap((criterion) =>
        criterion.from.flatMap((ref) => (ref._tag === "decision" ? [ref.id as string] : [])),
    );

/**
 * Derives the strictly ordered, phase-wise plan from the accepted records, the analysis facts and the request. Pure:
 * every field not written by an agent is computed here, and anything that does not add up is returned as a problem.
 * @param input the records, the facts and the request
 * @returns the plan and the structural problems found while deriving it
 */
export const buildPlan = (input: PlanInput): Built => {
    const { facts, layers, decisions } = input;
    const problems: string[] = [];
    const actionOf = new Map(
        facts.capabilities.flatMap((c) =>
            c.surfaces.flatMap((s) => s.actions.map((a) => [a.id, { action: a, surface: s, capability: c }] as const)),
        ),
    );
    const decisionById = new Map(decisions.map((d) => [d.id as string, d]));
    const all: { story: Story; scaffold: boolean; index: number }[] = [
        { story: scaffoldStory(layers), scaffold: true, index: -1 },
        ...input.stories.map((story, index) => ({ story, scaffold: false, index })),
    ];

    const views = all.map(({ story, scaffold, index }) => {
        const functional = story.actions.length > 0;
        const surfaces = new Set(story.actions.map((id) => actionOf.get(id as string)?.surface.key ?? "?"));
        const first = story.actions.length > 0 ? actionOf.get(story.actions[0] as string) : undefined;
        const builds = [...new Set(citedRules(story))];
        const area = scaffold
            ? "codebase"
            : functional
              ? undefined
              : (() => {
                    const topic = citedDecisions(story)
                        .map((id) => decisionById.get(id)?.topic)
                        .find((t) => t?._tag === "area");
                    return topic?._tag === "area" ? topic.name : builds.length > 0 ? "shared rules" : "platform";
                })();
        const epic = functional ? `capability:${first?.capability.id ?? "?"}` : `area:${area}`;
        const signature = functional
            ? [...story.actions].sort()
            : [...story.criteria.flatMap((c) => c.from.map((r) => `${r._tag}:${r.id}`))].sort();
        return {
            story,
            scaffold,
            index,
            functional,
            surfaces,
            first,
            builds,
            epic,
            key: keyOf(scaffold ? "scaffold" : signature),
        };
    });

    const builder = new Map<string, string>();
    for (const view of views) {
        for (const rule of view.builds) {
            if (builder.has(rule))
                problems.push(`rule "${facts.rules.get(rule)?.says.slice(0, 60) ?? rule}" is built by two stories`);
            builder.set(rule, view.key);
        }
    }
    const titleOf = new Map(views.map((view) => [view.key as string, view.story.title]));

    const derived = views.map((view) => {
        const reached = [
            ...new Set(view.story.actions.flatMap((id) => actionOf.get(id as string)?.action.rules ?? [])),
        ];
        const reliesOn = reached
            .filter((rule) => !view.builds.includes(rule) && builder.has(rule))
            .map((rule) => ({ rule, builtBy: builder.get(rule)! }));
        // Inside one capability the stories of a surface rely on each other's rules in both directions, so a reliance
        // blocks only on a story written earlier; relying on a later one stays a recorded fact, never a blocker.
        const byKey = new Map(views.map((each) => [each.key as string, each]));
        const blockedBy = [...new Set(reliesOn.map((each) => each.builtBy).filter((key) => key !== view.key))].filter(
            (key) => {
                const other = byKey.get(key);
                if (other === undefined || !view.functional || !other.functional) return true;
                const sameCapability = other.first?.capability.id === view.first?.capability.id;
                return !sameCapability || other.index < view.index;
            },
        );
        const klass = view.scaffold ? 0 : view.functional ? 3 : view.builds.length > 0 ? 2 : 1;
        return { ...view, reliesOn, blockedBy, klass };
    });

    // Epics and their barriers: everything comes after the codebase; capabilities come after foundation and shared rules.
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

    // One strict order: dependency order, ties by class, epic order and the order the records were written.
    const byKey = new Map(derived.map((view) => [view.key as string, view]));
    const after = new Map<string, Set<string>>();
    for (const view of derived) {
        const needs = new Set<string>(view.blockedBy);
        for (const epic of comesAfter(view.epic))
            for (const other of derived.filter((each) => each.epic === epic)) needs.add(other.key);
        after.set(view.key, needs);
    }
    const sequence = new Map<string, number>();
    const waiting = new Set(derived.map((view) => view.key as string));
    const rank = (view: (typeof derived)[number]) =>
        [view.klass, epicSequence.get(view.epic) ?? 0, view.index] as const;
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
        ready.sort((a, b) => rank(a)[0] - rank(b)[0] || rank(a)[1] - rank(b)[1] || rank(a)[2] - rank(b)[2]);
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
        .map((view): StoryView => ({
            ...view.story,
            key: view.key,
            sequence: sequence.get(view.key) ?? 0,
            phase: view.klass === 3 ? 3 + (level.get(view.key) ?? 0) : view.klass,
            epic: view.epic,
            kind: view.functional ? "functional" : "technical",
            blockedBy: view.blockedBy as unknown as StoryView["blockedBy"],
            builds: view.builds as unknown as StoryView["builds"],
            reliesOn: view.reliesOn as unknown as StoryView["reliesOn"],
            ...(view.first ? { capability: view.first.capability.name, surface: view.first.surface.name } : {}),
        }))
        .sort((a, b) => a.sequence - b.sequence);

    const epics: Epic[] = epicKeys.map((key) => {
        const mine = stories.filter((story) => story.epic === key);
        const capability = facts.capabilities.find((each) => `capability:${each.id}` === key);
        const area = key.startsWith("area:") ? key.slice(5) : undefined;
        const outcome = capability
            ? capability.purpose
            : key === SCAFFOLD_EPIC
              ? "The target codebase exists with every planned layer, each with a working check, ready for stories to be built in."
              : key === SHARED_EPIC
                ? "The rules several capabilities rest on are built once, so every capability can rely on them."
                : `Developers have ${area} in place, as decided, before any capability is built on it.`;
        return {
            key,
            kind: capability ? "functional" : "technical",
            title: capability
                ? `Carry over ${lower(capability.name)}`
                : key === SCAFFOLD_EPIC
                  ? "Set up the codebase"
                  : key === SHARED_EPIC
                    ? "Build the shared rules"
                    : `Set up ${area}`,
            outcome,
            ...(area !== undefined ? { area } : {}),
            ...(capability ? { capability: capability.name } : {}),
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
                    ? "Shared rules"
                    : `Capabilities, level ${number - 2}`,
        why:
            number === 0
                ? "Nothing can be built until the codebase has its layers and each layer's check runs."
                : number === 1
                  ? "The decisions about libraries, data, outside systems and conventions are made real before any capability."
                  : number === 2
                    ? "Rules several capabilities share are built once, ahead of the capabilities that rely on them."
                    : "Stories whose blockers are all in earlier phases; the smallest capability comes first, so it is the pilot.",
        stories: stories.filter((story) => story.phase === number).map((story) => story.key),
    }));

    const storyOfAction = new Map<string, string>();
    for (const story of stories) for (const id of story.actions) storyOfAction.set(id as string, story.key);
    const scopeByName = new Map(
        decisions
            .filter((d) => d.topic._tag === "scope")
            .map((d) => [(d.topic as { capability: string }).capability, scopeOf(d) ?? "carry"] as const),
    );
    const builtCount = [...facts.rules.keys()].filter((rule) => builder.has(rule)).length;
    const coverage: Coverage = {
        capabilities: facts.capabilities.map((capability) => ({
            name: capability.name,
            scope: scopeByName.get(capability.name) ?? "carry",
            surfaces: capability.surfaces.map((surface) => ({
                name: surface.name,
                actions: surface.actions.map((action) => ({
                    id: action.id as never,
                    name: action.name || action.purpose || "an entry point the code does not name",
                    story: (storyOfAction.get(action.id) ?? null) as never,
                })),
            })),
        })),
        rulesBuilt: builtCount,
        rulesTotal: facts.rules.size,
        unplanned: facts.unreached.map((each) => ({
            what: each.what,
            file: each.place.file,
            firstLine: each.place.firstLine,
            lastLine: each.place.lastLine,
        })),
    };

    void SHARED;
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
