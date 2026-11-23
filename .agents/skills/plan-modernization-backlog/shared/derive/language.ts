/** Words of the code, and the analysis's own bookkeeping, that a reader of a story should never meet. */
const recordId = /\b[a-z]+-\d{8,}\b/;
const camel = /\b[a-z]+(?:[A-Z][a-z0-9]+)+\b/g;
const pascal = /\b(?:[A-Z][a-z0-9]+){2,}\b/g;
const snake = /\b(?=[A-Za-z0-9_]*[a-z])[A-Za-z0-9]+(?:_[A-Za-z0-9]+)+\b/g;
const fileName =
    /\b[\w-]+\.(?:vb|cs|ts|tsx|js|jsx|json|xml|admx|adml|cmtx|resx|md|html|css|sql|yml|yaml|php|java|py)\b/gi;
const path = /\b[\w.-]+(?:[\\/][\w.-]+){2,}/g;
const emoji = /\p{Extended_Pictographic}/u;
const credit = /\b(?:claude|co-authored|generated with)\b/i;

/**
 * What a reader-facing text must not hold: a record id, a code identifier, a file name or a path.
 * @param text the text
 * @param allow words that look like identifiers but are the product's own name
 * @returns each hit with its rule
 */
export const readerProblems = (text: string, allow: readonly string[] = []) => {
    const problems: string[] = [];
    const id = text.match(recordId);
    if (id) problems.push(`a record id (${id[0]})`);
    const allowed = new Set(allow.map((word) => word.toLowerCase()));
    for (const [rule, pattern] of [
        ["a code identifier", camel],
        ["a code identifier", pascal],
        ["a code identifier", snake],
        ["a file name", fileName],
        ["a path", path],
    ] as const) {
        for (const hit of text.match(pattern) ?? []) {
            if (!allowed.has(hit.toLowerCase())) problems.push(`${rule} (${hit})`);
        }
    }
    return [...new Set(problems)];
};

/** The record id rule alone, for texts written for developers. */
export const recordIdProblems = (text: string) => {
    const id = text.match(recordId);
    return id ? [`a record id (${id[0]})`] : [];
};

/** Words a title or headline never ends on: they leave the phrase open. */
export const DANGLING: ReadonlySet<string> = new Set(
    (
        "a an the to of and or for in on with by from that which as at into so but if is are be " +
        "it its their his her our your my this these those where when who whose than then not no each every any some"
    ).split(" "),
);

/**
 * The words a whole title cannot end on: an article, a joining word or a possessive, which always wait for more.
 * Narrower than `DANGLING`: English lets a title end on a preposition, a particle or a pronoun ("Read what a policy is
 * for", "Let a person sign in", "Save a copy of it").
 */
export const OPEN_ENDED: ReadonlySet<string> = new Set(
    "a an the and or but nor their its his her our your my whose every each".split(" "),
);

/**
 * Why a title reads as cut: it ends in an ellipsis or on a word that leaves the phrase open.
 * @param title the title
 * @returns the problem, if any
 */
export const cutTitleProblems = (title: string) => {
    if (/(\.\.\.|\u2026)\s*$/.test(title)) return ["the title ends in an ellipsis"];
    const last = (title.trim().split(/\s+/).at(-1) ?? "").toLowerCase().replace(/[^a-z']/g, "");
    return OPEN_ENDED.has(last) ? [`the title ends on "${last}", which leaves it open`] : [];
};

/**
 * The templates' mechanical rules for a story: a title of at most 72 characters that is not cut, no type prefix, no
 * emoji, no line crediting the tool, no empty section.
 * @param title the title
 * @param body the body, when it is known
 * @returns what is wrong, if anything
 */
export const mechanicalProblems = (title: string, body = "") => {
    const problems: string[] = [];
    if (title.length > 72) problems.push(`the title is ${title.length} characters, over 72`);
    problems.push(...cutTitleProblems(title));
    if (/^(feat|fix|chore|refactor|docs|test)(\(.*\))?:/i.test(title)) problems.push("the title has a type prefix");
    if (emoji.test(title) || emoji.test(body)) problems.push("it holds an emoji");
    if (credit.test(title) || credit.test(body)) problems.push("it credits a tool");
    if (/<!--/.test(body)) problems.push("it keeps a template comment");
    const parts = body.split(/^## /m).slice(1);
    for (const part of parts) {
        const [heading = "", ...rest] = part.split("\n");
        if (rest.join("\n").trim() === "") problems.push(`the section "${heading.trim()}" is empty`);
    }
    return problems;
};

/** The most words a criterion may have; a longer one is refused where it is written. */
export const CRITERION_MAX_WORDS = 60;
/** Over this many words a criterion is worth a second look: split its conditions, keep its exact messages. */
export const CRITERION_LONG_WORDS = 40;

export const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

/**
 * Criteria over the hard cap, each named by its number.
 * @param criteria the criteria's texts
 * @returns one line per criterion over the cap
 */
export const criterionLengthProblems = (criteria: readonly string[]) =>
    criteria.flatMap((says, at) =>
        wordCount(says) > CRITERION_MAX_WORDS
            ? [`criterion ${at + 1} is ${wordCount(says)} words, over ${CRITERION_MAX_WORDS}`]
            : [],
    );
