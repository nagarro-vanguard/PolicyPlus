import { Effect } from "effect";
import { criteriaOf } from "../../core/criteria";
import type { Run } from "../../core/run-context";
import { stageFolderOf } from "../../core/run-layout";
import { checksRan, countedByType, type Standing } from "../../core/stage-run-frame";
import { codeFound } from "../code/render-read";
import type { ChangeReviewFound } from "./render-model";

/**
 * Says where the evidence stands: stopped on a security finding; done when the review ran and found no defect; running
 * with what the review wrote when it found defects; running with the checks' counts once every check passed; else not
 * started.
 * @param run the run
 * @returns the standing
 */
export function changeReviewStanding(run: Run): Standing {
    const findings = run.records.changeFindings;
    const checks = run.checks.afterCode;
    if (findings.some((finding) => finding.weight === "security")) {
        return {
            state: "stopped",
            reason: "The change review found a security problem: an engineer must look at it before the change can go on.",
        };
    }
    if (run.reviewed.change && !findings.some((finding) => finding.weight === "defect")) {
        return { state: "done" };
    }
    if (run.reviewed.change) {
        return {
            state: "running",
            ran: [
                {
                    _tag: "agentWrote",
                    label: "The review",
                    wrote: countedByType(run.records.byStage.changeReview),
                },
            ],
        };
    }
    if (checks !== undefined && checks.outcome === "passed") {
        return { state: "running", ran: [checksRan("The checks after the code commit", checks.runs)] };
    }
    return { state: "notStarted" };
}

/**
 * Gathers each criterion with its results, each fact at risk with whether its tests held after the code, the code's
 * findings and the review's findings.
 * @param run the run, its code committed
 * @returns the findings
 * Fails: FindingsNotReady when the code is not committed.
 */
export const changeReviewFound = Effect.fn("ChangeReviewRead.changeReviewFound")(function* (run: Run) {
    const code = yield* codeFound(run);
    const found: typeof ChangeReviewFound.Type = {
        kind: run.plan.kind,
        criteria: criteriaOf(run),
        evidence: `${stageFolderOf("code")}/evidence`,
        facts: run.records.invariants.map((invariant) => {
            const proven =
                run.manifests.afterCode === undefined
                    ? []
                    : run.manifests.afterCode.layers.flatMap((layer) => layer.proof.tests);
            return {
                why: invariant.why,
                tests: run.records.tests
                    .filter((test) => test.proves !== undefined && test.proves.includes(invariant.id))
                    .map((test) => ({
                        title: test.title,
                        held: proven.some((result) => result.title === test.title && result.passed),
                    })),
            };
        }),
        code,
        findings: run.records.changeFindings,
        reviewed: run.reviewed.change,
    };
    return found;
});
