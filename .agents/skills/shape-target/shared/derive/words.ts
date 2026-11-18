/*
 * Words that tie a design to a medium, to the controls of one, or to a technology. A design here names what a person
 * gets done and what the system does, never how a particular kind of interface does it. The list is data, not
 * knowledge of any stack, and the tests apply the same list to this skill's own agents, schemas and prompts.
 */
export const controlWords = [
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
export const mediumWords = ["web", "website", "mobile", "desktop", "android", "ios", "cli", "gui", "ui", "ux"];
export const technologyWords = ["sql", "http", "https", "xml", "api", "html", "css", "javascript", "registry"];

export const designWords = [...controlWords, ...mediumWords, ...technologyWords];

const pattern = (word: string) =>
    new RegExp(`(?<![A-Za-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?(?![A-Za-z0-9])`, "i");

/**
 * The words in a text that tie it to a medium, a control or a technology.
 * @param text the text
 * @param words the word list, the design words by default
 * @returns each word found
 */
export const wordsIn = (text: string, words: readonly string[] = designWords) =>
    words.filter((word) => pattern(word).test(text));
