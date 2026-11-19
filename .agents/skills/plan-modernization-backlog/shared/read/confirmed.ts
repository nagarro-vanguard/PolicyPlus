import { existsSync, readFileSync } from "node:fs";
import { gates, gateState, proposalOf, recordOf, subjectOf, type Gate } from "../../../shape-target/shared/gates";
import { layoutOf } from "../../../shape-target/shared/model/layout";
import type { Layout } from "../model/layout";

/*
 * Whether the person confirmed the target the plan is made from, and what each decision was made about. The rule is
 * shape-target's own (`shared/gates.ts`), read from there so the plan, the conductor and that skill cannot disagree: a
 * decision holds while the file it decides on still has the hash it recorded (`subject`), and the decision before it
 * holds and was confirmed no later; a decision recorded before hashes were kept is judged by time until it is confirmed
 * again.
 */
export type { Gate };
export const decisionGates = gates;

const problemOf = {
    "not made": "has nothing proposed yet",
    waiting: "is not confirmed",
    blocked: "rests on a decision that is not confirmed",
    changed: "changed after it was confirmed",
} as const;

/**
 * What stops the plan from being made on the target: each decision that is missing or no longer holds. A run with no
 * `target/` folder was never shaped and is planned from the analysis alone, so it has no gaps.
 * @param layout the run's folders
 * @returns one line per decision that is not confirmed, empty when the plan may start
 */
export const targetGaps = (layout: Layout): string[] => {
    if (!existsSync(layout.target)) return [];
    const shaped = layoutOf(layout.outputRoot);
    return gates.flatMap((gate) => {
        const state = gateState(shaped, gate);
        return state === "confirmed" ? [] : [`the ${gate} ${problemOf[state]}`];
    });
};

/**
 * The hash of what a decision was made about: the `subject` its record kept, or, for a record made before subjects were
 * kept, the hash of the file it decides on as it is now (the same function shape-target uses).
 * @param layout the run's folders
 * @param gate the decision
 * @returns the hex sha256, or nothing when the decision or its file is missing
 */
export const subjectNow = (layout: Layout, gate: Gate): string | undefined => {
    const shaped = layoutOf(layout.outputRoot);
    const record = recordOf(shaped, gate);
    const proposal = proposalOf(shaped, gate);
    if (!existsSync(record) || !existsSync(proposal)) return undefined;
    try {
        const subject = (JSON.parse(readFileSync(record, "utf8")) as { subject?: unknown }).subject;
        if (typeof subject === "string" && subject !== "") return subject;
    } catch {
        // an unreadable record is judged by its file
    }
    return subjectOf(proposal);
};
