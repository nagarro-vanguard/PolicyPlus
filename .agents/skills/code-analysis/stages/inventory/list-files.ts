import { basename, join, relative } from "node:path";
import { Effect } from "effect";
import { extensionOf } from "../../shared/source/file-extension";
import { FileAccess } from "../../shared/source/file-access";
import { GitRepository } from "../../shared/source/git-repository";
import { analysisPaths, isInsideFolder, sourceBase } from "../../shared/run/analysis-layout";
import type { FileSummary, ReadsAs } from "../../shared/model/schemas/file-listing";
import { AnalysisConfig } from "../../shared/run/analysis-limits";
import { measureFile, type MeasureLimits, type UnreadRange } from "./measure-file";
import { countProgress } from "../../shared/jobs/progress";
import type { FileNotFound, FileUnreadable } from "../../shared/run/script-errors";

export interface ListedFile {
    readonly path: string;
    readonly lines: number;
    readonly bytes: number;
    readonly hash: string;
    readonly readsAs: ReadsAs;
    readonly binary: boolean;
    readonly utf8: boolean;
    readonly longestLine: number;
    readonly encoding: string;
    readonly encodingUncertain: boolean;
    readonly unread: readonly UnreadRange[];
    readonly readFrom?: string;
    readonly copyOf?: string;
}

export type Skipped = (typeof FileSummary.Type)["skipped"][number];

/**
 * Take in one tracked entry: a file is measured; a link (which may lead outside the source or nowhere, so it is looked
 * at before it is followed), a folder (a submodule not checked out) and a file that cannot be read are reported
 * instead, never dropped silently. A file git tracks but that is gone holds nothing to read.
 * @param absolute the entry's absolute path
 * @param path the entry's path relative to the base
 * @param limits the longest line an agent reads whole, and the lengths that make a line unread
 * @returns the measured file, or why it was skipped, or nothing when it is gone
 */
const takeIn = Effect.fnUntraced(function* (absolute: string, path: string, limits: MeasureLimits) {
    const fs = yield* FileAccess;
    if (yield* fs.isLink(absolute)) {
        return { skipped: { path, why: "link" as const } };
    }
    if (!(yield* fs.exists(absolute))) {
        return undefined;
    }
    if (yield* fs.isDirectory(absolute)) {
        return { skipped: { path, why: "submoduleNotCheckedOut" as const } };
    }
    const bytes = yield* fs.readBytes(absolute).pipe(Effect.option);
    return bytes._tag === "None"
        ? { skipped: { path, why: "unreadable" as const } }
        : { file: { path, ...measureFile(bytes.value, limits) } };
});

/**
 * Every file under a folder that is no git repository, as exported datasets often are, relative to it: walked folder
 * by folder, a link never followed (it is taken in, and reported, as a link), so nothing outside the root is read.
 * @param root the folder
 * @returns the files, relative to the root
 */
const walkedFiles = Effect.fnUntraced(function* (root: string) {
    const fs = yield* FileAccess;
    const found: string[] = [];
    const walk = (folder: string): Effect.Effect<void, FileNotFound | FileUnreadable, FileAccess> =>
        Effect.gen(function* () {
            for (const name of yield* fs.entriesOf(join(root, folder))) {
                const path = folder === "" ? name : join(folder, name);
                const absolute = join(root, path);
                if (!(yield* fs.isLink(absolute)) && (yield* fs.isDirectory(absolute))) {
                    yield* walk(path);
                } else {
                    found.push(path);
                }
            }
        });
    yield* walk("");
    return found;
});

/**
 * What one root holds, and as of when: inside a git repository, the files git tracks (its `.gitignore` files honoured
 * by what was committed) with the commit and whether its tree was clean; outside one, every file under it, walked,
 * with no commit (D184), since an export of datasets has none.
 * @param root the source root
 * @returns its entries, relative to it, and its commit and whether it was clean, or null for both outside git
 */
const entriesOfRoot = Effect.fnUntraced(function* (root: string) {
    const git = yield* GitRepository;
    if (!(yield* git.isRepository(root))) {
        const none: { readonly commit: string | null; readonly clean: boolean | null } = { commit: null, clean: null };
        return { entries: yield* walkedFiles(root), head: none };
    }
    const head: { readonly commit: string | null; readonly clean: boolean | null } = yield* git.headOf(root);
    return { entries: yield* git.trackedFiles(root), head };
});

/**
 * List and measure every file of each root once (`entriesOfRoot`). Nothing else about scope is decided here: only the
 * analysis root itself is left out, as the analysis must never read its own output. Exact copies are marked by hash,
 * so they are read once. A file the agent's Read tool would show wrongly gets a decoded copy under the analysis root,
 * which the job reads instead.
 * @param roots the source roots, as absolute paths
 * @param analysisRoot the analysis root, which may sit inside a source root
 * @returns the measured files (paths relative to the roots' base), what was skipped and why, and each root's commit
 */
export const listFiles = Effect.fnUntraced(function* (roots: readonly [string, ...string[]], analysisRoot: string) {
    const base = sourceBase(roots);
    const { longLineMax, minifiedLineMin, encodedRunMin } = yield* AnalysisConfig;
    const limits = { longLineMax, minifiedLineMin, encodedRunMin };
    const fs = yield* FileAccess;
    const files: ListedFile[] = [];
    const skipped: Skipped[] = [];
    const firstByHash = new Map<string, string>();
    const heads: Array<{ readonly name: string; readonly commit: string | null; readonly clean: boolean | null }> = [];
    for (const root of roots) {
        const { entries, head } = yield* entriesOfRoot(root);
        heads.push({ name: basename(root), ...head });
        const measured = yield* countProgress(`inventory listing ${root}`, entries.length, "entries measured");
        for (const entry of [...entries].sort()) {
            yield* measured;
            const absolute = join(root, entry);
            if (isInsideFolder(analysisRoot, absolute)) {
                continue;
            }
            const taken = yield* takeIn(absolute, relative(base, absolute), limits);
            if (taken === undefined) {
                continue;
            }
            if (taken.skipped !== undefined) {
                skipped.push(taken.skipped);
            } else if (taken.file !== undefined) {
                const { decodedText, ...file } = taken.file;
                const copyOf = file.lines > 0 ? firstByHash.get(file.hash) : undefined;
                if (file.lines > 0 && !copyOf) {
                    firstByHash.set(file.hash, file.path);
                }
                if (decodedText !== undefined && !copyOf) {
                    const copy = analysisPaths(analysisRoot).decodedCopy(file.path);
                    yield* fs.writeText(copy, decodedText);
                    files.push({ ...file, readFrom: relative(analysisRoot, copy) });
                } else {
                    files.push(copyOf ? { ...file, copyOf } : file);
                }
            }
        }
    }
    return { files, skipped, heads };
});

/**
 * The files' counts by folder, as many rows as `max` allows (G13 of plan 0003): the folders two levels deep, else one,
 * else the largest folders one level deep with the rest counted together, so the summary stays one agent's reading
 * at any estate size. A file never counts as a folder of its own; files at the top count under `.`.
 * @param files the measured files in scope
 * @param max the most rows
 * @returns each folder's files and lines
 */
function foldersOf(files: readonly ListedFile[], max: number): Record<string, { files: number; lines: number }> {
    const countedAt = (depth: number) => {
        const counts = new Map<string, { files: number; lines: number }>();
        for (const file of files) {
            const segments = file.path.split("/").slice(0, -1).slice(0, depth);
            const key = segments.length ? segments.join("/") : ".";
            const held = counts.get(key);
            const count = held === undefined ? { files: 0, lines: 0 } : held;
            counts.set(key, count);
            count.files += 1;
            count.lines += file.lines;
        }
        return counts;
    };
    const two = countedAt(2);
    const one = two.size <= max ? two : countedAt(1);
    if (one.size <= max) {
        return Object.fromEntries(one);
    }
    const largest = [...one].sort(([, left], [, right]) => right.lines - left.lines);
    const rest = largest
        .slice(max - 1)
        .reduce((sum, [, count]) => ({ files: sum.files + count.files, lines: sum.lines + count.lines }), {
            files: 0,
            lines: 0,
        });
    return Object.fromEntries([...largest.slice(0, max - 1), ["(the other folders)", rest]]);
}

/**
 * The file summary, over the files in scope: counts per extension (binary and not-UTF-8 included, so the person
 * sees what the agent cannot read well), per folder within `foldersMax` rows (`foldersOf`), and the files with a line
 * longer than `longLineMax`; plus what the listing skipped.
 * @param files the measured files in scope
 * @param limits the longest line a file may have before it is flagged, and the most folder rows
 * @param limits.longLineMax the longest line, in bytes
 * @param limits.foldersMax the most folder rows
 * @param skipped what the listing skipped, and why
 * @param roots each source root's commit and whether its tree was clean, as the listing read them
 * @returns the summary, as work/inventory/file-summary.json holds it
 */
export function summarise(
    files: readonly ListedFile[],
    limits: { readonly longLineMax: number; readonly foldersMax: number },
    skipped: readonly Skipped[],
    roots: (typeof FileSummary.Type)["roots"],
): typeof FileSummary.Type {
    const byFileExtension: Record<
        string,
        { files: number; lines: number; bytes: number; binary: number; notUtf8: number }
    > = {};
    for (const file of files) {
        const extensionKey = extensionOf(file.path);
        const known = byFileExtension[extensionKey];
        const extension = known === undefined ? { files: 0, lines: 0, bytes: 0, binary: 0, notUtf8: 0 } : known;
        byFileExtension[extensionKey] = extension;
        extension.files += 1;
        extension.lines += file.lines;
        extension.bytes += file.bytes;
        extension.binary += file.binary ? 1 : 0;
        extension.notUtf8 += !file.binary && !file.utf8 ? 1 : 0;
    }
    const longLineFiles = files.filter((file) => file.longestLine > limits.longLineMax).map((file) => file.path);
    return {
        byFileExtension,
        byFolder: foldersOf(files, limits.foldersMax),
        longLineFiles,
        uncertainEncoding: files.filter((file) => file.encodingUncertain).map((file) => file.path),
        roots,
        skipped,
    };
}
