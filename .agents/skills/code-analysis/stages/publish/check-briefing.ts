import { Effect } from "effect";
import { addToCount } from "../../shared/run/collections";
import type { JsonRecord } from "../../shared/model/json-record";
import { ofType } from "../../shared/read/record-reading";
import { checkReviewedJob } from "../../shared/jobs/review-rounds";
import { CapabilityGroup, CrossCuttingConcern } from "../../shared/model/schemas/briefing";
import { readFactBase, stageFactGaps } from "../../shared/read/stage-facts";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import { briefedCandidates, briefedCapabilities } from "./briefing-brief";
import { briefingShapes, reviewedBriefingJob } from "./briefing-job";
import { missedOutside } from "../../shared/jobs/review-verdicts";
import type { Missed } from "../../shared/model/schemas/missed";
import { ScopeFiles } from "../../shared/read/scope-files";
import { citedFiles } from "../../shared/read/record-writing";

type Finding = JsonRecord & { readonly id: string };

/**
 * How often each of some ids is named, by the lists that name them.
 * @param lists the lists, each naming ids
 * @returns each id's count
 */
function timesNamed(lists: ReadonlyArray<readonly string[]>): Map<string, number> {
    const times = new Map<string, number>();
    lists.flat().forEach((id) => addToCount(times, id, 1));
    return times;
}

/**
 * Each of the brief's units named exactly once by the records, and none named that the brief does not hold.
 * @param units the brief's units
 * @param times how often the records name each
 * @param words how a gap names what is missing, doubled and unknown
 * @param words.missing what a unit named nowhere lacks
 * @param words.doubled what to do with a unit named more than once
 * @param words.unknown what a named id the brief does not hold is not
 * @returns one line per gap
 */
function onceEach(
    units: readonly string[],
    times: ReadonlyMap<string, number>,
    words: { readonly missing: string; readonly doubled: string; readonly unknown: string },
): string[] {
    const known = new Set(units);
    return [
        ...units.flatMap((id) => {
            const count = times.get(id);
            if (count === undefined) {
                return [`${id} ${words.missing}`];
            }
            return count > 1 ? [`${id} is named ${count} times: ${words.doubled}`] : [];
        }),
        ...[...times.keys()].filter((id) => !known.has(id)).map((id) => `${id} is ${words.unknown}`),
    ];
}

/**
 * The briefing's gate (D225): every capability of the brief in exactly one area, and no area naming what is no
 * capability of the brief.
 * @param records the briefing's records
 * @param capabilities the capabilities of the brief
 * @returns one line per gap
 */
function briefingGaps(records: readonly Finding[], capabilities: readonly string[]): string[] {
    return onceEach(
        capabilities,
        timesNamed(ofType(records, RecordIdPrefix.CapabilityGroup, CapabilityGroup).map((area) => area.capabilities)),
        {
            missing: "is in no area: put every capability in exactly one CapabilityGroup",
            doubled: "put it in exactly one CapabilityGroup",
            unknown: "in an area, but no capability of the brief",
        },
    );
}

/**
 * The cross-cutting gate: every candidate block of the brief in exactly one `CrossCuttingConcern`, and no concern naming
 * a block that is not a candidate.
 * @param records the briefing's records
 * @param candidates the candidate blocks of the brief
 * @returns one line per gap
 */
export function crossCuttingGaps(records: readonly Finding[], candidates: readonly string[]): string[] {
    return onceEach(
        candidates,
        timesNamed(
            ofType(records, RecordIdPrefix.CrossCuttingConcern, CrossCuttingConcern).map((concern) => concern.blocks),
        ),
        {
            missing: "is a candidate no CrossCuttingConcern explains: put every candidate in exactly one",
            doubled: "put it in exactly one CrossCuttingConcern",
            unknown: "named by a CrossCuttingConcern but is no candidate of the brief",
        },
    );
}

/**
 * The briefing under review: its record types, and its gate, held to its brief. Its verdicts need only the shared rules;
 * a missed record points at lines in scope.
 * @param root the analysis root
 * @returns the stage as the review rounds take it
 */
export const briefingReview = (root: string) => ({
    stage: "publish" as const,
    shapes: briefingShapes,
    checksFor: (cited: readonly Finding[]) =>
        Effect.gen(function* () {
            const capabilities = yield* briefedCapabilities(root);
            const candidates = yield* briefedCandidates(root);
            const lineCounts = yield* (yield* ScopeFiles).lineCountsFor(citedFiles(cited));
            const facts = { ...(yield* readFactBase()), lineCounts };
            return {
                records: (records: readonly Finding[]) => [
                    ...briefingGaps(records, capabilities),
                    ...crossCuttingGaps(records, candidates),
                    ...stageFactGaps(records, facts),
                ],
                placement: (missed: ReadonlyArray<typeof Missed.Type>) => missedOutside(missed, lineCounts, "manifest"),
                writtenBeside: new Set<string>(),
            };
        }),
});

/**
 * `check`: the briefing's gate, and, once its reviewer has written, the review's verdicts and the gate again on what
 * the review would leave. The writer and the reviewer both run it as their done-check.
 * @param root the analysis root
 * @returns one line per gap; none when the briefing passes
 */
export const checkBriefing = Effect.fnUntraced(function* (root: string) {
    return yield* checkReviewedJob(briefingReview(root), reviewedBriefingJob(root));
});
