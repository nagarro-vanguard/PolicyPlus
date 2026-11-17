import { Config, Context, Effect, Layer } from "effect";
import { analysisPaths } from "./analysis-layout";
import { UsageInvalid } from "./script-errors";

type AnalysisPaths = ReturnType<typeof analysisPaths>;

export interface AnalysisRootOps {
    readonly root: string;
    readonly paths: AnalysisPaths;
}

/**
 * The run at `root`: the analysis root a script works in, and every path under it. A script run by the orchestrator
 * or an agent gets the root from CODE_ANALYSIS_ROOT, read through Effect's Config, and fails with how to set it when
 * it is not set.
 * @param root the analysis root
 * @returns the root and its paths
 */
const runAt = (root: string): AnalysisRootOps => ({ root, paths: analysisPaths(root) });

export class AnalysisRoot extends Context.Service<AnalysisRoot, AnalysisRootOps>()("code-analysis/core/AnalysisRoot") {
    static readonly layer: Layer.Layer<AnalysisRoot, UsageInvalid> = Layer.effect(
        AnalysisRoot,
        Config.NonEmptyString("CODE_ANALYSIS_ROOT").pipe(
            Effect.map(runAt),
            Effect.mapError(
                () =>
                    new UsageInvalid({
                        issue: "CODE_ANALYSIS_ROOT is not set: run scripts as CODE_ANALYSIS_ROOT=<analysis root> bun <script>.ts",
                    }),
            ),
        ),
    );
}
