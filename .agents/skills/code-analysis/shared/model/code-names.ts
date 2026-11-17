import type { Block as BlockRecord } from "./schemas/map";
import type { Lines } from "./shared-fields";

type Block = typeof BlockRecord.Encoded;

/**
 * Whether a character is an uppercase letter, in any script: it has a lowercase form other than itself.
 * @param char one character
 * @returns true for an uppercase letter
 */
const isUppercase = (char: string) => char.toLowerCase() !== char;

/**
 * Whether a character ends a word that an uppercase letter after it starts anew: a lowercase letter or a digit.
 * @param char one character
 * @returns true for a lowercase letter or a digit
 */
const endsLowercaseWord = (char: string) => char.toUpperCase() !== char || (char >= "0" && char <= "9");

/**
 * Whether a character only separates words in a name as code writes it: an underscore, a dash or a dot.
 * @param char one character
 * @returns true for a separator
 */
const isSeparator = (char: string) => char === "_" || char === "-" || char === ".";

/**
 * A name made readable: words split where a lowercase letter or digit meets an uppercase letter, and at underscores,
 * dashes and dots, in lowercase. Characters are read one by one; nothing is matched by pattern.
 * @param name a name as the code writes it
 * @returns the readable name
 */
const readable = (name: string) => {
    const words: string[] = [];
    let word = "";
    let before = "";
    for (const char of name) {
        if (isSeparator(char)) {
            words.push(word);
            word = "";
        } else if (word !== "" && endsLowercaseWord(before) && isUppercase(char)) {
            words.push(word);
            word = char;
        } else {
            word += char;
        }
        before = char;
    }
    words.push(word);
    return words
        .filter((each) => each !== "")
        .join(" ")
        .toLowerCase();
};

/**
 * Text with its first character in uppercase.
 * @param text any text
 * @returns the text, capitalised
 */
const capitalised = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Lines as a reader reads them.
 * @param lines a span of lines
 * @returns `file, line n` for one line, `file, lines a to b` for more
 */
const placeInWords = (lines: Lines) =>
    lines.firstLine === lines.lastLine
        ? `${lines.file}, line ${lines.firstLine}`
        : `${lines.file}, lines ${lines.firstLine} to ${lines.lastLine}`;

/**
 * What starts an entry point, short: how work reaches it up to the first comma (what follows says who sends it).
 * @param reachedBy how work reaches it, with its address
 * @returns the words
 */
const triggerOf = (reachedBy: string) => {
    const [first = reachedBy] = reachedBy.split(",");
    return first.trim();
};

/**
 * A piece of code as a reader names it: an entry point by what starts it (its verb and route, its schedule, its
 * message: P12.10, never a code signature), any other block by its name made readable, after its container's, else its
 * place. Each is a case of its own, never a default.
 * @param block a block
 * @returns its title
 */
export function titleOf(block: Block): string {
    const { entryPoint, writtenAs, container } = block;
    if (entryPoint !== undefined) {
        return triggerOf(entryPoint.reachedBy);
    }
    if (writtenAs !== undefined) {
        return container === undefined
            ? capitalised(readable(writtenAs))
            : `${capitalised(readable(container))}: ${readable(writtenAs)}`;
    }
    return placeInWords(block.lines);
}
