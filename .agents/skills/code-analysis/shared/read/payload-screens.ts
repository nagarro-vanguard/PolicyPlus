import { compareText, known } from "../run/collections";
import type { CapabilityPayload } from "../model/schemas/payloads";
import { contextOf, pagePathOf } from "./payload-context";
import { groupRank, plural, ruleLine, type Group } from "./payload-words";

type TouchedAction = {
    readonly id: string;
    readonly path: ReadonlyArray<{ readonly layer: string; readonly depth: number }>;
    readonly rules: readonly string[];
};

type Touched = { actions: number; rules: Set<string>; depth: number };

/**
 * The entry of a layer among those a screen touches, made when the layer is first met.
 * @param touched the entries so far, by layer id
 * @param layer the layer's id
 * @returns the layer's entry
 */
const entryOf = (touched: Map<string, Touched>, layer: string) => {
    if (touched.has(layer)) {
        return known(touched, layer, "checked");
    }
    const fresh = { actions: 0, rules: new Set<string>(), depth: Number.POSITIVE_INFINITY };
    touched.set(layer, fresh);
    return fresh;
};

/**
 * Count, for each layer an action's path meets, the action once and the least depth it is met at.
 * @param touched the entries so far, by layer id
 * @param action the action
 */
const walkPath = (touched: Map<string, Touched>, action: TouchedAction) => {
    const seen = new Set<string>();
    for (const step of action.path) {
        const each = entryOf(touched, step.layer);
        each.depth = Math.min(each.depth, step.depth);
        if (!seen.has(step.layer)) {
            seen.add(step.layer);
            each.actions++;
        }
    }
};

/**
 * How many of the screen's actions reach each rule.
 * @param actions the screen's actions
 * @returns the count by rule id
 */
const reachOf = (actions: readonly TouchedAction[]) => {
    const reach = new Map<string, number>();
    for (const action of actions) {
        for (const rule of new Set(action.rules)) {
            reach.set(rule, (reach.has(rule) ? known(reach, rule, "checked") : 0) + 1);
        }
    }
    return reach;
};

/**
 * The layers a screen touches, from its actions: a layer is touched when an action's path passes through it or when it
 * decides a rule an action reaches. Each rule is counted once, under the one layer that decides it; a rule is shared
 * when more than one of the screen's actions reach it. The layers come in flow order: by the fewest links from any of
 * the screen's actions to the layer (its own layers first), then person-facing first and store last.
 * @param actions the screen's actions, each once
 * @param layerOfRule the layer that decides each rule, by rule id
 * @param groupOfLayer the group of each layer, by layer id
 * @returns one entry per layer touched
 */
export const layersTouchedOf = (
    actions: readonly TouchedAction[],
    layerOfRule: ReadonlyMap<string, string>,
    groupOfLayer: ReadonlyMap<string, Group>,
) => {
    const touched = new Map<string, Touched>();
    for (const action of actions) {
        walkPath(touched, action);
    }
    const reach = reachOf(actions);
    for (const rule of reach.keys()) {
        const layer = layerOfRule.get(rule);
        if (layer !== undefined) {
            entryOf(touched, layer).rules.add(rule);
        }
    }
    const rank = (layer: string) =>
        groupRank(groupOfLayer.has(layer) ? known(groupOfLayer, layer, "checked") : "logic");
    return [...touched]
        .map(([layerId, each]) => ({
            layerId,
            actions: each.actions,
            rules: each.rules.size,
            sharedRules: [...each.rules].filter((rule) => known(reach, rule, "counted above") > 1).length,
            depth: each.depth,
        }))
        .toSorted(
            (one, other) =>
                (one.depth === other.depth ? 0 : one.depth < other.depth ? -1 : 1) ||
                rank(one.layerId) - rank(other.layerId) ||
                compareText(one.layerId, other.layerId),
        )
        .map(({ layerId, actions: count, rules, sharedRules }) => ({ layerId, actions: count, rules, sharedRules }));
};

type ScreenAction = CapabilityPayload["layers"][number]["actions"][number] & { readonly capability: string };

export type ScreenInput = {
    readonly key: string;
    readonly actions: readonly ScreenAction[];
    readonly payloads: readonly CapabilityPayload[];
    readonly layerOfRule: ReadonlyMap<string, string>;
    readonly groupOfLayer: ReadonlyMap<string, Group>;
    readonly commit: string;
    /** What the place is, when it is not a screen a person works in: said in its own noun. */
    readonly scope?: string;
};

/**
 * One line per layer the screen touches: its name, what it does, where to look and how many of the screen's rules it
 * decides.
 * @param input the screen
 * @param caps the capabilities that hold the screen's actions
 * @returns the lines
 */
const layerLines = (input: ScreenInput, caps: readonly CapabilityPayload[]) => {
    const layers = new Map(caps.flatMap((each) => each.layers.map((layer) => [layer.id, layer] as const)));
    return layersTouchedOf(input.actions, input.layerOfRule, input.groupOfLayer).flatMap((each) => {
        const layer = layers.get(each.layerId);
        if (layer === undefined) {
            return [];
        }
        const first = layer.evidence[0];
        const where = first === undefined ? "" : ` (${first.file}:${first.firstLine})`;
        return [`${layer.name}: ${layer.purpose}${where}; ${plural(each.rules, "rule", "rules")} decided here`];
    });
};

/**
 * The context of a screen merged across capabilities: its own files first, then the layers it uses with what each does,
 * where to look and how many of the screen's rules it decides, the data its actions save and read, its rules, and what
 * is unconfirmed or not followed.
 * @param input the screen's key, actions, the capability payloads, the layer lookups and the commit
 * @returns the screen's context
 */
export const screenContext = (input: ScreenInput) => {
    const { key, actions, payloads, commit } = input;
    const last = key.split("/").at(-1);
    const name = last === undefined ? key : last;
    const caps = payloads.filter((each) => actions.some((action) => action.capability === each.capability.id));
    const rules = new Map(
        caps.flatMap((each) => each.layers.flatMap((layer) => layer.rules.map((rule) => [rule.id, rule] as const))),
    );
    const found = actions.find((action) => pagePathOf(action.place.file) === key);
    const own = found === undefined ? actions[0] : found;
    const dataOf = (kind: "saves" | "reads") =>
        [...new Set(actions.flatMap((action) => action.context[kind]))].toSorted();
    return contextOf({
        scope:
            input.scope === undefined
                ? `Screen ${name} of the whole system: ${plural(actions.length, "action", "actions")} that a person starts, in ${plural(caps.length, "capability", "capabilities")}. ${own === undefined ? "" : own.purpose}`
                : input.scope,
        startsAt: own === undefined ? undefined : `${own.place.file}:${own.place.firstLine}`,
        files: [...new Set(actions.map((action) => action.place.file))]
            .toSorted()
            .map((file) => ({ file, capabilities: caps.length })),
        layers: layerLines(input, caps),
        saves: dataOf("saves"),
        reads: dataOf("reads"),
        rules: [...new Set(actions.flatMap((action) => action.rules))].flatMap((id) => {
            const rule = rules.get(id);
            return rule === undefined ? [] : [ruleLine(rule)];
        }),
        unconfirmed: caps.flatMap((each) => each.context.unconfirmed),
        notFollowed: [...new Set(actions.flatMap((action) => action.context.notFollowed))],
        commit,
    });
};
