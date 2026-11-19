import { compareText } from "../io";

/** How many words a text has. */
export const wordsOf = (text: string) => text.split(/\s+/).filter((word) => word !== "").length;

/**
 * The first sentence of a text, for a one-line summary; the text is the facts' own, never rewritten.
 * @param text the text
 * @returns the first sentence, or an empty text
 */
export const firstSentence = (text: string) => {
    const trimmed = text.trim();
    const match = /^[\s\S]*?[.!?](?=\s|$)/.exec(trimmed);
    return (match === null ? trimmed : match[0]).trim();
};

/**
 * A readable address part from a name: lower case letters and digits joined by hyphens, a camel-cased name split into
 * words, at most 60 characters, never empty.
 * @param text the name
 * @returns the part
 */
export const slugify = (text: string) => {
    const words = text
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word !== "");
    let joined = "";
    for (const word of words) {
        const next = joined === "" ? word : `${joined}-${word}`;
        if (next.length > 60 && joined !== "") break;
        joined = next.slice(0, 60);
    }
    return joined === "" ? "item" : joined;
};

/**
 * Address parts unique within each level, given in the order the items are offered, so the caller decides the order
 * once and every run gives the same parts.
 */
export class Slugs {
    private readonly used = new Map<string, Set<string>>();
    private readonly given = new Map<string, string>();

    /**
     * The part of one item, made once.
     * @param level the level it is unique in
     * @param id the item's stable id
     * @param name the name to build it from
     * @returns the part
     */
    of(level: string, id: string, name: string) {
        const key = `${level}\u0000${id}`;
        const known = this.given.get(key);
        if (known !== undefined) return known;
        const used = this.used.get(level) ?? new Set<string>();
        this.used.set(level, used);
        const base = slugify(name);
        let slug = base;
        for (let number = 2; used.has(slug); number += 1) slug = `${base}-${number}`;
        used.add(slug);
        this.given.set(key, slug);
        return slug;
    }

    /**
     * The part already given to an item.
     * @param level its level
     * @param id its id
     * @returns the part
     */
    get(level: string, id: string) {
        const known = this.given.get(`${level}\u0000${id}`);
        if (known === undefined) throw new Error(`no address part for ${level} ${id}`);
        return known;
    }
}

/** Sort items by a text key, then by a second key. */
export const sortByText = <T>(items: readonly T[], ...keys: ((item: T) => string)[]) =>
    items.toSorted((one, other) => {
        for (const key of keys) {
            const order = compareText(key(one), key(other));
            if (order !== 0) return order;
        }
        return 0;
    });
