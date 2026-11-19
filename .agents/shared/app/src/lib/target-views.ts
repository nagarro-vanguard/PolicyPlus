import type { Diagram } from "./target-diagram";
import type { Architecture, Journey, Legacy } from "./target-types";

const containerOf = (architecture: Architecture, domain: string) =>
    architecture.containers.find((container) => container.kind !== "store" && container.holds.includes(domain));

/** The domains, what each owns, and who relies on whom. */
export const domainMap = (architecture: Architecture): Diagram => ({
    title: "Domains",
    nodes: architecture.domains.map((domain) => ({ id: domain.name, label: domain.name, sub: domain.concept, lines: [`${domain.facts.length} facts, ${domain.rules.length} rules`] })),
    edges: architecture.domains.flatMap((domain) => domain.dependsOn.map((to) => ({ from: domain.name, to, label: "relies on" }))),
});

/** C1: who uses the system and which outside systems it reaches. */
export const context = (architecture: Architecture, journeys: readonly Journey[], legacy: Legacy | undefined): Diagram => {
    const actors = [...new Set(journeys.map((journey) => journey.actor))];
    return {
        title: "System context",
        direction: "RIGHT",
        nodes: [
            { id: "system", label: "The system", sub: `${architecture.domains.length} domains`, kind: "system" },
            ...actors.map((actor) => ({ id: `actor:${actor}`, label: actor, sub: "uses the system", kind: "actor" as const })),
            ...architecture.integrations.map((integration) => ({ id: `outside:${integration.need}`, label: legacy?.externals[integration.need]?.name ?? "An outside system", sub: integration.how, kind: "outside" as const })),
        ],
        edges: [
            ...actors.map((actor) => ({ from: `actor:${actor}`, to: "system", label: "gets tasks done" })),
            ...architecture.integrations.map((integration) => ({ from: "system", to: `outside:${integration.need}`, label: "reaches" })),
        ],
    };
};

/** C2: the parts that are built and run, with the domains each holds. */
export const containers = (architecture: Architecture): Diagram => ({
    title: "Containers",
    nodes: architecture.containers.map((container) => ({ id: container.name, label: container.name, sub: `${container.kind}: ${container.tech}`, lines: container.holds.map((domain) => `holds ${domain}`) })),
    edges: [
        ...architecture.domains.flatMap((domain) => {
            const from = containerOf(architecture, domain.name);
            return domain.dependsOn.flatMap((to) => {
                const target = containerOf(architecture, to);
                return from === undefined || target === undefined || from === target ? [] : [{ from: from.name, to: target.name, label: "calls" }];
            });
        }),
        ...architecture.containers
            .filter((store) => store.kind === "store")
            .flatMap((store) =>
                store.holds.flatMap((domain) => {
                    const from = containerOf(architecture, domain);
                    return from === undefined ? [] : [{ from: from.name, to: store.name, label: "keeps data in" }];
                }),
            ),
    ],
});

/** C3: the components of one container, grouped by domain through their sub line. */
export const components = (architecture: Architecture, container: string): Diagram => {
    const held = architecture.containers.find((each) => each.name === container)?.holds ?? [];
    const own = (architecture.components ?? []).filter((component) => held.includes(component.domain));
    const names = new Set(own.map((component) => component.name));
    const outside = (architecture.components ?? []).filter((component) => !names.has(component.name) && own.some((each) => each.uses.includes(component.name)));
    return {
        title: `Components of ${container}`,
        nodes: [
            ...own.map((component) => ({ id: component.name, label: component.name, sub: `${component.domain}: ${component.responsibility}`, lines: [`serves ${component.serves.length} steps, enforces ${component.enforces.length} rules`] })),
            ...outside.map((component) => ({ id: component.name, label: component.name, sub: `in ${component.domain}`, kind: "other" as const })),
        ],
        edges: own.flatMap((component) => component.uses.map((to) => ({ from: component.name, to, label: "uses" }))),
    };
};

/** Overall: containers with their domains, the outside systems and who reaches them. */
export const overall = (architecture: Architecture, legacy: Legacy | undefined): Diagram => ({
    title: "The whole system",
    nodes: [
        ...containers(architecture).nodes,
        ...architecture.integrations.map((integration) => ({ id: `outside:${integration.need}`, label: legacy?.externals[integration.need]?.name ?? "An outside system", sub: integration.how, kind: "outside" as const })),
    ],
    edges: [
        ...containers(architecture).edges,
        ...architecture.integrations.flatMap((integration) => {
            const container = containerOf(architecture, integration.domain);
            return container === undefined ? [] : [{ from: container.name, to: `outside:${integration.need}`, label: "reaches" }];
        }),
    ],
});

/** Integration: each outside system, the adapter that owns it, and its domain. */
export const integration = (architecture: Architecture, legacy: Legacy | undefined): Diagram => ({
    title: "Integration",
    direction: "RIGHT",
    nodes: architecture.integrations.flatMap((each) => {
        const adapter = (architecture.components ?? []).find((component) => component.adapts === each.need);
        return [
            { id: `outside:${each.need}`, label: legacy?.externals[each.need]?.name ?? "An outside system", sub: "outside", kind: "outside" as const },
            { id: `adapter:${each.need}`, label: adapter?.name ?? `${each.domain} adapter`, sub: `${each.domain}: ${each.how}` },
        ];
    }),
    edges: architecture.integrations.map((each) => ({ from: `adapter:${each.need}`, to: `outside:${each.need}`, label: "reads or writes" })),
});

/** The kinds of data a journey touches, each with the domain that owns it, and the kinds of other domains they relate to. */
export const touchedFacts = (architecture: Architecture, journey: Journey) => {
    const touched = new Set(journey.steps.flatMap((step) => step.touches));
    const mine = architecture.domains.flatMap((domain) => domain.facts.filter((fact) => fact.from.some((id) => touched.has(id))).map((fact) => ({ fact, domain: domain.name })));
    const names = new Set(mine.map((each) => each.fact.name));
    const related = architecture.domains.flatMap((domain) => domain.facts.filter((fact) => !names.has(fact.name) && mine.some((each) => each.fact.relates.some((relation) => relation.to === fact.name))).map((fact) => ({ fact, domain: domain.name })));
    return { mine, related };
};

/** ERD of a journey: the facts its steps touch, marked with the domain that owns them; facts of other domains are grey. */
export const erd = (architecture: Architecture, journey: Journey): Diagram => {
    const { mine, related } = touchedFacts(architecture, journey);
    const count = new Map<string, number>();
    for (const each of mine) count.set(each.domain, (count.get(each.domain) ?? 0) + 1);
    const lead = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const names = new Set(mine.map((each) => each.fact.name));
    return {
        title: `Data of ${journey.name}`,
        direction: "RIGHT",
        nodes: [...mine, ...related].map(({ fact, domain }) => ({ id: fact.name, label: fact.name, sub: `owned by ${domain}`, lines: fact.keys.map((key) => `key: ${key}`), kind: domain === lead && names.has(fact.name) ? ("primary" as const) : ("other" as const) })),
        edges: [...mine, ...related].flatMap(({ fact }) => fact.relates.map((relation) => ({ from: fact.name, to: relation.to, label: relation.how }))),
    };
};
