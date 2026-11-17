import type { Lines } from "./shared-fields";

/**
 * Whether one range of lines holds another: lines are compared as ranges, never as text.
 * @param outer the holding lines
 * @param inner the held lines
 * @returns true when every line of `inner` is in `outer`
 */
export const holds = (outer: Lines, inner: Lines) =>
    outer.file === inner.file && outer.firstLine <= inner.firstLine && inner.lastLine <= outer.lastLine;

/**
 * Whether two ranges share a line of the same file: lines are compared as ranges, never as text.
 * @param left one range
 * @param right the other
 * @returns true when they overlap
 */
export const overlaps = (left: Lines, right: Lines) =>
    left.file === right.file && left.firstLine <= right.lastLine && right.firstLine <= left.lastLine;

/**
 * Lines as a script prints them for an agent or in a `show`: one rule, so every gap, feedback item and listing names a
 * place the same way.
 * @param lines the lines
 * @returns `file:first-last`
 */
export const lineSpan = (lines: Lines) => `${lines.file}:${lines.firstLine}-${lines.lastLine}`;
