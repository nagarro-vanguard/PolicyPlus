/** One line of a diff: kept, added or removed, with its number in the old and the new text. */
export type DiffLine =
    | { kind: "same"; text: string; old: number; new: number }
    | { kind: "added"; text: string; new: number }
    | { kind: "removed"; text: string; old: number }
    | { kind: "skipped"; count: number };

/**
 * The lines of a text, without the empty line after a final line break.
 * @param text the text
 * @returns its lines
 */
const linesOf = (text: string) => {
    const lines = text.split("\n");
    return lines.at(-1) === "" ? lines.slice(0, -1) : lines;
};

/**
 * The longest common run of lines through the middle of two texts, as a table of lengths, so the diff keeps every
 * line both texts share.
 * @param before the old lines
 * @param after the new lines
 * @returns at row i, column j, the longest common subsequence of before[i..] and after[j..]
 */
function commonLengths(before: readonly string[], after: readonly string[]): Uint32Array {
    const width = after.length + 1;
    const table = new Uint32Array((before.length + 1) * width);
    for (let i = before.length - 1; i >= 0; i--) {
        for (let j = after.length - 1; j >= 0; j--) {
            table[i * width + j] =
                before[i] === after[j]
                    ? table[(i + 1) * width + j + 1]! + 1
                    : Math.max(table[(i + 1) * width + j]!, table[i * width + j + 1]!);
        }
    }
    return table;
}

/**
 * How many lines two texts share at their start and at their end, so only the middle needs the common-run table.
 * @param before the old lines
 * @param after the new lines
 * @returns the count of shared lines at the start, and at the end after those
 */
function sharedEnds(before: readonly string[], after: readonly string[]) {
    let start = 0;
    while (start < before.length && start < after.length && before[start] === after[start]) {
        start++;
    }
    let end = 0;
    while (end < before.length - start && end < after.length - start && before.at(-1 - end) === after.at(-1 - end)) {
        end++;
    }
    return { start, end };
}

/**
 * Every line of two texts in order, each kept, added or removed.
 * @param beforeText the old text, empty for a new file
 * @param afterText the new text, empty for a deleted file
 * @returns the lines
 */
export function lineDiff(beforeText: string, afterText: string): DiffLine[] {
    const before = linesOf(beforeText);
    const after = linesOf(afterText);
    const { start, end } = sharedEnds(before, after);
    const oldMiddle = before.slice(start, before.length - end);
    const newMiddle = after.slice(start, after.length - end);
    const table = commonLengths(oldMiddle, newMiddle);
    const width = newMiddle.length + 1;
    const lines: DiffLine[] = before.slice(0, start).map((text, i) => ({ kind: "same", text, old: i + 1, new: i + 1 }));
    let i = 0;
    let j = 0;
    while (i < oldMiddle.length || j < newMiddle.length) {
        if (i < oldMiddle.length && j < newMiddle.length && oldMiddle[i] === newMiddle[j]) {
            lines.push({ kind: "same", text: oldMiddle[i]!, old: start + i + 1, new: start + j + 1 });
            i++;
            j++;
        } else if (
            i < oldMiddle.length &&
            (j === newMiddle.length || table[(i + 1) * width + j]! >= table[i * width + j + 1]!)
        ) {
            lines.push({ kind: "removed", text: oldMiddle[i]!, old: start + i + 1 });
            i++;
        } else {
            lines.push({ kind: "added", text: newMiddle[j]!, new: start + j + 1 });
            j++;
        }
    }
    for (let k = 0; k < end; k++) {
        const text = before[before.length - end + k]!;
        lines.push({ kind: "same", text, old: before.length - end + k + 1, new: after.length - end + k + 1 });
    }
    return lines;
}

/**
 * A diff with each long run of kept lines folded to its first and last few, so a reader sees every change with
 * enough around it to place it.
 * @param lines the diff's lines
 * @param context how many kept lines to show beside each change
 * @returns the lines, with folded runs as one skipped line
 */
export function foldUnchanged(lines: readonly DiffLine[], context = 3): DiffLine[] {
    const changed = lines.map((line, i) => (line.kind === "same" ? -1 : i)).filter((i) => i >= 0);
    const near = (i: number) => changed.some((at) => Math.abs(at - i) <= context);
    const folded: DiffLine[] = [];
    for (const [i, line] of lines.entries()) {
        if (line.kind !== "same" || near(i)) {
            folded.push(line);
            continue;
        }
        const last = folded.at(-1);
        if (last?.kind === "skipped") {
            last.count++;
        } else {
            folded.push({ kind: "skipped", count: 1 });
        }
    }
    return folded;
}
