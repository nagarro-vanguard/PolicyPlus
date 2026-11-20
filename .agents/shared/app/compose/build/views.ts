import { compareText, distinct } from "../io";
import type { Payloads } from "../inputs/payloads";
import type { Facts } from "./facts";
import type { ArchitectureView } from "./journeys";
import { sortByText } from "./text";
import {
    componentKindWords,
    containerKindWords,
    layerGroupWords,
    outsideFrameWords,
    outsideKindWords,
    outsideStyle,
    partKindWords,
    questions,
    relationWords,
    words,
} from "./vocabulary";

/*
 * The views of the case: an ordered list, each one a picture a person can ask for. A view is boxes (each a record of
 * the case, with its kind in words and its own sentence), frames that group them (named by the record or the place that
 * frames them) and lines between boxes, each a kind of relation in plain words. A line is worked out here from facts
 * that hold between the boxes; an agent never writes one, and no line carries a count. Every view has a text version
 * that says each line, so a picture never carries anything its text does not. The app renders any list of views and
 * holds no word of its own about them.
 *
 * Today's views come from the analysis: what the system does, what it is made of, how its code is layered, what it
 * reaches, what data it keeps and how that changes. A picture the briefing asked for (its question, its caption and
 * the records it named) is one view; one it did not ask for is drawn once with a default question. The new system's
 * views come from the chosen architecture and each option's own record.
 */

export const viewpoints = [
    "functional",
    "information",
    "system",
    "integration",
    "deployment",
    "decisions",
    "layers",
] as const;
export type Viewpoint = (typeof viewpoints)[number];

/** How a box is drawn: the only thing the app decides about a kind of box, and it holds no words for it. */
export type BoxStyle = "system" | "store" | "outside" | "plain";

export type ViewNode = {
    id: string;
    label: string;
    kind: BoxStyle;
    /** What the box is, in words. */
    kindWords: string;
    group: string | null;
    /** What the record behind the box says about itself, or null when it says nothing. */
    sentence: string | null;
};

export type View = {
    key: string;
    /** Where the view sits: `today.<viewpoint>`, `target.<viewpoint>` or `variant.<n>.<viewpoint>`. */
    section: string;
    viewpoint: Viewpoint;
    /** The question the view answers. */
    title: string;
    caption: string | null;
    nodes: ViewNode[];
    groups: { id: string; words: string }[];
    edges: { from: string; to: string; relation: string }[];
    legend: { relation: string; words: string }[];
    text: string[];
    shown: boolean;
};

type Frame = { id: string; words: string };
type Line = { from: string; to: string; relation: string };

/** Finish a view: its lines one per pair and relation, its legend, its text version and whether it is worth showing. */
const finish = (
    key: string,
    section: string,
    viewpoint: Viewpoint,
    title: string,
    caption: string | null,
    nodes: ViewNode[],
    groups: Frame[],
    lines: readonly Line[],
): View => {
    const ids = new Set(nodes.map((node) => node.id));
    const edges = [
        ...new Map(
            lines
                .filter((line) => line.from !== line.to && ids.has(line.from) && ids.has(line.to))
                .map((line) => [`${line.from}\u0000${line.to}\u0000${line.relation}`, line] as const),
        ).values(),
    ].sort(
        (one, other) =>
            compareText(one.from, other.from) || compareText(one.to, other.to) || compareText(one.relation, other.relation),
    );
    const label = new Map(nodes.map((node) => [node.id, node.label]));
    const used = distinct(edges.map((edge) => edge.relation));
    return {
        key,
        section,
        viewpoint,
        title,
        caption: caption === null || caption.trim() === "" ? null : caption,
        nodes,
        groups,
        edges: edges.map((edge) => ({ from: edge.from, to: edge.to, relation: edge.relation })),
        legend: used.map((relation) => ({ relation, words: relationWords(relation) })),
        text: edges.map(
            (edge) => `${label.get(edge.from) ?? edge.from} ${relationWords(edge.relation)} ${label.get(edge.to) ?? edge.to}`,
        ),
        shown: nodes.length >= 2 && (edges.length >= 1 || groups.length >= 2),
    };
};

/** The frames the boxes' groups need, in the order the groups first appear; one group alone frames nothing. */
const framesOf = (nodes: readonly ViewNode[], wordsOf: (group: string) => string, alone = false): Frame[] => {
    const groups = distinct(nodes.map((node) => node.group).filter((group): group is string => group !== null));
    return groups.length < 2 && !alone ? [] : groups.map((group) => ({ id: group, words: wordsOf(group) }));
};

const sentenceOf = (text: string | null | undefined) => (text === undefined || text === null || text.trim() === "" ? null : text);

/** The pictures the briefing asked for, by the family of facts each draws; none asked for yields one default. */
type Wanted = { question: string | null; caption: string | null; records: ReadonlySet<string> };
const wantedOf = (facts: Facts, kind: string): Wanted[] => {
    const asked = facts.figures.filter((each) => each.kind === kind);
    return asked.length === 0
        ? [{ question: null, caption: null, records: new Set() }]
        : asked.map((each) => ({
              question: each.question,
              caption: each.caption,
              records: new Set(each.records),
          }));
};
const takes = (wanted: Wanted, id: string) => wanted.records.size === 0 || wanted.records.has(id);
const keyed = (base: string, at: number) => (at === 0 ? base : `${base}-${at + 1}`);

/** The style and words of a box for an outside system. */
const outsideNode = (each: Facts["outside"][number], sentence: string | null = null): ViewNode => ({
    id: each.id,
    label: each.name,
    kind: outsideStyle(each.kind),
    kindWords: outsideKindWords(each.kind),
    group: each.kind,
    sentence,
});

/**
 * Today's views.
 * @param facts the facts
 * @param payloads the payloads, for the analysis's links between layers and parts
 * @returns the views
 */
const todayViews = (facts: Facts, payloads: Payloads): View[] => {
    const views: View[] = [];

    // What the system does: the capabilities, framed by the area that holds them.
    {
        const capabilities = facts.capabilities.filter((each) => each.area !== null);
        const areaName = new Map(facts.areas.map((area) => [area.id, area.name]));
        const nodes: ViewNode[] = capabilities.map((capability) => ({
            id: capability.id,
            label: capability.name,
            kind: "plain",
            kindWords: words.capability,
            group: capability.area,
            sentence: sentenceOf(capability.purpose),
        }));
        views.push(
            finish(
                "today/functional",
                "today.functional",
                "functional",
                questions.functional,
                null,
                nodes,
                framesOf(nodes, (group) => areaName.get(group) ?? group),
                [],
            ),
        );
    }

    // What the system is made of: its parts and what each reaches (more than one part, or it is the context again).
    for (const [at, wanted] of wantedOf(facts, "parts").entries()) {
        const parts = facts.parts.filter((each) => takes(wanted, each.id));
        const outside = new Map(facts.outside.map((each) => [each.id, each]));
        const links = (payloads.knowledge.partLinks ?? []).filter(
            (link) => parts.some((part) => part.id === link.from) && outside.has(link.to),
        );
        const nodes: ViewNode[] = [
            ...parts.map((part) => ({
                id: part.id,
                label: part.name,
                kind: "system" as const,
                kindWords: partKindWords(part.kind),
                group: "part",
                sentence: sentenceOf(part.purpose),
            })),
            ...distinct(links.map((link) => link.to)).flatMap((id) => {
                const each = outside.get(id);
                return each === undefined ? [] : [outsideNode(each)];
            }),
        ];
        if (parts.length < 2) continue;
        views.push(
            finish(
                keyed("today/system", at),
                "today.system",
                "system",
                wanted.question ?? questions.parts,
                wanted.caption,
                nodes,
                framesOf(nodes, (group) => (group === "part" ? words.parts : outsideFrameWords(group))),
                links.map((link) => ({ from: link.from, to: link.to, relation: link.kind })),
            ),
        );
    }

    // How the code is layered.
    for (const [at, wanted] of wantedOf(facts, "layers").entries()) {
        const layers = sortByText(
            facts.layers.filter((each) => takes(wanted, each.id)),
            (layer) => layer.group,
            (layer) => layer.name,
        );
        const nodes: ViewNode[] = layers.map((layer) => ({
            id: layer.id,
            label: layer.name,
            kind: "plain",
            kindWords: words.layer,
            group: layer.group,
            sentence: sentenceOf(layer.purpose),
        }));
        views.push(
            finish(
                keyed("today/layers", at),
                "today.layers",
                "layers",
                wanted.question ?? questions.layers,
                wanted.caption,
                nodes,
                framesOf(nodes, layerGroupWords),
                payloads.system.edges.map((edge) => ({ from: edge.from, to: edge.to, relation: edge.kind })),
            ),
        );
    }

    // What it reaches outside itself.
    for (const [at, wanted] of wantedOf(facts, "integration").entries()) {
        const outside = facts.outside.filter((each) => takes(wanted, each.id));
        const nodes: ViewNode[] = [
            {
                id: "system",
                label: facts.system.name,
                kind: "system",
                kindWords: words.system,
                group: "system",
                sentence: sentenceOf(facts.system.purpose),
            },
            ...outside.map((each) => outsideNode(each)),
        ];
        views.push(
            finish(
                keyed("today/integration", at),
                "today.integration",
                "integration",
                wanted.question ?? questions.integration,
                wanted.caption,
                nodes,
                framesOf(nodes.filter((node) => node.group !== "system"), outsideFrameWords),
                outside.flatMap((each) =>
                    distinct(each.reach.map((reach) => reach.access)).map((access) => ({
                        from: "system",
                        to: each.id,
                        relation: access,
                    })),
                ),
            ),
        );
    }

    // Which capabilities keep which data, and how each kind of data changes over time.
    for (const [at, wanted] of wantedOf(facts, "data").entries()) {
        const capabilityOf = new Map(facts.capabilities.map((each) => [each.id, each]));
        const entityOf = new Map(facts.entities.map((each) => [each.id, each]));
        const uses = facts.dataUse.filter(
            (each) =>
                capabilityOf.has(each.capability) &&
                entityOf.has(each.entity) &&
                (takes(wanted, each.entity) || takes(wanted, each.capability)),
        );
        const nodes: ViewNode[] = [
            ...distinct(uses.map((each) => each.capability)).flatMap((id) => {
                const each = capabilityOf.get(id);
                return each === undefined
                    ? []
                    : [
                          {
                              id,
                              label: each.name,
                              kind: "plain" as const,
                              kindWords: words.capability,
                              group: "capability",
                              sentence: sentenceOf(each.purpose),
                          },
                      ];
            }),
            ...distinct(uses.map((each) => each.entity)).flatMap((id) => {
                const each = entityOf.get(id);
                return each === undefined
                    ? []
                    : [
                          {
                              id,
                              label: each.name,
                              kind: "store" as const,
                              kindWords: words.kindOfData,
                              group: "data",
                              sentence: sentenceOf(each.purpose),
                          },
                      ];
            }),
        ];
        views.push(
            finish(
                keyed("today/data", at),
                "today.information",
                "information",
                wanted.question ?? questions.data,
                wanted.caption,
                nodes,
                framesOf(nodes, (group) => (group === "capability" ? words.capabilities : words.dataItKeeps)),
                uses.map((each) => ({
                    from: each.capability,
                    to: each.entity,
                    relation: each.reads && each.saves ? "reads and saves" : each.saves ? "saves" : "reads",
                })),
            ),
        );
    }
    for (const [at, wanted] of wantedOf(facts, "states").entries()) {
        const lifecycles = facts.lifecycles.filter((each) => takes(wanted, each.entity));
        const nodes: ViewNode[] = lifecycles.flatMap((lifecycle) =>
            distinct(lifecycle.transitions.flatMap((each) => [each.from, each.to]).filter((state) => state !== "")).map(
                (state) => ({
                    id: `${lifecycle.entity}:${state}`,
                    label: state,
                    kind: "plain" as const,
                    kindWords: words.state,
                    group: lifecycle.entity,
                    sentence: null,
                }),
            ),
        );
        const name = new Map(lifecycles.map((each) => [each.entity, each.name]));
        views.push(
            finish(
                keyed("today/states", at),
                "today.information",
                "information",
                wanted.question ?? questions.states,
                wanted.caption,
                nodes,
                framesOf(nodes, (group) => name.get(group) ?? group, true),
                lifecycles.flatMap((lifecycle) =>
                    lifecycle.transitions
                        .filter((each) => each.from !== "")
                        .map((each) => ({
                            from: `${lifecycle.entity}:${each.from}`,
                            to: `${lifecycle.entity}:${each.to}`,
                            relation: "becomes",
                        })),
                ),
            ),
        );
    }
    return views;
};

type Container = {
    name: string;
    kind: string;
    does: string | null;
    runsOn: string | null;
    runsOnWords: string | null;
    holds: readonly string[];
};

/** The place a part runs, as a frame: the words the catalogue gives, or the saying that it is not stated. */
const placeOf = (container: Container): Frame => ({
    id: container.runsOn ?? "unstated",
    words: container.runsOnWords ?? container.runsOn ?? words.unstatedPlace,
});

/**
 * Where each part of a design runs: parts in a frame per place, a part that keeps data beside the store that keeps the
 * data of a domain it holds, and parts that use one another.
 */
const deploymentView = (
    key: string,
    section: string,
    title: string,
    caption: string | null,
    containers: readonly Container[],
    talks: readonly { from: string; to: string }[],
): View => {
    const nodes: ViewNode[] = containers.map((container) => ({
        id: container.name,
        label: container.name,
        kind: container.kind === "store" ? "store" : "system",
        kindWords: containerKindWords(container.kind),
        group: placeOf(container).id,
        sentence: sentenceOf(container.does),
    }));
    const frames = [...new Map(containers.map((container) => [placeOf(container).id, placeOf(container)])).values()];
    const stores = containers.filter((container) => container.kind === "store");
    const keeps = containers
        .filter((container) => container.kind !== "store")
        .flatMap((container) =>
            stores
                .filter((store) => store.holds.some((domain) => container.holds.includes(domain)))
                .map((store) => ({ from: container.name, to: store.name, relation: "keeps" })),
        );
    return finish(
        key,
        section,
        "deployment",
        title,
        caption,
        nodes,
        frames,
        [...keeps, ...talks.map((talk) => ({ from: talk.from, to: talk.to, relation: "uses" }))],
    );
};

/**
 * The views of the new system: the chosen architecture, and each option the person did not choose drawn the same way.
 * @param facts the facts, for the outside systems' kinds
 * @param architecture the chosen architecture
 * @returns the views
 */
const targetViews = (facts: Facts, architecture: ArchitectureView): View[] => {
    const views: View[] = [];
    const domains = architecture.domains;
    const concept = new Map(domains.map((domain) => [domain.name, domain.concept]));

    // How the business is cut: the domains and which uses which.
    {
        const nodes: ViewNode[] = domains.map((domain) => ({
            id: domain.name,
            label: domain.name,
            kind: "plain",
            kindWords: words.domain,
            group: null,
            sentence: sentenceOf(domain.concept),
        }));
        views.push(
            finish(
                "target/functional",
                "target.functional",
                "functional",
                questions.targetFunctional,
                null,
                nodes,
                [],
                [
                    ...architecture.domainEdges.map((edge) => ({ from: edge.from, to: edge.to, relation: "uses" })),
                    ...domains.flatMap((domain) =>
                        domain.dependsOn.map((other) => ({ from: domain.name, to: other, relation: "uses" })),
                    ),
                ],
            ),
        );
    }

    // Where each part runs.
    views.push(
        deploymentView(
            "target/deployment",
            "target.deployment",
            questions.targetDeployment,
            architecture.idea,
            architecture.containers,
            architecture.talks,
        ),
    );

    // What is inside each domain: its components and the calls between them.
    const domainOfComponent = new Map(architecture.components.map((each) => [each.name, each.domain]));
    for (const domain of domains) {
        const own = architecture.components.filter((each) => each.domain === domain.name);
        const folded = new Set<string>();
        const lines: Line[] = [];
        for (const component of own)
            for (const used of component.uses) {
                const other = domainOfComponent.get(used);
                if (other === domain.name) lines.push({ from: component.name, to: used, relation: "call" });
                else if (other !== undefined) {
                    folded.add(other);
                    lines.push({ from: component.name, to: `domain:${other}`, relation: "call" });
                }
            }
        const nodes: ViewNode[] = [
            ...own.map((component) => ({
                id: component.name,
                label: component.name,
                kind: "plain" as const,
                kindWords: component.kind === null ? words.capability : componentKindWords(component.kind),
                group: null,
                sentence: sentenceOf(component.responsibility),
            })),
            ...[...folded].sort(compareText).map((other) => ({
                id: `domain:${other}`,
                label: other,
                kind: "plain" as const,
                kindWords: words.anotherDomain,
                group: null,
                sentence: sentenceOf(concept.get(other)),
            })),
        ];
        views.push(
            finish(
                `target/system/${domain.slug}`,
                "target.system",
                "system",
                questions.inside(domain.name),
                domain.concept,
                nodes,
                [],
                lines,
            ),
        );
    }

    // What it reaches outside itself, and which domain holds each contact.
    {
        const outsideOf = new Map(facts.outside.map((each) => [each.id, each]));
        const reached = architecture.integrations.filter((each) => outsideOf.has(each.outside));
        const nodes: ViewNode[] = [
            ...distinct(reached.map((each) => each.domain)).map((name) => ({
                id: `domain:${name}`,
                label: name,
                kind: "plain" as const,
                kindWords: words.domain,
                group: "domain",
                sentence: sentenceOf(concept.get(name)),
            })),
            ...distinct(reached.map((each) => each.outside)).flatMap((id) => {
                const each = outsideOf.get(id);
                return each === undefined
                    ? []
                    : [outsideNode(each, sentenceOf(reached.find((integration) => integration.outside === id)?.how))];
            }),
        ];
        views.push(
            finish(
                "target/integration",
                "target.integration",
                "integration",
                questions.targetIntegration,
                null,
                nodes,
                framesOf(nodes, (group) => (group === "domain" ? words.domains : outsideFrameWords(group))),
                reached.map((each) => ({ from: `domain:${each.domain}`, to: each.outside, relation: "reaches" })),
            ),
        );
    }

    // Which part keeps the data of which domain.
    {
        const stores = architecture.containers.filter((container) => container.kind === "store");
        const kept = distinct(stores.flatMap((store) => store.holds));
        const nodes: ViewNode[] = [
            ...kept.map((name) => ({
                id: `domain:${name}`,
                label: name,
                kind: "plain" as const,
                kindWords: words.domain,
                group: "domain",
                sentence: sentenceOf(concept.get(name)),
            })),
            ...stores.map((store) => ({
                id: store.name,
                label: store.name,
                kind: "store" as const,
                kindWords: containerKindWords(store.kind),
                group: "store",
                sentence: sentenceOf(store.does),
            })),
        ];
        views.push(
            finish(
                "target/information",
                "target.information",
                "information",
                questions.targetInformation,
                null,
                nodes,
                framesOf(nodes, (group) => (group === "domain" ? words.domains : containerKindWords("store"))),
                stores.flatMap((store) =>
                    store.holds.map((name) => ({ from: `domain:${name}`, to: store.name, relation: "keeps" })),
                ),
            ),
        );
    }

    // Each option not chosen, drawn the way the chosen one is.
    architecture.alternatives.forEach((alternative, at) => {
        views.push(
            deploymentView(
                `variant/${at + 1}/deployment`,
                `variant.${at + 1}.deployment`,
                questions.variantDeployment,
                alternative.idea,
                alternative.containers,
                [],
            ),
        );
    });
    return views;
};

/**
 * Every view the facts support, in the order a reader meets them: today, the new system, then each option.
 * @param facts the facts
 * @param payloads the payloads
 * @param architecture the chosen architecture
 * @returns the views
 */
export const viewsOf = (facts: Facts, payloads: Payloads, architecture: ArchitectureView | undefined): View[] => [
    ...todayViews(facts, payloads),
    ...(architecture === undefined ? [] : targetViews(facts, architecture)),
];
