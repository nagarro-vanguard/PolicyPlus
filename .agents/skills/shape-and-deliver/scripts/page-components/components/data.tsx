/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { jsx, type Child } from "../jsx";

/** One column of a table: the key of each row's cell, its heading, and how its cells read. */
export type Column = { key: string; label: string; numeric?: boolean; rowHeader?: boolean };

/**
 * A table with a caption, column headings and, when a column names each row, row headings; it scrolls inside
 * itself on a narrow screen so the page never does.
 * @param props the table
 * @param props.caption what the table shows
 * @param props.columns its columns, in order
 * @param props.rows its rows, each cell by its column's key
 * @param props.empty what to say when there is no row
 * @param props.stack true for a table of sentences: where it has too little room, each row reads as a block, each
 * cell under its column's name, instead of scrolling sideways
 * @returns the table
 */
export const DataTable = (props: {
    caption: string;
    columns: readonly Column[];
    rows: readonly Readonly<Record<string, Child>>[];
    empty: string;
    stack?: boolean;
}) => (
    <div
        class={props.stack ? "table-scroll stack" : "table-scroll"}
        role="region"
        aria-label={props.caption}
        tabindex="0"
    >
        <table>
            <caption>{props.caption}</caption>
            <thead>
                <tr>
                    {props.columns.map((column) => (
                        <th scope="col" class={column.numeric ? "numeric" : undefined}>
                            {column.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {props.rows.length === 0 ? (
                    <tr>
                        <td colspan={props.columns.length}>{props.empty}</td>
                    </tr>
                ) : (
                    props.rows.map((row) => (
                        <tr>
                            {props.columns.map((column) =>
                                column.rowHeader ? (
                                    <th scope="row">{row[column.key]}</th>
                                ) : (
                                    <td class={column.numeric ? "numeric" : undefined} data-label={column.label}>
                                        {row[column.key]}
                                    </td>
                                ),
                            )}
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    </div>
);

/**
 * Detail a reader opens when they want it, such as the engineering detail under a plain-words summary. It opens
 * itself for printing.
 * @param props the disclosure
 * @param props.title what opening it shows
 * @param props.id its anchor; a link to it, or to anything inside it, opens it
 * @param props.children the detail
 * @returns the disclosure
 */
export const Disclosure = (props: { title: string; id?: string; children?: Child }) => (
    <details class="disclosure" id={props.id}>
        <summary>{props.title}</summary>
        <div class="disclosure-body">{props.children}</div>
    </details>
);
