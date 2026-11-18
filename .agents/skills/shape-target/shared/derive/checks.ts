import type { Architecture, Component, CurrentStep, Domain, Journey, StoredJourney, Task } from "../model/records";
import { cycleIn, missing } from "./graph";
import { leaksIn, type LegacySheet } from "./legacy";
import { wordsIn } from "./words";

/** The limits of check C7, tuned on fixtures: a variant above both is a copy of today. */
export const COPY_SHARE = 0.8;
export const COPY_RATIO = [0.8, 1.25] as const;
/** A task done in fewer steps than this today has nothing to restructure. */
export const COPY_MIN_STEPS = 3;

const key = (ids: readonly string[]) => [...ids].sort().join("|");

/**
 * C7: how far a variant mirrors today's journey.
 * @param variant the target steps
 * @param current today's steps
 * @returns the share of steps made of exactly one current step's entry points, and the step ratio
 */
export const copyOf = (variant: Journey, current: readonly CurrentStep[]) => {
    const today = new Set(current.map((step) => key(step.from)));
    const same = variant.steps.filter((step) => step.link._tag === "legacy" && today.has(key(step.link.from))).length;
    return { share: same / variant.steps.length, ratio: variant.steps.length / current.length };
};
export const isCopy = (variant: Journey, current: readonly CurrentStep[]) => {
    if (current.length < COPY_MIN_STEPS) return false;
    const { share, ratio } = copyOf(variant, current);
    return share >= COPY_SHARE && ratio >= COPY_RATIO[0] && ratio <= COPY_RATIO[1];
};

/**
 * The gate of a journeys job: C1 and C7 for every variant of every task of the job, and the shape the variants must
 * have. Returns every gap.
 * @param task the task the variants are for
 * @param variants its variants
 * @returns the gaps
 */
export const journeyGaps = (task: Task, variants: readonly Journey[]): string[] => {
    const gaps: string[] = [];
    const actions = new Set<string>(task.actions);
    const rules = new Set<string>(task.rules);
    const facts = new Set<string>(task.facts);
    if (variants.length < 2) gaps.push(`task ${task.id}: write at least two variants`);
    const recommended = variants.filter((variant) => variant.recommended !== undefined);
    if (recommended.length !== 1)
        gaps.push(`task ${task.id}: exactly one variant is recommended (found ${recommended.length})`);
    if (new Set(variants.map((variant) => variant.name)).size !== variants.length)
        gaps.push(`task ${task.id}: two variants share a name`);
    for (const variant of variants) {
        const label = `task ${task.id}, variant "${variant.name}"`;
        if (variant.task !== task.id) gaps.push(`${label}: names task ${variant.task}`);
        const covered = new Set<string>();
        const kept = new Set<string>();
        variant.steps.forEach((step, at) => {
            const where = `${label}, step ${at + 1}`;
            if (step.touches.length + step.honours.length === 0)
                gaps.push(`${where}: touches no data and honours no rule`);
            for (const id of step.touches)
                if (!facts.has(id)) gaps.push(`${where}: touches data ${id}, which is not the task's`);
            for (const id of step.honours)
                if (!rules.has(id)) gaps.push(`${where}: honours rule ${id}, which is not the task's`);
            if (step.link._tag === "legacy") {
                for (const id of step.link.from) {
                    covered.add(id);
                    if (!actions.has(id)) gaps.push(`${where}: cites entry point ${id}, which is not the task's`);
                }
                for (const id of step.link.keeps) {
                    kept.add(id);
                    if (!rules.has(id)) gaps.push(`${where}: keeps rule ${id}, which is not the task's`);
                    else if (!step.honours.includes(id)) gaps.push(`${where}: keeps rule ${id} without honouring it`);
                }
            }
            for (const [field, text] of [
                ["intent", step.intent],
                ["system", step.system],
            ] as const) {
                const words = wordsIn(text);
                if (words.length > 0)
                    gaps.push(`${where}: the ${field} names a medium, control or technology (${words.join(", ")})`);
            }
        });
        for (const drop of variant.drops) {
            for (const id of drop.actions) {
                covered.add(id);
                if (!actions.has(id)) gaps.push(`${label}: drops entry point ${id}, which is not the task's`);
            }
            for (const id of drop.rules) {
                kept.add(id);
                if (!rules.has(id)) gaps.push(`${label}: drops rule ${id}, which is not the task's`);
            }
        }
        const lostActions = missing(actions, covered);
        if (lostActions.count > 0)
            gaps.push(
                `${label}: ${lostActions.count} entry points are neither in a step nor dropped: ${lostActions.text}`,
            );
        const lostRules = missing(rules, kept);
        if (lostRules.count > 0)
            gaps.push(`${label}: ${lostRules.count} rules are neither kept nor dropped: ${lostRules.text}`);
        for (const [field, text] of [
            ["idea", variant.idea],
            ["tradeoff", variant.tradeoff],
            ["name", variant.name],
        ] as const) {
            const words = wordsIn(text);
            if (words.length > 0)
                gaps.push(`${label}: the ${field} names a medium, control or technology (${words.join(", ")})`);
        }
        if (isCopy(variant, task.current) && variant.recommended !== undefined)
            gaps.push(`${label}: mirrors today's journey and cannot be the recommended variant`);
    }
    if (task.current.length >= COPY_MIN_STEPS && variants.every((variant) => isCopy(variant, task.current)))
        gaps.push(`task ${task.id}: every variant mirrors today's journey; restructure at least one`);
    return gaps;
};

export type DesignContext = {
    legacy: LegacySheet;
    journeys: readonly StoredJourney[];
    /** The ids of the outside systems the chosen tasks reach. */
    needs: readonly string[];
    stack: readonly string[];
};

export const techInStack = (tech: string, stack: readonly string[]) =>
    tech.trim().length >= 2 && stack.some((line) => line.toLowerCase().includes(tech.trim().toLowerCase()));

const keptRules = (journeys: readonly StoredJourney[]) =>
    new Set<string>(
        journeys.flatMap((journey) =>
            journey.steps.flatMap((step) => (step.link._tag === "legacy" ? step.link.keeps : [])),
        ),
    );
const touched = (journeys: readonly StoredJourney[]) =>
    new Set<string>(journeys.flatMap((journey) => journey.steps.flatMap((step) => step.touches)));

/** The domain of a name, with the names it relies on. */
const dependsGraph = (domains: readonly Domain[]) =>
    new Map(domains.map((domain) => [domain.name, [...domain.dependsOn]]));

/**
 * The checks of one architecture variant at domain level: C4 (rules partitioned), C5 (boundaries) and the stack
 * and names part of C6.
 * @param variant the variant
 * @param context what the chosen journeys and the request say
 * @returns the gaps
 */
export const variantGaps = (variant: Architecture, context: DesignContext): string[] => {
    const gaps: string[] = [];
    const kept = keptRules(context.journeys);
    const data = touched(context.journeys);
    const label = `variant "${variant.name}"`;
    if (variant.components !== undefined)
        gaps.push(`${label}: components are written later, for the chosen variant only`);
    const names = variant.domains.map((domain) => domain.name);
    if (new Set(names).size !== names.length) gaps.push(`${label}: two domains share a name`);
    const known = new Set(names);
    for (const domain of variant.domains) {
        for (const name of domain.dependsOn)
            if (!known.has(name) || name === domain.name)
                gaps.push(`${label}: domain ${domain.name} depends on ${name}, which is not another domain`);
        for (const leak of [
            ...leaksIn(domain.name, context.legacy.identifiers),
            ...leaksIn(domain.concept, context.legacy.identifiers),
        ])
            gaps.push(`${label}: domain ${domain.name} carries the old system's name "${leak}"`);
    }
    const cycle = cycleIn(dependsGraph(variant.domains));
    if (cycle.length > 0) gaps.push(`${label}: domains depend on each other in a cycle (${cycle.join(" > ")})`);
    const owners = new Map<string, string[]>();
    for (const domain of variant.domains)
        for (const id of domain.rules) owners.set(id, [...(owners.get(id) ?? []), domain.name]);
    const lost = missing(kept, new Set(owners.keys()));
    if (lost.count > 0) gaps.push(`${label}: ${lost.count} kept rules belong to no domain: ${lost.text}`);
    for (const [id, who] of owners) {
        if (who.length > 1) gaps.push(`${label}: rule ${id} belongs to more than one domain (${who.join(", ")})`);
        if (!kept.has(id)) gaps.push(`${label}: rule ${id} is not kept by any chosen step`);
    }
    const factNames = variant.domains.flatMap((domain) => domain.facts.map((fact) => fact.name));
    if (new Set(factNames).size !== factNames.length) gaps.push(`${label}: two facts share a name`);
    const carried = new Set(variant.domains.flatMap((domain) => domain.facts.flatMap((fact) => fact.from)));
    const lostData = missing(data, carried);
    if (lostData.count > 0)
        gaps.push(`${label}: ${lostData.count} kinds of data touched by steps are in no fact: ${lostData.text}`);
    for (const domain of variant.domains)
        for (const fact of domain.facts)
            for (const relation of fact.relates)
                if (!factNames.includes(relation.to))
                    gaps.push(`${label}: fact ${fact.name} relates to ${relation.to}, which is not a fact`);
    const holds = new Map<string, number>();
    for (const container of variant.containers) {
        if (!techInStack(container.tech, context.stack))
            gaps.push(
                `${label}: container ${container.name} names "${container.tech}", which is no phrase of the Target Stack`,
            );
        if (container.kind !== "store" && container.holds.length === 0)
            gaps.push(`${label}: container ${container.name} holds no domain`);
        for (const name of container.holds) {
            // A store keeps the data of domains that something else runs, so it does not count as holding them.
            if (container.kind !== "store") holds.set(name, (holds.get(name) ?? 0) + 1);
            if (!known.has(name))
                gaps.push(`${label}: container ${container.name} holds ${name}, which is not a domain`);
        }
        for (const leak of leaksIn(container.name, context.legacy.identifiers))
            gaps.push(`${label}: container ${container.name} carries the old system's name "${leak}"`);
    }
    for (const name of names)
        if (holds.get(name) !== 1)
            gaps.push(`${label}: domain ${name} is held by ${holds.get(name) ?? 0} containers, not one`);
    const needs = new Map<string, number>();
    for (const integration of variant.integrations) {
        needs.set(integration.need, (needs.get(integration.need) ?? 0) + 1);
        if (!known.has(integration.domain))
            gaps.push(`${label}: an integration is owned by ${integration.domain}, which is not a domain`);
    }
    for (const need of context.needs)
        if (needs.get(need) !== 1)
            gaps.push(`${label}: outside system ${need} has ${needs.get(need) ?? 0} integrations, not one`);
    for (const need of needs.keys())
        if (!context.needs.includes(need)) gaps.push(`${label}: integration for ${need}, which no chosen task reaches`);
    return gaps;
};

/**
 * The gate of the architecture job, at domain level: C4 (rules partitioned), C5 (boundaries), the stack and names part
 * of C6, and the shape of the variants.
 * @param variants the variants
 * @param context what the chosen journeys and the request say
 * @returns the gaps
 */
export const shapeGaps = (variants: readonly Architecture[], context: DesignContext): string[] => {
    const gaps: string[] = [];
    if (variants.length < 2) gaps.push("write at least two variants");
    const recommended = variants.filter((variant) => variant.recommended !== undefined);
    if (recommended.length !== 1) gaps.push(`exactly one variant is recommended (found ${recommended.length})`);
    if (new Set(variants.map((variant) => variant.name)).size !== variants.length)
        gaps.push("two variants share a name");
    for (const variant of variants) gaps.push(...variantGaps(variant, context));
    return gaps;
};

/** What a domain's components job needs besides the architecture. */
export type ComponentContext = DesignContext & {
    architecture: Architecture;
    domain: string;
    /** Names of components already written by the domains this one depends on. */
    available: readonly string[];
    /** The step ids the domain may serve. */
    relevant: readonly string[];
};

/**
 * The gate of one domain's components job.
 * @param components what the job wrote
 * @param context the architecture, the domain and what earlier jobs wrote
 * @returns the gaps
 */
export const componentJobGaps = (components: readonly Component[], context: ComponentContext): string[] => {
    const gaps: string[] = [];
    const domain = context.architecture.domains.find((each) => each.name === context.domain);
    if (domain === undefined) return [`no domain ${context.domain}`];
    const names = components.map((component) => component.name);
    if (new Set(names).size !== names.length || names.some((name) => context.available.includes(name)))
        gaps.push("two components share a name");
    const own = new Set(names);
    const relevant = new Set(context.relevant);
    const modules = components.map((component) => component.module);
    if (new Set(modules).size !== modules.length) gaps.push("two components share a module");
    const enforced = new Map<string, number>();
    for (const component of components) {
        const label = `component ${component.name}`;
        if (component.domain !== context.domain)
            gaps.push(`${label}: belongs to domain ${component.domain}, not ${context.domain}`);
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(component.module))
            gaps.push(`${label}: module "${component.module}" is not kebab-case`);
        for (const use of component.uses)
            if (!own.has(use) && !context.available.includes(use))
                gaps.push(`${label}: uses ${use}, which is not a component of this domain or of one it depends on`);
        for (const id of component.serves)
            if (!relevant.has(id)) gaps.push(`${label}: serves step ${id}, which does not touch this domain`);
        for (const id of component.enforces) {
            enforced.set(id, (enforced.get(id) ?? 0) + 1);
            if (!domain.rules.some((rule) => rule === id))
                gaps.push(`${label}: enforces rule ${id}, which the domain does not own`);
        }
        if (component.serves.length === 0 && component.platform === undefined && component.adapts === undefined)
            gaps.push(`${label}: serves no step; list the steps it carries out, or say why it exists`);
        for (const leak of leaksIn(component.name, context.legacy.identifiers))
            gaps.push(`${label}: carries the old system's name "${leak}"`);
    }
    for (const id of domain.rules)
        if (enforced.get(id) !== 1) gaps.push(`rule ${id} is enforced by ${enforced.get(id) ?? 0} components, not one`);
    const mine = context.architecture.integrations
        .filter((each) => each.domain === context.domain)
        .map((each) => each.need);
    for (const need of mine)
        if (components.filter((each) => each.adapts === need).length !== 1)
            gaps.push(`outside system ${need} needs exactly one adapter component`);
    for (const component of components)
        if (component.adapts !== undefined && !mine.some((need) => need === component.adapts))
            gaps.push(`component ${component.name} adapts ${component.adapts}, which this domain does not own`);
    const cycle = cycleIn(
        new Map(components.map((component) => [component.name, component.uses.filter((use) => own.has(use))])),
    );
    if (cycle.length > 0) gaps.push(`components call each other in a cycle (${cycle.join(" > ")})`);
    return gaps;
};

/**
 * The checks C2 to C6 across a whole chosen architecture with its components.
 * @param architecture the chosen variant with its components
 * @param context what the chosen journeys and the request say
 * @returns the gaps
 */
export const finalGaps = (architecture: Architecture, context: DesignContext): string[] => {
    const gaps = variantGaps({ ...architecture, components: undefined }, context);
    const components = architecture.components ?? [];
    const byName = new Map(components.map((component) => [component.name, component]));
    if (byName.size !== components.length) gaps.push("two components share a name");
    const domains = new Map(architecture.domains.map((domain) => [domain.name, domain]));
    const factsOf = (name: string) => new Set<string>(domains.get(name)?.facts.flatMap((fact) => fact.from) ?? []);
    const reach = (name: string): Set<string> => {
        const all = new Set<string>(factsOf(name));
        for (const dep of domains.get(name)?.dependsOn ?? []) for (const id of factsOf(dep)) all.add(id);
        return all;
    };
    for (const journey of context.journeys)
        journey.steps.forEach((step) => {
            const serving = components.filter((component) => component.serves.includes(step.id));
            if (serving.length === 0) {
                gaps.push(`step ${step.id} is served by no component`);
                return;
            }
            const reachable = new Set(serving.flatMap((component) => [...reach(component.domain)]));
            const lost = missing(step.touches, reachable);
            if (lost.count > 0)
                gaps.push(
                    `step ${step.id}: the data ${lost.text} is not owned by the serving components' domains or those they depend on`,
                );
        });
    const stepIds = new Set(context.journeys.flatMap((journey) => journey.steps.map((step) => step.id)));
    for (const component of components) {
        if (component.serves.length === 0 && component.platform === undefined && component.adapts === undefined)
            gaps.push(`component ${component.name} serves no step and is not marked as platform`);
        for (const id of component.serves)
            if (!stepIds.has(id))
                gaps.push(`component ${component.name} serves step ${id}, which no chosen journey has`);
        if (!domains.has(component.domain))
            gaps.push(`component ${component.name} belongs to ${component.domain}, which is not a domain`);
        for (const use of component.uses) {
            const used = byName.get(use);
            if (used === undefined) gaps.push(`component ${component.name} uses ${use}, which does not exist`);
            else if (
                used.domain !== component.domain &&
                !(domains.get(component.domain)?.dependsOn ?? []).includes(used.domain)
            )
                gaps.push(
                    `component ${component.name} reaches domain ${used.domain}, which its domain does not depend on`,
                );
        }
    }
    for (const domain of architecture.domains)
        if (!components.some((component) => component.domain === domain.name))
            gaps.push(`domain ${domain.name} has no component`);
    const enforcers = new Map<string, string[]>();
    for (const component of components)
        for (const id of component.enforces) enforcers.set(id, [...(enforcers.get(id) ?? []), component.name]);
    for (const id of keptRules(context.journeys))
        if ((enforcers.get(id) ?? []).length !== 1)
            gaps.push(`rule ${id} is enforced by ${(enforcers.get(id) ?? []).length} components, not one`);
    const cycle = cycleIn(new Map(components.map((component) => [component.name, [...component.uses]])));
    if (cycle.length > 0) gaps.push(`components call each other in a cycle (${cycle.join(" > ")})`);
    for (const need of context.needs)
        if (components.filter((component) => component.adapts === need).length !== 1)
            gaps.push(`outside system ${need} has no single adapter component`);
    return gaps;
};

/**
 * What an architecture variant scores at domain level, for the person choosing.
 * @param architecture the variant
 * @param journeys the chosen journeys
 * @returns steps served, rules assigned and the domains that serve no step
 */
export const scoreOf = (architecture: Architecture, journeys: readonly StoredJourney[]) => {
    const steps = journeys.flatMap((journey) => journey.steps);
    const serves = (domain: Domain, step: (typeof steps)[number]) =>
        step.honours.some((id) => domain.rules.includes(id)) ||
        step.touches.some((id) => domain.facts.some((fact) => fact.from.includes(id)));
    const kept = keptRules(journeys);
    return {
        steps: steps.length,
        stepsServed: steps.filter((step) => architecture.domains.some((domain) => serves(domain, step))).length,
        rules: kept.size,
        rulesAssigned: [...kept].filter((id) =>
            architecture.domains.some((domain) => domain.rules.some((rule) => rule === id)),
        ).length,
        idleDomains: architecture.domains
            .filter((domain) => !steps.some((step) => serves(domain, step)))
            .map((domain) => domain.name),
    };
};

/** The step ids a domain may serve: those that honour its rules or touch its data. */
export const relevantSteps = (domain: Domain, journeys: readonly StoredJourney[]) =>
    journeys.flatMap((journey) =>
        journey.steps
            .filter(
                (step) =>
                    step.honours.some((id) => domain.rules.includes(id)) ||
                    step.touches.some((id) => domain.facts.some((fact) => fact.from.includes(id))),
            )
            .map((step) => step.id as string),
    );
