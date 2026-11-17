import { dirname, join } from "node:path";
import { Effect } from "effect";
import { scriptsCommand } from "../run/analysis-layout";
import type { AgentCall } from "./dispatch-prompt";
import { FileAccess } from "../source/file-access";
import { instructionsOf } from "./job-feedback";
import { lineSpan } from "../model/line-ranges";
import type { Shapes } from "./review-files";
import { scopeOf, type ReviewedJob, type ReviewedStage } from "./review-rounds";
import { secondRoundOf } from "./second-round";
import type { Lines } from "../model/shared-fields";

type Sheet = {
    readonly checklist: string;
    readonly reads: ReadonlyArray<readonly [string, string]>;
    readonly beside?: string;
};

type Call = {
    readonly root: string;
    readonly sourceFolder: string;
    readonly checkCommand: string;
    readonly feedback?: { readonly customInstructions?: string };
};

/**
 * Where a job's review sheet is written: beside its review.
 * @param job the job
 * @param job.reviewPath where its review goes
 * @returns the sheet's path
 */
const sheetPathOf = (job: { readonly reviewPath: string }) => join(dirname(job.reviewPath), "review-sheet.md");

/**
 * The named arguments of the shared reviewer, in the order its contract lists them: seven at most, the stage's own
 * context all in the sheet.
 * @param job the job's files
 * @param call the analysis root, the source folder, the command that checks the review and the job's feedback
 * @returns the arguments; `customInstructions` only with feedback
 */
export const reviewArguments = (job: Pick<ReviewedJob, "outputPath" | "reviewPath">, call: Call) => ({
    scriptsCommand: scriptsCommand(call.root),
    sourceFolder: call.sourceFolder,
    findingsPath: job.outputPath,
    sheetPath: sheetPathOf(job),
    checkCommand: call.checkCommand,
    outputPath: job.reviewPath,
    ...instructionsOf(call.feedback === undefined ? {} : call.feedback),
});

/**
 * A job's line ranges merged per file, one `file:first-last` each: what its receipt must cover.
 * @param scope the ranges
 * @returns the text
 */
const rangesText = (scope: readonly Lines[]) => {
    const merged: Array<{ file: string; firstLine: number; lastLine: number }> = [];
    const sorted = scope.toSorted((one, other) =>
        one.file === other.file ? one.firstLine - other.firstLine : one.file < other.file ? -1 : 1,
    );
    for (const range of sorted) {
        const last = merged.at(-1);
        if (last !== undefined && last.file === range.file && range.firstLine <= last.lastLine + 1) {
            last.lastLine = Math.max(last.lastLine, range.lastLine);
        } else {
            merged.push({ ...range });
        }
    }
    return merged.map(lineSpan).join("\n");
};

/**
 * The reviewer's call for one job: its sheet is written first (the lines of the job its receipt must cover, what to
 * read besides the findings, the stage's checklist, and what the stage adds), then the arguments name it.
 * @param stage the stage, which says what the job's lines are
 * @param job the job's files
 * @param sheet the stage's checklist file, what the reviewer reads besides the findings, and what the stage adds
 * @param call the analysis root, the source folder, the command that checks the review and the job's feedback
 * @returns the call
 */
export const reviewCall = Effect.fnUntraced(function* <T extends Shapes<T>, E, R>(
    stage: ReviewedStage<T, E, R>,
    job: ReviewedJob,
    sheet: Sheet,
    call: Call,
) {
    const fs = yield* FileAccess;
    const second = yield* secondRoundOf(job);
    const text = [
        `# Review sheet: ${job.label}`,
        ...(second === undefined
            ? []
            : [
                  `## Second review: judge only what the fix changed\nThis is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.\n${second.corrected.map((record) => `- ${record.id}`).join("\n")}${second.dropped.length ? "\n\nThe dropped records are listed below." : ""}`,
              ]),
        `## The lines of the job: your receipt lists the ranges you read\n${rangesText(yield* scopeOf(stage, job))}`,
        ...(sheet.reads.length
            ? [`## Read besides the findings\n${sheet.reads.map(([what, path]) => `- ${what}: ${path}`).join("\n")}`]
            : []),
        `## What this stage's findings are known for\n${yield* fs.readText(sheet.checklist)}`,
        ...(sheet.beside === undefined ? [] : [sheet.beside]),
    ].join("\n\n");
    yield* fs.writeText(sheetPathOf(job), `${text}\n`);
    const agent: AgentCall = { agent: "review/review-agent-findings", arguments: reviewArguments(job, call) };
    return agent;
});
