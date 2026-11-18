import { layerOfPath } from "../../core/codebase";
import { criteriaOf } from "../../core/criteria";
import type { Run } from "../../core/run-context";
import type { TestsFound } from "./render-model";

/**
 * Gathers each criterion's tests and load limits and every test file with its layer ("no layer" when none owns it) and
 * its text before and after, plus the support files.
 * @param run the run
 * @returns the findings
 */
export const testsFound = (run: Run): typeof TestsFound.Type => ({
    criteria: criteriaOf(run).map(({ ac, name, tests, thresholds }) => ({ ac, name, tests, thresholds })),
    files: run.testFiles.map((path) => {
        const layer = layerOfPath(run.codebase, path);
        const file = run.files.get(path);
        return {
            path,
            layer: layer === undefined ? "no layer" : layer.name,
            before: file === undefined ? "" : file.before,
            after: file === undefined ? "" : file.after,
        };
    }),
    support: run.records.supportFiles,
});
