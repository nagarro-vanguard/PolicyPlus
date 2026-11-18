/**
 * A number as a reader reads it, grouped by thousands.
 * @param value the number
 * @returns the words
 */
const num = (value: number) => value.toLocaleString("en-GB");

/**
 * The word that agrees with a number: the first for one, the second for any other count.
 * @param count the number
 * @param one the word for one
 * @param many the word for any other count
 * @returns the word
 */
export const agree = (count: number, one: string, many: string) => (count === 1 ? one : many);

/**
 * A count and the noun that agrees with it: "1 stack entry", "12 stack entries".
 * @param count the number
 * @param one the noun for one
 * @param many the noun for any other count
 * @returns the words
 */
export const counted = (count: number, one: string, many: string) => `${num(count)} ${agree(count, one, many)}`;

/**
 * When a page was made, in words, from the moment its model recorded.
 * @param iso the moment, as an ISO date and time
 * @returns the words, such as "12 October 2026 at 09:16"
 */
// A given moment is formatted here, never the clock read.
// eslint-disable-next-line no-restricted-syntax
export const madeOn = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });

/**
 * A criterion's text split into its title and the rest: the bold lead the writer gave it ("**AC-1: Title.**") without
 * its id and closing full stop, and what follows it. A text with no bold lead, or only a bold lead, has no title and is
 * all of the rest.
 * @param text the criterion as the work item words it
 * @returns the title, empty when the text has no separate one, and the rest
 */
export const splitCriterion = (text: string): { title: string; rest: string } => {
    const whole = text.trim();
    const end = whole.startsWith("**") ? whole.indexOf("**", 2) : -1;
    const rest = end < 0 ? "" : whole.slice(end + 2).trim();
    if (end < 3 || rest.length === 0) {
        return { title: "", rest: whole };
    }
    const lead = whole.slice(2, end).trim();
    const digits = lead.startsWith("AC-") ? [...lead.slice(3)].findIndex((char) => char < "0" || char > "9") : -1;
    const afterId = digits > 0 && lead[3 + digits] === ":" ? lead.slice(4 + digits).trim() : lead;
    const title = afterId.endsWith(".") ? afterId.slice(0, -1) : afterId;
    return { title, rest };
};
