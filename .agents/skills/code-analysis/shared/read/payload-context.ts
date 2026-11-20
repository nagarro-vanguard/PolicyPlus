import type { CapabilityPayload } from "../model/schemas/payloads";
import { compareText } from "../run/collections";

export type Context = CapabilityPayload["context"];

/**
 * How many of each list a context shows before it says how many it left out.
 */
const shown = { files: 12, rules: 8, points: 4, children: 12 } as const;

export type FileUse = { readonly file: string; readonly capabilities: number };

export type ContextInput = {
    /** What this place is, in one sentence: its kind, its name and what it is for. */
    readonly scope: string;
    /** The place the work starts, as `file:line`, first; none for a place with no single start. */
    readonly startsAt?: string;
    /** The files its code is in, each with how many capabilities' flows reach it. */
    readonly files: readonly FileUse[];
    /** What lies inside, for a place that is a map (the system, an area, a capability's screens): a line each. */
    readonly inside?: { readonly label: string; readonly lines: readonly string[] };
    /** For a screen: the layers it uses, a line each; shown after where to look first. */
    readonly layers?: readonly string[];
    readonly saves: readonly string[];
    readonly reads: readonly string[];
    /** The rules decided there, each as a sentence with its place. */
    readonly rules: readonly string[];
    readonly unconfirmed: readonly string[];
    readonly notFollowed: readonly string[];
    readonly commit: string;
};

/**
 * A list's first lines, and how many it left out.
 * @param lines the lines
 * @param cap how many to show
 * @returns the lines shown and the count of the rest
 */
const capped = (lines: readonly string[], cap: number) => ({
    lines: lines.slice(0, cap),
    more: Math.max(0, lines.length - cap),
});

/**
 * The lines that point at files: its own first, then the shared ones, the most widely shared first, capped as a whole
 * with the count left out.
 * @param files the files with how many capabilities reach each
 * @param startsAt where the work starts, or none
 * @returns the pointer lines and the count left out
 */
const pointers = (files: readonly FileUse[], startsAt: string | undefined) => {
    const own = files
        .filter((file) => file.capabilities <= 1)
        .toSorted((one, other) => compareText(one.file, other.file));
    const shared = files
        .filter((file) => file.capabilities > 1)
        .toSorted((one, other) => other.capabilities - one.capabilities || compareText(one.file, other.file));
    const all = [
        ...(startsAt === undefined ? [] : [`Starts at ${startsAt}`]),
        ...own.map((file) => `${file.file} (only this capability)`),
        ...shared.map(
            (file) =>
                `${file.file} (shared with ${file.capabilities - 1} other capabilit${file.capabilities === 2 ? "y" : "ies"})`,
        ),
    ];
    return capped(all, shown.files);
};

type Capped = { readonly lines: readonly string[]; readonly more: number };

/**
 * A heading and its lines as bullets, then the count left out; nothing when the list is empty and has none left out.
 * @param heading the heading, ending in a colon
 * @param list the capped lines
 * @returns the lines of text
 */
const bulleted = (heading: string, list: Capped) => [
    ...(list.lines.length === 0 ? [] : [heading, ...list.lines.map((line) => `- ${line}`)]),
    ...(list.more > 0 ? [`  ...and ${list.more} more`] : []),
];

/**
 * The plain text of a context, in the order a brief for a coding agent reads it.
 * @param input the facts of the place
 * @param lists the capped lists the context holds
 * @param lists.look where to look first
 * @param lists.inside what lies inside, for a place that is a map
 * @param lists.rules the rules decided there
 * @param lists.unconfirmed what is unconfirmed
 * @param lists.notFollowed what was not followed
 * @returns the text
 */
const textOfContext = (
    input: ContextInput,
    lists: {
        readonly look: Capped;
        readonly inside: Capped | undefined;
        readonly rules: Capped;
        readonly unconfirmed: Capped;
        readonly notFollowed: Capped;
    },
) => {
    const { look, inside, rules, unconfirmed, notFollowed } = lists;
    const layers = input.layers === undefined ? [] : input.layers;
    return [
        "Ask: (say what you want done here: verify, test, rewrite or explain)",
        `Scope: ${input.scope}`,
        ...(inside === undefined || input.inside === undefined ? [] : bulleted(`${input.inside.label}:`, inside)),
        ...bulleted("Where to look first:", look),
        ...(layers.length === 0 ? [] : ["Layers this screen uses:", ...layers.map((line) => `- ${line}`)]),
        ...(input.saves.length === 0 ? [] : [`Data saved: ${input.saves.join(", ")}`]),
        ...(input.reads.length === 0 ? [] : [`Data read: ${input.reads.join(", ")}`]),
        `Rules decided here: ${input.rules.length}`,
        ...rules.lines.map((line) => `- ${line}`),
        ...(rules.more > 0 ? [`  ...and ${rules.more} more`] : []),
        ...(unconfirmed.lines.length === 0
            ? ["Unconfirmed: nothing the analysis could not settle here"]
            : bulleted("Unconfirmed:", unconfirmed)),
        ...bulleted("Not followed:", notFollowed),
        `Commit: ${input.commit}`,
    ].join("\n");
};

/**
 * The context of one place, compiled once from the facts the payload already holds: a few capped lists in the order a
 * brief for a coding agent reads them (the scope, where to look first, the data saved and read, the rules decided
 * there, what is unconfirmed, what was not followed, the commit), and the plain text of them. It contains no record
 * ids. At the upper levels it is a map with pointers, capped, with the count of what was left out.
 * @param input the facts of the place
 * @returns the structured context and its text
 */
export const contextOf = (input: ContextInput): Context => {
    const look = pointers(input.files, input.startsAt);
    const inside = input.inside === undefined ? undefined : capped(input.inside.lines, shown.children);
    const rules = capped(input.rules, shown.rules);
    const layers = input.layers === undefined ? [] : input.layers;
    const unconfirmed = capped(input.unconfirmed, shown.points);
    const notFollowed = capped(input.notFollowed, shown.points);
    return {
        scope: input.scope,
        inside: inside === undefined ? [] : inside.lines,
        insideNotShown: inside === undefined ? 0 : inside.more,
        insideLabel: input.inside === undefined ? "" : input.inside.label,
        lookFirst: look.lines,
        lookFirstNotShown: look.more,
        layers: [...layers],
        saves: [...input.saves],
        reads: [...input.reads],
        rules: rules.lines,
        rulesNotShown: rules.more,
        rulesTotal: input.rules.length,
        unconfirmed: unconfirmed.lines,
        notFollowed: notFollowed.lines,
        commit: input.commit,
        text: textOfContext(input, { look, inside, rules, unconfirmed, notFollowed }),
    };
};

const pageExtensions = ["aspx", "ascx", "master"];
const codeBehindSuffixes = ["", ".cs", ".vb"];

/**
 * The path of a page file without its extension, when the file is a page's markup, code-behind or master.
 * @param file a file path
 * @returns the path, or undefined when the file is no page
 */
export const pagePathOf = (file: string): string | undefined => {
    const lower = file.toLowerCase();
    for (const extension of pageExtensions) {
        for (const suffix of codeBehindSuffixes) {
            const ending = `.${extension}${suffix}`;
            if (lower.endsWith(ending)) {
                return file.slice(0, file.length - ending.length);
            }
        }
    }
    return undefined;
};

/**
 * The words of a file's name with everything but letters and digits dropped and case folded, to match a browser script
 * to the page it belongs to (`select-flight.js` and `SelectFlight.aspx`).
 * @param path a file path
 * @returns its base name, normalised
 */
const looseName = (path: string) => {
    const last = path.split("/").at(-1);
    const base = last === undefined ? path : last;
    const dot = base.lastIndexOf(".");
    return [...(dot === -1 ? base : base.slice(0, dot)).toLowerCase()]
        .filter((char) => (char >= "a" && char <= "z") || (char >= "0" && char <= "9"))
        .join("");
};

/**
 * The candidate place a file's entry points belong to, so every slice of one page (its markup, its code-behind class
 * and its browser script) is one place. A page file is its own place, named by its path without the extension; a
 * browser script joins the one page whose file name matches its own, and stands alone when none or several match; any
 * other file is a place of its own, by its path.
 * @param file the file an entry point starts in
 * @param pages the path of every page file (without extension) that entry points start in
 * @returns the place's key, a path
 */
export const placeKeyOf = (file: string, pages: readonly string[]): string => {
    const page = pagePathOf(file);
    if (page !== undefined) {
        return page;
    }
    if (file.toLowerCase().endsWith(".js")) {
        const same = pages.filter((each) => looseName(each) === looseName(file));
        const [only] = same;
        return same.length === 1 && only !== undefined ? only : file.slice(0, file.length - ".js".length);
    }
    return file;
};

/**
 * Where an action that a person starts belongs, so every slice of one page (its markup, its code-behind class and its
 * browser script) merges into one screen, whichever capability holds it (`placeKeyOf`). An action another system or a
 * schedule starts is no screen's: the screens are the places a person works in, kept as they were for the readers of
 * `screens`; the surfaces hold every starter.
 * @param action the action's starter and the file it starts in
 * @param pages the path of every page file (without extension) that a person's action starts in
 * @returns the screen's key, a path without extension; undefined for an action no screen holds
 */
export const screenKeyOf = (
    action: { readonly startedBy: string; readonly place: { readonly file: string } },
    pages: readonly string[],
): string | undefined => (action.startedBy === "person" ? placeKeyOf(action.place.file, pages) : undefined);
