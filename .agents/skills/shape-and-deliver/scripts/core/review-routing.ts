import { Effect } from "effect";
import { FeedbackItem } from "./feedback";
import { idPrefix, isRecordIdOf } from "./records";
import { producerNames, type Producer, type RunLayout } from "./run-layout";
import { readRecords, type RecordOf } from "./record-files";
import { planReviewRounds } from "./policy";
import { ranLastRound, roundsUsed, writeFeedback } from "./stage";
import { System } from "./system";

const owners: Readonly<Record<Producer, readonly string[]>> = {
    orient: [idPrefix.EntityTouched, idPrefix.InvariantAtRisk, idPrefix.JourneyAffected, idPrefix.SeamCrossed],
    trace: [idPrefix.PathStep, idPrefix.Question],
    changes: [idPrefix.ChangedFile, idPrefix.DesignDecision, idPrefix.PlanView],
    tests: [idPrefix.AcceptanceTest, idPrefix.LoadThreshold, idPrefix.TestSupportFile],
};

export type Owner = Producer;

/** The stages whose output each plan stage's agent reads: the trace reads the orientation, the code changes read the orientation and the trace, the tests read all three. */
export const reads: Readonly<Record<Owner, readonly Owner[]>> = {
    orient: [],
    trace: ["orient"],
    changes: ["orient", "trace"],
    tests: ["orient", "trace", "changes"],
};

/** How a stage's output is named in a keep-in-line note. */
const stageNoun: Readonly<Record<Owner, string>> = {
    orient: "orientation",
    trace: "trace",
    changes: "proposed code",
    tests: "proposed tests",
};

/** The plan's stages in the order they run. */
export const planOrder = producerNames;

/**
 * Finds the stage that wrote a record from its id's prefix. Ids of one kind may repeat across stage files, and every
 * stage may write a `Question`, so this is only the fallback for an id found in no stage's file; a `Question` falls
 * back to the trace. Ids that are no plan record (a problem with the skill, say) belong to no stage, wherever written.
 * @param id a record id
 * @returns the owning stage, or undefined when the id belongs to no plan stage
 */
export const ownerOf = (id: string): Owner | undefined =>
    planOrder.find((owner) => owners[owner].some((prefix) => isRecordIdOf(prefix, id)));

/**
 * Finds the stages that wrote a record: those whose own records file holds the id, since a `Question` may be written
 * by any stage and ids may repeat across the files. An id found in no file falls back to its prefix's stage, and an id
 * of a kind no plan stage owns has no owner.
 * @param layout the run's layout
 * @param id a record id
 * @returns the owning stages in plan order; empty when the id belongs to no plan stage
 */
const ownersOfRecord = Effect.fn("ReviewRouting.ownersOfRecord")(function* (layout: RunLayout, id: string) {
    const fallback = ownerOf(id);
    const holding: Owner[] = [];
    for (const stage of fallback === undefined ? [] : planOrder) {
        if ((yield* readRecords(layout[stage].records)).some((record) => record.id === id)) {
            holding.push(stage);
        }
    }
    if (holding.length === 0 && fallback !== undefined) {
        holding.push(fallback);
    }
    return holding;
});

/**
 * Finds the stages that own what any of the findings is about.
 * @param layout the run's layout
 * @param findings the findings
 * @returns the owning stages, each once
 */
const ownersNamedBy = Effect.fn("ReviewRouting.ownersNamedBy")(function* (
    layout: RunLayout,
    findings: readonly RecordOf<"Finding">[],
) {
    const named = new Set<Owner>();
    for (const about of findings.flatMap((finding) => finding.about)) {
        for (const owner of yield* ownersOfRecord(layout, about)) {
            named.add(owner);
        }
    }
    return named;
});

/**
 * Whether any of the stages has used its last round.
 * @param layout the run's layout
 * @param stages the stages, or the repair
 * @returns true when one has no round left
 */
export const outOfRounds = Effect.fn("ReviewRouting.outOfRounds")(function* (
    layout: RunLayout,
    stages: Iterable<Owner | "fix">,
) {
    const spent = yield* Effect.forEach([...stages], (stage) => ranLastRound(layout[stage].folder));
    return spent.some((last) => last);
});

/**
 * Whether a plan review has no round left to send its defects back in: it has used its own rounds, or a stage that owns
 * one of them has used its last.
 * @param layout the run's layout
 * @param defects the plan review's defects
 * @returns true when the defects stay open for the approver
 */
export const planReviewSpent = Effect.fn("ReviewRouting.planReviewSpent")(function* (
    layout: RunLayout,
    defects: readonly RecordOf<"Finding">[],
) {
    return (
        (yield* roundsUsed(layout.review("plan").folder)) >= planReviewRounds ||
        (yield* outOfRounds(layout, yield* ownersNamedBy(layout, defects)))
    );
});

/**
 * Words a defect for the operator and the approver: its id, what is wrong and the fix asked for.
 * @param finding the defect
 * @returns the sentence
 */
export const defectLine = (finding: RecordOf<"Finding">) => `${finding.id}: ${finding.says} Fix: ${finding.fix}`;

/**
 * Turns a defect finding into the feedback item its owner reads: what is wrong, the fix and what it is about.
 * @param finding the defect
 * @returns the feedback item
 */
export const reviewItem = (finding: RecordOf<"Finding">) =>
    new FeedbackItem({
        from: "review",
        said: `${finding.says} Fix: ${finding.fix}`,
        about: finding.about,
    });

/**
 * Words why defects cannot be sent back: they are about records no plan stage owns.
 * @param defects the defects
 * @returns a sentence naming each defect and what it is about
 */
export const unownedReason = (defects: readonly RecordOf<"Finding">[]) =>
    `no plan stage can fix ${defects.map((finding) => `${finding.id} (about ${finding.about.join(", ")})`).join("; ")}`;

/**
 * Saves each defect as review feedback for the stage that owns what it is about. A stage that reads it is told to
 * keep in line only once the sent-back stage is accepted again, and only for the records that changed.
 * @param layout the run's layout
 * @param defects the defects
 * @returns the stages that must run again, in order; empty when no defect has an owner
 * Writes: the feedback file of each stage to run again.
 */
export const routePlanDefects = Effect.fn("ReviewRouting.routePlanDefects")(function* (
    layout: RunLayout,
    defects: readonly RecordOf<"Finding">[],
) {
    const byOwner = new Map<Owner, FeedbackItem[]>();
    for (const finding of defects) {
        const item = reviewItem(finding);
        for (const owner of yield* ownersNamedBy(layout, [finding])) {
            byOwner.set(owner, [...(byOwner.get(owner) ?? []), item]);
        }
    }
    const redo = planOrder.filter((owner) => byOwner.has(owner));
    for (const owner of redo) {
        yield* writeFeedback(layout[owner].feedback, byOwner.get(owner) ?? []);
    }
    return redo;
});

/**
 * Tells the stages that read a reworked stage to keep in line with what changed, and only the ones that cite a record
 * that changed or went. A stage citing none stands accepted as it is.
 * @param layout the run's layout
 * @param stage the stage that has just been accepted again
 * @param earlier the stage's records as they were before the rework
 * @returns the stages that were told
 * Writes: the feedback file of each stage that cites a changed record.
 */
export const keepCitersInLine = Effect.fn("ReviewRouting.keepCitersInLine")(function* (
    layout: RunLayout,
    stage: Owner,
    earlier: string,
) {
    const system = yield* System;
    if (!(yield* system.exists(earlier))) {
        return [];
    }
    const before = new Map((yield* readRecords(earlier)).map((record) => [record.id, JSON.stringify(record)]));
    const after = new Map(
        (yield* readRecords(layout[stage].records)).map((record) => [record.id, JSON.stringify(record)]),
    );
    const changed = [...before].filter(([id, text]) => after.get(id) !== text).map(([id]) => id);
    const told: Owner[] = [];
    for (const reader of planOrder.filter((name) => reads[name].includes(stage))) {
        const records = yield* readRecords(layout[reader].records);
        const named = changed.filter((id) =>
            records.some((record) =>
                Object.entries(record).some(
                    ([key, value]) =>
                        key !== "id" && key !== "type" && JSON.stringify(value).includes(JSON.stringify(id)),
                ),
            ),
        );
        const [first, ...rest] = named;
        if (first !== undefined) {
            yield* writeFeedback(layout[reader].feedback, [
                new FeedbackItem({
                    from: "check",
                    said: `The ${stageNoun[stage]} changed; keep your output in line with it.`,
                    about: [first, ...rest],
                }),
            ]);
            told.push(reader);
        }
    }
    return told;
});
