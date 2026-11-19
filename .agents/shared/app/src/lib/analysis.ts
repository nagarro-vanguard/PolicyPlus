// What the analysis pages (action, layer, risks, risk, area and the four system pages) decide before they draw: where a rule's
// one home is, how an action points to it, which layers call which, and what a risk touches. Pure functions of the payloads.
import { titleOf } from "./derive";
import { slugify } from "./slugs";
import { compareText } from "./text";
import type { Capability, Layer, Risk, Rule, System } from "./types";

/** A filter appears only above this many rows; below it the list is read whole. */
export const filterAbove = 15;
/** A group of rows opens closed when the page holds more rows than this. */
export const foldAbove = 15;

/**
 * The anchors of a layer's rules on its page, the one place each full sentence is written. An anchor is read from the rule's
 * first words (never a record id), with a number after it when two rules begin alike, given in the order of the ids so a
 * rebuild gives the same anchors.
 * @param rules the layer's rules
 * @returns the fragment, without the hash, by rule id
 */
export const ruleAnchors = (rules: readonly Rule[]) => {
    const taken = new Map<string, number>();
    const anchors = new Map<string, string>();
    for (const rule of rules.toSorted((one, other) => compareText(one.id, other.id))) {
        const base = `rule-${slugify(rule.says.split(/\s+/).slice(0, 8).join(" "))}`;
        const seen = taken.get(base) ?? 0;
        taken.set(base, seen + 1);
        anchors.set(rule.id, seen === 0 ? base : `${base}-${seen + 1}`);
    }
    return anchors;
};

/**
 * How many actions of a capability pass each rule, so a rule's row on its layer page can say who uses it.
 * @param capability the capability
 * @returns the count by rule id
 */
export const usedByCounts = (capability: Capability) => {
    const counts = new Map<string, number>();
    for (const layer of capability.layers)
        for (const action of layer.actions) for (const rule of action.rules) counts.set(rule, (counts.get(rule) ?? 0) + 1);
    return counts;
};

/**
 * The actions that pass at least one rule of a layer, each with the rules it passes there, so the layer page can show only an
 * action's rules when a link from that action asks for them.
 * @param capability the capability
 * @param layer the layer
 * @param slug the address part of an action
 * @returns the actions, in the order the capability lists them
 */
export const actionsOfRules = (capability: Capability, layer: Layer, slug: (actionId: string) => string) => {
    const here = new Set(layer.rules.map((rule) => rule.id));
    return capability.layers
        .flatMap((each) => each.actions)
        .flatMap((action) => {
            const rules = action.rules.filter((id) => here.has(id));
            return rules.length === 0 ? [] : [{ slug: slug(action.id), title: titleOf(action.purpose), rules }];
        });
};

/**
 * Who calls a layer: the layers in which the actions that pass through it are started, with how many each.
 * @param capability the capability
 * @param layerId the layer
 * @returns the callers, most first; empty when nothing passes through
 */
export const callersOf = (capability: Capability, layerId: string) => {
    const byStart = new Map<string, number>();
    for (const layer of capability.layers)
        for (const action of layer.actions)
            if (action.path.some((step) => step.layer === layerId)) byStart.set(layer.id, (byStart.get(layer.id) ?? 0) + 1);
    return [...byStart]
        .flatMap(([id, actions]) => {
            const layer = capability.layers.find((each) => each.id === id);
            return layer === undefined ? [] : [{ layer, actions }];
        })
        .toSorted((one, other) => other.actions - one.actions || compareText(one.layer.name, other.layer.name));
};

/**
 * The other capabilities whose flows pass through the same layer.
 * @param capabilities every capability
 * @param capabilityId the one asked about
 * @param layer the layer
 * @returns the others, by name
 */
export const alsoThrough = (capabilities: readonly Capability[], capabilityId: string, layer: Layer) =>
    capabilities
        .filter((each) => each.capability.id !== capabilityId && each.layers.some((other) => other.id === layer.id && other.blocks > 0))
        .map((each) => each.capability)
        .toSorted((one, other) => compareText(one.name, other.name));

/**
 * The rules an action passes, grouped by the layer that decides them, in the order the action reaches the layers.
 * @param capability the capability
 * @param path the layers on the action's path
 * @param ruleIds the action's rule ids
 * @returns the groups that hold at least one rule
 */
export const rulesByLayer = (capability: Capability, path: readonly Layer[], ruleIds: readonly string[]) => {
    const byRule = new Map<string, { rule: Rule; layer: Layer }>(capability.layers.flatMap((layer) => layer.rules.map((rule) => [rule.id, { rule, layer }] as const)));
    const mine = ruleIds.flatMap((id) => {
        const found = byRule.get(id);
        return found === undefined ? [] : [found];
    });
    // A rule may sit in a layer the path does not name (the action calls into it late); those groups follow the path's.
    const order = [...path, ...capability.layers.filter((layer) => !path.some((step) => step.id === layer.id))];
    return order.flatMap((layer) => {
        const here = mine.filter((entry) => entry.layer.id === layer.id).map((entry) => entry.rule);
        return here.length === 0 ? [] : [{ layer, rules: here }];
    });
};

const severityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * The risks, most serious first, then by kind, then by sentence: the one order of every list of risks.
 * @param risks the risks
 * @returns a sorted copy
 */
export const risksInOrder = (risks: readonly Risk[]) =>
    risks.toSorted((one, other) => (severityRank[one.severity] ?? 3) - (severityRank[other.severity] ?? 3) || compareText(one.categoryWords, other.categoryWords) || compareText(one.statement, other.statement));

/**
 * The screens a risk touches: the screens built from any of the risk's files.
 * @param system the system payload
 * @param risk the risk
 * @returns the screens, by name
 */
export const screensOfRisk = (system: System, risk: Risk) => {
    const files = new Set(risk.places.files);
    return system.screens.filter((screen) => screen.files.some((file) => files.has(file))).toSorted((one, other) => compareText(one.name, other.name));
};

/**
 * The options of a filter that the data really has: a value with its count, most first, never a value with no row.
 * @param values the value of each row
 * @returns the options
 */
export const optionsOf = (values: readonly string[]) =>
    [...Map.groupBy(values, (value) => value)].map(([value, list]) => ({ value, count: list.length })).toSorted((one, other) => other.count - one.count || compareText(one.value, other.value));

const wordsIn = (text: string) => text.split(/\s+/).filter((word) => word !== "").length;

/**
 * A risk's statement as a page opens with it: a title, a lede and what is left. The title is the first sentence when it holds 25
 * words or fewer; a longer first sentence is cut at its first colon, semicolon or dash within 18 words, and the part after the cut
 * becomes the lede, so no word is dropped. The sentences after the first are what the page says under "why it matters".
 * @param text the statement
 * @returns the title, the lede (empty when nothing was cut) and the rest
 */
export const splitStatement = (text: string) => {
    const flat = text.replaceAll(/\s+/g, " ").trim();
    const first = /^.+?[.!?](?=\s|$)/.exec(flat)?.[0] ?? flat;
    const rest = flat.slice(first.length).trim();
    if (wordsIn(first) <= 25) return { title: first, lede: "", rest };
    for (const hit of first.matchAll(/[:;]\s|\s[—–-]\s/g)) {
        const head = first.slice(0, hit.index).trim();
        if (wordsIn(head) > 18) break;
        if (wordsIn(head) >= 4) {
            const tail = first.slice((hit.index ?? 0) + hit[0].length).trim();
            return { title: head, lede: tail === "" ? "" : `${tail[0]?.toUpperCase() ?? ""}${tail.slice(1)}`, rest };
        }
    }
    return { title: first, lede: "", rest };
};

/**
 * A kind of risk as a short label: the category's own words, "data-integrity" as "Data integrity".
 * @param category the category's slug
 * @returns the label
 */
export const categoryLabel = (category: string) => {
    const spaced = category.replaceAll("-", " ").trim();
    return spaced === "" ? "Other" : `${spaced[0]?.toUpperCase() ?? ""}${spaced.slice(1)}`;
};
