import { ComposeError } from "../errors";
import { distinct } from "../io";
import type { Payloads } from "../inputs/payloads";
import type { Target, TargetArchitecture, TargetJourney } from "../inputs/target";
import type { Facts } from "./facts";
import { Slugs, sortByText } from "./text";

/*
 * Today's journeys (the analysis's tasks, or the target's copy of them), the chosen ways of doing each, and the trace of
 * every chosen step to the rules it keeps, changes and drops. Corrections over the mockup: a rule the step changes or
 * the journey drops is never listed as kept.
 */

export type TodayStep = { number: number; intent: string; system: string; from: string[]; confidence: string };
export type TodayJourney = {
    id: string;
    slug: string;
    title: string;
    capability: string | null;
    outcome: string;
    actor: string;
    actions: string[];
    rules: string[];
    steps: TodayStep[];
};

export type ProposedStep = {
    id: string;
    number: number;
    intent: string;
    system: string;
    confidence: string;
    /** How the step differs from today, the stored word; `new` for a step with no legacy counterpart. */
    change: string;
    reason: string;
    from: string[];
    touches: string[];
    honours: string[];
    kept: string[];
    changes: { rule: string; to: string }[];
};

export type ProposedJourney = {
    id: string;
    task: string;
    slug: string;
    name: string;
    actor: string;
    strategy: string;
    idea: string;
    tradeoff: string;
    recommended: string | null;
    steps: ProposedStep[];
    drops: { actions: string[]; rules: string[]; reason: string }[];
    dropped: string[];
    /** Each step of today beside the steps of this way that do its work (they share an action). */
    pairs: { today: number; proposed: number }[];
    /** True when a step is anything but kept as it is today, or the journey leaves something out. */
    hasChanges: boolean;
    alternatives: { name: string; strategy: string; idea: string; tradeoff: string }[];
};

/**
 * A task's title from its id when the facts carry none: the words of its short name, the first in capitals.
 * @param id the task's id, `<capability>.<task>`
 * @returns the title
 */
export const titleFromId = (id: string) => {
    const short = id.includes(".") ? id.slice(id.lastIndexOf(".") + 1) : id;
    const words = short
        .split("-")
        .filter((word) => word !== "")
        .join(" ");
    return words === "" ? id : `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};

/**
 * Today's journeys: the analysis's own when its payloads carry them, else the target's copy, else none.
 * @param payloads the payloads
 * @param target the target, when there is one
 * @param facts the facts
 * @param slugs the address parts
 * @returns the journeys
 */
export const todayOf = (payloads: Payloads, target: Target | undefined, facts: Facts, slugs: Slugs): TodayJourney[] => {
    const tasks = payloads.journeys?.journeys ?? target?.tasks ?? [];
    const capabilityOf = new Map(facts.actions.map((action) => [action.id, action.capability]));
    return sortByText(tasks, (task) => task.id).map((task) => {
        const owners = distinct(task.actions.map((id) => capabilityOf.get(id) ?? "").filter((id) => id !== ""));
        const title = task.title ?? titleFromId(task.id);
        return {
            id: task.id,
            slug: slugs.of("journey", task.id, title),
            title,
            capability: task.capability ?? owners[0] ?? null,
            outcome: task.outcome,
            actor: task.actor,
            actions: distinct(task.actions),
            rules: distinct(task.rules),
            steps: task.current.map((step, number) => ({
                number: number + 1,
                intent: step.intent,
                system: step.system,
                from: [...step.from],
                confidence: step.confidence,
            })),
        };
    });
};

/**
 * The chosen way of doing each task, one per task.
 * @param target the target
 * @param today today's journeys, for their addresses
 * @returns the chosen journeys, in the order of today's
 */
export const proposedOf = (target: Target, today: readonly TodayJourney[]): ProposedJourney[] => {
    const slugOf = new Map(today.map((journey) => [journey.id, journey.slug]));
    const todayOf = new Map(today.map((journey) => [journey.id, journey]));
    const chosen = (pick: Target["picks"][number]): TargetJourney | undefined =>
        target.journeys.find((journey) =>
            pick.id !== undefined ? journey.id === pick.id : journey.task === pick.of && journey.name === pick.variant,
        );
    return sortByText(target.picks, (pick) => pick.of).flatMap((pick) => {
        const journey = chosen(pick);
        if (journey === undefined) return [];
        const dropped = distinct(journey.drops.flatMap((drop) => drop.rules));
        return [
            {
                id: journey.id,
                task: journey.task,
                slug: slugOf.get(journey.task) ?? journey.task,
                name: journey.name,
                actor: journey.actor,
                strategy: journey.strategy,
                idea: journey.idea,
                tradeoff: journey.tradeoff,
                recommended: journey.recommended ?? null,
                steps: journey.steps.map((step, number) => {
                    const changes = (step.changes ?? []).map((each) => ({ rule: each.rule, to: each.to }));
                    const changed = new Set(changes.map((each) => each.rule));
                    return {
                        id: step.id,
                        number: number + 1,
                        intent: step.intent,
                        system: step.system,
                        confidence: step.confidence,
                        change: step.link._tag === "legacy" ? step.link.change : "new",
                        reason: step.link.reason,
                        from: step.link._tag === "legacy" ? [...step.link.from] : [],
                        touches: [...step.touches],
                        honours: distinct(step.honours),
                        kept: distinct(step.honours).filter((rule) => !changed.has(rule) && !dropped.includes(rule)),
                        changes,
                    };
                }),
                drops: journey.drops.map((drop) => ({
                    actions: distinct(drop.actions),
                    rules: distinct(drop.rules),
                    reason: drop.reason,
                })),
                dropped,
                pairs: journey.steps.flatMap((step, number) =>
                    (todayOf.get(journey.task)?.steps ?? [])
                        .filter((old) => old.from.some((action) => step.link._tag === "legacy" && step.link.from.includes(action)))
                        .map((old) => ({ today: old.number, proposed: number + 1 })),
                ),
                hasChanges:
                    journey.drops.length > 0 ||
                    journey.steps.some((step) => step.link._tag !== "legacy" || step.link.change !== "kept"),
                alternatives: sortByText(
                    target.variants.filter((variant) => variant.task === journey.task && variant.name !== journey.name),
                    (variant) => variant.name,
                ).map((variant) => ({
                    name: variant.name,
                    strategy: variant.strategy,
                    idea: variant.idea,
                    tradeoff: variant.tradeoff,
                })),
            },
        ];
    });
};

export type Component = {
    name: string;
    domain: string;
    responsibility: string;
    uses: string[];
    serves: string[];
    enforces: string[];
    adapts: string | null;
    platform: string | null;
    kind: string | null;
};

export type ArchitectureView = {
    /** Whether the person confirmed it with its components; otherwise it is the recommended variant, proposed. */
    confirmed: boolean;
    name: string;
    idea: string;
    tradeoff: string;
    recommended: string | null;
    domains: {
        name: string;
        slug: string;
        concept: string;
        rules: string[];
        dependsOn: string[];
        facts: string[];
        components: number;
    }[];
    containers: {
        name: string;
        kind: string;
        tech: string;
        holds: string[];
    }[];
    components: Component[];
    integrations: { outside: string; name: string; domain: string; how: string }[];
    risks: string[];
    alternatives: {
        name: string;
        idea: string;
        tradeoff: string;
        score: Score | null;
        risks: string[];
    }[];
    /** The chosen option's score, when its record keeps one. */
    score: Score | null;
    /**
     * Where today's rules land: one row per layer of today (and one for rules in no layer, `layer` null, when there
     * are any), one cell per domain the row's rules go to, and the column `""` for rules placed in no domain.
     */
    landing: {
        layers: { layer: string | null; name: string; rules: number; number: string }[];
        domains: string[];
        cells: { layer: string | null; domain: string; rules: string[]; number: string }[];
    };
    /** Rules of today placed in no domain, each with the reason a chosen journey gives for leaving it out, or null. */
    unplaced: { rule: string; reason: string | null }[];
};

type Score = { steps: number; stepsServed: number; rules: number; rulesAssigned: number };

const scoreOf = (score: Score | undefined): Score | null =>
    score === undefined
        ? null
        : {
              steps: score.steps,
              stepsServed: score.stepsServed,
              rules: score.rules,
              rulesAssigned: score.rulesAssigned,
          };

/**
 * The chosen architecture with its joins: distinct components per domain, how the containers talk and the uses that
 * cross domains.
 * @param target the target
 * @param facts the facts, for the outside systems' names
 * @param slugs the address parts
 * @returns the architecture, or nothing when the target has none yet
 */
export const architectureOf = (
    target: Target,
    facts: Facts,
    slugs: Slugs,
    journeys: readonly ProposedJourney[] = [],
): ArchitectureView | undefined => {
    const architecture = target.architecture;
    if (architecture === undefined) return undefined;
    const components: Component[] = sortByText(architecture.components ?? [], (each) => each.name).map((each) => ({
        name: each.name,
        domain: each.domain,
        responsibility: each.responsibility,
        uses: distinct(each.uses),
        serves: distinct(each.serves),
        enforces: distinct(each.enforces),
        adapts: each.adapts ?? null,
        platform: each.platform ?? null,
        kind: each.kind ?? null,
    }));
    const byName = new Map(components.map((each) => [each.name, each]));
    for (const component of components)
        for (const used of component.uses)
            if (!byName.has(used))
                throw new ComposeError(
                    "build",
                    `component ${component.name} uses ${used}, which the architecture does not hold`,
                );
    const outsideName = new Map(facts.outside.map((each) => [each.id, each.name]));
    return {
        confirmed: target.architectureConfirmed,
        name: architecture.name,
        idea: architecture.idea,
        tradeoff: architecture.tradeoff,
        recommended: architecture.recommended ?? null,
        domains: architecture.domains.map((domain) => ({
            name: domain.name,
            slug: slugs.of("domain", domain.name, domain.name),
            concept: domain.concept,
            rules: distinct(domain.rules),
            dependsOn: distinct(domain.dependsOn),
            facts: domain.facts.map((fact) => fact.name),
            components: distinct(components.filter((each) => each.domain === domain.name).map((each) => each.name))
                .length,
        })),
        containers: architecture.containers.map((container) => ({
            name: container.name,
            kind: container.kind,
            tech: container.tech,
            holds: [...container.holds],
        })),
        components,
        integrations: architecture.integrations.map((each) => ({
            outside: each.need,
            name: outsideName.get(each.need) ?? "",
            domain: each.domain,
            how: each.how,
        })),
        risks: [...architecture.risks],
        alternatives: sortByText(
            target.alternatives.filter((each) => each.name !== architecture.name),
            (each) => each.name,
        ).map((each) => ({
            name: each.name,
            idea: each.idea,
            tradeoff: each.tradeoff,
            score: scoreOf(each.score),
            risks: [...(each.risks ?? [])],
        })),
        score: scoreOf(target.alternatives.find((each) => each.name === architecture.name)?.score),
        ...landingOf(facts, architecture.domains, journeys, slugs),
    };
};

/**
 * Where today's rules land in the chosen domains, by today's layer, and the rules no domain holds with the reason a
 * chosen journey gives for leaving each out.
 * @param facts the facts
 * @param domains the chosen domains
 * @param journeys the chosen journeys, for their drops
 * @param slugs the address parts, for the number keys
 * @returns the table and the rules placed nowhere
 */
const landingOf = (
    facts: Facts,
    domains: TargetArchitecture["domains"],
    journeys: readonly ProposedJourney[],
    slugs: Slugs,
): Pick<ArchitectureView, "landing" | "unplaced"> => {
    const domainOf = new Map<string, string>();
    for (const domain of domains) for (const rule of domain.rules) if (!domainOf.has(rule)) domainOf.set(rule, domain.name);
    const layerName = new Map(facts.layers.map((layer) => [layer.id, layer.name]));
    const rows = [
        ...facts.layers.map((layer) => layer.id as string | null),
        ...(facts.rules.some((rule) => rule.layer === null || !layerName.has(rule.layer)) ? [null] : []),
    ];
    const layerKey = (layer: string | null) =>
        layer === null ? "none" : slugs.of("landing-layer", layer, layerName.get(layer) ?? layer);
    const columnKey = (domain: string) =>
        domain === "" ? "none" : slugs.of("domain", domain, domain);
    const rowOf = (layer: string | null) => (layer !== null && layerName.has(layer) ? layer : null);
    const cells: ArchitectureView["landing"]["cells"] = [];
    const columns = [...domains.map((domain) => domain.name), ""];
    for (const layer of rows) {
        for (const domain of columns) {
            const rules = facts.rules
                .filter((rule) => rowOf(rule.layer) === layer && (domainOf.get(rule.id) ?? "") === domain)
                .map((rule) => rule.id);
            if (rules.length === 0) continue;
            cells.push({
                layer,
                domain,
                rules,
                number: `architecture/landing/${layerKey(layer)}/${columnKey(domain)}`,
            });
        }
    }
    const reasonOf = new Map<string, string>();
    for (const journey of journeys)
        for (const drop of journey.drops) for (const rule of drop.rules) if (!reasonOf.has(rule)) reasonOf.set(rule, drop.reason);
    return {
        landing: {
            layers: rows
                .map((layer) => ({
                    layer,
                    name: layer === null ? "" : (layerName.get(layer) ?? ""),
                    rules: facts.rules.filter((rule) => rowOf(rule.layer) === layer).length,
                    number: `architecture/landing/${layerKey(layer)}`,
                }))
                .filter((row) => row.rules > 0),
            domains: columns,
            cells,
        },
        unplaced: facts.rules
            .filter((rule) => !domainOf.has(rule.id))
            .map((rule) => ({ rule: rule.id, reason: reasonOf.get(rule.id) ?? null })),
    };
};

export type StepTrace = {
    journey: string;
    step: string;
    stories: string[];
    components: string[];
    domains: string[];
    primaryDomain: string | null;
    kept: string[];
    changed: { rule: string; to: string }[];
    dropped: string[];
    /** Other chosen journeys whose steps the same components serve. */
    alsoUsedBy: string[];
};

/**
 * Each chosen step traced to the stories that deliver it (stories that name the step, never stories that only build
 * one of its rules), the distinct components that serve it, their domains and the rules it keeps, changes and drops.
 * @param journeys the chosen journeys
 * @param architecture the chosen architecture
 * @param storiesOfStep the stories that name each step, by step id
 * @returns one trace per step
 */
export const traceOf = (
    journeys: readonly ProposedJourney[],
    architecture: ArchitectureView,
    storiesOfStep: ReadonlyMap<string, readonly string[]>,
): StepTrace[] => {
    const domainOrder = architecture.domains.map((domain) => domain.name);
    const journeyOfStep = new Map(
        journeys.flatMap((journey) => journey.steps.map((step) => [step.id, journey.id] as const)),
    );
    return journeys.flatMap((journey) =>
        journey.steps.map((step) => {
            const serving = architecture.components.filter((component) => component.serves.includes(step.id));
            const counts = new Map<string, number>();
            for (const component of serving) counts.set(component.domain, (counts.get(component.domain) ?? 0) + 1);
            const primary =
                [...counts].sort(
                    ([one, a], [other, b]) => b - a || domainOrder.indexOf(one) - domainOrder.indexOf(other),
                )[0]?.[0] ?? null;
            const others = distinct(
                serving
                    .flatMap((component) => component.serves.map((id) => journeyOfStep.get(id) ?? ""))
                    .filter((id) => id !== "" && id !== journey.id),
            );
            return {
                journey: journey.id,
                step: step.id,
                stories: distinct(storiesOfStep.get(step.id) ?? []),
                components: distinct(serving.map((component) => component.name)),
                domains: distinct(serving.map((component) => component.domain)),
                primaryDomain: primary,
                kept: step.kept,
                changed: step.changes,
                dropped: journey.dropped.filter((rule) => step.honours.includes(rule)),
                alsoUsedBy: others,
            };
        }),
    );
};
