/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { foldUnchanged, lineDiff, type DiffLine } from "../diff";
import { jsx, trusted } from "../jsx";

const copyIcon =
    '<rect x="5" y="5" width="8.5" height="9.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H10" fill="none" stroke="currentColor" stroke-width="1.5"/>';

/**
 * A button that copies text: the text of the element it names, or a text of its own. It works from a page opened
 * as a file too.
 * @param props the button: what it copies, the text of an element (`target`, its id) or a text of its own (`text`),
 * and what it says (`label`)
 * @returns the button
 */
const CopyButton = (
    props: { readonly target: string; readonly label: string } | { readonly text: string; readonly label: string },
) => (
    <button
        type="button"
        class="copy-button"
        data-copy={"target" in props ? props.target : ""}
        data-copy-text={"text" in props ? props.text : undefined}
    >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            {trusted(copyIcon)}
        </svg>
        <span data-label>{props.label}</span>
    </button>
);

/**
 * Code or other exact text, kept as written, with a heading and a copy button.
 * @param props the block
 * @param props.id the block's id, which its copy button names
 * @param props.title what the text is, such as a file's path
 * @param props.code the text
 * @returns the block
 */
export const CodeBlock = ({ id, title, code }: { id: string; title: string; code: string }) => (
    <figure class="code-block">
        <figcaption class="code-head">
            <span>{title}</span>
            <CopyButton target={id} label="Copy" />
        </figcaption>
        <pre id={id}>
            <code>{code}</code>
        </pre>
    </figure>
);

/** The word a screen reader hears, and the mark a reader sees, for each kind of diff line. */
const lineMarks = { same: ["", " "], added: ["Added: ", "+"], removed: ["Removed: ", "−"] } as const;

/**
 * One row of a diff table.
 * @param props the row
 * @param props.line the line
 * @returns the row
 */
const DiffRow = ({ line }: { line: DiffLine }) => {
    if (line.kind === "skipped") {
        return (
            <tr class="skipped">
                <td colspan={4}>
                    {line.count} unchanged {line.count === 1 ? "line" : "lines"}
                </td>
            </tr>
        );
    }
    const [spoken, mark] = lineMarks[line.kind];
    return (
        <tr class={line.kind === "same" ? undefined : line.kind}>
            <td class="line-number">{"old" in line ? line.old : ""}</td>
            <td class="line-number">{"new" in line ? line.new : ""}</td>
            <td class="marker" aria-hidden="true">
                {mark}
            </td>
            <td>
                {spoken && <span class="visually-hidden">{spoken}</span>}
                {line.text}
            </td>
        </tr>
    );
};

/**
 * What changes in one file, line by line, with long unchanged runs folded and a count of what was added and removed.
 * @param props the diff
 * @param props.title what changes, such as the file's path and its action
 * @param props.before the file as it is today; empty when it is new
 * @param props.after the file as it will be; empty when it is deleted
 * @returns the diff
 */
export const DiffView = ({ title, before, after }: { title: string; before: string; after: string }) => {
    const lines = lineDiff(before, after);
    const added = lines.filter((line) => line.kind === "added").length;
    const removed = lines.filter((line) => line.kind === "removed").length;
    return (
        <figure class="code-block diff">
            <figcaption class="code-head">
                <span>{title}</span>
                <span class="tabular">
                    {added} added, {removed} removed
                </span>
            </figcaption>
            <div class="table-scroll" role="region" aria-label={title} tabindex="0">
                <table>
                    <tbody>
                        {foldUnchanged(lines).map((line) => (
                            <DiffRow line={line} />
                        ))}
                    </tbody>
                </table>
            </div>
        </figure>
    );
};
