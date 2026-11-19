// Short text derived from long text, deterministically. The analysis writes one sentence where the pages need a headline
// (at most 8 words) and a summary (at most 25 words); until the agents write those themselves (the content spike's
// recommendation), the pages derive them here. Nothing is invented: a headline or a summary is always a leading part of
// the original words, the original stays whole as the `detail`, and a cut that drops words ends in an ellipsis.

export const headlineWords = 8;
export const summaryWords = 25;

const words = (text: string) => text.split(/\s+/).filter((word) => word !== "");

/** Words a headline never ends on: a cut there would read as a broken sentence. */
const dangling = new Set([
    "a", "an", "the", "of", "to", "in", "on", "at", "by", "for", "with", "from", "and", "or", "but", "that", "which",
    "when", "if", "is", "are", "as", "so", "its", "their", "his", "her", "each", "every", "than", "then", "into",
]);

/** Where a clause ends: the punctuation, and the words that open a second clause. */
const boundaries = /[.!?;:]\s|,\s|\s[—–-]\s|\s(?=(?:which|that|so|because|while|whereas|but|unless|until|once|after|before|then)\s)/g;

const upperFirst = (text: string) => (text === "" ? text : text[0]?.toUpperCase() + text.slice(1));

/**
 * The words of a text up to a limit, cut at the last clause that fits, or else at a word that is not left dangling.
 * @param text the original
 * @param limit the most words
 * @returns the cut text, with an ellipsis when words were dropped
 */
const shorten = (text: string, limit: number) => {
    const flat = text.replaceAll(/\s+/g, " ").trim();
    const all = words(flat);
    if (all.length <= limit) return flat.replace(/[.,;:]$/, "");
    // The longest run of whole clauses that fits, as long as it keeps at least three words.
    let best = "";
    for (const hit of flat.matchAll(boundaries)) {
        const head = flat.slice(0, hit.index).trim().replace(/[.,;:—–-]$/, "");
        const count = words(head).length;
        if (count > limit) break;
        if (count >= 3) best = head;
    }
    if (best !== "") return best;
    let cut = all.slice(0, limit);
    while (cut.length > 3 && dangling.has((cut[cut.length - 1] ?? "").toLowerCase().replace(/[^a-z]/g, ""))) cut = cut.slice(0, -1);
    return `${cut.join(" ").replace(/[.,;:]$/, "")}…`;
};

/**
 * A headline: the first clause of the text, at most eight words, without a leading article when that saves a word.
 * @param text the original sentence
 * @returns the headline; empty when the text is
 */
export const headlineOf = (text: string) => {
    const flat = text.replaceAll(/\s+/g, " ").trim();
    if (flat === "") return "";
    const trimmed = words(flat).length > headlineWords ? flat.replace(/^(?:the|an?)\s+/i, "") : flat;
    return upperFirst(shorten(trimmed, headlineWords));
};

/**
 * A summary: the leading sentences of the text that fit in 25 words, or the first clause cut to fit.
 * @param text the original sentence
 * @returns the summary; empty when the text is
 */
export const summaryOf = (text: string) => {
    const flat = text.replaceAll(/\s+/g, " ").trim();
    if (flat === "") return "";
    if (words(flat).length <= summaryWords) return flat;
    const sentences = flat.match(/[^.!?]+[.!?]+(?:\s|$)/g) ?? [flat];
    let out = "";
    for (const sentence of sentences) {
        const next = `${out}${sentence}`.trim();
        if (words(next).length > summaryWords) break;
        out = `${next} `;
    }
    return out.trim() === "" ? upperFirst(shorten(flat, summaryWords)) : out.trim();
};

/**
 * A count of words.
 * @param text the text
 * @returns how many words
 */
export const wordCount = (text: string) => words(text).length;

/**
 * A summary that adds to the headline: the sentences after the first, when the text has more than one, cut to 25 words. The
 * first sentence is what the headline was cut from, so repeating it would only say the same thing twice.
 * @param text the original text
 * @returns the summary of the rest; empty when the text is one sentence
 */
export const summaryBeyond = (text: string) => {
    const flat = text.replaceAll(/\s+/g, " ").trim();
    const end = flat.search(/[.!?]\s/);
    return end === -1 ? "" : summaryOf(flat.slice(end + 2));
};

/** The most words a row's title may hold before it is cut to its first sentence. */
export const titleWords = 25;

/**
 * The title of a row: the whole sentence when it is 25 words or fewer, otherwise its first sentence. Never cut mid-sentence and
 * never ends in an ellipsis, so a row says what the text says.
 * @param text the original text
 * @returns the title; empty when the text is
 */
export const titleOf = (text: string) => {
    const flat = text.replaceAll(/\s+/g, " ").trim();
    if (words(flat).length <= titleWords) return flat;
    const first = /^.+?[.!?](?=\s|$)/.exec(flat)?.[0] ?? flat;
    return first;
};

/** The most words a lede may hold. */
export const ledeWords = 45;

/**
 * The lede of a page: the whole purpose when it is short, otherwise the leading whole sentences that fit in 45 words.
 * @param text the purpose
 * @returns the lede; empty when the text is
 */
export const ledeOf = (text: string) => {
    const flat = text.replaceAll(/\s+/g, " ").trim();
    if (words(flat).length <= ledeWords) return flat;
    const sentences = flat.match(/[^.!?]+[.!?]+(?:\s|$)/g) ?? [flat];
    let out = "";
    for (const sentence of sentences) {
        const next = `${out}${sentence}`.trim();
        if (words(next).length > ledeWords) break;
        out = `${next} `;
    }
    return out.trim() === "" ? titleOf(flat) : out.trim();
};
