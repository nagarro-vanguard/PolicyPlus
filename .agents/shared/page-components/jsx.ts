export class Html {
    /**
     * Wrap markup already built from escaped parts.
     * @param html the markup
     */
    constructor(readonly html: string) {}
}

export type Child = Html | string | number | boolean | null | undefined | readonly Child[];

type Attributes = { [name: string]: Child };

type Component<P> = (props: P) => Html;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace -- TypeScript reads JSX element types from this namespace.
    namespace JSX {
        type Element = Html;
        interface ElementChildrenAttribute {
            children: unknown;
        }
        interface IntrinsicElements {
            [tag: string]: Attributes;
        }
    }
}

const voidElements = new Set(["meta", "link", "br", "hr", "img", "input", "source"]);

/**
 * Text escaped for HTML, in content or in an attribute's quotes.
 * @param text the text
 * @returns the escaped text
 */
const escapeHtml = (text: string) =>
    text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

/**
 * The markup of a child: markup as it is, text and numbers escaped, nothing for null, undefined or a boolean.
 * @param child the child
 * @returns its markup
 */
const markupOf = (child: Child): string => {
    if (child instanceof Html) {
        return child.html;
    }
    if (Array.isArray(child)) {
        return child.map(markupOf).join("");
    }
    return typeof child === "string" || typeof child === "number" ? escapeHtml(String(child)) : "";
};

/**
 * An element's attributes as written in its opening tag. An attribute that is not text, a number or true is not
 * written.
 * @param attributes the attributes, children aside
 * @returns the attribute text, each with a leading space
 */
const attributeText = (attributes: Attributes) =>
    Object.entries(attributes)
        .map(([name, value]) => {
            if (name === "children") {
                return "";
            }
            if (typeof value === "string" || typeof value === "number") {
                return ` ${name}="${escapeHtml(String(value))}"`;
            }
            return value === true ? ` ${name}` : "";
        })
        .join("");

/**
 * Build one element or run one component; TypeScript calls this for every JSX tag, with null props for a tag that
 * has no attributes (a component then gets only its children). Every text value is escaped as it is placed, and only markup built by these functions is placed as it is, so no page can carry unescaped checked text.
 * @param tag the element's name, or a component
 * @param props its attributes, or the component's props
 * @param children what sits inside it
 * @returns its markup
 */
export function jsx<P>(
    tag: string | Component<P>,
    props: (P & Attributes) | null,
    ...children: readonly Child[]
): Html {
    const content: Child = children.length === 1 ? children[0] : children;
    if (typeof tag === "function") {
        return tag(Object.assign({ children: content }, props));
    }
    const opening = `<${tag}${props === null ? "" : attributeText(props)}>`;
    return new Html(voidElements.has(tag) ? opening : `${opening}${markupOf(content)}</${tag}>`);
}

/**
 * Several elements side by side with no element around them.
 * @param props the elements
 * @param props.children the elements
 * @returns their markup
 */
export const Fragment = ({ children }: { children?: Child }) => new Html(markupOf(children));

/**
 * Markup this package writes itself, such as its stylesheet and its page script, placed as it is. Never pass it text
 * that came from a record or a person: that text goes through jsx, which escapes it.
 * @param markup the markup
 * @returns the markup, to place as it is
 */
export const trusted = (markup: string) => new Html(markup);

/**
 * A whole page as text, with its doctype.
 * @param page the page's `<html>` element
 * @returns the page's text
 */
export const documentText = (page: Html) => `<!DOCTYPE html>\n${page.html}\n`;
