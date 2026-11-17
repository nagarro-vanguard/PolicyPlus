import { Effect } from "effect";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { AnyRecord, readOptionalRecords } from "../../shared/run/json-files";
import { ofType } from "../../shared/read/record-reading";
import { Unread } from "../../shared/model/schemas/unread";
import { RecordIdPrefix, type Lines } from "../../shared/model/shared-fields";

/**
 * The lines Inventory accounted for as unread, from the records a script wrote beside the inventory: what counts toward
 * a Map job's tiling without any record of the agent's.
 * @param root the analysis root
 * @returns each range of unread lines
 */
export const readUnread = Effect.fnUntraced(function* (root: string) {
    const records = (yield* readOptionalRecords(analysisPaths(root).unread, AnyRecord)).flatMap((record) =>
        typeof record.id === "string" ? [{ ...record, id: record.id }] : [],
    );
    return ofType(records, RecordIdPrefix.Unread, Unread).map((record): Lines => record.lines);
});

/**
 * The files whose every line is unread (a file of one minified line, a data file of encoded lines): no job reads them,
 * since a window made only of unread lines holds nothing for an agent to map.
 * @param manifest the files in scope, with their line counts
 * @param unread every range of unread lines
 * @returns their paths
 */
export const whollyUnread = (
    manifest: ReadonlyArray<{ readonly path: string; readonly lines: number }>,
    unread: readonly Lines[],
): ReadonlySet<string> => {
    const covered = new Map<string, Set<number>>();
    for (const range of unread) {
        const held = covered.get(range.file);
        const lines = held === undefined ? new Set<number>() : held;
        for (let line = range.firstLine; line <= range.lastLine; line += 1) {
            lines.add(line);
        }
        covered.set(range.file, lines);
    }
    return new Set(
        manifest
            .filter((file) => {
                const lines = covered.get(file.path);
                return file.lines > 0 && lines !== undefined && lines.size === file.lines;
            })
            .map((file) => file.path),
    );
};
