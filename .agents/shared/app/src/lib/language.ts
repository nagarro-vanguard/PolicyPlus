// What a reader of the app must never meet: a record id (the analysis's own bookkeeping), a word of the analysis's own
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
 * The text a reader reads from a page of HTML: what is on the page, without scripts, styles, tags, the text a button
 * copies to the clipboard (a brief written for a coding assistant, not for the reader) or a ready-made prompt shown in
 * a `<pre data-prompt>` box, which is shown as the plan skill wrote it, keys and folders included.
 * @param html the page
 * @returns the text
 */
export const visibleText = (html: string) =>
    html
        .replaceAll(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
        .replaceAll(/<pre[^>]*data-prompt[^>]*>[\s\S]*?<\/pre>/g, " ")
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

/** What the plan's own bookkeeping looks like: a story's key, an epic's key, a stand-in record's id. */
const planKeys: readonly [string, RegExp][] = [
    ["a story key is shown", /(?<![\p{L}\p{N}_-])story-[0-9a-f]{12}(?![\p{L}\p{N}_])/u],
    ["an epic key is shown", /(?<![\p{L}\p{N}_-])(?:area|capability):\S/u],
    ["a record id is shown", /(?<![\p{L}\p{N}_-])(?:layer|decision)-standin-\d+/u],
];

/** What a name from code looks like in running text: with an underscore, a class and its member, or a source file. */
const codeNames: readonly [string, RegExp][] = [
    // ALL-CAPS constants such as the registry's HKEY_LOCAL_MACHINE are the product's own words; a name from code has a lowercase letter.
    ["a code identifier is shown", /\b(?=[A-Za-z0-9_]*[a-z])[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+\b/],
    ["a code identifier is shown", /\b[A-Z][A-Za-z0-9]+\.[A-Z][A-Za-z0-9]+\b/],
    ["a source file is shown", /\b[\w-]+\.(?:vb|cs|ts|tsx|js|py|java|bat|sql)\b/i],
];

/**
 * What a reader of a plan page must not meet beyond what every page is checked for: a story's or an epic's key, a
 * stand-in record's id, or a name taken from the code. A prompt box, a rules file and a piece of code in a code element
 * are shown as they are written and are left out of the second check.
 * @param html the page
 * @param where the page's address
 * @returns the hard findings
 */
export const planFindings = (html: string, where: string): Finding[] => {
    const found: Finding[] = [];
    const text = visibleText(html);
    for (const [rule, pattern] of planKeys) {
        const hit = around(text, pattern);
        if (hit !== undefined) found.push({ rule, hit, where });
    }
    const prose = visibleText(html.replaceAll(/<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>/g, " "));
    for (const [rule, pattern] of codeNames) {
        const hit = around(prose, pattern);
        if (hit !== undefined) found.push({ rule, hit, where });
    }
    return found;
};

/**
 * Whether a page is one of the plan's.
 * @param page the page's path below the site's root
 * @returns true for plan.html and everything under plan/
 */
export const isPlanPage = (page: string) => page === "plan.html" || page.startsWith("plan/");
