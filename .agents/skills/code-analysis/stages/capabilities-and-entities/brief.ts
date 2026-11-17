import { Effect } from "effect";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { everySubject, readBriefParts, staleBriefGap } from "../../shared/store/stage-brief";

/**
 * The brief every job of Capabilities and entities and its review work from, one for the stage: the layers, the
 * external systems a unit names by id, and the facts whose questions the stage reads (`readBriefParts`).
 * @returns the brief, as its text
 */
export const briefText = Effect.fnUntraced(function* () {
    return JSON.stringify(
        yield* readBriefParts("capabilities-and-entities", ["how-it-runs", "map"], everySubject),
        null,
        1,
    );
});

/**
 * Refuse while the brief built today differs from the one the stage's jobs were prepared with: How it runs or the Map
 * wrote again since.
 * @param root the analysis root
 * @returns nothing when the brief is current; the gap otherwise
 */
export const staleBrief = Effect.fnUntraced(function* (root: string) {
    return yield* staleBriefGap(analysisPaths(root).capabilitiesAndEntities.brief, yield* briefText(), {
        name: "Capabilities and entities",
        prepare: "name-capabilities-and-entities.ts prepare",
    });
});
