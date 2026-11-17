import { dirname } from "node:path";
import { compareText, getOrCreate } from "../../shared/run/collections";
import type { ManifestFile } from "../../shared/model/schemas/file-listing";
import type { Lines } from "../../shared/model/shared-fields";

export type ManifestEntry = Pick<typeof ManifestFile.Encoded, "path" | "lines" | "readFrom">;

type JobFile = Lines & { readonly readFrom?: string };

export type Job = { files: JobFile[]; lines: number };

/**
 * A job holding `files`.
 * @param files the file windows
 * @returns the job, with its line total
 */
const jobOf = (files: JobFile[]): Job => ({
    files,
    lines: files.reduce((total, file) => total + file.lastLine - file.firstLine + 1, 0),
});

/**
 * Every file in scope that has lines, grouped by folder, in path order. The scope is the manifest: the person decided
 * it at Inventory, so nothing here leaves a file out.
 * @param manifest the files in scope
 * @returns each folder's files, in the order its first file appears
 */
function byFolder(manifest: ReadonlyArray<ManifestEntry>): ManifestEntry[][] {
    const groups = new Map<string, ManifestEntry[]>();
    for (const file of manifest
        .filter((each) => each.lines > 0)
        .sort((left, right) => compareText(left.path, right.path))) {
        getOrCreate(groups, dirname(file.path)).push(file);
    }
    return [...groups.values()];
}

/**
 * The windows of one file of more than `budget` lines, each a job of its own.
 * @param file the large file
 * @param budget the most lines one window holds
 * @returns the windows, in line order
 */
function windowsOf(file: ManifestEntry, budget: number): JobFile[] {
    const windows: JobFile[] = [];
    for (let start = 1; start <= file.lines; start += budget) {
        windows.push({
            file: file.path,
            firstLine: start,
            lastLine: Math.min(file.lines, start + budget - 1),
            ...(file.readFrom === undefined ? {} : { readFrom: file.readFrom }),
        });
    }
    return windows;
}

/**
 * The file lists of one folder: a large file in windows, the rest packed in path order up to
 * `budget` lines.
 * @param files the group's files, in path order
 * @param budget the most lines one job holds
 * @returns each job's files, in order
 */
function packFolder(files: ReadonlyArray<ManifestEntry>, budget: number): JobFile[][] {
    const packed: JobFile[][] = [];
    let current: JobFile[] = [];
    let size = 0;
    for (const file of files) {
        if (file.lines > budget) {
            packed.push(...windowsOf(file, budget).map((window) => [window]));
            continue;
        }
        if (size + file.lines > budget && current.length) {
            packed.push(current);
            current = [];
            size = 0;
        }
        current.push({
            file: file.path,
            firstLine: 1,
            lastLine: file.lines,
            ...(file.readFrom === undefined ? {} : { readFrom: file.readFrom }),
        });
        size += file.lines;
    }
    if (current.length) {
        packed.push(current);
    }
    return packed;
}

/**
 * The map jobs: every file in scope with lines, packed by folder up to `budget` lines, a larger file in windows; then
 * small neighbouring jobs joined across folders, in path order. The same input always gives the same jobs. A job's
 * line total only packs the jobs.
 * @param manifest the files in scope
 * @param budget the most lines one job holds, the run's `readBudget`: small enough for one agent to read every line
 * @returns the jobs, without their job ids, which the writer gives
 */
export function cutMapJobs(manifest: ReadonlyArray<ManifestEntry>, budget: number): Job[] {
    return packSmall(
        byFolder(manifest).flatMap((files) => packFolder(files, budget).map(jobOf)),
        budget,
    );
}

/**
 * Whether a job holds a window of a large file rather than whole files.
 * @param job a map job
 * @returns true when any of its files starts after line 1
 */
const isWindowed = (job: Job) => job.files.some((file) => file.firstLine > 1);

/**
 * Join neighbouring small jobs of different folders up to `budget` lines, so a small system or folder does not pay an
 * agent's fixed cost per tiny job.
 * @param jobs the jobs, in order
 * @param budget the most lines one joined job holds
 * @returns the joined jobs
 */
function packSmall(jobs: ReadonlyArray<Job>, budget: number): Job[] {
    const joined: Job[] = [];
    for (const job of jobs) {
        const last = joined[joined.length - 1];
        if (last && !isWindowed(last) && !isWindowed(job) && last.lines + job.lines <= budget) {
            joined[joined.length - 1] = { files: [...last.files, ...job.files], lines: last.lines + job.lines };
        } else {
            joined.push(job);
        }
    }
    return joined;
}

/**
 * Where the jobs fail to hold every line of every file in scope exactly once: the check the map proves before
 * dispatching.
 * @param manifest the files in scope
 * @param jobs the map jobs
 * @returns one message per gap or overlap, in manifest order; none when every line is in exactly one job
 */
export function coverageGaps(manifest: ReadonlyArray<ManifestEntry>, jobs: ReadonlyArray<Job>): string[] {
    const covered = new Map<string, number[]>();
    for (const job of jobs) {
        for (const file of job.files) {
            getOrCreate(covered, file.file).push(file.firstLine, file.lastLine);
        }
    }
    const gaps: string[] = [];
    for (const entry of manifest.filter((file) => file.lines > 0)) {
        const held = covered.get(entry.path);
        const ranges = held === undefined ? [] : held;
        let next = 1;
        for (let i = 0; i < ranges.length; i += 2) {
            if (ranges[i] !== next) {
                gaps.push(`${entry.path}: line ${next} not in exactly one job`);
            }
            const last = ranges[i + 1];
            next = (last === undefined ? next : last) + 1;
        }
        if (next !== entry.lines + 1) {
            gaps.push(`${entry.path}: lines ${next}-${entry.lines} not covered`);
        }
    }
    return gaps;
}
