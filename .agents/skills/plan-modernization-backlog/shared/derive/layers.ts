import type { Decision, LayerRole, Story, TargetLayer } from "../model/records";
import type { Target, TargetComponent } from "../read/target";

/*
 * Where in the target stack a story is built. The layers say what they are for (`role`) and which part of the chosen
 * architecture they build (`container`); a component says what kind of part it is (`kind`, from shape-target). Nothing
 * is guessed: a component whose kind is not known and adapts no outside system has no layer, and says so by an empty
 * answer.
 */

/** The role of the layer a component of each kind is built in. */
export const roleOfKind: Readonly<Record<string, LayerRole>> = {
    rules: "rules",
    adapter: "service",
    data: "data",
    flow: "service",
    screen: "screens",
};

/** A layer's role: the one it states, or `e2e` for a layer of tests of the running product. */
export const roleOf = (layer: TargetLayer): LayerRole | undefined =>
    layer.role ?? (layer.kind === "test" ? "e2e" : undefined);

export type Stack = {
    readonly layers: readonly TargetLayer[];
    readonly decisions: readonly Decision[];
    readonly target: Target;
    /** The outside systems by id, so an adapter finds the decision about the system it adapts. */
    readonly externals: readonly { readonly id: string; readonly name: string }[];
};

/** The part of the architecture a component runs in: the store that keeps its domain for data access, else the part that holds it. */
const containerOf = (component: TargetComponent, kind: string | undefined, target: Target) =>
    target.architecture.containers.find(
        (container) => (kind === "data") === (container.kind === "store") && container.holds.includes(component.domain),
    )?.name;

/**
 * The layer a component is built in: for an adapter, the layer the decision about its outside system names; otherwise
 * the one layer whose role its kind needs, in the part of the architecture that holds it when several have that role.
 * @param name the component's name
 * @param stack the layers, decisions and the target
 * @returns the layer, or nothing when no fact places it
 */
export const componentLayer = (name: string, stack: Stack): TargetLayer | undefined => {
    const component = stack.target.architecture.components.find((each) => each.name === name);
    if (component === undefined) return undefined;
    if (component.adapts !== undefined) {
        const system = stack.externals.find((each) => each.id === component.adapts)?.name ?? component.adapts;
        const decided = stack.decisions.find(
            (decision) => decision.topic._tag === "integration" && decision.topic.system === system,
        )?.layer;
        const layer = stack.layers.find((each) => each.id === decided);
        if (layer !== undefined) return layer;
    }
    const kind = component.kind ?? (component.adapts !== undefined ? "adapter" : undefined);
    const role = kind === undefined ? undefined : roleOfKind[kind];
    if (role === undefined) return undefined;
    const candidates = stack.layers.filter((layer) => roleOf(layer) === role);
    if (candidates.length <= 1) return candidates[0];
    const container = containerOf(component, kind, stack.target);
    const inside = candidates.filter((layer) => layer.container !== undefined && layer.container === container);
    return inside.length === 1 ? inside[0] : undefined;
};

/**
 * The layers a story is built in, in the layers' own order: every layer for the scaffold, the test layer for an
 * acceptance story, the layers its criteria and their decisions name, and the layer of each component it builds.
 * @param story the story
 * @param how whether it is the scaffold or an acceptance story
 * @param stack the layers, decisions and the target
 * @returns the layer ids; empty when no fact places it
 */
export const storyLayers = (
    story: Story,
    how: { readonly scaffold: boolean; readonly acceptance: boolean },
    stack: Stack,
): TargetLayer["id"][] => {
    if (how.scaffold) return stack.layers.map((layer) => layer.id);
    const ids = new Set<string>();
    if (how.acceptance) for (const layer of stack.layers) if (roleOf(layer) === "e2e") ids.add(layer.id);
    for (const criterion of story.criteria)
        for (const ref of criterion.from) {
            if (ref._tag === "layer") ids.add(ref.id);
            if (ref._tag === "decision") {
                const layer = stack.decisions.find((decision) => decision.id === ref.id)?.layer;
                if (layer !== undefined && layer !== "workspace") ids.add(layer);
            }
        }
    for (const name of story.components ?? []) {
        const layer = componentLayer(name, stack);
        if (layer !== undefined) ids.add(layer.id);
    }
    return stack.layers.filter((layer) => ids.has(layer.id)).map((layer) => layer.id);
};

/**
 * The depth of each layer in the graph of what it may reach: 0 for a layer that reaches none.
 * @param layers the layers
 * @returns the depth by layer id; a layer caught in a cycle counts as 0 (the cycle is a failing gate of its own)
 */
export const layerDepths = (layers: readonly TargetLayer[]): Map<string, number> => {
    const depth = new Map<string, number>();
    const visiting = new Set<string>();
    const of = (id: string): number => {
        const known = depth.get(id);
        if (known !== undefined) return known;
        if (visiting.has(id)) return 0;
        visiting.add(id);
        const deps = layers.find((layer) => layer.id === id)?.dependsOn ?? [];
        const value = deps.length === 0 ? 0 : 1 + Math.max(...deps.map(of));
        visiting.delete(id);
        depth.set(id, value);
        return value;
    };
    for (const layer of layers) of(layer.id);
    return depth;
};

/**
 * Every layer a layer may reach, directly or through others.
 * @param layers the layers
 * @param id the layer
 * @returns the ids
 */
export const reachedFrom = (layers: readonly TargetLayer[], id: string): Set<string> => {
    const seen = new Set<string>();
    const queue: string[] = [...(layers.find((layer) => layer.id === id)?.dependsOn ?? [])];
    for (let next = queue.pop(); next !== undefined; next = queue.pop())
        if (!seen.has(next)) {
            seen.add(next);
            queue.push(...(layers.find((layer) => layer.id === next)?.dependsOn ?? []));
        }
    return seen;
};
