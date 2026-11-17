import { Effect } from "effect";
import { getOrCreate, known } from "../../shared/run/collections";
import { holds, overlaps } from "../../shared/model/line-ranges";
import { ofType } from "../../shared/read/record-reading";
import type { JsonRecord } from "../../shared/model/json-record";
import { Block, DataDefinition, Span } from "../../shared/model/schemas/map";
import { RecordIdPrefix, type Lines } from "../../shared/model/shared-fields";
import { sourceReader } from "../../shared/source/source-text";
import { readUnread } from "./unread";

type Finding = JsonRecord & { readonly id: string };

type MapBlock = typeof Block.Encoded;

type Lined = { readonly id: string; readonly lines: Lines };

/**
 * The runs of a window's non-blank lines that no covering record holds, each run merged across blank lines, and which
 * of them comes before any covered line: the leading run, which may continue a block an earlier job owns when the
 * window starts after line 1. Blank lines (whitespace only) need no record: a script tells them in any language.
 * @param window the window
 * @param covering the lines of the job's blocks, data definitions and spans
 * @param text the window's file, one entry per line
 * @returns the leading run, when there is one, and the other runs
 */
function uncoveredRuns(window: Lines, covering: readonly Lines[], text: readonly string[]) {
    const runs: Lines[] = [];
    let leading: Lines | undefined;
    let open: { firstLine: number; lastLine: number } | undefined;
    let seenCovered = false;
    const close = () => {
        if (open !== undefined) {
            const run = { file: window.file, ...open };
            if (seenCovered) {
                runs.push(run);
            } else {
                leading = run;
            }
            open = undefined;
        }
    };
    for (let line = window.firstLine; line <= window.lastLine; line += 1) {
        const content = text[line - 1];
        if (content === undefined) {
            throw new Error(`${window.file} has no line ${line}: a window lies inside its file's line count`);
        }
        if (content.trim() !== "") {
            if (covering.some((lines) => holds(lines, { file: window.file, firstLine: line, lastLine: line }))) {
                close();
                seenCovered = true;
            } else if (open === undefined) {
                open = { firstLine: line, lastLine: line };
            } else {
                open.lastLine = line;
            }
        }
    }
    close();
    return { leading, runs };
}

/**
 * The lines a job does not account for: each run of non-blank lines in no block, data definition or span, except a
 * leading run in a window that starts after line 1, which the job's `finish` holds to a block of the job before; and each span overlapping one of the others, since a span names only lines none holds.
 * @param records the job's records that cover lines
 * @param records.blocks its blocks
 * @param records.definitions its data definitions
 * @param records.spans its spans
 * @param records.unread the ranges of unread lines a script wrote, which count as covered
 * @param windows the job's windows
 * @param textOf each window's file, one entry per line
 * @returns one line per gap
 */
export function uncoveredLines(
    records: {
        readonly blocks: readonly Lined[];
        readonly definitions: readonly Lined[];
        readonly spans: readonly Lined[];
        readonly unread: readonly Lines[];
    },
    windows: readonly Lines[],
    textOf: ReadonlyMap<string, readonly string[]>,
): string[] {
    const { blocks, definitions, spans, unread } = records;
    const held = [...blocks, ...definitions];
    const covering = [...[...held, ...spans].map((record) => record.lines), ...unread];
    const runGaps = windows.flatMap((window) => {
        const { leading, runs } = uncoveredRuns(
            window,
            covering,
            known(textOf, window.file, "the context reads every window's file"),
        );
        return [...(leading !== undefined && window.firstLine === 1 ? [leading] : []), ...runs];
    });
    return [
        ...runGaps.map(
            (run) =>
                `lines ${run.firstLine}-${run.lastLine} of ${run.file} are in no block, data definition or span: map them, or name what they are in a span`,
        ),
        ...spans.flatMap((span) =>
            held
                .filter((other) => overlaps(span.lines, other.lines))
                .map(
                    (other) =>
                        `${span.id} overlaps ${other.id}: a span names only lines no block or data definition holds`,
                ),
        ),
    ];
}

/**
 * An accepted job's leading runs: in each of its windows that starts after line 1, the non-blank lines before its
 * first covered line, which a block of the job before must hold (checked across jobs at `finish`). Reads only those
 * windows' files.
 * @param root the analysis root
 * @param windows the job's windows
 * @param records the job's accepted records
 * @returns each leading run, with the first line of its window
 */
export const leadingRunsOf = Effect.fnUntraced(function* (
    root: string,
    windows: readonly Lines[],
    records: readonly Finding[],
) {
    const { sourceText } = yield* sourceReader(root);
    const covering = [
        ...[
            ...ofType(records, RecordIdPrefix.Block, Block),
            ...ofType(records, RecordIdPrefix.DataDefinition, DataDefinition),
            ...ofType(records, RecordIdPrefix.Span, Span),
        ].map((record) => record.lines),
        ...(yield* readUnread(root)),
    ];
    const runs: Array<{ readonly windowFirstLine: number; readonly run: Lines }> = [];
    for (const window of windows.filter((each) => each.firstLine > 1)) {
        const { leading } = uncoveredRuns(window, covering, (yield* sourceText(window.file)).split("\n"));
        if (leading !== undefined) {
            runs.push({ windowFirstLine: window.firstLine, run: leading });
        }
    }
    return runs;
});

/**
 * The pairs of a job's own blocks that partly overlap (neither inside the other) or sit on identical lines: no block
 * can be resolved among them. The same rule the record store applies across jobs (`CodeGraph.findClashingBlocks`), here
 * over one job's records before they are accepted. Each file's blocks are swept in line
 * order, so a block is compared only with those still open where it starts.
 * @param blocks the blocks
 * @returns each such pair
 */
export function clashingBlocks(blocks: readonly MapBlock[]): Array<readonly [MapBlock, MapBlock]> {
    const byFile = new Map<string, MapBlock[]>();
    blocks.forEach((block) => getOrCreate(byFile, block.lines.file).push(block));
    const pairs: Array<readonly [MapBlock, MapBlock]> = [];
    for (const list of byFile.values()) {
        list.sort(
            (left, right) => left.lines.firstLine - right.lines.firstLine || right.lines.lastLine - left.lines.lastLine,
        );
        let open: MapBlock[] = [];
        for (const later of list) {
            open = open.filter((earlier) => earlier.lines.lastLine >= later.lines.firstLine);
            for (const earlier of open) {
                const identical =
                    earlier.lines.firstLine === later.lines.firstLine &&
                    earlier.lines.lastLine === later.lines.lastLine;
                const nested = later.lines.lastLine <= earlier.lines.lastLine;
                if (identical || !nested) {
                    pairs.push([earlier, later]);
                }
            }
            open.push(later);
        }
    }
    return pairs;
}
