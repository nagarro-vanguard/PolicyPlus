/**
 * Plural for a count and a noun.
 * @param count how many
 * @param one the noun for one
 * @param many the noun for several; the noun with an s when left out
 * @returns the phrase
 */
export const plural = (count: number, one: string, many?: string) =>
    `${count} ${count === 1 ? one : many === undefined ? `${one}s` : many}`;

/**
 * A place as `file:line`.
 * @param place a place in the code
 * @param place.file the file
 * @param place.firstLine its first line
 * @returns the text
 */
export const where = (place: { readonly file: string; readonly firstLine: number }) =>
    `${place.file}:${place.firstLine}`;

/**
 * How wide a text is in characters of the label font: a wide character (East Asian script, emoji) counts twice, so a
 * label is cut by the room it takes, never by how many characters it has.
 * @param text the text
 * @returns its width in characters
 */
export const widthOf = (text: string) => {
    let width = 0;
    for (const char of text) {
        const code = char.codePointAt(0) ?? 0;
        width +=
            code >= 0x1100 &&
            (code <= 0x115f ||
                (code >= 0x2e80 && code <= 0xa4cf) ||
                (code >= 0xac00 && code <= 0xd7a3) ||
                (code >= 0xf900 && code <= 0xfaff) ||
                (code >= 0xfe30 && code <= 0xfe6f) ||
                (code >= 0xff00 && code <= 0xff60) ||
                code >= 0x1f300)
                ? 2
                : 1;
    }
    return width;
};

/**
 * A label wrapped into at most some lines of at most some characters of width, the last line ending in an ellipsis
 * when the text did not fit; a word too long for a line is cut.
 * @param text the label
 * @param room how many characters of width a line holds
 * @param lines how many lines there are
 * @returns the lines; the full text belongs in the figure's title
 */
export const wrapLabel = (text: string, room: number, lines: number) => {
    const out: string[] = [];
    let current = "";
    const words = text.split(/\s+/).filter((word) => word !== "");
    const push = () => {
        out.push(current);
        current = "";
    };
    for (const word of words) {
        let rest = word;
        while (widthOf(rest) > room) {
            let cut = "";
            for (const char of rest) {
                if (widthOf(cut + char) > room - 1) {
                    break;
                }
                cut += char;
            }
            if (current !== "") {
                push();
            }
            out.push(`${cut}-`);
            rest = rest.slice(cut.length);
        }
        if (current !== "" && widthOf(`${current} ${rest}`) > room) {
            push();
        }
        current = current === "" ? rest : `${current} ${rest}`;
    }
    if (current !== "") {
        push();
    }
    if (out.length <= lines) {
        return out;
    }
    const kept = out.slice(0, lines);
    const last = kept[lines - 1] ?? "";
    let cut = "";
    for (const char of last) {
        if (widthOf(`${cut}${char}…`) > room) {
            break;
        }
        cut += char;
    }
    kept[lines - 1] = `${cut.trimEnd()}…`;
    return kept;
};

/**
 * Text ordered the same on every machine, whatever its locale.
 * @param left one text
 * @param right the other
 * @returns negative, zero or positive
 */
export const compareText: (left: string, right: string) => number = new Intl.Collator("en").compare;

/**
 * The first sentence of a text: up to the first full stop, question mark or exclamation mark followed by a space.
 * @param text the text
 * @returns the first sentence, or the whole text when it has only one
 */
export const firstSentence = (text: string) => {
    const end = text.search(/[.!?](\s|$)/);
    return end === -1 ? text : text.slice(0, end + 1);
};
