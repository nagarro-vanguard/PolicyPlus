/**
 * The text with every `<!-- … -->` comment taken out, so a template's guidance never reads as a value.
 * @param text the markdown
 * @returns the text without comments; an unclosed comment runs to the end
 */
export function withoutComments(text: string): string {
    let kept = "";
    let at = 0;
    for (let open = text.indexOf("<!--"); open >= 0; open = text.indexOf("<!--", at)) {
        kept += text.slice(at, open);
        const close = text.indexOf("-->", open + 4);
        at = close < 0 ? text.length : close + 3;
    }
    return kept + text.slice(at);
}

/**
 * The document's `## ` sections, each with its lines, keyed by heading. Lines before the first `## ` belong to none.
 * @param text the markdown, comments removed
 * @returns each section's lines by its heading, in file order
 */
export function sections(text: string): Map<string, string[]> {
    const bodies = new Map<string, string[]>();
    let current: string[] | undefined;
    for (const line of text.split("\n")) {
        if (line.startsWith("## ")) {
            current = [];
            bodies.set(line.slice(3).trim(), current);
        } else {
            current?.push(line);
        }
    }
    return bodies;
}

/**
 * A section's single value: its first non-empty line, written plainly or as a `- ` item.
 * @param lines the section's lines; absent when there is no such section
 * @returns the value, or empty when the section holds none
 */
export function singleValue(lines: readonly string[] = []): string {
    const first = lines.map((line) => line.trim()).find((line) => line.length > 0) ?? "";
    return first.startsWith("- ") ? first.slice(2).trim() : first;
}

/**
 * The items of a section's `- ` list.
 * @param lines the section's lines; absent when there is no such section
 * @returns each item's text, trimmed, in order
 */
export function listItems(lines: readonly string[] = []): string[] {
    return lines
        .map((line) => line.trim())
        .filter((line) => line.startsWith("- "))
        .map((line) => line.slice(2).trim())
        .filter((item) => item.length > 0);
}

/**
 * A list item split at its first `: ` into the part before and the part after; a colon with no space after it, as in
 * `C:\src`, does not split.
 * @param item the list item
 * @returns the two parts, trimmed; the second is empty when there is no `: `
 */
function pair(item: string): [string, string] {
    const at = item.indexOf(": ");
    return at < 0 ? [item.trim(), ""] : [item.slice(0, at).trim(), item.slice(at + 2).trim()];
}

/**
 * The text between the first pair of backticks in a line, the way a layer writes a command: `` - `bun test` ``.
 * @param item the line
 * @returns the quoted text, or undefined when the line quotes nothing
 */
export function quoted(item: string): string | undefined {
    const open = item.indexOf("`");
    const close = open < 0 ? -1 : item.indexOf("`", open + 1);
    return close < 0 ? undefined : item.slice(open + 1, close).trim();
}

/**
 * Every piece of text between a pair of backticks in a line, in order.
 * @param text the line
 * @returns the quoted pieces, trimmed, none empty
 */
function quotedAll(text: string): string[] {
    const pieces = text.split("`");
    return pieces
        .filter((_, at) => at % 2 === 1 && at < pieces.length - 1)
        .map((piece) => piece.trim())
        .filter((piece) => piece.length > 0);
}

/**
 * The quoted values of the list item whose label, the text before its first `: `, is the one asked for, read without
 * regard to case.
 * @param items the section's list items
 * @param label the label, such as `Variants`
 * @returns every quoted value after the label; empty when no item has it
 */
export function labelled(items: readonly string[], label: string): string[] {
    const found = items.find((item) => pair(item)[0].toLowerCase() === label.toLowerCase());
    return found === undefined ? [] : quotedAll(pair(found)[1]);
}

/**
 * The sections a document must hold, as one sentence per section it does not.
 * @param text the document's text
 * @param needed the sections' names
 * @returns what is missing, naming each section; empty when all are present with some content
 */
export function sectionGaps(text: string, needed: readonly string[]): string[] {
    const held = sections(withoutComments(text));
    return needed
        .filter((name) => (held.get(name) ?? []).every((line) => line.trim() === ""))
        .map((name) => `the root AGENTS.md has no ## ${name}`);
}

/**
 * The cells of one markdown table row.
 * @param line the row, such as `| a | b |`
 * @returns its cells, trimmed
 */
function cellsOf(line: string): string[] {
    const inner = line.trim().slice(1, line.trim().endsWith("|") ? -1 : undefined);
    return inner.split("|").map((cell) => cell.trim());
}

/**
 * Whether a table row is the `| --- | --- |` line under the header.
 * @param cells the row's cells
 * @returns true for the separator row
 */
const isSeparator = (cells: readonly string[]) =>
    cells.every((cell) => cell.length > 0 && [...cell].every((char) => char === "-" || char === ":"));

/**
 * Every markdown table in some lines, each row keyed by its header's cell text.
 * @param lines the lines, usually one section's
 * @returns the tables in order, each as its rows
 */
export function tables(lines: readonly string[]): Array<Array<Map<string, string>>> {
    const found: Array<Array<Map<string, string>>> = [];
    let header: string[] | undefined;
    let rows: Array<Map<string, string>> = [];
    const close = () => {
        if (header) {
            found.push(rows);
        }
        header = undefined;
        rows = [];
    };
    for (const line of lines) {
        if (!line.trim().startsWith("|")) {
            close();
            continue;
        }
        const cells = cellsOf(line);
        if (!header) {
            header = cells;
        } else if (!isSeparator(cells)) {
            const names = header;
            rows.push(new Map(names.map((name, i) => [name, cells[i] ?? ""])));
        }
    }
    close();
    return found;
}

/**
 * Removes a front matter block: the `---` line at the top of a file, what it encloses and the closing `---` line.
 * @param text the markdown
 * @returns the text without its front matter, or the text itself when it has none
 */
export function withoutFrontMatter(text: string): string {
    const lines = text.split("\n");
    if (lines[0]?.trim() !== "---") {
        return text;
    }
    const end = lines.findIndex((line, at) => at > 0 && line.trim() === "---");
    return end < 0 ? text : lines.slice(end + 1).join("\n");
}
