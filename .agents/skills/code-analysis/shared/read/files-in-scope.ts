import { Effect } from "effect";
import { AnalysisConfig } from "../run/analysis-limits";
import { ScopeFiles } from "./scope-files";
import { requireAcceptedRecords } from "../store/stage-guards";
import { UsageInvalid } from "../run/script-errors";

/**
 * The files in scope whose path holds a text, one line each with its line count, in path order: the files an agent may
 * cite, found without reading the whole list. More than `pathsPrintedMax` are never given, nor cut short: the count is
 * given and the call refused, so the agent asks with a narrower text.
 * @param text part of a path, such as a folder or a file name
 * @returns the lines; UsageInvalid until Inventory has accepted its records, and for a text too many paths hold
 */
export const filesInScopeLines = Effect.fnUntraced(function* (text: string) {
    yield* requireAcceptedRecords("inventory");
    const files = yield* (yield* ScopeFiles).findFilesInScope(text);
    const { pathsPrintedMax } = yield* AnalysisConfig;
    if (files.length > pathsPrintedMax) {
        return yield* new UsageInvalid({
            issue: `${files.length} files in scope hold "${text}", more than the ${pathsPrintedMax} printed at once: ask with a longer part of a path`,
        });
    }
    return files.map((file) => `${file.path} ${file.lines}`);
});
