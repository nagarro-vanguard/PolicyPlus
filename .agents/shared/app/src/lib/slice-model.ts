import type { CapSlice, SliceAction, SliceLayer, SliceRule, SliceScreen } from "./slice-types";
import type { Grouping, Sort } from "./url-state";

// What the pages ask of a slice: lookups, which actions use a rule, the tag a rule carries, and filtering, sorting and
// grouping a list of rules. Pure, so the same code runs in the browser and in a test.

export type Tag = "refuses" | "rests" | "plain";
export const tagWords: Readonly<Record<Tag, string>> = {
    refuses: "Refuses something",
    rests: "Rests on other rules",
    plain: "Plain rule",
};

export type SliceModel = {
    readonly slice: CapSlice;
    readonly rule: ReadonlyMap<string, SliceRule>;
    readonly action: ReadonlyMap<string, SliceAction>;
    readonly layer: ReadonlyMap<string, SliceLayer>;
    readonly screen: ReadonlyMap<string, SliceScreen>;
    /** The actions that pass a rule, by the rule's id. */
    readonly usedBy: ReadonlyMap<string, readonly string[]>;
    /** The position of a rule in the slice, for the original order. */
    readonly order: ReadonlyMap<string, number>;
};

/**
 * Lookups over a slice.
 * @param slice the slice
 * @returns the model
 */
export const modelOf = (slice: CapSlice): SliceModel => {
    const usedBy = new Map<string, string[]>();
    for (const action of slice.actions) {
        for (const rule of action.rules) {
            const list = usedBy.get(rule) ?? [];
            list.push(action.id);
            usedBy.set(rule, list);
        }
    }
    return {
        slice,
        rule: new Map(slice.rules.map((each) => [each.id, each] as const)),
        action: new Map(slice.actions.map((each) => [each.id, each] as const)),
        layer: new Map(slice.layers.map((each) => [each.id, each] as const)),
        screen: new Map(slice.screens.map((each) => [each.key, each] as const)),
        usedBy,
        order: new Map(slice.rules.map((each, at) => [each.id, at] as const)),
    };
};

/**
 * The tag a rule carries: refusing wins over resting on others.
 * @param rule the rule
 * @returns the tag
 */
export const tagOf = (rule: SliceRule): Tag => (rule.gates ? "refuses" : rule.restsOn > 0 ? "rests" : "plain");

/**
 * The rules that pass a filter: every typed word is in the headline, the full text or the place, the layer and the tag match.
 * @param rules the rules
 * @param filter what the person typed and chose; empty strings mean no filter
 * @param filter.q the words
 * @param filter.layer a layer's id
 * @param filter.tag a tag
 * @returns the rules in their order
 */
export const filterRules = (rules: readonly SliceRule[], filter: { q: string; layer: string; tag: string }) => {
    const words = filter.q.toLowerCase().split(/\s+/).filter((word) => word !== "");
    return rules.filter((rule) => {
        if (filter.layer !== "" && rule.layer !== filter.layer) return false;
        if (filter.tag !== "" && tagOf(rule) !== filter.tag) return false;
        if (words.length === 0) return true;
        const text = `${rule.headline} ${rule.detail} ${rule.place}`.toLowerCase();
        return words.every((word) => text.includes(word));
    });
};

/**
 * Rules in an order a column names. The original order breaks ties, so a sort is stable.
 * @param rules the rules
 * @param model the slice model
 * @param sort the column
 * @param desc largest or last first
 * @returns a new list
 */
export const sortRules = (rules: readonly SliceRule[], model: SliceModel, sort: Sort, desc: boolean) => {
    const at = (rule: SliceRule) => model.order.get(rule.id) ?? 0;
    const text = (rule: SliceRule): string | number => {
        switch (sort) {
            case "headline":
                return rule.headline.toLowerCase();
            case "layer":
                return model.layer.get(rule.layer)?.name.toLowerCase() ?? "";
            case "tag":
                return tagOf(rule);
            case "place":
                return rule.place.toLowerCase();
            case "uses":
                return model.usedBy.get(rule.id)?.length ?? 0;
            default:
                return at(rule);
        }
    };
    const out = [...rules].sort((a, b) => {
        const x = text(a);
        const y = text(b);
        const base = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
        return (desc ? -base : base) || at(a) - at(b);
    });
    return out;
};

export type Group = { readonly key: string; readonly name: string; readonly rules: readonly SliceRule[]; readonly note?: string };

/**
 * The rules in groups, each with a name and the rules in it. By action a rule may be in more than one group (an action
 * names the rules it passes); by layer and by tag it is in exactly one. Empty groups are left out.
 * @param rules the rules to group (already filtered)
 * @param by the grouping
 * @param model the slice model
 * @param actions the actions in scope, for grouping by action: a screen's actions, or all of them
 * @returns the groups, in the order of their first rule
 */
export const groupRules = (rules: readonly SliceRule[], by: Grouping, model: SliceModel, actions: readonly SliceAction[]): Group[] => {
    const wanted = new Set(rules.map((rule) => rule.id));
    if (by === "layer") {
        return model.slice.layers.flatMap((layer) => {
            const here = rules.filter((rule) => rule.layer === layer.id);
            return here.length === 0 ? [] : [{ key: layer.id, name: layer.name, rules: here, note: layer.summary }];
        });
    }
    if (by === "tag") {
        return (["refuses", "rests", "plain"] as const).flatMap((tag) => {
            const here = rules.filter((rule) => tagOf(rule) === tag);
            return here.length === 0 ? [] : [{ key: tag, name: tagWords[tag], rules: here }];
        });
    }
    const groups = actions.flatMap((action) => {
        const here = action.rules.flatMap((id) => (wanted.has(id) ? [model.rule.get(id) as SliceRule] : []));
        return here.length === 0 ? [] : [{ key: action.id, name: action.headline, rules: here, note: action.screen }];
    });
    const inAction = new Set(groups.flatMap((group) => group.rules.map((rule) => rule.id)));
    const loose = rules.filter((rule) => !inAction.has(rule.id));
    return loose.length === 0 ? groups : [...groups, { key: "none", name: "Not passed by an action of this scope", rules: loose }];
};
