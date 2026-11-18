import { Effect } from "effect";
import { FindingsNotReady } from "../../core/script-errors";
import type { Run } from "../../core/run-context";
import { checksRan, countedByType, type Standing } from "../../core/stage-run-frame";
import { decisionsOf, type Decision } from "../../core/stage-model";
import type { CodeFound } from "./render-model";

/**
 * Says where the code stands: not started before its commit; waiting for the approver while a repair question is open;
 * stopped when the checks still fail after the repairs; done when every check passed and no repair is under way; else
 * running, with the checks' pass and fail counts and what the repair wrote.
 * @param run the run
 * @returns the standing
 */
export function codeStanding(run: Run): Standing {
    const checks = run.checks.afterCode;
    if (run.applied.codeCommit === undefined) {
        return { state: "notStarted" };
    }
    if (run.records.fixQuestions.length > 0) {
        return { state: "waitingForYou" };
    }
    if (checks !== undefined && checks.outcome === "stop") {
        const gaps = checks.gaps === undefined ? [] : checks.gaps.map((gap) => gap.split("\n")[0]);
        return { state: "stopped", reason: `Some checks still fail after the repairs. ${gaps.join(" ")}` };
    }
    const repairing = run.rounds.fix.waiting.length > 0 && !run.rounds.fix.accepted;
    if (checks !== undefined && checks.outcome === "passed" && !repairing) {
        return { state: "done" };
    }
    const wrote = countedByType(run.records.byStage.fix);
    const ran = [
        ...(checks === undefined ? [] : [checksRan("The checks after the code commit", checks.runs)]),
        ...(wrote.length ? [{ _tag: "agentWrote" as const, label: "The repair", wrote }] : []),
    ];
    return { state: "running", ran: ran.length ? ran : undefined };
}

/**
 * Gives the repair's questions for the approver as decisions that wait on them.
 * @param run the run
 * @returns the decisions
 */
export const codeDecisions = (run: Run): Decision[] => decisionsOf(run.records.fixQuestions);

/**
 * Gathers the code commit, the checks once they ran, and the departures from the plan; fails if the commit is not
 * made.
 * @param run the run, its code committed
 * @returns the findings
 */
export const codeFound = Effect.fn("CodeRead.codeFound")(function* (run: Run) {
    const commit = run.applied.codeCommit;
    if (commit === undefined) {
        return yield* new FindingsNotReady({ stage: "code", until: "its commit is made" });
    }
    const checks = run.checks.afterCode;
    const found: typeof CodeFound.Type = {
        commit,
        ...(checks === undefined ? {} : { checks }),
        deviations: run.records.deviations,
    };
    return found;
});
