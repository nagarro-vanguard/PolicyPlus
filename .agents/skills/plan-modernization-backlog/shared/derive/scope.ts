import type { Analysis } from "../read/analysis";
import type { Decision } from "../model/records";

export type Scope = "carry" | "replace" | "drop";

/** The scope a decision chose: its first word, `carry`, `replace` or `drop`. */
export const scopeOf = (decision: Decision): Scope | undefined => {
    const word = decision.chose.trim().toLowerCase().split(/\W+/)[0];
    return word === "carry" || word === "replace" || word === "drop" ? word : undefined;
};

/**
 * The capabilities to plan, from the `scope` decisions: carried and replaced capabilities are planned, dropped ones are
 * not; a capability with no decision is planned, and the gate reports the missing decision.
 * @param analysis the analysis
 * @param decisions every decision
 * @returns the scope by capability name and the ids to plan
 */
export const carriedFrom = (analysis: Analysis, decisions: readonly Decision[]) => {
    const byName = new Map<string, Scope>();
    for (const decision of decisions) {
        if (decision.topic._tag !== "scope") continue;
        const scope = scopeOf(decision);
        if (scope !== undefined) byName.set(decision.topic.capability, scope);
    }
    const ids = new Set(
        analysis.capabilities
            .filter((each) => byName.get(each.capability.name) !== "drop")
            .map((each) => each.capability.id),
    );
    return { byName, ids };
};
