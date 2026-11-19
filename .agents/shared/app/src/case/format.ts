import type { z } from "zod";
import type { NumberEntry } from "../../compose/contract";

// How a number of the case is printed: its value with the noun for one or many, and a combined number with its count
// per kind ("16 places: 9 pages, 7 services"). The app prints no count that is not in numbers.json; the number's scope
// says what is counted, in plain words, and goes beside it as its explanation.

export type NumberRecord = z.output<typeof NumberEntry>;
export type Noun = { one: string; many: string };

export type CountView = {
    /** The number in words: "11 screens", "16 places: 9 pages, 7 services". */
    text: string;
    /** What is counted and within what. */
    scope: string;
    value: number;
};

/** A value with the noun for one or many. */
export const counted = (value: number, noun: Noun) => `${value.toLocaleString("en")} ${value === 1 ? noun.one : noun.many}`;

/**
 * A number as the reader sees it. A combined number of one kind is shown in that kind's noun; of several, with each.
 * @param entry the number
 * @returns its words and scope
 */
export const countOf = (entry: NumberRecord): CountView => {
    const parts = entry.parts ?? [];
    const only = parts.length === 1 ? parts[0] : undefined;
    const text =
        only !== undefined
            ? counted(only.value, only.noun)
            : parts.length > 1
              ? `${counted(entry.value, entry.noun)}: ${parts.map((part) => counted(part.value, part.noun)).join(", ")}`
              : counted(entry.value, entry.noun);
    return { text, scope: entry.scope, value: entry.value };
};

/** A size in kilobytes, at least one. */
export const kilobytes = (bytes: number) => Math.max(1, Math.round(bytes / 1024));

/** The first letter in capitals, for a noun used as a heading. */
export const heading = (text: string) => (text === "" ? text : `${text[0]?.toUpperCase() ?? ""}${text.slice(1)}`);
