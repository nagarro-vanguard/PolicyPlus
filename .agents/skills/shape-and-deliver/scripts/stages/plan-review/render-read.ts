import { criterionName } from "../../core/criteria";
import { ownerOf, unownedReason } from "../../core/review-routing";
import type { Run } from "../../core/run-context";
import { countedByType, type Standing } from "../../core/stage-run-frame";
import { decisionsOf, type Decision } from "../../core/stage-model";
import { changesFound } from "../changes/render-read";
import { testsFound } from "../tests/render-read";
import type { PlanReviewFound } from "./render-model";

/**
 * Says where the plan stands: stopped on a security finding, on defects no stage owns, or when the trace, changes or
 * tests stage used its rounds. Once the approval marker exists it waits for the approver until a build exists, then is
 * done; before that it is running once the review ran or every stage was accepted, else not started.
 * @param run the run
 * @returns the standing
 */
export function planReviewStanding(run: Run): Standing {
    const { trace, changes, tests } = run.rounds;
    if (run.records.planFindings.some((finding) => finding.weight === "security")) {
        return {
            state: "stopped",
            reason: "The plan review found a security problem: an engineer must look at it before the plan can go on.",
        };
    }
    const defects = run.records.planFindings.filter((finding) => finding.weight === "defect");
    if (
        defects.length > 0 &&
        defects.every((finding) => finding.about.every((about) => ownerOf(about) === undefined))
    ) {
        return { state: "stopped", reason: `The plan review found a defect that ${unownedReason(defects)}.` };
    }
    const stopped = [trace, changes, tests].find((rounds) => rounds.stopped);
    if (stopped !== undefined) {
        return { state: "stopped", reason: `The plan could not be completed: ${stopped.waiting.join(" ")}` };
    }
    if (run.planApproved) {
        return { state: run.build === undefined ? "waitingForYou" : "done" };
    }
    if (run.reviewed.plan || (trace.accepted && changes.accepted && tests.accepted)) {
        const wrote = countedByType(run.records.byStage.planReview);
        return {
            state: "running",
            ran: wrote.length ? [{ _tag: "agentWrote", label: "The review", wrote }] : undefined,
        };
    }
    return { state: "notStarted" };
}

/**
 * Gives every open question of the plan as a decision that waits on the approver.
 * @param run the run
 * @returns the decisions
 */
export const planReviewDecisions = (run: Run): Decision[] => decisionsOf(run.records.questions);

/**
 * Gathers the kind of work, the criteria, the code changes and tests, the review's findings and
 * whether it ran, and whether the plan started from a design.
 * @param run the run
 * @returns the findings
 */
export function planReviewFound(run: Run): typeof PlanReviewFound.Type {
    const workItem = run.workItem;
    return {
        kind: run.plan.kind,
        criteria:
            workItem === undefined
                ? []
                : workItem.criteria.map((criterion, i) => ({ name: criterionName(i), text: criterion.text })),
        changes: changesFound(run),
        tests: testsFound(run),
        findings: run.records.planFindings,
        reviewed: run.reviewed.plan,
        ...(run.plan.fromDesign === undefined ? {} : { startedFromDesign: true }),
    };
}
