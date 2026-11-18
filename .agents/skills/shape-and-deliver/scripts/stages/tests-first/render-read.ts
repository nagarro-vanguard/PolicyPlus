import { Effect } from "effect";
import { criteriaOf } from "../../core/criteria";
import type { Run } from "../../core/run-context";
import { FindingsNotReady } from "../../core/script-errors";
import { checksRan, type Standing } from "../../core/stage-run-frame";
import type { TestsFirstFound } from "./render-model";

/**
 * Says where tests first stands: not started before the tests-only commit; running while the checks on today's code
 * have not run; stopped when they stop the run; done when they passed; else running, with how many commands passed and
 * failed.
 * @param run the run
 * @returns the standing
 */
export function testsFirstStanding(run: Run): Standing {
    const checks = run.checks.afterTests;
    if (run.applied.testsCommit === undefined) {
        return { state: "notStarted" };
    }
    if (checks === undefined) {
        return { state: "running", ran: undefined };
    }
    if (checks.outcome === "stop") {
        return {
            state: "stopped",
            reason:
                checks.reason === undefined
                    ? "The new tests could not be checked against today's code."
                    : checks.reason,
        };
    }
    return checks.outcome === "passed"
        ? { state: "done" }
        : { state: "running", ran: [checksRan("The checks on today's code", checks.runs)] };
}

/**
 * Gathers the kind of work, the tests-only commit, the checks on today's code once they ran, and each criterion's
 * results before the code; fails if the commit is not made.
 * @param run the run, its tests committed
 * @returns the findings
 */
export const testsFirstFound = Effect.fn("TestsFirstRead.testsFirstFound")(function* (run: Run) {
    const commit = run.applied.testsCommit;
    if (commit === undefined) {
        return yield* new FindingsNotReady({ stage: "tests first", until: "its commit is made" });
    }
    const checks = run.checks.afterTests;
    const found: typeof TestsFirstFound.Type = {
        kind: run.plan.kind,
        commit,
        ...(checks === undefined ? {} : { checks }),
        criteria: criteriaOf(run).map(({ name, text, before }) => ({ name, text, before })),
    };
    return found;
});
