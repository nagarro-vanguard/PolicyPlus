/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { Fragment, jsx, type Child } from "../jsx";

/** One block of a text: a paragraph of lines, a heading, or a list. */
type Block =
    | { readonly kind: "paragraph"; readonly lines: readonly string[] }
    | { readonly kind: "heading"; readonly level: number; readonly text: string }
    | { readonly kind: "list"; readonly ordered: boolean; readonly items: readonly string[] };

/**
 * The text of a list line without its marker: `- `, `* ` or a number and a dot.
 * @param line a trimmed line
 * @returns the item's text and whether it is numbered, or undefined when the line is no list item
 */
const itemOf = (line: string): { readonly text: string; readonly ordered: boolean } | undefined => {
    if (line.startsWith("- ") || line.startsWith("* ")) {
        return { text: line.slice(2).trim(), ordered: false };
    }
    const digits = [...line].findIndex((char) => char < "0" || char > "9");
    return digits > 0 && line[digits] === "." && line[digits + 1] === " "
        ? { text: line.slice(digits + 2).trim(), ordered: true }
        : undefined;
};

/**
 * The heading a line is, when it starts with one to four `#` and a space.
 * @param line a trimmed line
 * @returns its level and text, or undefined
 */
const headingOf = (line: string) => {
    const marks = [...line].findIndex((char) => char !== "#");
    return marks >= 1 && marks <= 4 && line[marks] === " "
        ? { level: marks, text: line.slice(marks + 1).trim() }
        : undefined;
};

/**
 * Add a list item to the blocks: to the list before it when that list is the same kind, else to a new list.
 * @param blocks the blocks so far, changed in place
 * @param item the item's text and whether it is numbered
 * @param item.text the item's text
 * @param item.ordered whether the item is numbered
 */
const addItem = (blocks: Block[], item: { readonly text: string; readonly ordered: boolean }) => {
    const last = blocks.length > 0 ? blocks[blocks.length - 1] : undefined;
    if (last !== undefined && last.kind === "list" && last.ordered === item.ordered) {
        blocks[blocks.length - 1] = { ...last, items: [...last.items, item.text] };
    } else {
        blocks.push({ kind: "list", ordered: item.ordered, items: [item.text] });
    }
};

/**
 * Add a line that is no heading and no list item: it continues the list item or the paragraph before it, or starts a
 * paragraph.
 * @param blocks the blocks so far, changed in place
 * @param raw the line with its indent
 * @param open whether the block before it is still open, that is, no blank line has ended it
 * @returns whether the block the line belongs to is open
 */
const addText = (blocks: Block[], raw: string, open: boolean) => {
    const line = raw.trim();
    const last = blocks.length > 0 ? blocks[blocks.length - 1] : undefined;
    if (last !== undefined && last.kind === "list" && !open && raw.startsWith(" ")) {
        const before = last.items.slice(0, -1);
        blocks[blocks.length - 1] = { ...last, items: [...before, `${last.items[last.items.length - 1]} ${line}`] };
        return false;
    }
    if (last !== undefined && last.kind === "paragraph" && open) {
        blocks[blocks.length - 1] = { ...last, lines: [...last.lines, line] };
        return true;
    }
    blocks.push({ kind: "paragraph", lines: [line] });
    return true;
};

/**
 * Split a text into its blocks. A blank line ends a block; a list item's continuation lines stay on the item.
 * @param text the markdown
 * @returns the blocks, in order
 */
const blocksOf = (text: string): Block[] => {
    const blocks: Block[] = [];
    let open = false;
    for (const raw of text.split("\n")) {
        const line = raw.trim();
        const heading = headingOf(line);
        const item = itemOf(line);
        if (heading !== undefined) {
            blocks.push({ kind: "heading", ...heading });
        } else if (item !== undefined) {
            addItem(blocks, item);
        } else if (line !== "") {
            open = addText(blocks, raw, open);
            continue;
        }
        open = false;
    }
    return blocks;
};

/**
 * Text with `**bold**` and `code` marked up; any other mark stays as the plain text it is.
 * @param text one line of a block
 * @returns the text and its elements
 */
const inline = (text: string): Child[] => {
    const out: Child[] = [];
    let rest = text;
    while (rest.length > 0) {
        const bold = rest.indexOf("**");
        const code = rest.indexOf("`");
        const boldEnd = bold < 0 ? -1 : rest.indexOf("**", bold + 2);
        const codeEnd = code < 0 ? -1 : rest.indexOf("`", code + 1);
        const useBold = boldEnd > 0 && (codeEnd < 0 || bold < code || codeEnd < 0);
        const useCode = !useBold && codeEnd > 0;
        if (useBold && (!useCode || bold <= code || code < 0)) {
            out.push(rest.slice(0, bold), <strong>{rest.slice(bold + 2, boldEnd)}</strong>);
            rest = rest.slice(boldEnd + 2);
        } else if (useCode) {
            out.push(rest.slice(0, code), <code>{rest.slice(code + 1, codeEnd)}</code>);
            rest = rest.slice(codeEnd + 1);
        } else {
            out.push(rest);
            rest = "";
        }
    }
    return out;
};

/**
 * A text the person who wrote it marked up, shown as what they meant: paragraphs (a line break stays one), headings,
 * bulleted and numbered lists, **bold** and `code`. Anything else is shown as the plain text it is, never as markup, so
 * a page never shows an asterisk or a pound sign the writer meant as formatting.
 * @param props the text
 * @param props.text the markdown
 * @param props.headingFrom the heading level a `#` becomes, so a page's own headings stay above it
 * @returns the elements
 */
export const Markdown = ({ text, headingFrom = 3 }: { text: string; headingFrom?: number }) => (
    <>
        {blocksOf(text).map((block) => {
            if (block.kind === "heading") {
                const level = Math.min(headingFrom + block.level - 1, 6);
                return jsx(`h${String(level)}`, null, ...inline(block.text));
            }
            if (block.kind === "list") {
                return jsx(block.ordered ? "ol" : "ul", null, ...block.items.map((item) => <li>{inline(item)}</li>));
            }
            return (
                <p>
                    {block.lines.map((line, at) => (
                        <>
                            {at > 0 && <br />}
                            {inline(line)}
                        </>
                    ))}
                </p>
            );
        })}
    </>
);
