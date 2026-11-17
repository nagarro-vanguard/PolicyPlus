/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { jsx, type Child } from "../jsx";
import { StatusBadge, type Status } from "./status.tsx";

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
 * @param props.open whether it starts open
 * @param props.id its anchor; a link to it, or to anything inside it, opens it
 * @param props.children the detail
 * @returns the disclosure
 */
export const Disclosure = (props: { title: string; open?: boolean; id?: string; children?: Child }) => (
    <details class="disclosure" open={props.open === true} id={props.id}>
        <summary>{props.title}</summary>
        <div class="disclosure-body">{props.children}</div>
    </details>
);

/** One place in a risk map: what is at risk, how much, and where its detail is. */
export type Risk = { label: string; href: string; status: Status; level: string };

/**
 * The risks of a piece of work at a glance, each a link into its detail further down.
 * @param props the map
 * @param props.label what the risks are of, for screen readers
 * @param props.risks the risks, most serious first
 * @returns the map
 */
export const RiskMap = ({ label, risks }: { label: string; risks: readonly Risk[] }) => (
    <nav class="risk-map" aria-label={label}>
        <ul role="list">
            {risks.map((risk) => (
                <li class="risk-chip" data-status={risk.status}>
                    <a href={risk.href}>
                        <span class="risk-level">{risk.level}</span>
                        {risk.label}
                    </a>
                </li>
            ))}
        </ul>
    </nav>
);

/** One event of a timeline. */
export type TimelineEvent = {
    title: string;
    status: Status;
    statusLabel: string;
    when?: string;
    detail?: Child;
};

/**
 * What happened, in order, each event with how it ended.
 * @param props the timeline
 * @param props.events the events, earliest first
 * @returns the timeline
 */
export const Timeline = ({ events }: { events: readonly TimelineEvent[] }) => (
    <ol class="timeline" role="list">
        {events.map((event) => (
            <li class="timeline-item" data-status={event.status}>
                {event.when && <span class="timeline-when">{event.when}</span>}
                <span class="timeline-head">
                    <strong>{event.title}</strong>
                    <StatusBadge status={event.status} label={event.statusLabel} />
                </span>
                {event.detail && <div>{event.detail}</div>}
            </li>
        ))}
    </ol>
);
