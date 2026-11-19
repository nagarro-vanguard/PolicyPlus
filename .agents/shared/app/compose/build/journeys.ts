import { ComposeError } from "../errors";
import { compareText, distinct } from "../io";
import type { Payloads } from "../inputs/payloads";
import type { Target, TargetJourney } from "../inputs/target";
import type { Facts } from "./facts";
import { firstSentence, Slugs, sortByText } from "./text";

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
    name: string;
    idea: string;
    tradeoff: string;
    recommended: string | null;
    domains: {
        name: string;
        slug: string;
        concept: string;
        why: string;
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
        does: string | null;
        runsOn: string | null;
        runsOnWords: string | null;
    }[];
    components: Component[];
    integrations: { outside: string; name: string; domain: string; how: string }[];
    risks: { statement: string; summary: string; kind: string | null; cites: string[]; containedBy: string | null }[];
    /** How the containers talk: for each pair, how many component uses cross it. */
    talks: { from: string; to: string; uses: number }[];
    /** Uses between components of two domains, each pair counted once per use. */
    domainEdges: { from: string; to: string; uses: number }[];
    alternatives: {
        name: string;
        idea: string;
        tradeoff: string;
        score: { steps: number; stepsServed: number; rules: number; rulesAssigned: number } | null;
    }[];
};

/**
 * The chosen architecture with its joins: distinct components per domain, how the containers talk and the uses that
 * cross domains.
 * @param target the target
 * @param facts the facts, for the outside systems' names
 * @param slugs the address parts
 * @returns the architecture
 */
export const architectureOf = (target: Target, facts: Facts, slugs: Slugs): ArchitectureView => {
    const architecture = target.architecture;
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
    const runner = (domain: string) =>
        sortByText(
            architecture.containers.filter(
                (container) => container.kind !== "store" && container.holds.includes(domain),
            ),
            (each) => each.name,
        )[0]?.name ??
        sortByText(
            architecture.containers.filter((container) => container.holds.includes(domain)),
            (each) => each.name,
        )[0]?.name ??
        "";
    const talks = new Map<string, number>();
    const domainEdges = new Map<string, number>();
    for (const component of components) {
        for (const used of component.uses) {
            const other = byName.get(used);
            if (other === undefined)
                throw new ComposeError(
                    "reconcile",
                    `component ${component.name} uses ${used}, which the architecture does not hold`,
                );
            if (other.domain !== component.domain) {
                const key = `${component.domain}\u0000${other.domain}`;
                domainEdges.set(key, (domainEdges.get(key) ?? 0) + 1);
            }
            const from = runner(component.domain);
            const to = runner(other.domain);
            if (from !== to && from !== "" && to !== "")
                talks.set(`${from}\u0000${to}`, (talks.get(`${from}\u0000${to}`) ?? 0) + 1);
        }
    }
    const pairs = (map: Map<string, number>) =>
        [...map]
            .sort(([one], [other]) => compareText(one, other))
            .map(([key, uses]) => {
                const [from = "", to = ""] = key.split("\u0000");
                return { from, to, uses };
            });
    const outsideName = new Map(facts.outside.map((each) => [each.id, each.name]));
    return {
        name: architecture.name,
        idea: architecture.idea,
        tradeoff: architecture.tradeoff,
        recommended: architecture.recommended ?? null,
        domains: architecture.domains.map((domain) => ({
            name: domain.name,
            slug: slugs.of("domain", domain.name, domain.name),
            concept: domain.concept,
            why: domain.why,
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
            does: container.does ?? null,
            runsOn: container.runsOn ?? null,
            runsOnWords: container.runsOn === undefined ? null : (target.runsOn.get(container.runsOn) ?? null),
        })),
        components,
        integrations: architecture.integrations.map((each) => ({
            outside: each.need,
            name: outsideName.get(each.need) ?? "",
            domain: each.domain,
            how: each.how,
        })),
        risks: architecture.risks.map((risk) =>
            typeof risk === "string"
                ? { statement: risk, summary: firstSentence(risk), kind: null, cites: [], containedBy: null }
                : {
                      statement: risk.statement,
                      summary: firstSentence(risk.statement),
                      kind: risk.kind,
                      cites: [...risk.cites],
                      containedBy: risk.containedBy ?? null,
                  },
        ),
        talks: pairs(talks),
        domainEdges: pairs(domainEdges),
        alternatives: sortByText(
            target.alternatives.filter((each) => each.name !== architecture.name),
            (each) => each.name,
        ).map((each) => ({
            name: each.name,
            idea: each.idea,
            tradeoff: each.tradeoff,
            score:
                each.score === undefined
                    ? null
                    : {
                          steps: each.score.steps,
                          stepsServed: each.score.stepsServed,
                          rules: each.score.rules,
                          rulesAssigned: each.score.rulesAssigned,
                      },
        })),
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
