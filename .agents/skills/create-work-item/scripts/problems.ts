/** Text that names the tool that wrote an item. */
const credits = ["generated with", "co-authored-by"];

/** The start of a path only one machine has. */
const localPaths = ["/Users/", "/private/tmp/"];

/**
 * Tells whether a character is in Unicode's emoji and symbol blocks, so it also flags checkmarks, stars and dingbats.
 * @param char one character
 * @returns true for U+1F000 to U+1FAFF and U+2600 to U+27BF
 */
const isPictograph = (char: string) => {
    const code = char.codePointAt(0) ?? 0;
    return (code >= 0x1f000 && code <= 0x1faff) || (code >= 0x2600 && code <= 0x27bf);
};

/**
 * Tells whether a text holds an emoji or a symbol.
 * @param text the text
 * @returns true when any of its characters is one
 */
const hasPictograph = (text: string) => {
    for (const char of text) {
        if (isPictograph(char)) {
            return true;
        }
    }
    return false;
};

/**
 * Lists what must not be in a work item: a missing or over-long title, an HTML comment, an emoji or symbol, a line
 * crediting the tool that wrote it, and a path a clone does not have.
 * @param text the item's markdown, its `# <title>` first
 * @returns one sentence per problem; empty when it may be created
 */
export const problemsOf = (text: string): readonly string[] => {
    const title = text.startsWith("# ") ? (text.split("\n")[0] ?? "").slice(2).trim() : "";
    const problems: string[] = [];
    if (title === "") {
        problems.push('the first line is "# <title>", the item\'s title');
    }
    if (title.length > 72) {
        problems.push(`the title is ${String(title.length)} characters; 72 is the most`);
    }
    if (text.includes("<!--")) {
        problems.push("it holds an HTML comment; remove it");
    }
    if (hasPictograph(text)) {
        problems.push("it holds an emoji; remove it");
    }
    const lower = text.toLowerCase();
    const credited = credits.find((phrase) => lower.includes(phrase));
    if (credited !== undefined) {
        problems.push(`it holds "${credited}": no line credits the tool that wrote it`);
    }
    const local = localPaths.find((path) => text.includes(path));
    if (local !== undefined) {
        problems.push(`it holds "${local}", a path a clone doesn't have`);
    }
    return problems;
};
