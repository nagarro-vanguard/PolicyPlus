import { Result } from "effect";

/** One element of an XML document: its name, attributes, child elements and the text directly inside it. */
export type XmlElement = {
    readonly name: string;
    readonly attributes: ReadonlyMap<string, string>;
    readonly children: XmlElement[];
    text: string;
};

/** Raised inside the reader for a document that is not well-formed; the reader's edge turns it into a failed Result. */
class Malformed extends Error {}

const entities: ReadonlyMap<string, string> = new Map([
    ["amp", "&"],
    ["lt", "<"],
    ["gt", ">"],
    ["quot", '"'],
    ["apos", "'"],
]);

/**
 * Reads one character reference such as `&#10;` or `&#x1F600;`.
 * @param name the text between `&` and `;`, starting with `#`
 * @returns the character
 */
const characterOf = (name: string): string => {
    const hex = name.startsWith("#x") || name.startsWith("#X");
    const digits = name.slice(hex ? 2 : 1);
    const code = hex ? Number.parseInt(digits, 16) : Number(digits);
    if (
        digits.length === 0 ||
        !Number.isInteger(code) ||
        code < 0 ||
        code > 0x10ffff ||
        (code >= 0xd800 && code < 0xe000)
    ) {
        throw new Malformed(`the character reference &${name}; is not a character`);
    }
    return String.fromCodePoint(code);
};

/**
 * Replaces the references in a text: the five named ones and numeric character references.
 * @param text the text as the document holds it
 * @returns the text the references stand for
 */
const decoded = (text: string): string => {
    const parts: string[] = [];
    let from = 0;
    for (let at = text.indexOf("&"); at !== -1; at = text.indexOf("&", from)) {
        const end = text.indexOf(";", at);
        if (end === -1 || end - at > 12) {
            throw new Malformed("an & that starts no reference such as &amp;");
        }
        const name = text.slice(at + 1, end);
        const known = entities.get(name);
        if (known === undefined && !name.startsWith("#")) {
            throw new Malformed(`the reference &${name}; is not one XML defines`);
        }
        parts.push(text.slice(from, at), known ?? characterOf(name));
        from = end + 1;
    }
    return parts.join("") + text.slice(from);
};

/**
 * Finds where a tag ends, since an attribute value may hold a `>`.
 * @param xml the document
 * @param from where the tag starts, at its `<`
 * @returns the index of the tag's closing `>`
 */
const tagEnd = (xml: string, from: number): number => {
    let quote = "";
    for (let at = from + 1; at < xml.length; at += 1) {
        const char = xml.charAt(at);
        if (quote !== "") {
            quote = char === quote ? "" : quote;
        } else if (char === '"' || char === "'") {
            quote = char;
        } else if (char === ">") {
            return at;
        }
    }
    throw new Malformed("a tag is never closed");
};

/**
 * Reads the attributes of an opening tag.
 * @param source the tag's text after its name
 * @returns each attribute's name and its decoded value
 */
const attributesOf = (source: string): Map<string, string> => {
    const found = new Map<string, string>();
    let at = 0;
    while (at < source.length) {
        const next = source.slice(at).trimStart();
        at = source.length - next.length;
        if (next.length === 0) {
            break;
        }
        const equals = next.indexOf("=");
        const quote =
            equals === -1
                ? ""
                : next
                      .slice(equals + 1)
                      .trimStart()
                      .charAt(0);
        if (equals < 1 || (quote !== '"' && quote !== "'")) {
            throw new Malformed(`an attribute without a quoted value near "${next.slice(0, 20)}"`);
        }
        const valueAt = source.indexOf(quote, at + equals) + 1;
        const valueEnd = source.indexOf(quote, valueAt);
        if (valueEnd === -1) {
            throw new Malformed(`an attribute value that is never closed near "${next.slice(0, 20)}"`);
        }
        found.set(next.slice(0, equals).trim(), decoded(source.slice(valueAt, valueEnd)));
        at = valueEnd + 1;
    }
    return found;
};

/**
 * Opens an element from the text between `<` and `>` of its tag.
 * @param inner the tag's text, without the brackets
 * @returns the element, and whether the tag closes it too
 */
const elementOf = (inner: string): { readonly element: XmlElement; readonly selfClosing: boolean } => {
    const selfClosing = inner.endsWith("/");
    const body = selfClosing ? inner.slice(0, -1) : inner;
    const nameEnd = [...body].findIndex((char) => char === " " || char === "\n" || char === "\t" || char === "\r");
    const name = nameEnd === -1 ? body : body.slice(0, nameEnd);
    if (name.length === 0) {
        throw new Malformed("a tag with no name");
    }
    const attributes = nameEnd === -1 ? new Map<string, string>() : attributesOf(body.slice(nameEnd));
    return { element: { name, attributes, children: [], text: "" }, selfClosing };
};

/**
 * Skips what holds no element: a comment, a declaration or a doctype, or reads a CDATA section into its parent.
 * @param xml the document
 * @param at where the markup starts, at its `<`
 * @param into the open element, which a CDATA section's text goes to
 * @returns where reading goes on, or undefined when the markup at `at` is a tag
 */
const skipped = (xml: string, at: number, into: XmlElement | undefined): number | undefined => {
    const forms: readonly (readonly [string, string])[] = [
        ["<!--", "-->"],
        ["<![CDATA[", "]]>"],
        ["<?", "?>"],
        ["<!", ">"],
    ];
    const form = forms.find(([open]) => xml.startsWith(open, at));
    if (form === undefined) {
        return undefined;
    }
    const end = xml.indexOf(form[1], at + form[0].length);
    if (end === -1) {
        throw new Malformed(`${form[0]} is never closed`);
    }
    if (form[0] === "<![CDATA[" && into !== undefined) {
        into.text += xml.slice(at + form[0].length, end);
    }
    return end + form[1].length;
};

/** What reading has found so far: the elements still open, and the root once it has begun. */
type Reading = { readonly open: XmlElement[]; root: XmlElement | undefined };

/**
 * Takes the text between two tags: into the open element, or nowhere when it is blank outside the root.
 * @param reading what reading has found so far
 * @param text the text as the document holds it
 */
const takeText = (reading: Reading, text: string) => {
    const top = reading.open.at(-1);
    if (top !== undefined) {
        top.text += decoded(text);
    } else if (text.trim() !== "") {
        throw new Malformed("text outside the root element");
    }
};

/**
 * Takes one opening, closing or self-closing tag.
 * @param reading what reading has found so far
 * @param inner the tag's text, without its brackets
 */
const takeTag = (reading: Reading, inner: string) => {
    if (inner.startsWith("/")) {
        const name = inner.slice(1).trim();
        if (reading.open.pop()?.name !== name) {
            throw new Malformed(`</${name}> closes an element that is not open`);
        }
        return;
    }
    const { element, selfClosing } = elementOf(inner);
    const top = reading.open.at(-1);
    if (top === undefined && reading.root !== undefined) {
        throw new Malformed("more than one root element");
    }
    top?.children.push(element);
    reading.root ??= element;
    if (!selfClosing) {
        reading.open.push(element);
    }
};

/**
 * Reads an XML document into its root element.
 * @param xml the document
 * @returns the root element
 * Throws: Malformed for a document that is not well-formed.
 */
const rootOf = (xml: string): XmlElement => {
    const reading: Reading = { open: [], root: undefined };
    let at = 0;
    while (at < xml.length) {
        const lt = xml.indexOf("<", at);
        takeText(reading, xml.slice(at, lt === -1 ? xml.length : lt));
        if (lt === -1) {
            break;
        }
        const after = skipped(xml, lt, reading.open.at(-1));
        if (after === undefined) {
            const end = tagEnd(xml, lt);
            takeTag(reading, xml.slice(lt + 1, end));
            at = end + 1;
        } else {
            at = after;
        }
    }
    const { open, root } = reading;
    if (open.length > 0 || root === undefined) {
        throw new Malformed(root === undefined ? "no element" : `<${open.at(-1)?.name ?? ""}> is never closed`);
    }
    return root;
};

/**
 * Parses an XML document: elements, attributes, text, CDATA, comments, declarations and character references.
 * @param xml the document
 * @returns the root element, or what is wrong with the document
 */
export const parseXml = (xml: string): Result.Result<XmlElement, string> => {
    try {
        return Result.succeed(rootOf(xml));
    } catch (error) {
        if (error instanceof Malformed) {
            return Result.fail(error.message);
        }
        throw error;
    }
};
