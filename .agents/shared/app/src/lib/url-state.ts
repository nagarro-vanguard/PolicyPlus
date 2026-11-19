// What a link to a page of the app holds: the view, the grouping, the filter, the sort and the open drawer, all in
// the address's fragment, so a link sent to a colleague shows what the sender saw. Pure, so a test can round-trip it.

export const views = ["groups", "table"] as const;
export type View = (typeof views)[number];
export const groupings = ["action", "layer", "tag"] as const;
export type Grouping = (typeof groupings)[number];
export const sorts = ["order", "headline", "layer", "tag", "place", "uses"] as const;
export type Sort = (typeof sorts)[number];

export type UrlState = {
    /** The screen shown by the screen page, by key. */
    s: string;
    /** The capability the screen page reads, by slug. */
    c: string;
    view: View;
    group: Grouping;
    /** The words typed into the filter. */
    q: string;
    /** Filter by layer (a slice's layer id) or by tag; empty for all. */
    layer: string;
    tag: string;
    sort: Sort;
    desc: boolean;
    /** The open drawer: `rule`, an action or a screen. */
    rule: string;
    action: string;
    /** The diagram view and its focus. */
    diagram: string;
};

export const defaults: UrlState = {
    s: "",
    c: "",
    view: "groups",
    group: "action",
    q: "",
    layer: "",
    tag: "",
    sort: "order",
    desc: false,
    rule: "",
    action: "",
    diagram: "",
};

const oneOf = <T extends string>(list: readonly T[], value: string | null, fallback: T): T => {
    const found = list.find((each) => each === value);
    return found === undefined ? fallback : found;
};
/** Ids a drawer may name: short slice-local ids, never free text. */
const idOf = (value: string | null) => (value !== null && /^[a-z][0-9]{1,6}$/.test(value) ? value : "");
const slugOf = (value: string | null) => (value !== null && /^[\p{L}\p{N}][\p{L}\p{N}-]{0,80}$/u.test(value) ? value : "");

/**
 * The state a fragment holds. Anything that is not a known key with a known value is dropped, so a hand-edited link never
 * breaks the page.
 * @param hash the fragment, with or without the leading `#`
 * @returns the state, with defaults for what the fragment leaves out
 */
export const decodeState = (hash: string): UrlState => {
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    return {
        s: slugOf(params.get("s")),
        c: slugOf(params.get("c")),
        view: oneOf(views, params.get("view"), defaults.view),
        group: oneOf(groupings, params.get("group"), defaults.group),
        q: (params.get("q") ?? "").slice(0, 200),
        layer: idOf(params.get("layer")),
        tag: oneOf(["refuses", "rests", "plain", ""] as const, params.get("tag"), ""),
        sort: oneOf(sorts, params.get("sort"), defaults.sort),
        desc: params.get("dir") === "desc",
        rule: idOf(params.get("rule")),
        action: idOf(params.get("action")),
        diagram: (params.get("diagram") ?? "").replaceAll(/[^a-z0-9,:-]/g, "").slice(0, 120),
    };
};

/**
 * The fragment for a state: only what differs from the defaults, in a fixed order so the same state is the same link.
 * @param state the state
 * @returns the fragment without the `#`; empty when everything is a default
 */
export const encodeState = (state: Partial<UrlState>): string => {
    const full = { ...defaults, ...state };
    const params = new URLSearchParams();
    const set = (key: string, value: string, fallback: string) => {
        if (value !== fallback && value !== "") params.set(key, value);
    };
    set("s", full.s, "");
    set("c", full.c, "");
    set("view", full.view, defaults.view);
    set("group", full.group, defaults.group);
    set("q", full.q, "");
    set("layer", full.layer, "");
    set("tag", full.tag, "");
    set("sort", full.sort, defaults.sort);
    if (full.desc && full.sort !== "order") params.set("dir", "desc");
    set("rule", full.rule, "");
    set("action", full.action, "");
    set("diagram", full.diagram, "");
    return params.toString();
};
