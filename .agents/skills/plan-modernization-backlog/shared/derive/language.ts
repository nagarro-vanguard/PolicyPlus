/** Words of the code, and the analysis's own bookkeeping, that a reader of a work item should never meet. */
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

/**
 * The templates' mechanical rules for a work item: a title of at most 72 characters, no type prefix, no emoji, no line
 * crediting the tool, no empty section.
 * @param title the title
 * @param body the body, when it is known
 * @returns what is wrong, if anything
 */
export const mechanicalProblems = (title: string, body = "") => {
    const problems: string[] = [];
    if (title.length > 72) problems.push(`the title is ${title.length} characters, over 72`);
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
