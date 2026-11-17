// What a reader of ux-visuals must never meet: a record id (the analysis's own bookkeeping), a word of the analysis's own
// machinery, or phrasing that reads as boilerplate. A record id is a hard failure; the rest is reported, because the words
// of the analysed code and of the agents that read it are not ours to rewrite. See stages/publish/rules/narrative.md.

export type Finding = { readonly rule: string; readonly hit: string; readonly where: string };

/** A record id: the kind of record, a hyphen and eight or more digits, as a whole word. */
const recordId = /(?<![\p{L}\p{N}_-])[a-z]+(?:-[a-z]+)*-\d{8,}(?![\p{L}\p{N}_])/u;

const machinery: readonly [string, RegExp][] = [
    [
        "a word of the analysis's own machinery",
        /\b(?:entry points?|payloads?|record ids?|verdicts?|code kinds?|block ids?)\b/i,
    ],
    [
        "a word of the analysis's own machinery",
        /\b(?:blocks?)\b(?=\s+(?:of code|id|record))|\b(?:analysed|analyzed|each|every|one|a|the) blocks?\b(?!\s+(?:the|an|a|any|all|it|them|that|until|if)\b)/i,
    ],
    [
        "a name from the analysis's data model",
        /\b(?:startedBy|externalSystem|crossCutting|sharedDomain|facesPerson|facesOtherSystems|runsOnSchedule|runsAsTooling|mixedEntry|reachesStore)\b/,
    ],
];

const tells: readonly [string, RegExp][] = [
    [
        "phrasing that reads as boilerplate",
        /\b(?:delve[sd]?|leverag(?:e|es|ed|ing)|seamless(?:ly)?|robust|comprehensive|crucial|pivotal|tapestry|testament|holistic|streamlin(?:e|es|ed|ing)|plethora|myriad)\b/i,
    ],
    ["phrasing that reads as boilerplate", /\b(?:foster(?:s|ed|ing)?|elevat(?:e|es|ed|ing)|utiliz(?:e|es|ed|ing))\b/i],
    [
        "phrasing that reads as boilerplate",
        /(?:worth noting|important to note|in conclusion|furthermore|moreover|game-chang|cutting-edge|navigate the)/i,
    ],
    ["a dash used as punctuation", /—/],
];

/**
 * Where a pattern first matches in a text, with a few words around it, or nothing.
 * @param text the text
 * @param pattern the pattern
 * @returns the words around the first match
 */
const around = (text: string, pattern: RegExp) => {
    const found = pattern.exec(text);
    return found === null
        ? undefined
        : text
              .slice(Math.max(0, found.index - 40), found.index + found[0].length + 40)
              .replaceAll(/\s+/g, " ")
              .trim();
};

/**
 * What in a text a reader must not meet.
 * @param text what the reader reads in one place
 * @param where the page it is on
 * @returns the hard findings (record ids) and the reported ones
 */
export const languageFindings = (text: string, where: string) => {
    const hard: Finding[] = [];
    const soft: Finding[] = [];
    const id = around(text, recordId);
    if (id !== undefined) {
        hard.push({ rule: "a record id is shown", hit: id, where });
    }
    for (const [rule, pattern] of [...machinery, ...tells]) {
        const hit = around(text, pattern);
        if (hit !== undefined) {
            soft.push({ rule, hit, where });
        }
    }
    return { hard, soft };
};

/**
 * Whether an address or a file name carries a record id.
 * @param path the address
 * @returns true when it does
 */
export const pathNamesRecordId = (path: string) => recordId.test(path);

/**
 * The text a reader reads from a page of HTML: what is on the page, without scripts, styles, tags or the text a button
 * copies to the clipboard (a brief written for a coding assistant, not for the reader).
 * @param html the page
 * @returns the text
 */
export const visibleText = (html: string) =>
    html
        .replaceAll(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
        .replaceAll(/data-copy-text="[^"]*"/g, "")
        .replaceAll(/<[^>]+>/g, " ")
        .replaceAll("&#39;", "'")
        .replaceAll("&quot;", '"')
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll(/\s+/g, " ")
        .trim();

/**
 * The addresses a page links to and loads from.
 * @param html the page
 * @returns every href and src value
 */
export const addressesIn = (html: string) =>
    [...html.matchAll(/(?:href|src)="([^"]*)"/g)].map((match) => match[1] ?? "");
