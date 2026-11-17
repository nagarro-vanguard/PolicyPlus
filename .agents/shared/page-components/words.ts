/**
 * A number as a reader reads it, grouped by thousands.
 * @param value the number
 * @returns the words
 */
export const num = (value: number) => value.toLocaleString("en-GB");

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
export const madeOn = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });

/**
 * A heading as an anchor: its words, lower case, joined by hyphens, so a link can name a section.
 * @param heading the heading
 * @returns the anchor
 */
export const anchorOf = (heading: string) =>
    [...heading.toLowerCase()]
        .map((char) => ((char >= "a" && char <= "z") || (char >= "0" && char <= "9") ? char : " "))
        .join("")
        .split(" ")
        .filter((word) => word.length > 0)
        .join("-");
