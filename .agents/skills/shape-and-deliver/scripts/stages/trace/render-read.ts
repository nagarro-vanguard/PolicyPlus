import { criteriaOf } from "../../core/criteria";
import type { Run } from "../../core/run-context";
import type { TraceFound } from "./render-model";

/**
 * Gathers each criterion's name, text and the path steps the trace wrote for it.
 * @param run the run
 * @returns the findings
 */
export const traceFound = (run: Run): typeof TraceFound.Type => ({
    criteria: criteriaOf(run).map(({ ac, name, text, steps }) => ({ ac, name, text, steps })),
});
