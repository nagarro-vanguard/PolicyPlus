import { diagrams } from "./diagram-config";
import type { Laid } from "./layout";
import { linesOf } from "./layout";
import type { FlowModel } from "./model";
import type { Capability, Knowledge, System } from "./types";

/**
 * Every record id the payloads name that a figure may stand for.
 * @param system the system payload
 * @param capabilities every capability payload
 * @param knowledge what the analysis knows of the system as a whole, for the parts
 * @returns the ids
 */
export const knownIds = (system: System, capabilities: readonly Capability[], knowledge?: Pick<Knowledge, "parts">) =>
    new Set([
        ...(knowledge === undefined ? [] : knowledge.parts.map((part) => part.id)),
        ...system.layers.map((layer) => layer.id),
        ...system.capabilities.map((each) => each.id),
        ...system.externals.map((each) => each.id),
        ...system.screens.flatMap((screen) => screen.actionIds),
        ...capabilities.flatMap((each) => [
            ...each.data.map((kind) => kind.id),
            ...each.layers.flatMap((layer) => [layer.id, ...layer.actions.map((action) => action.id)]),
        ]),
    ]);

/**
 * What a figure's model must satisfy before it is drawn: every box stands for ids the payloads name and is told once,
 * every arrow joins two boxes, the figure holds no more boxes than its budget, and what was folded into "more" boxes is
 * counted exactly.
 * @param model the figure
 * @param known the ids the payloads name
 * @returns one line per difference; none when the model holds
 */
export const modelProblems = (model: FlowModel, known: ReadonlySet<string>) => {
    const problems: string[] = [];
    const seen = new Set<string>();
    const nodeIds = new Set(model.nodes.map((node) => node.id));
    for (const node of model.nodes) {
        if (seen.has(node.id)) {
            problems.push(`${model.id}: box ${node.id} is drawn twice`);
        }
        seen.add(node.id);
        if (node.label.trim() === "") {
            problems.push(`${model.id}: box ${node.id} has no label`);
        }
        for (const id of node.ids.filter((each) => !known.has(each))) {
            problems.push(`${model.id}: box ${node.id} stands for ${id}, which no payload names`);
        }
    }
    for (const edge of model.edges) {
        if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
            problems.push(`${model.id}: arrow ${edge.id} joins a box that is not drawn`);
        }
        if (edge.count < 1) {
            problems.push(`${model.id}: arrow ${edge.id} counts nothing`);
        }
    }
    const budget = diagrams[model.id].budget;
    if (budget !== undefined && model.nodes.length > budget.nodes) {
        problems.push(`${model.id}: ${model.nodes.length} boxes, the budget is ${budget.nodes}`);
    }
    const folded = model.nodes
        .filter((node) => node.kind === "more")
        .reduce((sum, node) => sum + (node.hidden === undefined ? 0 : node.hidden), 0);
    if (folded !== model.omitted) {
        problems.push(`${model.id}: ${model.omitted} folded, the "more" boxes hold ${folded}`);
    }
    return problems;
};

const apart = (one: Laid["boxes"][number], other: Laid["boxes"][number]) =>
    one.x + one.w <= other.x || other.x + other.w <= one.x || one.y + one.h <= other.y || other.y + other.h <= one.y;

/**
 * What a laid-out figure must satisfy: no two boxes overlap, every box and arrow lies inside the figure, every label
 * fits its lines, and no arrow passes through a box that is not at either end of it.
 * @param model the figure
 * @param laid where everything goes
 * @returns one line per difference; none when the layout holds
 */
export const layoutProblems = (model: FlowModel, laid: Laid) => {
    const problems: string[] = [];
    const slack = 1;
    laid.boxes.forEach((box, i) => {
        if (
            box.x < -slack ||
            box.y < -slack ||
            box.x + box.w > laid.width + slack ||
            box.y + box.h > laid.height + slack
        ) {
            problems.push(`${model.id}: box ${box.id} lies outside the figure`);
        }
        for (const other of laid.boxes.slice(i + 1)) {
            if (!apart(box, other)) {
                problems.push(`${model.id}: boxes ${box.id} and ${other.id} overlap`);
            }
        }
    });
    const budget = diagrams[model.id].budget;
    for (const node of model.nodes) {
        if (budget !== undefined && linesOf(node.label, model.id).length > budget.labelLines) {
            problems.push(`${model.id}: the label of ${node.id} needs more than ${budget.labelLines} lines`);
        }
    }
    for (const wire of laid.wires) {
        for (const box of laid.boxes.filter((each) => each.id !== wire.from && each.id !== wire.to)) {
            for (let i = 1; i < wire.points.length; i++) {
                const a = wire.points[i - 1];
                const b = wire.points[i];
                if (a !== undefined && b !== undefined && crosses(a, b, box)) {
                    problems.push(`${model.id}: arrow ${wire.id} passes through box ${box.id}`);
                    break;
                }
            }
        }
    }
    return problems;
};

/**
 * Whether an axis-aligned segment passes through the inside of a box.
 * @param a one end of the segment
 * @param a.x its x
 * @param a.y its y
 * @param b the other end
 * @param b.x its x
 * @param b.y its y
 * @param box the box
 * @returns true when the segment enters the box
 */
const crosses = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    box: { x: number; y: number; w: number; h: number },
) => {
    const inset = 1;
    const left = box.x + inset;
    const right = box.x + box.w - inset;
    const top = box.y + inset;
    const bottom = box.y + box.h - inset;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    return maxX > left && minX < right && maxY > top && minY < bottom;
};
