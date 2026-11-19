// Small helpers the scripts share: build elements without ever parsing a string as markup (so analysed text can never
// become markup), badges and evidence chips drawn like the components of the kit, and copy to the clipboard.

type Child = Node | string | number | null | false | undefined | readonly Child[];
type Attr = string | number | boolean | null | undefined | ((event: Event) => void);

/**
 * An element with attributes and children. `class` and `text` are shorthands; a function under `on<event>` is a listener;
 * `false`, `null` and `undefined` attributes are left out.
 * @param tag the tag name
 * @param attrs the attributes
 * @param kids the children; strings become text nodes
 * @returns the element
 */
export const h = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, Attr> = {}, ...kids: Child[]): HTMLElementTagNameMap[K] => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined || value === null || value === false) continue;
        if (key === "class") node.className = String(value);
        else if (key === "text") node.textContent = String(value);
        else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value === true ? "" : String(value));
    }
    const add = (kid: Child) => {
        if (kid === null || kid === false || kid === undefined) return;
        if (Array.isArray(kid)) kid.forEach(add);
        else node.append(typeof kid === "string" || typeof kid === "number" ? document.createTextNode(String(kid)) : (kid as Node));
    };
    kids.forEach(add);
    return node;
};

// The same line icons as components/ui/Icon.astro, for what the scripts draw.
const paths: Record<string, string> = {
    "alert-triangle": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    "alert-circle": '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    pencil: '<path d="M21.2 6.8a1 1 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8l-1.3 4.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5z"/>',
    eye: '<path d="M2.1 12.3a1 1 0 0 1 0-.7 10.8 10.8 0 0 1 19.8 0 1 1 0 0 1 0 .7 10.8 10.8 0 0 1-19.8 0"/><circle cx="12" cy="12" r="3"/>',
    "check-circle": '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "help-circle": '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.2a2 2 0 0 0-1.7 1.1"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M8 16H3v5"/>',
};

/**
 * A line icon, hidden from a screen reader.
 * @param name the icon's name
 * @returns the svg
 */
export const icon = (name: string): SVGSVGElement => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.innerHTML = paths[name] ?? "";
    return svg;
};

const known: Record<string, { icon: string; word: string }> = {
    high: { icon: "alert-triangle", word: "High" },
    medium: { icon: "alert-circle", word: "Medium" },
    low: { icon: "info", word: "Low" },
    "changes-state": { icon: "pencil", word: "Changes state" },
    "read-only": { icon: "eye", word: "Read only" },
    stated: { icon: "check-circle", word: "Stated by the code" },
    inferred: { icon: "search", word: "Inferred" },
    assumed: { icon: "help-circle", word: "Assumed" },
};

/**
 * A badge as components/ui/Badge.astro draws it: an icon and a word for a scale's kinds, a word alone for a neutral one.
 * @param kind a kind of a scale, or "neutral"
 * @param label the word, when it is not the kind's own
 * @returns the badge
 */
export const badge = (kind: string, label?: string): HTMLSpanElement => {
    const shown = known[kind];
    const node = h("span", { class: `badge${shown === undefined ? "" : ` badge-${kind}`}` });
    if (shown !== undefined) node.append(icon(shown.icon));
    node.append(h("span", { text: label ?? shown?.word ?? kind }));
    return node;
};

/**
 * The last part of a path, for rows that must stay one line; the full place is the chip's label and what it copies.
 * @param place `file:line`
 * @returns `name:line`
 */
export const shortPlace = (place: string) => place.slice(place.lastIndexOf("/") + 1);

/**
 * An evidence chip: `file:line` in mono, a button that copies the whole place (site.js handles the click).
 * @param place the place, `file:line`
 * @param full show the whole path instead of its last part
 * @returns the chip
 */
export const evidence = (place: string, full = false): HTMLButtonElement => {
    const chip = h("button", { type: "button", class: "chip-evidence", "data-copy-text": place, "data-copied": "Copied", "aria-label": `Copy ${place}`, title: place });
    chip.append(h("span", { "data-label": "", text: full ? place : shortPlace(place) }), icon("copy"));
    return chip;
};

/**
 * Words with a unit, singular for one.
 * @param count how many
 * @param one the noun for one
 * @param many the noun for more; the noun and an s when left out
 * @returns the phrase
 */
export const count = (n: number, one: string, many?: string) => `${n} ${n === 1 ? one : many ?? `${one}s`}`;

/**
 * Puts text on the clipboard, with the old way as a fallback.
 * @param text the text
 * @returns when it is done; never rejects
 */
export const copyText = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const area = h("textarea", { "aria-hidden": "true" });
        area.value = text;
        document.body.append(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        return ok;
    }
};

/**
 * Says something to a screen reader.
 * @param text the words
 */
export const say = (text: string) => {
    const box = document.getElementById("announce");
    if (box !== null) box.textContent = text;
};
