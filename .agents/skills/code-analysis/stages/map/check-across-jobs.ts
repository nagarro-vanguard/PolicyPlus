import { Effect } from "effect";
import { lineSpan } from "../../shared/model/line-ranges";
import type { Lines } from "../../shared/model/shared-fields";
import { getOrCreate } from "../../shared/run/collections";
import { CodeGraph, type UnresolvedTarget } from "../../shared/graph/code-graph";

type Window = { readonly jobId: string; readonly file: string; readonly firstLine: number; readonly lastLine: number };

export type WindowOfLine = (file: string, line: number) => Window | undefined;

export type LeadingRun = { readonly jobId: string; readonly windowFirstLine: number; readonly run: Lines };

export type GapAcrossJobs = { readonly jobs: readonly string[]; readonly reason: string };

/**
 * The jobs a gap names, each once: the jobs that wrote its records and, for a target, the job whose lines hold it.
 * @param jobs the job ids, some unknown
 * @returns the job ids
 */
const jobsOf = (jobs: ReadonlyArray<string | null | undefined>) => [
    ...new Set(jobs.filter((job): job is string => typeof job === "string")),
];

/**
 * Why a link's target names no block, with what lies on its line instead, so a job run again can act on it: two or more
 * blocks starting there, the block whose lines contain it, or nothing.
 * @param unresolved the link, its target and what is there
 * @returns the reason
 */
function unresolvedReason(unresolved: UnresolvedTarget): string {
    const { link, target, blocksStartingOnTarget, blockContainingTarget } = unresolved;
    const where = `the link at ${lineSpan(link)} reaches ${target.file}:${target.line}`;
    if (blocksStartingOnTarget.length) {
        return `${where}, where the blocks at ${blocksStartingOnTarget.map(lineSpan).join(" and ")} all start: name a line inside the one the link reaches`;
    }
    return blockContainingTarget === undefined
        ? `${where}, where no block or data definition holds the line`
        : `${where}, a line inside the block at ${lineSpan(blockContainingTarget)}, which the join takes as the target`;
}

/**
 * Every gap the Map's accepted records make across jobs, found in the record store once their link ends are resolved,
 * by positions only: blocks of different jobs that partly overlap or sit on the same lines, and a link whose target lies
 * in an accepted job's lines where no one block starts and no data definition does. Each gap names every job it involves, so
 * each is redone with the reason; it names records by their lines, which a job run again can act on. A target in lines
 * no accepted job covers is outside the map and kept, never a gap, and so is one on lines no block holds (the join takes
 * the innermost block holding the line, and a line that runs nothing is no gap); only a line where two blocks start is one. Then each accepted window that starts after line 1:
 * its leading run, the lines before its first covered line, lies inside one block or data definition, of the job before (whose window
 * holds the line above); a window whose line above no accepted job holds is left alone, its lines knowingly out.
 * @param windowOf which accepted job's window covers a line
 * @param leading each accepted job's leading runs
 * @returns the gaps
 */
export const gapsAcrossJobs = Effect.fnUntraced(function* (windowOf: WindowOfLine, leading: readonly LeadingRun[]) {
    const graph = yield* CodeGraph;
    const jobOf = (file: string, line: number) => {
        const window = windowOf(file, line);
        return window === undefined ? undefined : window.jobId;
    };
    const gaps: GapAcrossJobs[] = (yield* graph.findClashingBlocks("map")).map(([one, other]) => ({
        jobs: jobsOf([one.jobId, other.jobId]),
        reason: `the blocks at ${lineSpan(one)} and ${lineSpan(other)} overlap without one holding the other, or sit on the same lines: correct where one of them ends`,
    }));
    for (const unresolved of yield* graph.findUnresolvedTargets("map")) {
        const targetJob = jobOf(unresolved.target.file, unresolved.target.line);
        if (targetJob !== undefined && unresolved.blocksStartingOnTarget.length > 1) {
            gaps.push({ jobs: jobsOf([unresolved.link.jobId, targetJob]), reason: unresolvedReason(unresolved) });
        }
    }
    for (const { jobId, windowFirstLine, run } of leading) {
        const before = windowOf(run.file, windowFirstLine - 1);
        if (before !== undefined && (yield* graph.countPiecesHolding("map", run)) === 0) {
            gaps.push({
                jobs: jobsOf([before.jobId, jobId]),
                reason: `lines ${run.firstLine}-${run.lastLine} of ${run.file} continue no block or data definition of the job before: that job lists the one running on into them, or this job maps them or names them in a span`,
            });
        }
    }
    return gaps;
});

/**
 * The reasons of every gap, grouped by the job each names, once.
 * @param gaps the gaps
 * @returns each job's reasons
 */
export const reasonsByJob = (gaps: readonly GapAcrossJobs[]) => {
    const byJob = new Map<string, string[]>();
    for (const gap of gaps) {
        for (const job of gap.jobs) {
            getOrCreate(byJob, job).push(gap.reason);
        }
    }
    return byJob;
};

/**
 * Which window of the given ones covers a line, answered from each file's windows sorted once.
 * @param windows each covered window with the job that covers it
 * @returns the lookup
 */
export function windowsByLine(windows: readonly Window[]): WindowOfLine {
    const byFile = new Map<string, Window[]>();
    windows.forEach((window) => getOrCreate(byFile, window.file).push(window));
    for (const list of byFile.values()) {
        list.sort((left, right) => left.firstLine - right.firstLine);
    }
    return (file, line) => {
        const held = byFile.get(file);
        const list = held === undefined ? [] : held;
        let low = 0;
        let high = list.length;
        while (low < high) {
            const middle = (low + high) >>> 1;
            const window = list[middle];
            if (window === undefined || window.firstLine <= line) {
                low = middle + 1;
            } else {
                high = middle;
            }
        }
        const window = list[low - 1];
        return window !== undefined && window.lastLine >= line ? window : undefined;
    };
}
