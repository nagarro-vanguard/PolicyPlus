/**
 * How long a rule's words run and whether they state more than one decision, read by plain string functions so the
 * same rule always gets the same answer. Words a rule quotes (a message shown, a value the code fixes) are its exact
 * outcome, not its length: each quotation counts as one word and its insides are never read for joins.
 */

/** Over this many words a rule is reported as long. */
const ruleWordsReported = 25;

/** Over this many words a rule is refused: split into one rule per decision. */
const ruleWordsRefused = 40;

/**
 * Whether a character is a letter.
 * @param char the character, or none past either end
 * @returns true when it is
 */
const letter = (char: string | undefined) => char !== undefined && char.toLowerCase() !== char.toUpperCase();

/**
 * A rule's words with each quotation replaced by one placeholder word: text in double quotes or curly quotes, and
 * text in single quotes that open after a space or a bracket and close before a space, a stop or the end (so a
 * possessive's apostrophe is never taken for a quote).
 * @param text the rule
 * @returns the text outside quotes
 * @internal exported for the tests, which check it on its own
 */
export const outsideQuotes = (text: string) => {
    const chars = [...text];
    let out = "";
    let at = 0;
    while (at < chars.length) {
        const char = chars[at];
        const before = chars[at - 1];
        const closing = char === '"' ? '"' : char === "“" ? "”" : char === "'" && !letter(before) ? "'" : undefined;
        if (closing !== undefined) {
            let end = at + 1;
            while (end < chars.length && !(chars[end] === closing && !letter(chars[end + 1]))) {
                end++;
            }
            if (end < chars.length) {
                out += " QUOTED";
                at = end + 1;
                continue;
            }
        }
        out += char === undefined ? "" : char;
        at++;
    }
    return out;
};

/**
 * How many words a rule runs to, each quotation counted as one.
 * @param text the rule
 * @returns the count
 */
export const wordsOutsideQuotes = (text: string) =>
    outsideQuotes(text)
        .split(" ")
        .filter((word) => word.trim() !== "").length;

const joins: ReadonlyArray<readonly [string, string]> = [
    [" also ", "says `also`"],
    [", and when ", "adds a second condition with `and when`"],
    [", and if ", "adds a second condition with `and if`"],
    [", and unless ", "adds a second condition with `and unless`"],
    [". when ", "has a second sentence with its own condition"],
    [". if ", "has a second sentence with its own condition"],
];

const hints: ReadonlyArray<readonly [string, string]> = [
    [";", "joins statements with a semicolon"],
    [". otherwise ", "has a second sentence with its own outcome"],
];

/**
 * The marks found in a rule's words outside what it quotes.
 * @param text the rule
 * @param marks the marks looked for, each with what it says of the rule
 * @returns one phrase per mark found
 */
const marksIn = (text: string, marks: ReadonlyArray<readonly [string, string]>) => {
    const plain = ` ${outsideQuotes(text).toLowerCase().split("\n").join(" ")} `;
    return marks.filter(([mark]) => plain.includes(mark)).map(([, words]) => words);
};

/**
 * The marks of a rule that states more than one decision, outside what it quotes: `also`, a second condition joined
 * by `and when`, `and if` or `and unless`, or a second sentence starting with its own condition. Conservative: a rule
 * whose outcome has two parts (refused and the person is told why), or whose one decision has branches written with a
 * semicolon or `otherwise`, is not refused for it; those are only reported (`decisionHints`).
 * @param text the rule
 * @returns one phrase per mark found; none for a rule of one decision
 */
const decisionMarks = (text: string) => marksIn(text, joins);

/**
 * What may show a rule of several decisions but also writes the branches of one: a semicolon, or a second sentence
 * starting `Otherwise`. Reported for a reader to judge, never refused.
 * @param text the rule
 * @returns one phrase per hint found
 */
const decisionHints = (text: string) => marksIn(text, hints);

/**
 * Whether a rule must be split, and what to say: over forty words, or more than one decision.
 * @param text the rule
 * @returns the reasons, none when it stands
 */
export const splitReasons = (text: string) => {
    const words = wordsOutsideQuotes(text);
    return [...(words > ruleWordsRefused ? [`runs to ${words} words`] : []), ...decisionMarks(text)];
};

/**
 * What is reported of a rule and not refused: over twenty-five words, and the hints of several decisions.
 * @param text the rule
 * @returns the phrases, none when nothing is reported
 */
export const ruleNotices = (text: string) => {
    const words = wordsOutsideQuotes(text);
    return [
        ...(words > ruleWordsReported && words <= ruleWordsRefused ? [`runs to ${words} words`] : []),
        ...decisionHints(text),
    ];
};
