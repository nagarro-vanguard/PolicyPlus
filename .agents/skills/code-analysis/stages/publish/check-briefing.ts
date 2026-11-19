import { Effect } from "effect";
import { addToCount } from "../../shared/run/collections";
import type { JsonRecord } from "../../shared/model/json-record";
import { ofType } from "../../shared/read/record-reading";
import { checkReviewedJob } from "../../shared/jobs/review-rounds";
import { CapabilityGroup, CrossCuttingConcern, Figure, Screen } from "../../shared/model/schemas/briefing";
import { readFactBase, stageFactGaps } from "../../shared/read/stage-facts";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import { briefedCandidates, briefedCapabilities, briefedMenu, briefedScreens } from "./briefing-brief";
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
 * @internal exported for the tests, which check this gate on its own
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
 * The screens gate: every candidate screen of the brief in exactly one `Screen`, and no screen naming a place that is no
 * candidate.
 * @param records the briefing's records
 * @param candidates the candidate screens' keys
 * @returns one line per gap
 * @internal exported for the tests, which check this gate on its own
 */
export function screenGaps(records: readonly Finding[], candidates: readonly string[]): string[] {
    return onceEach(
        candidates,
        timesNamed(ofType(records, RecordIdPrefix.Screen, Screen).map((screen) => screen.places)),
        {
            missing: "is a candidate screen no Screen names: put every candidate in exactly one Screen",
            doubled: "put it in exactly one Screen",
            unknown: "named by a Screen but is no candidate screen of the brief",
        },
    );
}

/**
 * Whether a text holds a digit.
 * @param text the text
 * @returns true when it does
 */
const hasDigit = (text: string) => [...text].some((char) => char >= "0" && char <= "9");

/**
 * The figures gate: a figure's shape is on the brief's menu (or is `other`, which draws nothing and says what is wanted),
 * it names only records its menu line offers, and its caption states no count.
 * @param records the briefing's records
 * @param menu the record ids each shape of picture can draw
 * @returns one line per gap
 * @internal exported for the tests, which check this gate on its own
 */
export function figureGaps(records: readonly Finding[], menu: ReadonlyMap<string, readonly string[]>): string[] {
    return ofType(records, RecordIdPrefix.Figure, Figure).flatMap((figure) => {
        const offered = menu.get(figure.kind);
        return [
            ...(figure.kind === "other"
                ? [
                      ...(figure.records.length > 0 ? [`${figure.id} is \`other\`: it names no records`] : []),
                      ...(figure.wanted === undefined
                          ? [`${figure.id} is \`other\`: say what picture is wanted in \`wanted\``]
                          : []),
                  ]
                : [
                      ...(offered === undefined
                          ? [
                                `${figure.id} is a ${figure.kind} picture the menu does not offer: the records cannot draw it`,
                            ]
                          : []),
                      ...(figure.wanted === undefined ? [] : [`${figure.id} has \`wanted\`, which only \`other\` has`]),
                      ...figure.records
                          .filter((id) => offered !== undefined && !offered.includes(id))
                          .map(
                              (id) =>
                                  `${figure.id} names ${id}, which the ${figure.kind} line of the menu does not offer`,
                          ),
                  ]),
            ...(hasDigit(figure.caption)
                ? [`${figure.id}: the caption states a count or a number; the page counts, so say it in words`]
                : []),
        ];
    });
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
            const screens = yield* briefedScreens(root);
            const menu = yield* briefedMenu(root);
            const lineCounts = yield* (yield* ScopeFiles).lineCountsFor(citedFiles(cited));
            const facts = { ...(yield* readFactBase()), lineCounts };
            return {
                records: (records: readonly Finding[]) => [
                    ...briefingGaps(records, capabilities),
                    ...crossCuttingGaps(records, candidates),
                    ...screenGaps(records, screens),
                    ...figureGaps(records, menu),
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
