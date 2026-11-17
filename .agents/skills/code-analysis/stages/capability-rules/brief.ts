import { Effect } from "effect";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { everySubject, readBriefParts, staleBriefGap } from "../../shared/store/stage-brief";

/**
 * The brief every job of Capability rules and its review work from, one for the stage: the layers, the external systems a
 * job names by id, and the facts whose questions the stage reads (`readBriefParts`): batch work, navigation and
 * permissions, user state, data shapes, who may do what, tenants, and failures.
 * @returns the brief, as its text
 */
export const briefText = Effect.fnUntraced(function* () {
    return JSON.stringify(
        yield* readBriefParts("capability-rules", ["how-it-runs", "map", "capabilities-and-entities"], everySubject),
        null,
        1,
    );
});

/**
 * Refuse while the brief built today differs from the one the stage's jobs were prepared with: How it runs, the Map or
 * Capabilities and entities wrote again since (D48).
 * @param root the analysis root
 * @returns nothing when the brief is current; the gap otherwise
 */
export const staleBrief = Effect.fnUntraced(function* (root: string) {
    return yield* staleBriefGap(analysisPaths(root).capabilityRules.brief, yield* briefText(), {
        name: "Capability rules",
        prepare: "explain-capability-rules.ts prepare",
    });
});
