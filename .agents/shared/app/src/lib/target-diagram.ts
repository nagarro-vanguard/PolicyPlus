import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs";

export type DNode = {
    readonly id: string;
    readonly label: string;
    readonly sub?: string;
    /** Extra lines inside the box, such as the keys of a fact. */
    readonly lines?: readonly string[];
    readonly kind?: "primary" | "other" | "outside" | "actor" | "system";
};
export type DEdge = { readonly from: string; readonly to: string; readonly label?: string };
export type Diagram = {
    readonly title: string;
    readonly nodes: readonly DNode[];
    readonly edges: readonly DEdge[];
    readonly direction?: "DOWN" | "RIGHT";
};

const W = 200;
const LINE = 14;
const wrap = (text: string, room: number) => {
    const out: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
        if (`${line} ${word}`.trim().length > room && line !== "") {
            out.push(line);
            line = word;
        } else line = `${line} ${word}`.trim();
    }
    return line === "" ? out : [...out, line];
};
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Box = { id: string; x: number; y: number; w: number; h: number; text: { bold: string[]; plain: string[] }; kind: string };

/**
 * Draws a diagram as inline SVG, laid out by one deterministic engine so the same records always give the same picture.
 * @param diagram the nodes and edges, each node standing for a record
 * @returns the SVG text; an empty string for a diagram with nothing to draw
 */
export const draw = async (diagram: Diagram): Promise<string> => {
    if (diagram.nodes.length === 0) return "";
    const ids = new Set(diagram.nodes.map((node) => node.id));
    const edges = diagram.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to) && edge.from !== edge.to);
    const boxes = new Map<string, Box>();
    for (const node of diagram.nodes) {
        const bold = wrap(node.label, 26);
        const plain = [...wrap(node.sub ?? "", 30), ...(node.lines ?? []).flatMap((line) => wrap(line, 30))];
        boxes.set(node.id, { id: node.id, x: 0, y: 0, w: W, h: 20 + LINE * (bold.length + plain.length), text: { bold, plain }, kind: node.kind ?? "primary" });
    }
    const graph: ElkNode = {
        id: "root",
        layoutOptions: {
            "elk.algorithm": "layered",
            "elk.direction": diagram.direction ?? "DOWN",
            "elk.spacing.nodeNode": "28",
            "elk.layered.spacing.nodeNodeBetweenLayers": "46",
            "elk.edgeRouting": "ORTHOGONAL",
        },
        children: [...boxes.values()].map((box) => ({ id: box.id, width: box.w, height: box.h })),
        edges: edges.map((edge, at) => ({ id: `e${at}`, sources: [edge.from], targets: [edge.to] })),
    };
    const laid = await new ELK().layout(graph);
    for (const child of laid.children ?? []) {
        const box = boxes.get(child.id);
        if (box !== undefined) {
            box.x = child.x ?? 0;
            box.y = child.y ?? 0;
        }
    }
    const width = Math.max(...[...boxes.values()].map((box) => box.x + box.w)) + 16;
    const height = Math.max(...[...boxes.values()].map((box) => box.y + box.h)) + 16;
    const wires = (laid.edges ?? []).map((edge, at) => {
        const section = (edge as { sections?: { startPoint: { x: number; y: number }; endPoint: { x: number; y: number }; bendPoints?: { x: number; y: number }[] }[] }).sections?.[0];
        if (section === undefined) return "";
        const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
        const label = edges[at]?.label;
        const mid = points[Math.floor(points.length / 2)] ?? section.startPoint;
        return `<polyline class="tg-wire" points="${points.map((p) => `${p.x + 8},${p.y + 8}`).join(" ")}" marker-end="url(#tg-arrow)"/>${label === undefined || label === "" ? "" : `<text class="tg-wire-label" x="${mid.x + 12}" y="${mid.y + 6}">${escape(label)}</text>`}`;
    });
    const rects = [...boxes.values()].map(
        (box) =>
            `<g class="tg-node tg-${box.kind}"><rect x="${box.x + 8}" y="${box.y + 8}" width="${box.w}" height="${box.h}" rx="6"/>${box.text.bold.map((line, i) => `<text class="tg-bold" x="${box.x + 18}" y="${box.y + 8 + 16 + i * LINE}">${escape(line)}</text>`).join("")}${box.text.plain.map((line, i) => `<text class="tg-plain" x="${box.x + 18}" y="${box.y + 8 + 16 + (box.text.bold.length + i) * LINE}">${escape(line)}</text>`).join("")}</g>`,
    );
    return `<svg class="tg" role="img" aria-label="${escape(diagram.title)}" viewBox="0 0 ${width + 16} ${height + 16}" width="${width + 16}" height="${height + 16}" xmlns="http://www.w3.org/2000/svg"><defs><marker id="tg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="tg-arrowhead"/></marker></defs>${wires.join("")}${rects.join("")}</svg>`;
};
