import { inSlice } from "./bundle-diagrams";
import { isGenerated, mergeRanges, type Place, type Range } from "./bundle-places";
import type { Payloads, Slice } from "./bundle-slice";

export type FileRow = {
    readonly path: string;
    readonly tier: "own" | "relied on" | "neighbour screen" | "generated";
    readonly ranges: readonly Range[];
    readonly whole: boolean;
    readonly why: string;
};

/**
 * Every place the slice reads or cites, by file; generated layout counts only where a rule cites it.
 * @param payloads everything the analysis wrote
 * @param slice the slice
 * @returns the ranges by file
 */
const spansOf = (payloads: Payloads, slice: Slice) => {
    const spans = new Map<string, Range[]>();
    const add = (place: Place) => {
        const list = spans.get(place.file);
        const range = { first: place.firstLine, last: place.lastLine };
        if (list === undefined) {
            spans.set(place.file, [range]);
        } else {
            list.push(range);
        }
    };
    for (const block of slice.blocks.values()) {
        if (!isGenerated(block.file)) {
            add(block);
        }
    }
    for (const entry of slice.actions) {
        add(entry.action.place);
    }
    for (const entry of slice.rules) {
        add(entry.rule.place);
        entry.rule.alsoRestsOn.forEach(add);
    }
    for (const life of payloads.index.lifecycles) {
        for (const transition of life.transitions.filter((each) => inSlice(slice, each))) {
            add(transition);
        }
    }
    return spans;
};

/**
 * Say how many of something, with its plural.
 * @param count how many
 * @param one the singular
 * @param many the plural
 * @returns the phrase, or nothing when there are none
 */
const counted = (count: number, one: string, many: string) =>
    count === 0 ? "" : `${count} ${count === 1 ? one : many}`;

/**
 * Why a file is in the read order, from what the slice does there.
 * @param slice the slice
 * @param path the file
 * @param usedBy how many other capabilities run blocks of the file
 * @returns the reason
 */
const reasonOf = (slice: Slice, path: string, usedBy: number) => {
    const started = slice.actions.filter((entry) => entry.action.place.file === path).length;
    const decided = slice.rules.filter((entry) => entry.rule.place.file === path);
    const owned = decided.filter((entry) => entry.owned).length;
    const parts = [
        started === 0 ? "" : `starts ${counted(started, "action", "actions")}`,
        owned === 0 ? "" : `decides ${counted(owned, "owned rule", "owned rules")}`,
        decided.length === owned
            ? ""
            : `decides ${counted(decided.length - owned, "relied-on rule", "relied-on rules")}`,
        isGenerated(path) ? "generated layout; rules cite these lines, the controls table replaces the rest" : "",
        started === 0 && owned === 0 && !isGenerated(path) ? "called code" : "",
        usedBy === 0 || isGenerated(path) ? "" : `used by ${counted(usedBy, "other capability", "other capabilities")}`,
    ];
    return parts.filter((part) => part !== "").join("; ");
};

/**
 * One file of the read order: its tier, the lines to read and why.
 * @param slice the slice
 * @param path the file
 * @param ranges the places in it the slice reads or cites
 * @returns the row
 */
const rowOf = (slice: Slice, path: string, ranges: readonly Range[]): FileRow => {
    const selfIds = new Set(slice.capabilities.map((each) => each.capability.id));
    const blocks = [...slice.blocks.values()].filter((block) => block.file === path);
    const others = new Set(blocks.flatMap((block) => block.capabilities).filter((id) => !selfIds.has(id)));
    const decidesOwned = slice.rules.some((entry) => entry.owned && entry.rule.place.file === path);
    const starts = slice.actions.some((entry) => entry.action.place.file === path);
    const generated = isGenerated(path);
    const own = !generated && (slice.dedicated(path) || starts || decidesOwned);
    return {
        path,
        tier: generated ? "generated" : own ? "own" : "relied on",
        ranges: mergeRanges(ranges),
        whole: own && slice.dedicated(path),
        why: reasonOf(slice, path, others.size),
    };
};

/**
 * Add the files of the screens the slice opens or is opened by, with the lines where they meet.
 * @param rows the rows so far
 * @param slice the slice
 */
const addNeighbours = (rows: FileRow[], slice: Slice) => {
    const meetings = [
        ...slice.opens.map((each) => ({
            block: each.target,
            why: `${each.how === "opens" ? "opened" : "called"} from this screen: ${each.screen.name}`,
        })),
        ...slice.openedBy.map((each) => ({
            block: each.via,
            why: `${each.how === "opens" ? "opens" : "calls into"} this screen: ${each.screen.name}`,
        })),
    ];
    for (const meeting of meetings) {
        const range = { first: meeting.block.firstLine, last: meeting.block.lastLine };
        const found = rows.findIndex((row) => row.path === meeting.block.file);
        const row = rows[found];
        if (row === undefined) {
            rows.push({
                path: meeting.block.file,
                tier: "neighbour screen",
                ranges: [range],
                whole: false,
                why: meeting.why,
            });
        } else {
            rows[found] = { ...row, ranges: mergeRanges([...row.ranges, range]), why: `${row.why}; ${meeting.why}` };
        }
    }
};

const tierOrder = { own: 0, "relied on": 1, "neighbour screen": 2, generated: 3 } as const;

/**
 * The files to read: the slice's own first, then the code it relies on, then the screens it meets, then the generated
 * layout the rules cite, each with the lines to read and why.
 * @param payloads everything the analysis wrote
 * @param slice the slice
 * @returns the files in reading order
 */
export const filesOf = (payloads: Payloads, slice: Slice): FileRow[] => {
    const rows = [...spansOf(payloads, slice)].map(([path, ranges]) => rowOf(slice, path, ranges));
    addNeighbours(rows, slice);
    return rows.toSorted(
        (one, other) => tierOrder[one.tier] - tierOrder[other.tier] || (one.path < other.path ? -1 : 1),
    );
};
