import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Layout } from "../model/layout";
import type { BuiltFrom, Plan } from "../model/plan";
import { fingerprintOf } from "../read/fingerprint";
import { decisionGates, subjectNow } from "../read/confirmed";

/**
 * What the plan is built from, as it holds now: the analysis's fingerprint and, when the run has a target, the hash of
 * what each of the person's four decisions was made about.
 * @param layout the run's folders
 * @param analysis the analysis's fingerprint, when it is already known
 * @returns the stamp, without decisions when the run has no target or a decision is missing
 */
export const builtFromNow = (
    layout: Layout,
    analysis: string = fingerprintOf(join(layout.analysis, "payloads")),
): BuiltFrom => {
    if (!existsSync(layout.target)) return { analysis };
    const subjects = decisionGates.map((gate) => [gate, subjectNow(layout, gate)] as const);
    if (subjects.some(([, subject]) => subject === undefined)) return { analysis };
    return { analysis, decisions: Object.fromEntries(subjects) as NonNullable<BuiltFrom["decisions"]> };
};

/**
 * Whether a plan is the plan of what holds now: each input whose hash differs from the one the plan was built from.
 * Decided by the hashes alone, never by the files' times.
 * @param layout the run's folders
 * @param plan the plan as written
 * @returns what changed since the plan was built, empty when it is current; nothing when the plan predates the stamp
 */
export const changedSinceBuilt = (layout: Layout, plan: Pick<Plan, "builtFrom">): string[] | undefined => {
    if (plan.builtFrom === undefined) return undefined;
    const now = builtFromNow(layout);
    const changed: string[] = [];
    if (now.analysis !== plan.builtFrom.analysis) changed.push("the analysis");
    for (const gate of decisionGates) {
        const was = plan.builtFrom.decisions?.[gate];
        const is = now.decisions?.[gate];
        if (was !== is) changed.push(`the ${gate} decision`);
    }
    return changed;
};
