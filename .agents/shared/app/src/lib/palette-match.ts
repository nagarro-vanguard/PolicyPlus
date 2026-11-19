// The command palette's matcher: a typed filter (`screen:`, `journey:`, `rule:`, `risk:high`), then a fuzzy match on name and id.
// Pure, so a test can run it without a page.

export type Entry = {
    readonly id: string;
    readonly kind: string;
    readonly headline: string;
    readonly summary?: string | undefined;
    readonly tags?: readonly string[] | undefined;
};

export type Query = {
    /** The kind the person asked for with a prefix, or empty for any. */
    readonly kind: string;
    /** A tag the person asked for (`risk:high` is kind risk with tag `risk:high`). */
    readonly tag: string;
    readonly text: string;
};

/** The prefixes a person can type and the kind each means. `rule` and `action` are not index kinds: they read slices. */
export const prefixes: Readonly<Record<string, string>> = {
    screen: "screen",
    cap: "capability",
    capability: "capability",
    area: "area",
    risk: "risk",
    rule: "rule",
    journey: "journey",
    task: "journey",
    story: "story",
    epic: "epic",
    phase: "phase",
    gate: "gate",
    page: "page",
};

/**
 * Splits what was typed into a kind, a tag and the words to match.
 * @param typed the text in the palette
 * @returns the query
 */
export const parseQuery = (typed: string): Query => {
    const trimmed = typed.trim();
    const hit = /^([a-z]+):(\S*)\s*(.*)$/i.exec(trimmed);
    if (hit === null) return { kind: "", tag: "", text: trimmed };
    const prefix = (hit[1] ?? "").toLowerCase();
    const kind = prefixes[prefix];
    if (kind === undefined) return { kind: "", tag: "", text: trimmed };
    const value = (hit[2] ?? "").toLowerCase();
    const rest = hit[3] ?? "";
    if (kind === "risk" && ["high", "medium", "low"].includes(value)) return { kind, tag: `risk:${value}`, text: rest };
    return { kind, tag: "", text: `${value} ${rest}`.trim() };
};

export type Match = { readonly score: number; readonly marks: readonly number[] };

const isStart = (text: string, at: number) => at === 0 || /[^a-z0-9]/i.test(text[at - 1] ?? "");

/**
 * How well a word matches a text: every letter of the word must appear in order; letters that are consecutive or open a word
 * score higher, and an early start scores higher still. Case is ignored.
 * @param word the word typed, one word
 * @param text the text to look in
 * @returns the score and the indexes of the matched letters, or undefined when it does not match
 */
export const fuzzy = (word: string, text: string): Match | undefined => {
    const w = word.toLowerCase();
    const t = text.toLowerCase();
    if (w === "") return { score: 0, marks: [] };
    const whole = t.indexOf(w);
    if (whole !== -1) {
        const marks = Array.from({ length: w.length }, (_, i) => whole + i);
        return { score: 100 + (isStart(t, whole) ? 40 : 0) - Math.min(whole, 30) + (t.length === w.length ? 30 : 0), marks };
    }
    const marks: number[] = [];
    let score = 0;
    let at = 0;
    let streak = 0;
    for (const letter of w) {
        const found = t.indexOf(letter, at);
        if (found === -1) return undefined;
        const consecutive = marks.length > 0 && found === (marks[marks.length - 1] ?? -2) + 1;
        streak = consecutive ? streak + 1 : 0;
        score += 1 + streak * 3 + (isStart(t, found) ? 6 : 0) - Math.min(found - at, 4) * 0.5;
        marks.push(found);
        at = found + 1;
    }
    return { score, marks };
};

/** The readable part of an id: `capability:browsing-policy-definitions` is `browsing policy definitions`. */
const idWords = (id: string) => id.slice(id.indexOf(":") + 1).replaceAll("-", " ");

/**
 * The entries a query finds, best first. Every word must match the headline or the id; a headline match counts for more.
 * @param entries what can be found
 * @param query the parsed query
 * @param limit the most entries to return
 * @returns the entries with their score and the marked letters of the headline
 */
export const search = (entries: readonly Entry[], query: Query, limit = 12) => {
    const words = query.text.split(/\s+/).filter((word) => word !== "");
    const found: { entry: Entry; score: number; marks: readonly number[] }[] = [];
    for (const entry of entries) {
        if (query.kind !== "" && entry.kind !== query.kind) continue;
        if (query.tag !== "" && !(entry.tags ?? []).includes(query.tag)) continue;
        let score = 0;
        let marks: readonly number[] = [];
        let ok = true;
        for (const word of words) {
            const head = fuzzy(word, entry.headline);
            const id = head === undefined ? fuzzy(word, idWords(entry.id)) : undefined;
            const text = head === undefined && id === undefined && entry.summary !== undefined ? fuzzy(word, entry.summary) : undefined;
            const hit = head ?? id ?? text;
            if (hit === undefined) {
                ok = false;
                break;
            }
            score += head === undefined ? (id === undefined ? hit.score * 0.25 : hit.score * 0.6) : hit.score;
            if (head !== undefined) marks = [...marks, ...head.marks];
        }
        if (ok) found.push({ entry, score: score + (words.length === 0 ? 0 : 0), marks });
    }
    return found.sort((a, b) => b.score - a.score || a.entry.headline.localeCompare(b.entry.headline)).slice(0, limit);
};
