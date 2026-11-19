import { existsSync } from "node:fs";
import { gateState, proposalOf, recordOf, type Gate } from "../../shape-target/shared/gates";
import { layoutOf } from "../../shape-target/shared/model/layout";
import type { Paths } from "./steps";

export type { Gate };

/**
 * Why a recorded decision no longer holds, or nothing. The rule is shape-target's own (`shared/gates.ts`), read from
 * there: a decision holds while the file it decides on still has the hash it recorded, and the decision before it holds
 * and was confirmed no later; a decision recorded before hashes were kept is judged by time until it is confirmed again.
 * A decision not recorded yet has no problem here: its step is due because the record is missing.
 * @param paths the run's folders
 * @param gate the decision
 * @returns the problems, empty when the decision holds or is not made yet
 */
export const gateProblems = (paths: Paths, gate: Gate): string[] => {
    const layout = layoutOf(paths.root);
    if (!existsSync(recordOf(layout, gate)) || !existsSync(proposalOf(layout, gate))) return [];
    const state = gateState(layout, gate);
    return state === "confirmed"
        ? []
        : state === "waiting"
          ? [`the ${gate} decision has no date`]
          : state === "blocked"
            ? [`the ${gate} decision rests on one that no longer holds`]
            : [`the ${gate} proposal changed after it was confirmed`];
};
