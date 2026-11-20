import { Effect } from "effect";
import { addToCount } from "../../shared/run/collections";
import type { JsonRecord } from "../../shared/model/json-record";
import { ofType } from "../../shared/read/record-reading";
import { checkReviewedJob } from "../../shared/jobs/review-rounds";
import { CapabilityGroup, CrossCuttingConcern, Screen, SystemWords, View } from "../../shared/model/schemas/briefing";
import { setGaps } from "../../shared/views/guard";
import { readFactBase, stageFactGaps } from "../../shared/read/stage-facts";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import {
    briefedCandidates,
    briefedCapabilities,
    briefedPlaces,
    briefedScreens,
    briefedText,
} from "./briefing-brief";
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
function crossCuttingGaps(records: readonly Finding[], candidates: readonly string[]): string[] {
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
 */
function screenGaps(records: readonly Finding[], candidates: readonly string[]): string[] {
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
 * Whether a name reads as code: two words run together with a capital inside (`TravelClassesManagement`), or a dot,
 * an underscore or a slash in it.
 * @param name the name
 * @returns true when it does
 */
const readsAsCode = (name: string) => {
    const chars = [...name];
    const lower = (char: string) => char !== char.toUpperCase();
    const upper = (char: string) => char !== char.toLowerCase();
    return (
        chars.slice(1).some((char, at) => {
            const before = chars[at];
            return before !== undefined && lower(before) && upper(char);
        }) || ["_", "/", "\\"].some((mark) => name.includes(mark))
    );
};

/**
 * The places gate on names: a place is named in its people's words, never by the code's name for it (the class or file
 * name the script falls back on) nor a name that reads as code, and is never given the kind `test`, which the script
 * gives the test suites it groups itself.
 * @param records the briefing's records
 * @param places the candidate places of the brief, with the name the code gives each and its files
 * @returns one line per gap
 */
function surfaceNameGaps(
    records: readonly Finding[],
    places: ReadonlyArray<{ readonly key: string; readonly name: string; readonly files: readonly string[] }>,
): string[] {
    const codeNames = new Map(places.map((place) => [place.key, place] as const));
    return ofType(records, RecordIdPrefix.Screen, Screen).flatMap((screen) => {
        const own = screen.places.flatMap((key) => {
            const place = codeNames.get(key);
            return place === undefined
                ? []
                : [place.name, ...place.files.map((file) => file.split("/").at(-1)), key.split("/").at(-1)];
        });
        const lower = screen.name.trim().toLowerCase();
        return [
            ...(own.some((name) => name !== undefined && name.toLowerCase() === lower) || readsAsCode(screen.name)
                ? [`${screen.id} is named ${screen.name}, which is the code's name: name it as its people would`]
                : []),
            ...(screen.kind === "test"
                ? [`${screen.id} is of kind test: test suites are grouped by script and are never named here`]
                : []),
        ];
    });
}

/**
 * Whether a text holds some words, case aside.
 * @param text the text
 * @param words the words
 * @returns true when it does
 */
const holds = (text: string, words: string) => text.toLowerCase().includes(words.trim().toLowerCase());

/**
 * The words gate: at most one `SystemWords`; its name at most five words and found in the brief; each term used in the
 * brief, defined in at most twenty-five words and not by itself.
 * @param records the briefing's records
 * @param brief the brief's text
 * @returns one line per gap
 */
function systemWordsGaps(records: readonly Finding[], brief: string): string[] {
    const words = ofType(records, RecordIdPrefix.SystemWords, SystemWords);
    const count = (text: string) => text.split(" ").filter((word) => word !== "").length;
    return [
        ...(words.length > 1 ? [`${words.length} SystemWords are written: write at most one`] : []),
        ...words.flatMap((each) => [
            ...(each.name !== undefined && (count(each.name) > 5 || !holds(brief, each.name))
                ? [
                      `${each.id}: the name ${each.name} is not in the brief or is over five words; name only what is named`,
                  ]
                : []),
            ...(each.terms === undefined ? [] : each.terms).flatMap((term) => [
                ...(holds(brief, term.term) ? [] : [`${each.id}: the term ${term.term} is not used in the brief`]),
                ...(count(term.means) > 25 ? [`${each.id}: ${term.term} is defined in over twenty-five words`] : []),
                ...(holds(term.means, term.term) ? [`${each.id}: ${term.term} is defined by itself`] : []),
            ]),
        ]),
    ];
}

/**
 * Whether a text holds a digit.
 * @param text the text
 * @returns true when it does
 */
const hasDigit = (text: string) => [...text].some((char) => char >= "0" && char <= "9");

/**
 * The views gate: each view holds together (ids, arrows, groups, room), its title and caption state no count, and a
 * functional and a technical view are among them.
 * @param records the briefing's records
 * @returns one line per gap
 */
function viewGaps(records: readonly Finding[]): string[] {
    return setGaps(ofType(records, RecordIdPrefix.View, View), {
        where: "the system",
        textGaps: (where, text, kind) =>
            (kind === "caption" || kind === "title") && hasDigit(text)
                ? [`${where} states a count or a number; the page counts, so say it in words`]
                : [],
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
            const places = yield* briefedPlaces(root);
            const brief = yield* briefedText(root);
            const lineCounts = yield* (yield* ScopeFiles).lineCountsFor(citedFiles(cited));
            const facts = { ...(yield* readFactBase()), lineCounts };
            return {
                records: (records: readonly Finding[]) => [
                    ...briefingGaps(records, capabilities),
                    ...crossCuttingGaps(records, candidates),
                    ...screenGaps(records, screens),
                    ...surfaceNameGaps(records, places),
                    ...systemWordsGaps(records, brief),
                    ...viewGaps(records),
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
