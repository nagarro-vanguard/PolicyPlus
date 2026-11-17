import { Effect } from "effect";
import { AnalysisRoot } from "../run/analysis-root";
import { gap } from "../jobs/gap-remedies";
import { holds } from "./line-ranges";
import type { Receipt } from "./schemas/receipt";
import type { Lines } from "./shared-fields";
import { sourceReader } from "../source/source-text";

const shareMin = 1;

/**
 * The non-blank lines of a job's scope, by file. A file no listed source holds adds nothing: the job's gate reports it.
 * @param scope the ranges that make up the job's lines
 * @returns the line numbers of each file that hold something
 */
export const nonBlankLinesOf = Effect.fnUntraced(function* (scope: readonly Lines[]) {
    const { sourceText } = yield* sourceReader((yield* AnalysisRoot).root);
    const lines = new Map<string, readonly number[]>();
    for (const file of new Set(scope.map((range) => range.file))) {
        const text = (yield* sourceText(file).pipe(Effect.orElseSucceed(() => ""))).split("\n");
        const wanted = new Set(
            scope
                .filter((range) => range.file === file)
                .flatMap((range) =>
                    Array.from({ length: range.lastLine - range.firstLine + 1 }, (_, i) => range.firstLine + i),
                ),
        );
        lines.set(
            file,
            [...wanted].filter((at) => text.slice(at - 1, at).some((content) => content.trim() !== "")),
        );
    }
    return lines;
});

/**
 * The gaps of the receipt an agent files for a job, on coordinates only: exactly one receipt, its ranges covering every
 * non-blank line of the job. What the ranges hold is never read. The writer's receipt and the reviewer's are
 * weighed by this one rule.
 * @param receipts the receipts the agent wrote
 * @param lines the job's non-blank lines, by file
 * @param by who filed it, for the message
 * @returns one line per gap
 */
export const coverageGaps = (
    receipts: readonly (typeof Receipt.Type)[],
    lines: ReadonlyMap<string, readonly number[]>,
    by: "writer" | "review" = "review",
) => {
    const [receipt, ...more] = receipts;
    if (receipt === undefined || more.length) {
        const whose = by === "writer" ? "the job's output" : "the review";
        return [
            receipt === undefined
                ? gap(
                      "no-receipt",
                      `${whose} has no receipt${by === "writer" ? "" : ", even when it challenges nothing"}`,
                  )
                : gap("many-receipts", `${whose} has ${receipts.length} receipts`),
        ];
    }
    let total = 0;
    let covered = 0;
    for (const [file, numbers] of lines) {
        for (const line of numbers) {
            total += 1;
            covered += receipt.read.some((range) => holds(range, { file, firstLine: line, lastLine: line })) ? 1 : 0;
        }
    }
    return total > 0 && covered < total * shareMin
        ? [gap("receipt-short", `the receipt covers ${covered} of the job's ${total} non-blank lines`)]
        : [];
};

/**
 * The gaps of a receipt against a job's scope.
 * @param receipts the receipts the agent wrote
 * @param scope the ranges that make up the job's lines
 * @param by who filed it
 * @returns one line per gap
 */
export const receiptGaps = Effect.fnUntraced(function* (
    receipts: readonly (typeof Receipt.Type)[],
    scope: readonly Lines[],
    by: "writer" | "review" = "review",
) {
    return coverageGaps(receipts, yield* nonBlankLinesOf(scope), by);
});
