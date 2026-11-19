import { viewerOfArchitecture } from "./slice";
import { viewerOfVariant } from "./target-viewer-data";
import type { ViewerData } from "./slice-types";
import type { Architecture } from "./target-types";
import type { Capability, System } from "./types";

// One record shape (groups, boxes, who uses whom) for every lens, so one viewer draws them all: each lens has a small
// mapping from its own records.

/**
 * Today: a layer is a group, and a box is a capability that has code in it. A capability uses the other layers its own code
 * passes on to, where today's layers call each other.
 * @param sys the system payload
 * @param caps the capability payloads
 * @returns the viewer's data
 */
export const viewerOfToday = (sys: System, caps: readonly Capability[]): ViewerData => {
    const layers = sys.layers.toSorted((one, other) => Number(other.product) - Number(one.product) || other.blocks - one.blocks || one.name.localeCompare(other.name));
    const index = new Map(layers.map((layer, at) => [layer.id, at] as const));
    const calls = new Map<string, Set<string>>();
    for (const edge of sys.edges) if (edge.from !== edge.to) calls.set(edge.from, (calls.get(edge.from) ?? new Set<string>()).add(edge.to));
    const boxes = caps.flatMap((cap) => {
        const own = new Set(cap.layers.map((layer) => layer.id));
        return cap.layers.flatMap((layer) => {
            const g = index.get(layer.id);
            if (g === undefined) return [];
            const ug = [...(calls.get(layer.id) ?? [])].filter((to) => own.has(to) && index.has(to)).map((to) => index.get(to) as number);
            return [{ n: cap.capability.name, g, u: [] as number[], ug, note: `${layer.blocks} routines, ${layer.rules.length} rules` }];
        });
    });
    return {
        name: "Today",
        words: { group: "layer", groups: "layers", box: "capability", boxes: "capabilities" },
        groups: layers.map((layer) => ({ name: layer.name, note: `${layer.blocks} routines${layer.product ? "" : ", project work"}` })),
        boxes,
    };
};

/**
 * Modernized: a domain is a group and a component a box; an architecture without components yet shows its parts as groups and
 * its domains as boxes.
 * @param architecture the chosen architecture
 * @returns the viewer's data
 */
export const viewerOfModernized = (architecture: Architecture): ViewerData =>
    (architecture.components ?? []).length > 0 ? viewerOfArchitecture(architecture) : viewerOfVariant(architecture);
