/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { jsx, trusted, type Child } from "../jsx";

/** How a thing stands: each has its own icon, word and colour, so no reader depends on colour alone. */
export type Status = "pass" | "fail" | "warn" | "info" | "neutral";

/** Each status's icon, drawn on a 16-unit grid in the text's colour. */
const iconPaths: Record<Status, string> = {
    pass: '<path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    fail: '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    warn: '<path d="M8 2.5l6 11H2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 6.5v3.2M8 11.6v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    info: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 7.2v4M8 4.9v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    neutral: '<circle cx="8" cy="8" r="3.5" fill="currentColor"/>',
};

/**
 * A status's icon, hidden from screen readers since the word beside it says the same.
 * @param props the icon
 * @param props.status which status
 * @returns the icon
 */
const StatusIcon = ({ status }: { status: Status }) => (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {trusted(iconPaths[status])}
    </svg>
);

/**
 * A status as a small labelled badge.
 * @param props the badge
 * @param props.status how it stands
 * @param props.label the word a reader sees, such as "Passed" or "Not proved"
 * @returns the badge
 */
export const StatusBadge = ({ status, label }: { status: Status; label: string }) => (
    <span class="badge" data-status={status}>
        <StatusIcon status={status} />
        {label}
    </span>
);

/** One figure of a summary strip. */
export type SummaryFigure = { label: string; value: string | number; status?: Status; note?: string };

/**
 * A row of headline figures, each with what it counts, read before anything else on a page.
 * @param props the strip
 * @param props.label what the figures summarise, for screen readers
 * @param props.figures the figures, in reading order
 * @returns the strip
 */
export const SummaryStrip = ({ label, figures }: { label: string; figures: readonly SummaryFigure[] }) => (
    <section class="summary-strip" aria-label={label}>
        <dl>
            {figures.map((figure) => (
                <div class="summary-item" data-status={figure.status}>
                    <dt>{figure.label}</dt>
                    <dd>{figure.value}</dd>
                    {figure.note && <dd class="summary-note">{figure.note}</dd>}
                </div>
            ))}
        </dl>
    </section>
);

/**
 * A short message set apart from the text around it: what to do next, a warning, or a verdict.
 * @param props the callout
 * @param props.status its tone
 * @param props.title its heading
 * @param props.children what it says
 * @returns the callout
 */
export const Callout = ({ status, title, children }: { status: Status; title: string; children?: Child }) => (
    <aside class="callout" data-status={status} aria-label={title}>
        <strong class="callout-title">
            <StatusIcon status={status} />
            {title}
        </strong>
        <div>{children}</div>
    </aside>
);
