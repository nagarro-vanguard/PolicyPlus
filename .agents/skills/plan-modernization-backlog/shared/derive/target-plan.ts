import { createHash } from "node:crypto";
import { Schema } from "effect";
import { StoryKey } from "../model/fields";
import type { Coverage, Epic, Phase, Plan, StoryView } from "../model/plan";
import type { Decision, Story, TargetLayer } from "../model/records";
import type { Target, TargetComponent, TargetJourney } from "../read/target";
import type { Facts } from "./facts";
import { layerDepths, reachedFrom, storyLayers, type Stack } from "./layers";

export type TargetPlanInput = {
    readonly analysis: { readonly root: string; readonly fingerprint: string };
    readonly facts: Facts;
    readonly layers: readonly TargetLayer[];
    readonly decisions: readonly Decision[];
    readonly stories: readonly Story[];
    readonly target: Target;
};

export type Built = { readonly plan: Plan; readonly problems: readonly string[] };

const upper = (text: string) => (text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1));
const hashOf = (value: unknown) => createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 12);
const keyOf = (value: unknown) => Schema.decodeUnknownSync(StoryKey)(`story-${hashOf(value)}`);

/** A story's stable key: a signature of what it builds, so it survives a re-plan. */
export const storyKeyOf = (story: Story) =>
    keyOf(
        story.actions.length > 0
            ? [...story.actions].sort()
            : [...story.criteria.flatMap((c) => c.from.map((r) => `${r._tag}:${r.id}`))].sort(),
    );

export const SCAFFOLD_EPIC = "area:codebase";

/** The epic of a journey: one per task, since one journey is chosen for each. */
export const journeyEpic = (journey: TargetJourney) => `journey:${journey.task}`;

/**
 * Who builds each component: the journey it serves alone, or a shared story when it serves several journeys, is
 * platform, or adapts an outside system.
 * @param target the decided target
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
 * The unit of a component: the parts of one kind that the same journeys rely on. A unit is built by one story, or cut
 * into several; a story never joins parts of different kinds, so a rules story never waits on a flow story.
 * @param target the decided target
 * @returns the unit key by component name
 */
export const unitsOf = (target: Target): Map<string, string> => {
    const journeyOfStep = new Map(
        target.journeys.flatMap((journey) => journey.steps.map((step) => [step.id, journey.id] as const)),
    );
    return new Map(
        target.architecture.components.map((component) => {
            const served = [...new Set(component.serves.flatMap((id) => journeyOfStep.get(id) ?? []))].sort();
            return [component.name, `${component.kind}:${served.join("+")}`] as const;
        }),
    );
};

/** Every rule a journey's steps keep, which the components built for it enforce. */
export const keptRules = (target: Target) =>
    new Set(
        target.journeys.flatMap((journey) =>
            journey.steps.flatMap((step) => (step.link._tag === "legacy" ? step.link.keeps : [])),
        ),
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
 * Derives the strictly ordered, phase-wise plan of a decided target: epics are the chosen journeys, a story is a slice
 * of a journey with the components that carry it, phases are the levels of the component graph and blockers are the
 * calls between components. The legacy supplies coverage only. Pure.
 * @param input the records, the facts and the target
 * @returns the plan and the structural problems found while deriving it
 */
export const buildTargetPlan = (input: TargetPlanInput): Built => {
    const { facts, layers, decisions, target } = input;
    const problems: string[] = [];
    const stack: Stack = { layers, decisions, target, externals: facts.externals };
    const components = new Map(target.architecture.components.map((component) => [component.name, component] as const));
    const journeyOfStep = new Map(
        target.journeys.flatMap((journey) => journey.steps.map((step) => [step.id, journey] as const)),
    );
    const decisionById = new Map(decisions.map((decision) => [decision.id as string, decision]));
    // The story that sets up the layers is written by the foundation writer; it is the one citing layers.
    const all = input.stories.map((story, index) => ({
        story,
        scaffold: story.criteria.some((criterion) => criterion.from.some((ref) => ref._tag === "layer")),
        index,
    }));
    // Two journeys can have the same headline: the later ones take a number, so titles stay unique.
    const titles = new Set<string>();
    for (const entry of all) {
        let title = entry.story.title;
        for (let n = 2; titles.has(title); n++) title = `${entry.story.title} (${n})`;
        titles.add(title);
        if (title !== entry.story.title) entry.story = { ...entry.story, title };
    }
    const views = all.map(({ story, scaffold, index }) => {
        const stepIds = story.steps ?? [];
        const functional = story.actions.length > 0;
        const built = story.components ?? [];
        // A story with steps belongs to the journey of its first step; a technical one to the journey that alone
        // serves its components, and to none when several do.
        const served = new Set(
            [...stepIds, ...built.flatMap((name) => components.get(name)?.serves ?? [])].flatMap((id) => {
                const each = journeyOfStep.get(id);
                return each === undefined ? [] : [each];
            }),
        );
        const journey = functional ? journeyOfStep.get(stepIds[0] ?? "") : served.size === 1 ? [...served][0] : undefined;
        const builds = [...new Set(citedRules(story))];
        const area = scaffold
            ? "codebase"
            : (() => {
                  const topic = citedDecisions(story)
                      .map((id) => decisionById.get(id)?.topic)
                      .find((each) => each?._tag === "area");
                  return topic?._tag === "area" ? topic.name : (components.get(built[0] ?? "")?.domain ?? "platform");
              })();
        const klass = scaffold ? 0 : journey !== undefined || built.length > 0 ? 2 : 1;
        const epic = journey !== undefined && !scaffold ? journeyEpic(journey) : `area:${area}`;
        const signature = scaffold
            ? "scaffold"
            : functional
              ? [...stepIds].sort()
              : built.length > 0
                ? [...built].sort()
                : [story.title, ...story.criteria.flatMap((c) => c.from.map((r) => `${r._tag}:${r.id}`))].sort();
        const layerIds = storyLayers(story, { scaffold }, stack);
        return {
            story,
            scaffold,
            index,
            functional,
            journey,
            built,
            builds,
            klass,
            epic,
            layerIds,
            key: keyOf(signature),
        };
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

    // The platform is built in the order of its layers: a story waits for the platform stories of the layers its own
    // layers reach, when those sit lower in the stack, so no two stories wait on each other.
    const depth = layerDepths(layers);
    const rank = (ids: readonly string[]) => Math.max(-1, ...ids.map((id) => depth.get(id) ?? 0));
    const platform = views.filter((view) => view.klass === 1);
    const platformBefore = (view: (typeof views)[number]) => {
        if (view.klass !== 1) return [];
        const reached = new Set(view.layerIds.flatMap((id) => [...reachedFrom(layers, id)]));
        return platform
            .filter(
                (other) =>
                    other.key !== view.key &&
                    rank(other.layerIds) < rank(view.layerIds) &&
                    other.layerIds.some((id) => reached.has(id)),
            )
            .map((other) => other.key as string);
    };
    // The groups of stories that wait on each other, through the parts they build (strongly connected stories).
    const positionOf = new Map(views.map((view) => [view.key as string, view.index]));
    const waitsOf = new Map<string, string[]>(
        views.map((view) => [
            view.key as string,
            [
                ...new Set(
                    view.built.flatMap((name) =>
                        (components.get(name)?.uses ?? []).flatMap((used) => {
                            const other = componentBuilder.get(used);
                            return other === undefined || other === view.key ? [] : [other as string];
                        }),
                    ),
                ),
            ],
        ]),
    );
    const groupOf = new Map<string, number>();
    {
        let counter = 0;
        let groups = 0;
        const order = new Map<string, number>();
        const low = new Map<string, number>();
        const open: string[] = [];
        const onOpen = new Set<string>();
        const visit = (key: string) => {
            order.set(key, counter);
            low.set(key, counter++);
            open.push(key);
            onOpen.add(key);
            for (const next of waitsOf.get(key) ?? []) {
                if (!order.has(next)) {
                    visit(next);
                    low.set(key, Math.min(low.get(key)!, low.get(next)!));
                } else if (onOpen.has(next)) low.set(key, Math.min(low.get(key)!, order.get(next)!));
            }
            if (low.get(key) === order.get(key)) {
                for (let top = open.pop(); top !== undefined; top = open.pop()) {
                    onOpen.delete(top);
                    groupOf.set(top, groups);
                    if (top === key) break;
                }
                groups++;
            }
        };
        for (const key of waitsOf.keys()) if (!order.has(key)) visit(key);
    }
    const derived = views.map((view) => {
        const used = [...new Set(view.built.flatMap((name) => components.get(name)?.uses ?? []))];
        const usedBuilders = used.flatMap((name) => {
            const builder = componentBuilder.get(name);
            return builder === undefined || builder === view.key ? [] : [{ name, builder }];
        });
        const reliesOn = usedBuilders.flatMap(({ name, builder }) =>
            (components.get(name)?.enforces ?? []).map((rule) => ({ rule, builtBy: builder })),
        );
        // Stories that build parts calling each other's parts in both directions wait on each other; among them a story
        // waits only on one written earlier, and what it uses from a later one stays in `reliesOn`.
        const blockedBy = [
            ...new Set([
                ...usedBuilders
                    .map((each) => each.builder)
                    .filter((key) => groupOf.get(key) !== groupOf.get(view.key) || (positionOf.get(key) ?? 0) < view.index),
                ...platformBefore(view),
            ]),
        ];
        return { ...view, reliesOn, blockedBy };
    });

    // Epics and their barriers: everything comes after the codebase; journeys after the foundation and shared components.
    const epicKeys: string[] = [SCAFFOLD_EPIC];
    for (const klass of [1, 2])
        for (const view of derived.filter((each) => each.klass === klass))
            if (!epicKeys.includes(view.epic)) epicKeys.push(view.epic);
    const classOfEpic = (epic: string) => derived.find((view) => view.epic === epic)?.klass ?? 2;
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
                phase: view.klass === 2 ? 2 + (level.get(view.key) ?? 0) : view.klass,
                epic: view.epic,
                kind: view.functional ? "functional" : "technical",
                blockedBy: view.blockedBy as unknown as StoryView["blockedBy"],
                builds: view.builds as unknown as StoryView["builds"],
                reliesOn: view.reliesOn as unknown as StoryView["reliesOn"],
                ...(first ? { capability: first.c.name, surface: first.s.name } : {}),
                layers: view.layerIds as unknown as NonNullable<StoryView["layers"]>,
            };
        })
        .sort((a, b) => a.sequence - b.sequence);

    const epics: Epic[] = epicKeys.map((key) => {
        const mine = stories.filter((story) => story.epic === key);
        const journey = target.journeys.find((each) => journeyEpic(each) === key);
        const area = key.startsWith("area:") ? key.slice(5) : undefined;
        // Every word of an epic is an agent's: the journey's idea, or the first story's reason; the area's own name.
        return {
            key,
            kind: journey ? "functional" : "technical",
            title: journey ? (target.outcomes.get(journey.task) ?? journey.name) : upper(area ?? key),
            outcome: journey ? journey.idea : (mine[0]?.why ?? ""),
            ...(area !== undefined ? { area } : {}),
            ...(journey ? { task: journey.task } : {}),
            comesAfter: comesAfter(key),
            stories: mine.map((story) => story.key),
            sequence: epicSequence.get(key) ?? 0,
        };
    });

    const phases: Phase[] = [...new Set(stories.map((story) => story.phase))]
        .sort((a, b) => a - b)
        .map((number) => ({
            number,
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
