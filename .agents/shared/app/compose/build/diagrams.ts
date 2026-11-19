import { compareText, distinct } from "../io";
import type { Payloads } from "../inputs/payloads";
import type { Facts } from "./facts";
import type { ArchitectureView, ProposedJourney, TodayJourney } from "./journeys";
import { sortByText } from "./text";

/*
 * Graph data for each kind of diagram whose facts exist, with an edge legend and a text version of every edge, so a
 * diagram never carries anything its text does not. Captions are the analysis's own Figure choices where one exists for
 * that kind; otherwise the caption is left empty for the app to leave out.
 */

export const diagramKinds = ["organisation", "context", "navigation", "data", "flow", "compare"] as const;
export type DiagramKind = (typeof diagramKinds)[number];

/** The plain words of each kind of edge. */
export const edgeWords: Record<string, string> = {
    call: "calls",
    dispatches: "hands work to",
    renders: "shows",
    request: "sends requests to",
    reads: "reads",
    saves: "saves",
    "reads and saves": "reads and saves",
    leadsTo: "leads to",
    uses: "uses",
    becomes: "becomes",
    replacedBy: "is done in the new way by",
};

export type Diagram = {
    key: string;
    kind: DiagramKind;
    /** What it is about: `system`, or a node of the hierarchy, a journey, an entity or the target. */
    subject: string;
    caption: string | null;
    question: string | null;
    nodes: { id: string; label: string; group: string | null; count: number | null }[];
    edges: { from: string; to: string; kind: string; count: number }[];
    legend: { kind: string; words: string }[];
    text: string[];
    shown: boolean;
};

const figureKinds: Record<string, string> = { organisation: "layers", context: "integration", data: "data" };

/**
 * Finish a diagram: its legend from the kinds of its edges, its text version, and whether it is worth showing (at least
 * two nodes and one edge).
 */
const finish = (
    facts: Facts,
    key: string,
    kind: DiagramKind,
    subject: string,
    nodes: Diagram["nodes"],
    edges: Diagram["edges"],
    figureKind?: string,
): Diagram => {
    const label = new Map(nodes.map((node) => [node.id, node.label]));
    const figure = facts.figures.find((each) => each.kind === (figureKind ?? figureKinds[kind]));
    const sortedEdges = edges.toSorted(
        (one, other) =>
            compareText(one.from, other.from) || compareText(one.to, other.to) || compareText(one.kind, other.kind),
    );
    return {
        key,
        kind,
        subject,
        caption: figure?.caption === undefined || figure.caption === "" ? null : figure.caption,
        question: figure?.question ?? null,
        nodes,
        edges: sortedEdges,
        legend: distinct(sortedEdges.map((edge) => edge.kind)).map((each) => ({
            kind: each,
            words: edgeWords[each] ?? each,
        })),
        text: sortedEdges.map(
            (edge) =>
                `${label.get(edge.from) ?? edge.from} ${edgeWords[edge.kind] ?? edge.kind} ${label.get(edge.to) ?? edge.to}${edge.count > 1 ? ` (${edge.count} times)` : ""}`,
        ),
        shown: nodes.length >= 2 && edges.length >= 1,
    };
};

const tally = (pairs: readonly (readonly [string, string, string, number])[]) => {
    const counts = new Map<string, number>();
    for (const [from, to, kind, count] of pairs)
        counts.set(`${from}\u0000${to}\u0000${kind}`, (counts.get(`${from}\u0000${to}\u0000${kind}`) ?? 0) + count);
    return [...counts].map(([key, count]) => {
        const [from = "", to = "", kind = ""] = key.split("\u0000");
        return { from, to, kind, count };
    });
};

/**
 * Every diagram the facts support.
 * @param facts the facts
 * @param payloads the payloads, for the analysis's links between blocks
 * @param nodeOf the canonical node of each record, for subjects
 * @param today today's journeys
 * @param proposed the chosen journeys
 * @param architecture the chosen architecture
 * @returns the diagrams
 */
export const diagramsOf = (
    facts: Facts,
    payloads: Payloads,
    nodeOf: ReadonlyMap<string, string>,
    today: readonly TodayJourney[],
    proposed: readonly ProposedJourney[],
    architecture: ArchitectureView | undefined,
): Diagram[] => {
    const diagrams: Diagram[] = [];
    const layerIds = new Set(facts.layers.map((layer) => layer.id));

    diagrams.push(
        finish(
            facts,
            "organisation/system",
            "organisation",
            "system",
            sortByText(
                facts.layers,
                (layer) => layer.group,
                (layer) => layer.name,
            ).map((layer) => ({ id: layer.id, label: layer.name, group: layer.group, count: null })),
            tally(
                payloads.system.edges
                    .filter((edge) => edge.from !== edge.to && layerIds.has(edge.from) && layerIds.has(edge.to))
                    .map((edge) => [edge.from, edge.to, edge.kind, edge.links] as const),
            ),
        ),
    );

    diagrams.push(
        finish(
            facts,
            "context/system",
            "context",
            "system",
            [
                { id: "system", label: facts.system.name, group: "system", count: null },
                ...facts.outside.map((each) => ({
                    id: each.id,
                    label: each.name,
                    group: each.kind,
                    count: each.links,
                })),
            ],
            tally(
                facts.outside.flatMap((each) =>
                    each.reach.map((reach) => ["system", each.id, reach.access, reach.links] as const),
                ),
            ),
        ),
    );

    // Navigation: the analysis's leads-to links between blocks, drawn between the places that hold them.
    const surfaceOfAction = new Map(facts.actions.map((action) => [action.id, action.surface]));
    const surfaceOfFile = new Map<string, string>();
    for (const surface of facts.surfaces)
        for (const file of surface.files) if (!surfaceOfFile.has(file)) surfaceOfFile.set(file, surface.key);
    const blockFile = new Map(payloads.index.blocks.map((block) => [block.id, block.file]));
    const placeOf = (block: string) =>
        surfaceOfAction.get(block) ?? surfaceOfFile.get(blockFile.get(block) ?? "") ?? null;
    const navigation = tally(
        payloads.index.links
            .filter((link) => link.kind === "leadsTo")
            .map((link) => [placeOf(link.from), placeOf(link.to)] as const)
            .filter(
                (pair): pair is readonly [string, string] =>
                    pair[0] !== null && pair[1] !== null && pair[0] !== pair[1],
            )
            .map(([from, to]) => [from, to, "leadsTo", 1] as const),
    );
    const navigated = distinct(navigation.flatMap((edge) => [edge.from, edge.to]));
    const surfaceByKey = new Map(facts.surfaces.map((surface) => [surface.key, surface]));
    diagrams.push(
        finish(
            facts,
            "navigation/system",
            "navigation",
            "system",
            navigated.map((key) => ({
                id: key,
                label: surfaceByKey.get(key)?.name ?? key,
                group: surfaceByKey.get(key)?.kind ?? null,
                count: null,
            })),
            navigation,
            "navigation",
        ),
    );

    // Data: which capabilities read or save which data.
    const capabilityName = new Map(facts.capabilities.map((each) => [each.id, each.name]));
    const entityName = new Map(facts.entities.map((each) => [each.id, each.name]));
    const uses = facts.dataUse.filter((each) => capabilityName.has(each.capability) && entityName.has(each.entity));
    diagrams.push(
        finish(
            facts,
            "data/system",
            "data",
            "system",
            [
                ...distinct(uses.map((each) => each.capability)).map((id) => ({
                    id,
                    label: capabilityName.get(id) ?? id,
                    group: "capability",
                    count: null,
                })),
                ...distinct(uses.map((each) => each.entity)).map((id) => ({
                    id,
                    label: entityName.get(id) ?? id,
                    group: "data",
                    count: null,
                })),
            ],
            uses.map((each) => ({
                from: each.capability,
                to: each.entity,
                kind: each.reads && each.saves ? "reads and saves" : each.saves ? "saves" : "reads",
                count: 1,
            })),
        ),
    );
    for (const lifecycle of facts.lifecycles) {
        const states = distinct(
            lifecycle.transitions.flatMap((each) => [each.from === "" ? "(start)" : each.from, each.to]),
        );
        diagrams.push(
            finish(
                facts,
                `data/${nodeOf.get(lifecycle.entity) ?? lifecycle.name}`,
                "data",
                `entity:${lifecycle.entity}`,
                states.map((state) => ({ id: state, label: state, group: null, count: null })),
                tally(
                    lifecycle.transitions.map(
                        (each) => [each.from === "" ? "(start)" : each.from, each.to, "becomes", 1] as const,
                    ),
                ),
                "states",
            ),
        );
    }

    // Flow: the layers each capability's work passes through.
    const layerName = new Map(facts.layers.map((layer) => [layer.id, layer]));
    const actionById = new Map(facts.actions.map((action) => [action.id, action]));
    for (const capability of facts.capabilities) {
        const steps: (readonly [string, string, string, number])[] = [];
        const visits = new Map<string, number>();
        for (const id of capability.actions) {
            const action = actionById.get(id);
            if (action === undefined) continue;
            action.path.forEach((layer, number) => {
                visits.set(layer, (visits.get(layer) ?? 0) + 1);
                const before = action.path[number - 1];
                if (before !== undefined && before !== layer) steps.push([before, layer, "call", 1]);
            });
        }
        diagrams.push(
            finish(
                facts,
                `flow/${capability.slug}`,
                "flow",
                nodeOf.get(capability.id) ?? capability.id,
                [...visits]
                    .sort(([one], [other]) => compareText(one, other))
                    .map(([id, count]) => ({
                        id,
                        label: layerName.get(id)?.name ?? id,
                        group: layerName.get(id)?.group ?? null,
                        count,
                    })),
                tally(steps),
                "flow",
            ),
        );
    }

    // Compare: each chosen journey against today's.
    const todayById = new Map(today.map((journey) => [journey.id, journey]));
    for (const journey of proposed) {
        const before = todayById.get(journey.task);
        if (before === undefined) continue;
        const nodes = [
            ...before.steps.map((step) => ({
                id: `today-${step.number}`,
                label: step.intent,
                group: "today",
                count: null,
            })),
            ...journey.steps.map((step) => ({
                id: `proposed-${step.number}`,
                label: step.intent,
                group: "proposed",
                count: null,
            })),
        ];
        const edges = journey.steps.flatMap((step) =>
            before.steps
                .filter((old) => old.from.some((action) => step.from.includes(action)))
                .map((old) => ({
                    from: `today-${old.number}`,
                    to: `proposed-${step.number}`,
                    kind: "replacedBy",
                    count: 1,
                })),
        );
        diagrams.push(
            finish(facts, `compare/${journey.slug}`, "compare", `journey:${journey.task}`, nodes, edges, "compare"),
        );
    }

    if (architecture !== undefined) {
        diagrams.push(
            finish(
                facts,
                "organisation/target",
                "organisation",
                "target",
                architecture.domains.map((domain) => ({
                    id: domain.name,
                    label: domain.name,
                    group: null,
                    count: domain.components,
                })),
                architecture.domainEdges.map((edge) => ({
                    from: edge.from,
                    to: edge.to,
                    kind: "uses",
                    count: edge.uses,
                })),
                "target-domains",
            ),
        );
        diagrams.push(
            finish(
                facts,
                "context/target",
                "context",
                "target",
                architecture.containers.map((container) => ({
                    id: container.name,
                    label: container.name,
                    group: container.kind,
                    count: null,
                })),
                architecture.talks.map((edge) => ({ from: edge.from, to: edge.to, kind: "uses", count: edge.uses })),
                "target-containers",
            ),
        );
    }
    return diagrams.sort((one, other) => compareText(one.key, other.key));
};
