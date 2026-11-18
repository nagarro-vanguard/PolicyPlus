import { Effect } from "effect";
import { idPrefix, isRecordIdOf } from "./records";
import { readRecords, recordsOf } from "./record-files";
import { ownerOf, planOrder } from "./review-routing";
import type { Review } from "./review-brief";
import type { RunLayout } from "./run-layout";
import { LayerChecks } from "./documents";
import { StageNotAccepted } from "./script-errors";
import { readStageInput, requireAccepted, roundsUsed } from "./stage";
import { System } from "./system";
import { fixAgent, reviewAgent } from "./dispatch-prompt";

/**
 * Checks what the review's findings are about. A plan finding must be about records of the plan, the orientation's
 * included; a change finding may also be about a file, but a record id it names must exist.
 * @param layout the run's layout
 * @param review which review
 * @returns one sentence per finding that names no record of the run
 */
export const reviewGaps = Effect.fn("ReviewCheck.reviewGaps")(function* (layout: RunLayout, review: Review) {
    const findings = yield* recordsOf(yield* readRecords(layout.review(review).records), "Finding");
    const planRecords = [
        ...(yield* readRecords(layout.orient.records)),
        ...(yield* readRecords(layout.trace.records)),
        ...(yield* readRecords(layout.changes.records)),
        ...(yield* readRecords(layout.tests.records)),
    ];
    const deviations = review === "change" ? yield* readRecords(layout.fix.records) : [];
    const known = new Set([...planRecords, ...deviations].map((record) => record.id));
    const isRecordId = (about: string) => ownerOf(about) !== undefined || isRecordIdOf(idPrefix.Deviation, about);
    return findings.flatMap((finding) =>
        finding.about
            .filter((about) => (review === "plan" || isRecordId(about)) && !known.has(about))
            .map((about) => `${finding.id} is about ${about}, which names no record of this run`),
    );
});

/**
 * Lists what no finding names yet: the plan's records, or the change's deviations and planned files. It is for the
 * reviewer's judgement, not a list to clear.
 * @param layout the run's layout
 * @param review which review
 * @returns one line per kind, with the ids or paths no finding names
 */
export const reviewView = Effect.fn("ReviewCheck.reviewView")(function* (layout: RunLayout, review: Review) {
    const named = new Set(
        (yield* recordsOf(yield* readRecords(layout.review(review).records), "Finding")).flatMap(
            (finding) => finding.about,
        ),
    );
    const plan = [
        ...(yield* readRecords(layout.trace.records)),
        ...(yield* readRecords(layout.changes.records)),
        ...(yield* readRecords(layout.tests.records)),
    ];
    const subjects =
        review === "plan"
            ? plan.map((record) => ({ kind: record.type, name: record.id }))
            : [
                  ...(yield* readRecords(layout.fix.records))
                      .filter((record) => record.type === "Deviation")
                      .map((record) => ({ kind: record.type, name: record.id })),
                  ...(yield* recordsOf(plan, "ChangedFile")).map((record) => ({ kind: "file", name: record.path })),
                  ...(yield* recordsOf(plan, "AcceptanceTest")).flatMap((record) =>
                      record.file === undefined ? [] : [{ kind: "file", name: record.file }],
                  ),
              ];
    const unnamed = subjects.filter((subject) => !named.has(subject.name));
    return [...new Set(unnamed.map((subject) => subject.kind))].map(
        (kind) =>
            `${kind} no finding names: ${[...new Set(unnamed.filter((subject) => subject.kind === kind).map((subject) => subject.name))].join(", ")}`,
    );
});

/**
 * Refuses a review until what it judges stands accepted: every plan stage for the plan review; for the change review,
 * passed checks after the code commit and, when the repair ran, the accepted repair.
 * @param layout the run's layout
 * @param review which review
 * @returns nothing when the review may run
 * Fails: StageNotAccepted.
 */
export const requireReviewInputs = Effect.fn("ReviewCheck.requireReviewInputs")(function* (
    layout: RunLayout,
    review: Review,
) {
    if (review === "plan") {
        return yield* requireAccepted(
            "the plan review",
            planOrder.map((stage) => ({
                name: stage,
                folder: layout[stage].folder,
                feedback: layout[stage].feedback,
            })),
        );
    }
    const path = layout.layerChecks("afterCode");
    const passed =
        (yield* (yield* System).exists(path)) &&
        (yield* readStageInput(reviewAgent, path, LayerChecks)).outcome === "passed";
    if (!passed) {
        return yield* new StageNotAccepted({ stage: "the change review", needs: "run-layer-checks afterCode" });
    }
    if ((yield* roundsUsed(layout.fix.folder)) > 0) {
        yield* requireAccepted("the change review", [
            { name: fixAgent, folder: layout.fix.folder, feedback: layout.fix.feedback },
        ]);
    }
});
