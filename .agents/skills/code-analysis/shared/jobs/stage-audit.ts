import { Effect, Stream } from "effect";
import { analysisPaths, scriptsCommand, shellWord, type Stage } from "../run/analysis-layout";
import { FileAccess } from "../source/file-access";
import { jsonlText } from "../run/json-files";
import type { JsonRecord } from "../model/json-record";
import { citedFiles } from "../read/record-writing";
import { RecordReads } from "../read/record-reads";
import type { Decoder } from "../store/stored-bodies";
import { ScopeFiles } from "../read/scope-files";
import type { ReviewedJob } from "./review-rounds";
import { missedOutside } from "./review-verdicts";
import type { Shapes } from "./review-files";
import type { Missed } from "../model/schemas/missed";

export const stageAuditKey = "the stage audit";

/**
 * A whole stage's audit as the review rounds take it: its findings are the stage's accepted records, written as one
 * document since agents never read the store (P1.28).
 * @param root the analysis root
 * @param stage the stage
 * @returns the job, with where its validator writes
 */
export const stageAuditJob = (root: string, stage: Stage): ReviewedJob => ({
    stage,
    key: stageAuditKey,
    label: stageAuditKey,
    ...analysisPaths(root).stageAudit(stage),
});

/**
 * Write the stage's accepted records as the audit's findings, one record type after another, in the store's order.
 * @param root the analysis root
 * @param stage the stage
 * @param types the record types the stage writes, each by its name and schema
 * @returns how many records were written
 */
export const writeAuditFindings = Effect.fnUntraced(function* (
    root: string,
    stage: Stage,
    types: ReadonlyArray<{ readonly type: string; readonly schema: Decoder }>,
) {
    const reads = yield* RecordReads;
    const records: unknown[] = [];
    for (const { type, schema } of types) {
        records.push(...(yield* Stream.runCollect(reads.recordsOfType(type, schema, [stage]))));
    }
    yield* (yield* FileAccess).writeText(stageAuditJob(root, stage).outputPath, jsonlText(records));
    return records.length;
});

/**
 * What the validation agent is given besides the audit's files: the source folder and the command that checks its review.
 * @param root the analysis root
 * @param script the stage's entry script
 * @param sourceFolder the folder record paths are relative to
 * @returns the call
 */
export const stageAuditCall = (root: string, script: string, sourceFolder: string) => ({
    root,
    sourceFolder,
    checkCommand: `${scriptsCommand(root)}/${script} check ${shellWord(stageAuditKey)}`,
});

/**
 * A whole stage's audit under review: the records are the stage's accepted ones, already gated, so no record check
 * runs again; the audit rules only on what it challenges, and what it finds missing may lie anywhere in scope.
 * @param stage the stage
 * @param shapes the record types the stage writes
 * @returns the stage as the review rounds take it
 */
export const stageAuditReview = <T extends Shapes<T>>(stage: Stage, shapes: T) => ({
    stage,
    shapes,
    checksFor: (cited: readonly JsonRecord[]) =>
        Effect.gen(function* () {
            const lineCounts = yield* (yield* ScopeFiles).lineCountsFor(citedFiles(cited));
            return {
                records: () => [],
                placement: (missed: ReadonlyArray<typeof Missed.Type>) => missedOutside(missed, lineCounts, "manifest"),
                writtenBeside: new Set<string>(),
            };
        }),
});
