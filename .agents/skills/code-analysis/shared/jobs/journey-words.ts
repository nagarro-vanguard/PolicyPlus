/*
 * Words that tie a journey to a medium, to the controls of one, or to a technology. A task is stated in what a person
 * gets done and what the system does, never how one kind of interface does it. The list is data, not knowledge of any
 * stack, and the gate applies it to every outcome and actor.
 */
const controlWords = [
    "click",
    "double-click",
    "double click",
    "press",
    "button",
    "menu",
    "tab",
    "dialog",
    "window",
    "screen",
    "page",
    "checkbox",
    "dropdown",
    "drop-down",
    "textbox",
    "text box",
    "icon",
    "tooltip",
    "scroll",
    "keyboard",
    "mouse",
    "tap",
    "swipe",
    "command line",
    "terminal",
    "browser",
    "url",
];
const mediumWords = ["web", "website", "mobile", "desktop", "android", "ios", "cli", "gui", "ui", "ux"];
const technologyWords = ["sql", "http", "https", "xml", "api", "html", "css", "javascript", "registry"];

const designWords = [...controlWords, ...mediumWords, ...technologyWords];

/**
 * Whether a character is a letter or a digit of the Latin alphabet.
 * @param char one character, or none
 * @returns true for a letter or a digit
 */
const isAlphanumeric = (char: string | undefined) =>
    char !== undefined &&
    ((char >= "a" && char <= "z") || (char >= "A" && char <= "Z") || (char >= "0" && char <= "9"));

type Match = { readonly ignoreCase: boolean; readonly plural: boolean; readonly underscore: boolean };

/**
 * Whether a text holds a word with no letter or digit beside it (nor an underscore, when asked), an `s` after it
 * allowed when asked.
 * @param text the text
 * @param word the word
 * @param how whether case is ignored, a plural taken, and an underscore counted as part of a word
 * @returns true when the text holds the word
 */
const holdsWord = (text: string, word: string, how: Match) => {
    const hay = how.ignoreCase ? text.toLowerCase() : text;
    const needle = how.ignoreCase ? word.toLowerCase() : word;
    const inWord = (char: string | undefined) => isAlphanumeric(char) || (how.underscore && char === "_");
    for (let at = hay.indexOf(needle); at >= 0; at = hay.indexOf(needle, at + 1)) {
        const end = at + needle.length;
        if (at > 0 && inWord(hay[at - 1])) {
            continue;
        }
        if (!inWord(hay[end]) || (how.plural && hay[end] === "s" && !inWord(hay[end + 1]))) {
            return true;
        }
    }
    return false;
};

/**
 * The words in a text that tie it to a medium, a control or a technology.
 * @param text the text
 * @returns each word found
 */
export const wordsIn = (text: string) =>
    designWords.filter((word) => holdsWord(text, word, { ignoreCase: true, plural: true, underscore: false }));

/**
 * Whether a name has a lowercase letter followed by an uppercase one, as camel case writes it.
 * @param word the name
 * @returns true for camel case
 */
const hasCamelCase = (word: string) =>
    [...word].some(
        (char, at) =>
            at > 0 && char.toLowerCase() !== char && word.charAt(at - 1).toUpperCase() !== word.charAt(at - 1),
    );

/**
 * Whether a name reads as one the code uses: long enough, and written in camel case, with an underscore or a dot.
 * @param word the name
 * @returns true for a name of the code
 */
const isCodeName = (word: string) =>
    word.length >= 4 && (word.includes("_") || word.includes(".") || hasCamelCase(word));

/**
 * The names of the system's own structure that a design must not carry: which of some names are code names, or phrases
 * long enough to be a name of a layer or a screen.
 * @param names the names the analysis holds: layers, screens, controls, files
 * @returns the names to keep out of a task's words, each once
 */
export const identifiersOf = (names: readonly string[]) => [
    ...new Set(names.filter((word) => (word.includes(" ") ? word.length >= 8 : isCodeName(word)))),
];

/**
 * The names of the system's own structure that a text carries: a name with a space is found whatever its case, any
 * other exactly, and neither with a letter, a digit or an underscore beside it.
 * @param text the text
 * @param identifiers the names to keep out
 * @returns each name found
 */
export const leaksIn = (text: string, identifiers: readonly string[]) =>
    identifiers.filter((word) =>
        holdsWord(text, word, { ignoreCase: word.includes(" "), plural: false, underscore: true }),
    );
