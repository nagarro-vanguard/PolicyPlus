import type { GraphProps } from "../components/diagram/DiagramCanvas";
import { copy } from "../lib/copy";
import { theCase } from "./loader";

// What a view shows, from its record in `views.json`: the boxes with their full names, what each is and says, the
// frames the case names, one line per pair of boxes in the style of its relation, the legend in the case's words and
// the case's own text version. The app lays it out (ELK, in the island) and holds no word about a view of its own: the
// title, the frames, the kinds and the relations are the case's, and the reading notes follow from what the view uses.

export type ViewRecord = {
    key: string;
    section: string;
    viewpoint: string;
    title: string;
    caption: string | null;
    nodes: { id: string; label: string; kind: "system" | "store" | "outside" | "plain"; kindWords: string; group: string | null; sentence: string | null }[];
    groups: { id: string; words: string }[];
    edges: { from: string; to: string; relation: string }[];
    legend: { relation: string; words: string }[];
    text: string[];
    shown: boolean;
};

export type DiagramView = {
    key: string;
    title: string;
    caption: string | null;
    legend: { words: string; style: number | null }[];
    notes: string[];
    text: string[];
    graph: GraphProps;
    /** When the lines outnumber twice the boxes, the drawing would be a tangle: the view is a table instead. */
    matrix: { columns: string[]; rows: { label: string; cells: string[] }[] } | null;
};

/** Every view of the case, in the order the case gives them. */
export const viewsOfCase = (): readonly ViewRecord[] => {
    const kase = theCase();
    return kase.has("views.json") ? (kase.json("views.json") as ViewRecord[]) : [];
};

/** The views of a section (`today`, `target`, `variant.2`, or one viewpoint of it), those with something to draw. */
export const viewsOfSection = (section: string): readonly ViewRecord[] =>
    viewsOfCase().filter((view) => view.shown && (view.section === section || view.section.startsWith(`${section}.`)));

/** A record as what the page draws. */
export const viewOf = (record: ViewRecord): DiagramView => {
    const relations = record.legend.map((each) => each.relation);
    const mixed = relations.length;
    const pairs = new Map<string, { from: string; to: string; relations: Set<string> }>();
    for (const edge of record.edges) {
        const pair = `${edge.from}\u0000${edge.to}`;
        const known = pairs.get(pair);
        if (known === undefined) pairs.set(pair, { from: edge.from, to: edge.to, relations: new Set([edge.relation]) });
        else known.relations.add(edge.relation);
    }
    const edges = [...pairs.values()].map((pair) => ({
        from: pair.from,
        to: pair.to,
        style: pair.relations.size === 1 ? relations.indexOf([...pair.relations][0] ?? "") : mixed,
    }));
    const framed = new Set(record.groups.map((group) => group.id));
    const label = new Map(record.nodes.map((node) => [node.id, node.label]));
    const wordsOf = new Map(record.legend.map((each) => [each.relation, each.words]));
    const sources = record.nodes.filter((node) => edges.some((edge) => edge.from === node.id)).map((node) => node.id);
    const targets = record.nodes.filter((node) => edges.some((edge) => edge.to === node.id)).map((node) => node.id);
    const matrix =
        edges.length <= 2 * record.nodes.length
            ? null
            : {
                  columns: targets.map((id) => label.get(id) ?? ""),
                  rows: sources.map((from) => ({
                      label: label.get(from) ?? "",
                      cells: targets.map((to) => {
                          const pair = pairs.get(`${from}\u0000${to}`);
                          return pair === undefined ? "" : [...pair.relations].map((relation) => wordsOf.get(relation) ?? "").join(", ");
                      }),
                  })),
              };
    const usesMixed = edges.some((edge) => edge.style === mixed);
    return {
        key: record.key,
        title: record.title,
        caption: record.caption,
        legend: [
            ...record.legend.map((each, at) => ({ words: each.words, style: relations.length > 1 ? at : null })),
            ...(usesMixed ? [{ words: copy.diagram.mixed, style: mixed }] : []),
        ],
        notes:
            matrix !== null
                ? [copy.diagram.matrix]
                : [...(edges.length > 0 ? [copy.diagram.lines] : []), ...(framed.size > 0 ? [copy.diagram.groups] : [])],
        matrix,
        text: record.text,
        graph: {
            label: copy.diagram.label(record.title),
            nodes: record.nodes.map((node) => ({
                id: node.id,
                label: node.label,
                group: node.group !== null && framed.has(node.group) ? node.group : null,
                tone: node.kind === "plain" ? "box" : node.kind,
                kindWords: node.kindWords,
                sentence: node.sentence,
            })),
            groups: record.groups,
            edges,
            words: {
                drawing: copy.diagram.drawing(record.title),
                loading: copy.diagram.loading,
                failed: copy.diagram.failed,
                scroll: copy.diagram.scroll,
                reaches: copy.diagram.reaches,
                reachedFrom: copy.diagram.reachedFrom,
                nothing: copy.diagram.nothing,
                pick: copy.diagram.pick,
            },
        },
    };
};
