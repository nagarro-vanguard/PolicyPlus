import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs";
import { diagrams } from "./diagram-config";
import type { FlowModel } from "./model";
import { wrapLabel, widthOf } from "./text";

export const nodeWidth = 208;
export const nodeHeight = 66;
/** How many characters of width one line of a label holds at the label's size: the room, with a margin. */
export const labelRoom = 25;
const labelHeight = 14;
const labelCharWidth = 6.6;

export type Box = { id: string; x: number; y: number; w: number; h: number };
export type Wire = {
    id: string;
    from: string;
    to: string;
    label: string;
    points: { x: number; y: number }[];
    lx: number;
    ly: number;
    lw: number;
};
export type Laid = { boxes: Box[]; wires: Wire[]; width: number; height: number };

type Point = { x: number; y: number };
type Section = { startPoint: Point; endPoint: Point; bendPoints?: Point[] };
type LaidEdge = {
    id: string;
    sources: string[];
    targets: string[];
    labels?: { x?: number; y?: number; width?: number }[];
    sections?: Section[];
};

/**
 * Lay a figure out: layers of boxes in the direction the arrows run, the arrows routed around the boxes with their
 * labels given room, all by one deterministic engine, so the same figure always comes out the same.
 * @param model the figure
 * @param direction the way the arrows run
 * @returns where every box, arrow and label goes, and the size of the figure
 */
export const layout = async (model: FlowModel, direction: "DOWN" | "RIGHT"): Promise<Laid> => {
    const settings = diagrams[model.id].layout;
    const algorithm = settings === undefined ? "layered" : settings.algorithm;
    const ids = new Set(model.nodes.map((node) => node.id));
    const edges = model.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to) && edge.from !== edge.to);
    const graph = {
        id: "root",
        layoutOptions: {
            "elk.algorithm": algorithm,
            "elk.direction": direction,
            "elk.spacing.nodeNode": "36",
            "elk.layered.spacing.nodeNodeBetweenLayers": "72",
            "elk.layered.spacing.edgeNodeBetweenLayers": "24",
            "elk.edgeRouting": "ORTHOGONAL",
            "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
            "elk.padding": "[top=8,left=8,bottom=8,right=8]",
        },
        children: model.nodes.map((node) => ({ id: node.id, width: nodeWidth, height: nodeHeight })),
        edges: edges.map((edge) => ({
            id: edge.id,
            sources: [edge.from],
            targets: [edge.to],
            labels:
                edge.label === ""
                    ? []
                    : [
                          {
                              id: `${edge.id}#label`,
                              text: edge.label,
                              width: widthOf(edge.label) * labelCharWidth,
                              height: labelHeight,
                          },
                      ],
        })),
    };
    const out: ElkNode = await new ELK().layout(graph);
    const laidEdges = (out.edges ?? []) as LaidEdge[];
    const labelOf = new Map(edges.map((edge) => [edge.id, edge.label]));
    return {
        width: out.width === undefined ? 0 : out.width,
        height: out.height === undefined ? 0 : out.height,
        boxes: (out.children ?? []).map((child) => ({
            id: child.id,
            x: child.x === undefined ? 0 : child.x,
            y: child.y === undefined ? 0 : child.y,
            w: nodeWidth,
            h: nodeHeight,
        })),
        wires: laidEdges.map((edge) => {
            const section = edge.sections === undefined ? undefined : edge.sections[0];
            const label = edge.labels === undefined ? undefined : edge.labels[0];
            const text = labelOf.get(edge.id) ?? "";
            return {
                id: edge.id,
                from: edge.sources[0] ?? "",
                to: edge.targets[0] ?? "",
                label: text,
                points:
                    section === undefined ? [] : [section.startPoint, ...(section.bendPoints ?? []), section.endPoint],
                lx: label === undefined || label.x === undefined ? 0 : label.x,
                ly: label === undefined || label.y === undefined ? 0 : label.y,
                lw: widthOf(text) * labelCharWidth,
            };
        }),
    };
};

/**
 * A box's label as the lines it is drawn in: wrapped to the room of a line, at most the figure's allowed lines.
 * @param label the full label
 * @param id the figure
 * @returns the lines
 */
export const linesOf = (label: string, id: FlowModel["id"]) => {
    const budget = diagrams[id].budget;
    return wrapLabel(label, labelRoom, budget === undefined ? 2 : budget.labelLines);
};
