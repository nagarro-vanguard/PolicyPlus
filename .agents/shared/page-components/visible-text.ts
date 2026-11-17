/**
 * The text a reader sees on a page, split by reader: the page's own reader (the approver) and each section that
 * names another reader with `data-reader`. Styles, scripts and tags are dropped; attributes such as anchors are not
 * text.
 * @param html the page
 * @returns the visible text of each reader's sections
 */
export function visibleTextByReader(html: string): Record<string, string> {
    const body = withoutElements(withoutElements(html, "style"), "script");
    const byReader: Record<string, string> = { approver: "" };
    const stack: string[] = [];
    let i = 0;
    while (i < body.length) {
        const open = body.indexOf("<", i);
        const reader = stack.at(-1) ?? "approver";
        if (open < 0) {
            byReader[reader] = (byReader[reader] ?? "") + decode(body.slice(i));
            break;
        }
        byReader[reader] = (byReader[reader] ?? "") + decode(body.slice(i, open));
        const close = body.indexOf(">", open);
        const tag = body.slice(open + 1, close);
        if (tag.startsWith("section")) {
            const marked = attributeOf(tag, "data-reader");
            stack.push(marked ?? stack.at(-1) ?? "approver");
        } else if (tag.startsWith("/section")) {
            stack.pop();
        }
        byReader[reader] = `${byReader[reader] ?? ""} `;
        i = close + 1;
    }
    return byReader;
}

/**
 * All the text a reader sees on a page, whoever each section is written for: for a skill whose pages have one reader,
 * so its checks never name another skill's readers.
 * @param html the page
 * @returns the visible text
 */
export function visibleText(html: string): string {
    return Object.values(visibleTextByReader(html)).join(" ");
}

/**
 * Whether a text names an id as a whole word: not as part of a longer id or word.
 * @param text the text
 * @param id the id
 * @returns true when it does
 */
export function namesId(text: string, id: string): boolean {
    const isWordChar = (char: string | undefined) =>
        char !== undefined &&
        ((char >= "a" && char <= "z") || (char >= "A" && char <= "Z") || (char >= "0" && char <= "9"));
    for (let at = text.indexOf(id); at >= 0; at = text.indexOf(id, at + 1)) {
        if (!isWordChar(text[at - 1]) && !isWordChar(text[at + id.length])) {
            return true;
        }
    }
    return false;
}

/**
 * The page without every element of one tag and its content.
 * @param html the page
 * @param tag the tag
 * @returns the page without them
 */
function withoutElements(html: string, tag: string): string {
    let rest = html;
    for (let start = rest.indexOf(`<${tag}`); start >= 0; start = rest.indexOf(`<${tag}`)) {
        const end = rest.indexOf(`</${tag}>`, start);
        rest = rest.slice(0, start) + rest.slice(end + tag.length + 3);
    }
    return rest;
}

/**
 * One attribute's value in a tag's text.
 * @param tag the tag's text, its name and attributes
 * @param name the attribute
 * @returns its value, or undefined when the tag has none
 */
function attributeOf(tag: string, name: string): string | undefined {
    const at = tag.indexOf(` ${name}="`);
    if (at < 0) {
        return undefined;
    }
    const from = at + name.length + 3;
    return tag.slice(from, tag.indexOf('"', from));
}

/**
 * Text with the page's escapes read back.
 * @param text the escaped text
 * @returns the text
 */
const decode = (text: string) =>
    text
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'")
        .replaceAll("&amp;", "&");
