const breaks = new Set([" ", "\t", "\n", '"', "'", "`", "(", ")", ",", ";", "<", ">", "[", "]", "|"]);

/**
 * The words of a text that hold a slash: what may be an address or a route, its trailing full stops and colons left
 * off.
 * @param text the text
 * @returns the words, in order
 */
const slashWords = (text: string) => {
    const words: string[] = [];
    let word = "";
    for (const char of `${text} `) {
        if (!breaks.has(char)) {
            word += char;
            continue;
        }
        let end = word.length;
        while (end > 0 && (word[end - 1] === "." || word[end - 1] === ":")) {
            end--;
        }
        const kept = word.slice(0, end);
        if (kept.includes("/") && [...kept].some((each) => each.toLowerCase() !== each.toUpperCase())) {
            words.push(kept);
        }
        word = "";
    }
    return words;
};

/**
 * A text without its leading slashes.
 * @param text the text
 * @returns the rest
 */
const withoutLeadingSlashes = (text: string) => {
    let start = 0;
    while (text[start] === "/") {
        start++;
    }
    return text.slice(start);
};

/**
 * The address an entry point is reached at, copied from its own words (`reachedBy`) and kept only when it stands,
 * character for character, in the lines that show something starts it: a web address or an API route, never a guess.
 * A file named in the words is no address.
 * @param reachedBy how work reaches it, as the Map wrote it
 * @param evidenceText the text of its evidence lines
 * @param files the files of its evidence lines
 * @returns the address, or none
 */
export const addressOf = (reachedBy: string | null, evidenceText: string, files: readonly string[]) => {
    if (reachedBy === null) {
        return undefined;
    }
    const words = slashWords(reachedBy).filter(
        (word) => !files.some((file) => file.endsWith(withoutLeadingSlashes(word))),
    );
    for (const word of words) {
        const bare = withoutLeadingSlashes(word);
        if (evidenceText.includes(word)) {
            return word;
        }
        if (bare.includes("/") && evidenceText.includes(bare)) {
            return bare;
        }
    }
    return undefined;
};

/**
 * The gate on addresses: each one stands, character for character, in its entry point's evidence lines.
 * @param addressed the entry points given an address, each with the text of its evidence lines
 * @returns one line per gap
 */
export const addressGaps = (
    addressed: ReadonlyArray<{ readonly id: string; readonly address: string; readonly evidenceText: string }>,
) =>
    addressed
        .filter((each) => !each.evidenceText.includes(each.address))
        .map((each) => `${each.id}: the address ${each.address} is not in the lines that show it starts`);
