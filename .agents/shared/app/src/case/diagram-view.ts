import type { GraphNode, GraphProps } from "../components/diagram/DiagramCanvas";
import { copy, diagramTitles } from "../lib/copy";
import { theCase } from "./loader";

// What a diagram shows, from its record in `diagrams.json`: the boxes with their full names, the groups drawn as
// frames (each named in the app's words for the closed list of groups), one line per pair of boxes in the style of its
// kind, the legend in the case's words for each kind, and the case's own text version. The app lays it out (ELK, in
// the island) and adds nothing the text version does not say.

type DiagramRecord = {
    key: string;
    kind: keyof typeof diagramTitles;
    subject: string;
    caption: string | null;
    question: string | null;
    nodes: { id: string; label: string; group: string | null; count: number | null }[];
    edges: { from: string; to: string; kind: string; count: number }[];
    legend: { kind: string; words: string }[];
    text: string[];
    shown: boolean;
};

export type DiagramView = {
    key: string;
    title: string;
    caption: string | null;
    question: string | null;
    legend: { words: string; style: number | null }[];
    notes: string[];
    text: string[];
    graph: GraphProps;
    /** When the lines outnumber twice the boxes, the drawing would be a tangle: the diagram is a table instead. */
    matrix: { columns: string[]; rows: { label: string; cells: string[] }[] } | null;
};

const tones: Readonly<Record<string, GraphNode["tone"]>> = {
    dataStore: "store",
    store: "store",
    data: "store",
    outsideService: "outside",
    messaging: "outside",
    library: "outside",
    system: "system",
};

/**
 * Every diagram of the case, by key.
 * @returns the lookup
 */
export const diagramsOfCase = (): ReadonlyMap<string, DiagramRecord> => {
    const kase = theCase();
    if (!kase.has("diagrams.json")) return new Map();
    return new Map((kase.json("diagrams.json") as DiagramRecord[]).map((each) => [each.key, each]));
};

/**
 * The view of one diagram, or nothing when the case does not hold it or it has too little to draw.
 * @param key the diagram's key, such as `context/system`
 * @param options the title when the page names the diagram itself, and the words of a group the closed list lacks
 * @returns the view
 */
export const diagramView = (
    key: string,
    options: { title?: string; groupWords?: (group: string) => string | undefined } = {},
): DiagramView | null => {
    const record = diagramsOfCase().get(key);
    if (record === undefined || !record.shown) return null;
    const groupsUsed = [...new Set(record.nodes.map((node) => node.group).filter((group): group is string => group !== null))];
    const wordsOf = (group: string) => {
        const words =
            options.groupWords?.(group) ?? (record.kind === "data" ? copy.diagram.dataGroupWords[group] : undefined) ?? copy.diagram.groupWords[group];
        if (words === undefined) throw new Error(`the diagram ${key} has a group "${group}" the app has no words for`);
        return words;
    };
    // A group of the system itself is the subject, not a kind of box; a single group tells nothing apart.
    const framed = groupsUsed.filter((group) => group !== "system");
    const groups = framed.length < 2 ? [] : framed.map((group) => ({ id: group, words: wordsOf(group) }));
    const kinds = record.legend.map((each) => each.kind);
    const mixed = kinds.length;
    const pairs = new Map<string, { from: string; to: string; kinds: Set<string>; count: number }>();
    for (const edge of record.edges) {
        const pair = `${edge.from}\u0000${edge.to}`;
        const known = pairs.get(pair);
        if (known === undefined) pairs.set(pair, { from: edge.from, to: edge.to, kinds: new Set([edge.kind]), count: edge.count });
        else {
            known.kinds.add(edge.kind);
            known.count += edge.count;
        }
    }
    const edges = [...pairs.values()].map((pair) => ({
        from: pair.from,
        to: pair.to,
        style: pair.kinds.size === 1 ? kinds.indexOf([...pair.kinds][0] ?? "") : mixed,
        count: pair.count,
    }));
    const counts = edges.some((edge) => edge.count > 1);
    const label = new Map(record.nodes.map((node) => [node.id, node.label]));
    const kindWords = new Map(record.legend.map((each) => [each.kind, each.words]));
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
                          if (pair === undefined) return "";
                          const said = [...pair.kinds].map((kind) => kindWords.get(kind) ?? kind).join(", ");
                          return pair.count > 1 ? `${said} (${pair.count})` : said;
                      }),
                  })),
              };
    const usesMixed = edges.some((edge) => edge.style === mixed);
    const title = options.title ?? diagramTitles[record.kind];
    return {
        key: record.key,
        title,
        caption: record.caption,
        question: record.question,
        legend: [
            ...record.legend.map((each, at) => ({ words: each.words, style: kinds.length > 1 ? at : null })),
            ...(usesMixed ? [{ words: copy.diagram.mixed, style: mixed }] : []),
        ],
        notes:
            matrix !== null
                ? [copy.diagram.matrix, ...(counts ? [copy.diagram.matrixCounts] : [])]
                : [copy.diagram.lines, ...(groups.length > 0 ? [copy.diagram.groups] : []), ...(counts ? [copy.diagram.counts] : [])],
        matrix,
        text: record.text,
        graph: {
            label: copy.diagram.label(title),
            nodes: record.nodes.map((node) => ({
                id: node.id,
                label: node.label,
                group: groups.length === 0 ? null : node.group,
                tone: tones[node.group ?? ""] ?? "box",
            })),
            groups,
            edges,
            counts,
            words: {
                drawing: copy.diagram.drawing(title),
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
