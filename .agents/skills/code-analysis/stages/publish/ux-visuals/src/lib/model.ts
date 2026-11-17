import { diagrams } from "./diagram-config";
import type { DiagramId } from "./diagram-config";
import type { Action, Capability, Knowledge, Layer, Lifecycle, Screen, System } from "./types";
import { accessWords, groupWords, kindWords, partKindWords, startedWords, wordFor } from "./words";
import { copy } from "./copy";
import { compareText, plural } from "./text";

export type NodeKind =
    "layer" | "group" | "data" | "store" | "outside" | "starter" | "system" | "action" | "part" | "state" | "more";

/** One box of a figure: what it says, and the record ids it stands for, so a figure traces back to the payloads. */
export type FlowNode = {
    readonly id: string;
    readonly label: string;
    readonly sub: string;
    readonly kind: NodeKind;
    readonly ids: readonly string[];
    /** For a "more" box: how many items it folds. */
    readonly hidden?: number;
    /** For a "more" box: what the folded items are called, so the text version can list them. */
    readonly members?: readonly string[];
};

/** One connection: what it does and how many calls or actions the payloads count behind it, worded so the number has a unit. */
export type FlowEdge = {
    readonly id: string;
    readonly from: string;
    readonly to: string;
    readonly verb: string;
    readonly unit: string;
    readonly label: string;
    readonly count: number;
};

type Link = Omit<FlowEdge, "id" | "label">;

/**
 * The words on a connection: what it does, then how many of what, so a number never stands alone.
 * @param verb what the connection does, or nothing
 * @param unit what is counted (singular), or nothing for no number
 * @param count how many
 * @returns the label
 */
const edgeLabel = (verb: string, unit: string, count: number) =>
    [verb, unit === "" ? "" : plural(count, unit)].filter((part) => part !== "").join(" · ");

export type FlowModel = {
    readonly id: DiagramId;
    readonly nodes: readonly FlowNode[];
    readonly edges: readonly FlowEdge[];
    /** How many boxes were folded into "more" boxes: the figure never leaves one out silently. */
    readonly omitted: number;
    /** Layers kept out of the figure because they are project work, not the product, by name. */
    readonly leftOut: readonly string[];
};

const trafficKinds = new Set(["call", "renders", "request", "reads", "saves"]);

/**
 * Connections merged by their ends and what they do: those between the same two boxes that do the same become one, their
 * counts added.
 * @param links the connections
 * @returns the merged connections, in the order they first appear
 */
const merged = (links: readonly Link[]): FlowEdge[] => {
    const byEnds = new Map<string, Link>();
    for (const link of links) {
        if (link.from === link.to) {
            continue;
        }
        const key = `${link.from}>${link.to}>${link.verb}`;
        const seen = byEnds.get(key);
        byEnds.set(key, seen === undefined ? link : { ...seen, count: seen.count + link.count });
    }
    return [...byEnds].map(([id, each]) => ({ ...each, id, label: edgeLabel(each.verb, each.unit, each.count) }));
};

/**
 * Keep at most some boxes: the heaviest stay, the rest fold into one "more" box that takes over their arrows, and the
 * count folded is recorded. Boxes of a kind in `keep` always stay.
 * @param model the figure before capping
 * @param model.nodes the boxes
 * @param model.edges the arrows
 * @param weight how much a box weighs; the heaviest stay
 * @param limit how many boxes at most, the "more" box included
 * @param noun what the folded boxes are, for the "more" box
 * @returns the boxes, the arrows and how many were folded
 */
const capped = (
    model: { readonly nodes: readonly FlowNode[]; readonly edges: readonly FlowEdge[] },
    weight: (node: FlowNode) => number,
    limit: number,
    noun: string,
) => {
    if (model.nodes.length <= limit) {
        return { nodes: [...model.nodes], edges: [...model.edges], omitted: 0 };
    }
    const pinned = model.nodes.filter((node) => node.kind === "system");
    const rest = model.nodes
        .filter((node) => node.kind !== "system")
        .toSorted((one, other) => weight(other) - weight(one) || compareText(one.id, other.id));
    const room = Math.max(1, limit - pinned.length - 1);
    const kept = rest.slice(0, room);
    const folded = rest.slice(room);
    const moreId = "more";
    const more: FlowNode = {
        id: moreId,
        label: `+${folded.length} more`,
        sub: noun,
        kind: "more",
        ids: folded.flatMap((node) => node.ids),
        hidden: folded.length,
        members: folded.map((node) => node.label),
    };
    const keptIds = new Set([...pinned, ...kept].map((node) => node.id));
    const end = (id: string) => (keptIds.has(id) ? id : moreId);
    const edges = merged(
        model.edges.map((edge) => ({
            from: end(edge.from),
            to: end(edge.to),
            verb: edge.verb,
            unit: edge.unit,
            count: edge.count,
        })),
    );
    return { nodes: [...pinned, ...kept, more], edges, omitted: folded.length };
};

/**
 * The layers of the system folded into one box per group, when there are more than a figure can hold.
 * @param layers the layers of the product
 * @param links the links between them, merged
 * @returns the boxes and arrows by group
 */
const groupedLayers = (layers: readonly System["layers"][number][], links: readonly FlowEdge[]) => {
    const groupOf = new Map(layers.map((layer) => [layer.id, layer.group]));
    const groups = new Map<string, System["layers"]>();
    for (const layer of layers) {
        groups.set(layer.group, [...(groups.get(layer.group) ?? []), layer]);
    }
    const nodes: FlowNode[] = [...groups].map(([group, members]) => ({
        id: `group-${group}`,
        label: wordFor(groupWords, group),
        sub: `${plural(members.length, "layer")} · ${plural(
            members.reduce((sum, layer) => sum + layer.blocks, 0),
            "routine",
        )}`,
        kind: "group",
        ids: members.map((layer) => layer.id),
    }));
    const edges = merged(
        links.map((edge) => ({
            from: `group-${groupOf.get(edge.from) ?? ""}`,
            to: `group-${groupOf.get(edge.to) ?? ""}`,
            verb: "",
            unit: "call",
            count: edge.count,
        })),
    );
    return { nodes, edges };
};

/**
 * How the layers of the product depend on each other: a box per layer, an arrow per pair that call, show, request, read or
 * save through one another, with how many links.
 * @param system the system payload
 * @returns the figure, and how many links between layers it holds
 */
export const tiersModel = (system: System, limit?: number) => {
    const product = system.layers.filter((layer) => layer.product);
    const ids = new Set(product.map((layer) => layer.id));
    const links = merged(
        system.edges
            .filter((edge) => trafficKinds.has(edge.kind) && ids.has(edge.from) && ids.has(edge.to))
            .map((edge) => ({ from: edge.from, to: edge.to, verb: "", unit: "call", count: edge.links })),
    );
    const budget = limit ?? diagrams.tiers.budget?.nodes ?? 14;
    const layerNodes: FlowNode[] = product.map((layer) => ({
        id: layer.id,
        label: layer.name,
        sub: plural(layer.blocks, "routine"),
        kind: "layer",
        ids: [layer.id],
    }));
    const base = product.length > budget ? groupedLayers(product, links) : { nodes: layerNodes, edges: links };
    const weightOf = new Map(product.map((layer) => [layer.id, layer.blocks]));
    const model = capped(
        base,
        (node) => node.ids.reduce((sum, id) => sum + (weightOf.get(id) ?? 0), 0),
        budget,
        "layers",
    );
    return {
        facts: { layerLinks: links.length },
        model: { id: "tiers" as const, ...model, leftOut: [] } satisfies FlowModel,
    };
};

/**
 * What the system is started by and reaches: a box for the system, one per kind of starter and one per outside system,
 * folded into one per kind of system when there are too many.
 * @param system the system payload
 * @returns the figure, and how many outside systems it covers
 */
export const contextModel = (system: System, limit?: number) => {
    const budget = limit ?? diagrams.context.budget?.nodes ?? 14;
    const centre: FlowNode = {
        id: "system",
        label: "The system",
        sub: "the system we analysed",
        kind: "system",
        ids: [],
    };
    const starters = (["person", "otherSystem", "schedule"] as const)
        .filter((who) => system.entries[who] > 0)
        .map((who): FlowNode => ({
            id: `starter-${who}`,
            label: wordFor(startedWords, who).replace(/^./, (c) => c.toUpperCase()),
            sub: plural(system.entries[who], "action"),
            kind: "starter",
            ids: [],
        }));
    const startEdges = starters.map((node): FlowEdge => {
        const who = node.id.slice("starter-".length) as "person" | "otherSystem" | "schedule";
        return {
            id: `${node.id}>system`,
            from: node.id,
            to: "system",
            verb: "starts",
            unit: "",
            label: "starts",
            count: system.entries[who],
        };
    });
    const room = Math.max(1, budget - starters.length - 1);
    const byKind = system.externals.length > room;
    const outside: FlowNode[] = byKind
        ? [...Map.groupBy(system.externals, (each) => each.kind)].map(([kind, members]) => ({
              id: `kind-${kind}`,
              label: wordFor(kindWords, kind),
              sub: plural(members.length, "system"),
              kind: kind === "dataStore" ? "store" : "outside",
              ids: members.map((member) => member.id),
          }))
        : system.externals.map((each) => ({
              id: each.id,
              label: each.name,
              sub: wordFor(kindWords, each.kind),
              kind: each.kind === "dataStore" ? "store" : "outside",
              ids: [each.id],
          }));
    const reach = system.externals.map((each) => ({
        from: "system",
        to: byKind ? `kind-${each.kind}` : each.id,
        verb: byKind
            ? ""
            : [...new Set(each.reach.map((use) => wordFor(accessWords, use.access)))].slice(0, 3).join(", "),
        unit: byKind ? "call" : "",
        count: each.links,
    }));
    const edges = [...startEdges, ...merged(reach)];
    const weightOf = new Map(
        outside.map((node) => [
            node.id,
            edges.filter((edge) => edge.to === node.id).reduce((sum, edge) => sum + edge.count, 0),
        ]),
    );
    const model = capped(
        { nodes: [centre, ...starters, ...outside], edges },
        (node) => weightOf.get(node.id) ?? 0,
        budget,
        "outside systems",
    );
    return {
        facts: { externals: system.externals.length },
        model: { id: "context" as const, ...model, leftOut: [] } satisfies FlowModel,
    };
};

/**
 * The layers a set of actions passes through, as arrows between consecutive layers, each counting the actions that make
 * that step.
 * @param actions the actions
 * @returns the arrows between layers
 */
const layerSteps = (actions: readonly Action[], keep?: ReadonlySet<string>) =>
    merged(
        actions.flatMap((action) => {
            const path = action.path
                .toSorted((one, other) => one.depth - other.depth)
                .map((step) => step.layer)
                .filter((layer) => keep === undefined || keep.has(layer));
            return path.slice(1).map((to, i) => ({ from: path[i] ?? "", to, verb: "", unit: "action", count: 1 }));
        }),
    );

/**
 * Arrows from layers to the kinds of data their actions save and read, counting the actions.
 * @param layers the layers and the actions of each that count
 * @param datas the boxes for kinds of data, by data name
 * @returns the arrows
 */
const dataEdges = (
    layers: readonly { readonly layer: string; readonly actions: readonly Action[] }[],
    datas: ReadonlyMap<string, string>,
) =>
    merged(
        layers.flatMap(({ layer, actions }) =>
            actions.flatMap((action) =>
                (["saves", "reads"] as const).flatMap((how) =>
                    action.context[how].flatMap((name) =>
                        datas.has(name)
                            ? [{ from: layer, to: datas.get(name) ?? "", verb: how, unit: "action", count: 1 }]
                            : [],
                    ),
                ),
            ),
        ),
    );

/**
 * How one capability runs: its layers and the data it uses, an arrow between layers that follow each other in its flows
 * and from a layer to the data its actions save or read.
 * @param capability the capability payload
 * @returns the figure, and how many layers it holds
 */
export const capabilityModel = (capability: Capability, limit?: number, product?: ReadonlySet<string>) => {
    const budget = limit ?? diagrams["capability-layers"].budget?.nodes ?? 14;
    const onlyProject = product === undefined || !capability.layers.some((layer) => product.has(layer.id));
    const kept = capability.layers.filter((layer) => onlyProject || (product !== undefined && product.has(layer.id)));
    const keep = new Set(kept.map((layer) => layer.id));
    const leftOut = capability.layers.filter((layer) => !keep.has(layer.id)).map((layer) => layer.name);
    const layerNodes = kept.map((layer): FlowNode => ({
        id: layer.id,
        label: layer.name,
        sub: `${plural(layer.actions.length, "action")} · ${plural(layer.rules.length, "rule")}`,
        kind: "layer",
        ids: [layer.id],
    }));
    const dataNodes = capability.data.map((kind): FlowNode => ({
        id: kind.id,
        label: kind.name,
        sub: kind.stores.length > 0 ? kind.stores.join(", ") : kind.access,
        kind: kind.stores.length > 0 ? "store" : "data",
        ids: [kind.id],
    }));
    const datas = new Map(capability.data.map((kind) => [kind.name, kind.id]));
    const edges = [
        ...layerSteps(
            capability.layers.flatMap((layer) => layer.actions),
            keep,
        ),
        ...dataEdges(
            kept.map((layer) => ({ layer: layer.id, actions: layer.actions })),
            datas,
        ),
    ];
    const layerIds = keep;
    const weightOf = new Map(edges.map((edge) => [edge.to, 0]));
    for (const edge of edges) {
        weightOf.set(edge.to, (weightOf.get(edge.to) ?? 0) + edge.count);
    }
    const model = capped(
        { nodes: [...layerNodes, ...dataNodes], edges },
        (node) => (layerIds.has(node.id) ? 1_000_000 : 0) + (weightOf.get(node.id) ?? 0),
        budget,
        "kinds of data",
    );
    return {
        facts: { layers: kept.length },
        model: { id: "capability-layers" as const, ...model, leftOut } satisfies FlowModel,
    };
};

/**
 * What a screen starts: a box per action, per layer its actions pass through and per kind of data they save or read,
 * with an arrow from each action to the layer it starts in and between layers that follow each other.
 * @param screen the screen from the system payload
 * @param capabilities the payloads of the capabilities that hold its actions
 * @returns the figure, and how many actions it covers
 */
export const screenModel = (
    screen: Screen,
    capabilities: readonly Capability[],
    limit?: number,
    product?: ReadonlySet<string>,
) => {
    const budget = limit ?? diagrams["screen-trace"].budget?.nodes ?? 14;
    const wanted = new Set(screen.actionIds);
    const layers = new Map<string, Layer>(
        capabilities.flatMap((each) => each.layers.map((layer) => [layer.id, layer] as const)),
    );
    const actions = capabilities.flatMap((each) =>
        each.layers.flatMap((layer) => layer.actions.filter((action) => wanted.has(action.id))),
    );
    const reached = new Set(actions.flatMap((action) => action.path.map((step) => step.layer)));
    const onlyProject = product === undefined || ![...reached].some((id) => product.has(id));
    const touched = new Set([...reached].filter((id) => onlyProject || (product !== undefined && product.has(id))));
    const leftOut = [...reached].filter((id) => !touched.has(id)).map((id) => layers.get(id)?.name ?? id);
    const actionNodes = actions.map((action): FlowNode => ({
        id: action.id,
        label: action.purpose,
        sub: plural(new Set(action.rules).size, "rule"),
        kind: "action",
        ids: [action.id],
    }));
    const layerNodes = [...touched].flatMap((id): FlowNode[] => {
        const layer = layers.get(id);
        return layer === undefined
            ? []
            : [{ id, label: layer.name, sub: plural(layer.rules.length, "rule"), kind: "layer", ids: [id] }];
    });
    const names = [
        ...new Set(actions.flatMap((action) => [...action.context.saves, ...action.context.reads])),
    ].toSorted();
    const dataNodes = names.map((name): FlowNode => ({
        id: `data-${name}`,
        label: name,
        sub: "data",
        kind: "data",
        ids: [],
    }));
    const starts = actions.flatMap((action) => {
        const first = action.path
            .toSorted((one, other) => one.depth - other.depth)
            .find((step) => touched.has(step.layer));
        return first === undefined ? [] : [{ from: action.id, to: first.layer, verb: "starts", unit: "", count: 1 }];
    });
    const onScreen = [...touched].map((layer) => ({
        layer,
        actions: actions.filter((action) => action.path.some((step) => step.layer === layer)),
    }));
    const edges = [
        ...merged(starts),
        ...layerSteps(actions, touched),
        ...dataEdges(onScreen, new Map(names.map((name) => [name, `data-${name}`]))),
    ];
    const rulesOf = new Map(actions.map((action) => [action.id, new Set(action.rules).size]));
    const model = capped(
        { nodes: [...actionNodes, ...layerNodes, ...dataNodes], edges },
        (node) => (node.kind === "layer" ? 1_000_000 : 0) + (rulesOf.get(node.id) ?? 0),
        budget,
        "actions and data",
    );
    return {
        facts: { actions: actions.length },
        model: { id: "screen-trace" as const, ...model, leftOut } satisfies FlowModel,
    };
};

export type LandscapeGroup = {
    readonly title: string;
    readonly areaId?: string;
    readonly purpose?: string;
    /** Whether this group is project work, not part of the product. */
    readonly project: boolean;
    readonly items: readonly LandscapeItem[];
};

export type LandscapeItem = {
    readonly id: string;
    readonly name: string;
    readonly purpose: string;
    readonly screens: number;
    readonly actions: number;
    readonly rules: number;
};

/**
 * What the product offers: the capabilities grouped by area, and apart from them those that live only in tooling and
 * tests, which are project work rather than the product.
 * @param system the system payload
 * @param capabilities every capability payload
 * @returns the groups of capabilities, and how many capabilities there are
 */
export const landscapeModel = (system: System, capabilities: readonly Capability[]) => {
    const product = new Set(system.layers.filter((layer) => layer.product).map((layer) => layer.id));
    const isProduct = (id: string) => {
        const own = capabilities.find((each) => each.capability.id === id);
        return own === undefined || own.layers.length === 0 || own.layers.some((layer) => product.has(layer.id));
    };
    const areaOf = new Map(system.areas.flatMap((area) => area.capabilities.map((id) => [id, area.id] as const)));
    const items = system.capabilities.map((each) => ({ each, product: isProduct(each.id), area: areaOf.get(each.id) }));
    const inAreas: LandscapeGroup[] = system.areas.map((area) => ({
        title: area.name,
        areaId: area.id,
        purpose: area.purpose,
        project: false,
        items: items.filter((item) => item.product && item.area === area.id).map((item) => item.each),
    }));
    const loose = items.filter((item) => item.product && item.area === undefined).map((item) => item.each);
    const project = items.filter((item) => !item.product).map((item) => item.each);
    const groups: LandscapeGroup[] = [
        ...inAreas,
        ...(loose.length > 0 ? [{ title: copy.system.inNoArea, project: false, items: loose }] : []),
        ...(project.length > 0 ? [{ title: copy.system.layersProject, project: true, items: project }] : []),
    ].filter((group) => group.items.length > 0);
    return { facts: { capabilities: system.capabilities.length }, groups };
};

/**
 * Links between the same two things, one arrow per pair: the ways they reach each other named together, the counts added,
 * so a figure of many parts and outside systems is not a tangle of wires.
 * @param links the links, each with how it reaches and how many
 * @returns one connection per pair
 */
const perPair = (links: readonly { from: string; to: string; kind: string; links: number }[]): Link[] => {
    const pairs = new Map<string, { from: string; to: string; kinds: string[]; count: number }>();
    for (const link of links) {
        const key = `${link.from}>${link.to}`;
        const seen = pairs.get(key) ?? { from: link.from, to: link.to, kinds: [], count: 0 };
        pairs.set(key, {
            ...seen,
            kinds: seen.kinds.includes(link.kind) ? seen.kinds : [...seen.kinds, link.kind],
            count: seen.count + link.links,
        });
    }
    return [...pairs.values()].map((pair) => ({
        from: pair.from,
        to: pair.to,
        verb: pair.kinds
            .slice(0, 3)
            .map((kind) => wordFor(accessWords, kind))
            .join(", "),
        unit: "link",
        count: pair.count,
    }));
};

/**
 * What the system is made of: a box per part and an arrow where one part uses another, with how many links the code makes.
 * Parts that are only tests are project work and left out, and said so.
 * @param knowledge what the analysis knows of the system as a whole
 * @param limit how many boxes at most
 * @returns the figure, and how many parts it covers
 */
export const partsModel = (knowledge: Knowledge, limit?: number) => {
    const budget = limit ?? diagrams.parts.budget?.nodes ?? 14;
    const shown = knowledge.parts.filter((part) => part.kind !== "tests");
    const ids = new Set(shown.map((part) => part.id));
    const nodes = shown.map((part): FlowNode => ({
        id: part.id,
        label: part.name,
        sub: `${wordFor(partKindWords, part.kind)} · ${plural(part.files, "file")}`,
        kind: "part",
        ids: [part.id],
    }));
    const edges = merged(perPair(knowledge.partLinks.filter((link) => ids.has(link.from) && ids.has(link.to))));
    const weightOf = new Map(nodes.map((node) => [node.id, 0]));
    for (const edge of edges) {
        weightOf.set(edge.from, (weightOf.get(edge.from) ?? 0) + edge.count);
        weightOf.set(edge.to, (weightOf.get(edge.to) ?? 0) + edge.count);
    }
    const model = capped({ nodes, edges }, (node) => weightOf.get(node.id) ?? 0, budget, "parts");
    const leftOut = knowledge.parts.filter((part) => part.kind === "tests").map((part) => part.name);
    return { facts: { parts: shown.length }, model: { id: "parts" as const, ...model, leftOut } satisfies FlowModel };
};

/**
 * What the parts reach outside the system: a box per part that uses an outside system or store, one per outside system,
 * an arrow for how, with how many links.
 * @param system the system payload, for the outside systems
 * @param knowledge what the analysis knows of the system as a whole, for the links
 * @param limit how many boxes at most
 * @returns the figure, and how many outside systems there are
 */
export const integrationModel = (system: System, knowledge: Knowledge, limit?: number) => {
    const budget = limit ?? diagrams.integration.budget?.nodes ?? 14;
    const outside = new Map(system.externals.map((each) => [each.id, each]));
    const parts = new Map(knowledge.parts.map((part) => [part.id, part]));
    const links = knowledge.partLinks.filter(
        (link) => outside.has(link.to) && parts.has(link.from) && parts.get(link.from)?.kind !== "tests",
    );
    const partIds = [...new Set(links.map((link) => link.from))];
    const outsideIds = [...new Set(links.map((link) => link.to))];
    const byKind = outsideIds.length > Math.max(3, budget - partIds.length - 1);
    const boxOf = (id: string) => (byKind ? `kind-${outside.get(id)?.kind ?? "other"}` : id);
    const edges = merged(perPair(links.map((link) => ({ ...link, to: boxOf(link.to) }))));
    const partNodes = partIds.flatMap((id): FlowNode[] => {
        const part = parts.get(id);
        return part === undefined
            ? []
            : [{ id, label: part.name, sub: wordFor(partKindWords, part.kind), kind: "part", ids: [id] }];
    });
    const outsideNodes: FlowNode[] = byKind
        ? [...Map.groupBy(outsideIds, (id) => outside.get(id)?.kind ?? "other")].map(([kind, members]) => ({
              id: `kind-${kind}`,
              label: wordFor(kindWords, kind),
              sub: plural(members.length, "system"),
              kind: kind === "dataStore" ? "store" : "outside",
              ids: members,
          }))
        : outsideIds.flatMap((id): FlowNode[] => {
              const each = outside.get(id);
              return each === undefined
                  ? []
                  : [
                        {
                            id,
                            label: each.name,
                            sub: wordFor(kindWords, each.kind),
                            kind: each.kind === "dataStore" ? "store" : "outside",
                            ids: [id],
                        },
                    ];
          });
    const weightOf = new Map<string, number>();
    for (const edge of edges) {
        weightOf.set(edge.from, (weightOf.get(edge.from) ?? 0) + edge.count);
        weightOf.set(edge.to, (weightOf.get(edge.to) ?? 0) + edge.count);
    }
    const model = capped(
        { nodes: [...partNodes, ...outsideNodes], edges },
        (node) => weightOf.get(node.id) ?? 0,
        budget,
        "parts and outside systems",
    );
    return {
        facts: { externals: links.length === 0 ? 0 : outsideIds.length },
        model: { id: "integration" as const, ...model, leftOut: [] } satisfies FlowModel,
    };
};

/**
 * How one kind of data changes over time: a box for where a record is created and one per state in the order a record
 * passes them, an arrow for each change the code makes, with how many places in the code make it.
 * @param life the life of one kind of data
 * @param limit how many boxes at most
 * @returns the figure, and how many lives it covers
 */
export const statesModel = (life: Lifecycle, limit?: number) => {
    const budget = limit ?? diagrams.states.budget?.nodes ?? 14;
    const start: FlowNode = {
        id: "created",
        label: "Record created",
        sub: "where a record starts",
        kind: "starter",
        ids: [],
    };
    const into = (state: number) => life.transitions.filter((change) => change.to === state).length;
    const nodes = life.states.map((name, i): FlowNode => ({
        id: `state-${i + 1}`,
        label: name,
        sub: `reached in ${plural(into(i + 1), "place")}`,
        kind: "state",
        ids: [],
    }));
    const edges = merged(
        life.transitions.flatMap((change) =>
            (change.from.length === 0 ? ["created"] : change.from.map((from) => `state-${from}`)).map((from) => ({
                from,
                to: `state-${change.to}`,
                verb: "",
                unit: "place",
                count: 1,
            })),
        ),
    );
    const weightOf = new Map(nodes.map((node) => [node.id, 0]));
    for (const edge of edges) {
        weightOf.set(edge.to, (weightOf.get(edge.to) ?? 0) + edge.count);
    }
    const hasStart = edges.some((edge) => edge.from === "created");
    const model = capped(
        { nodes: [...(hasStart ? [start] : []), ...nodes], edges },
        (node) => (node.kind === "starter" ? 1_000_000 : 0) + (weightOf.get(node.id) ?? 0),
        budget,
        "states",
    );
    return { facts: { lifecycles: 1 }, model: { id: "states" as const, ...model, leftOut: [] } satisfies FlowModel };
};

export type DataGrid = {
    readonly kinds: readonly { readonly id: string; readonly name: string }[];
    readonly capabilities: readonly { readonly id: string; readonly name: string }[];
    readonly cell: (kind: string, capability: string) => "saves" | "reads" | "both" | "";
};

/**
 * Which capability saves or reads which kind of data, as a grid of kinds of data by capabilities: only the kinds asked for
 * (all when none are named) and only the capabilities that use one of them.
 * @param knowledge what the analysis knows of the system as a whole
 * @param records the kinds of data asked for, by record id; none for all
 * @returns the grid, and how many kinds of data it holds
 */
export const dataGridModel = (knowledge: Knowledge, records: readonly string[] = []) => {
    const uses = knowledge.dataUse.filter((use) => records.length === 0 || records.includes(use.entity.id));
    const kinds = [...new Map(uses.map((use) => [use.entity.id, use.entity])).values()].toSorted((one, other) =>
        compareText(one.name, other.name),
    );
    const capabilities = [...new Map(uses.map((use) => [use.capability.id, use.capability])).values()].toSorted(
        (one, other) => compareText(one.name, other.name),
    );
    const at = new Map(uses.map((use) => [`${use.entity.id}|${use.capability.id}`, use]));
    const cell = (kind: string, capability: string) => {
        const use = at.get(`${kind}|${capability}`);
        return use === undefined ? "" : use.saves && use.reads ? "both" : use.saves ? "saves" : "reads";
    };
    return { facts: { kinds: kinds.length }, grid: { kinds, capabilities, cell } satisfies DataGrid };
};
