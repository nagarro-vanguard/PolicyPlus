import { join } from "node:path";
import { Effect, Schema } from "effect";
import { readCodebase } from "./codebase";
import { textAt } from "./git";
import { ImplementRequest, PlanRequest } from "./delivery-request";
import { LayerChecks, Manifest, WorkItem } from "./documents";
import { Feedback } from "./feedback";
import { readRecords, recordsOf } from "./record-files";
import { runLayout, type Phase, type RunLayout } from "./run-layout";
import { readApplied, readPlanRequest, readStageInput, roundsSpent, roundsUsed } from "./stage";
import { maxRounds } from "./policy";
import { System } from "./system";
import { readWorkItem } from "./work-item";

/**
 * A JSON document of the run, when it has been written.
 * @param path the file
 * @param schema its schema
 * @returns the document, or undefined before it is written
 */
const written = Effect.fnUntraced(function* <S extends Schema.Decoder<unknown>>(path: string, schema: S) {
    return (yield* (yield* System).exists(path)) ? yield* readStageInput("render", path, schema) : undefined;
});

/**
 * Where an agent's stage stands, from its rounds and its feedback: the rounds it used, whether the last was accepted,
 * and what its feedback says still waits; past the last round, the stage stopped.
 * @param folder the stage's folder
 * @param feedbackPath the stage's feedback file
 * @returns its rounds, whether accepted or stopped, and what waits
 */
const roundsOf = Effect.fnUntraced(function* (folder: string, feedbackPath: string) {
    const system = yield* System;
    const rounds = yield* roundsUsed(folder);
    const accepted = rounds > 0 && (yield* system.exists(join(folder, "rounds", String(rounds), "accepted")));
    const feedback = yield* written(feedbackPath, Feedback);
    const waiting = (feedback === undefined ? [] : feedback.items)
        .filter((item) => item.from !== "approver")
        .map((item) => item.said);
    return { rounds, maxRounds, accepted, stopped: waiting.length > 0 && roundsSpent(rounds), waiting };
});

export type Rounds = Effect.Success<ReturnType<typeof roundsOf>>;

/**
 * The run's work item as written, or else the work item's text checked for its kind, so a page can say what it lacks.
 * @param layout the run's layout
 * @param plan the plan request
 * @returns the work item, or the problem with it, or neither before the work item is given
 */
const workItemOf = Effect.fnUntraced(function* (layout: RunLayout, plan: PlanRequest) {
    const read = yield* written(layout.workItem, WorkItem);
    if (read !== undefined || !(yield* (yield* System).exists(layout.workItemMarkdown))) {
        return { workItem: read, problem: undefined };
    }
    const checked = yield* Effect.result(readWorkItem(layout.workItemMarkdown, plan.workItemId, plan.kind));
    return checked._tag === "Success"
        ? { workItem: checked.success, problem: undefined }
        : { workItem: undefined, problem: checked.failure.message };
});

/**
 * Every record of the run, by type, decoded by its schema, and each stage's records as written, for what a
 * stage's round wrote and the decisions it waits on.
 * @param layout the run's layout
 * @returns the records
 */
const recordsOfRun = Effect.fnUntraced(function* (layout: RunLayout) {
    const byStage = {
        orient: yield* readRecords(layout.orient.records),
        trace: yield* readRecords(layout.trace.records),
        changes: yield* readRecords(layout.changes.records),
        tests: yield* readRecords(layout.tests.records),
        fix: yield* readRecords(layout.fix.records),
        planReview: yield* readRecords(layout.review("plan").records),
        changeReview: yield* readRecords(layout.review("change").records),
    };
    const plan = [...byStage.orient, ...byStage.trace, ...byStage.changes, ...byStage.tests];
    const { fix, planReview, changeReview } = byStage;
    return {
        byStage,
        stageQuestions: {
            orient: yield* recordsOf(byStage.orient, "Question"),
            trace: yield* recordsOf(byStage.trace, "Question"),
            changes: yield* recordsOf(byStage.changes, "Question"),
            tests: yield* recordsOf(byStage.tests, "Question"),
        },
        entities: yield* recordsOf(plan, "EntityTouched"),
        invariants: yield* recordsOf(plan, "InvariantAtRisk"),
        journeys: yield* recordsOf(plan, "JourneyAffected"),
        seams: yield* recordsOf(plan, "SeamCrossed"),
        steps: (yield* recordsOf(plan, "PathStep")).toSorted((a, b) => a.order - b.order),
        questions: yield* recordsOf(plan, "Question"),
        decisions: yield* recordsOf(byStage.changes, "DesignDecision"),
        views: yield* recordsOf(byStage.changes, "PlanView"),
        changes: yield* recordsOf(plan, "ChangedFile"),
        tests: yield* recordsOf(plan, "AcceptanceTest"),
        thresholds: yield* recordsOf(plan, "LoadThreshold"),
        supportFiles: yield* recordsOf(plan, "TestSupportFile"),
        deviations: yield* recordsOf(fix, "Deviation"),
        fixQuestions: yield* recordsOf(fix, "Question"),
        planFindings: yield* recordsOf(planReview, "Finding"),
        changeFindings: yield* recordsOf(changeReview, "Finding"),
    };
});

/**
 * Each proposed file's text as the plan proposes it and as it was before the plan's first commit (from `git show`),
 * or in the working tree while nothing is applied, for the diffs; a deleted file has no text after, and a new file
 * none before.
 * @param root the codebase root
 * @param base the commit the branch was at before the plan's first commit, once the plan is applied
 * @param folders the folders of proposed files, laid out like the codebase
 * @param deletes the files the plan deletes
 * @returns each path's text before and after
 * Writes: runs `git show` for each proposed or deleted file once the plan is applied.
 */
const filesOf = Effect.fnUntraced(function* (
    root: string,
    base: string | undefined,
    folders: readonly string[],
    deletes: readonly string[],
) {
    const system = yield* System;
    const before = (path: string) =>
        base === undefined
            ? system
                  .exists(join(root, path))
                  .pipe(Effect.flatMap((exists) => (exists ? system.readText(join(root, path)) : Effect.succeed(""))))
            : textAt(root, base, path).pipe(Effect.map((text) => text ?? ""));
    const files = new Map<string, { readonly before: string; readonly after: string }>();
    for (const folder of folders) {
        for (const path of yield* system.listFiles(folder)) {
            files.set(path, { before: yield* before(path), after: yield* system.readText(join(folder, path)) });
        }
    }
    for (const path of deletes) {
        files.set(path, { before: yield* before(path), after: "" });
    }
    return files;
});

/**
 * Read everything a render draws from a run folder, once: its requests, the codebase and work item, every record
 * decoded, each stage's rounds, what the build applied, each run of the checks with its manifest, and the proposed
 * files with their texts. It changes no file.
 * @param runFolder the run folder
 * @returns the run
 * Writes: runs `git show` for the proposed files once the plan is applied.
 * Fails: StageOutputMissing when the plan request is not there, RequestInvalid when a document of the run is not in
 * the shape it is read in.
 */
export const readRun = Effect.fn("RunContext.readRun")(function* (runFolder: string) {
    const plan = yield* readPlanRequest("render", runFolder);
    const layout = runLayout(plan.codebase, plan.workItemId);
    const records = yield* recordsOfRun(layout);
    const applied = yield* readApplied("render", layout.applied);
    const checksOf = (phase: Phase) => written(layout.layerChecks(phase), LayerChecks);
    const manifestOf = (phase: Phase) => written(layout.manifest(phase), Manifest);
    const deletes = records.changes.filter((change) => change.action === "delete").map((change) => change.path);
    return {
        runFolder,
        layout,
        plan,
        build: yield* written(layout.buildRequest, ImplementRequest),
        codebase: yield* readCodebase(plan.codebase),
        ...(yield* workItemOf(layout, plan)),
        records,
        rounds: {
            orient: yield* roundsOf(layout.orient.folder, layout.orient.feedback),
            trace: yield* roundsOf(layout.trace.folder, layout.trace.feedback),
            changes: yield* roundsOf(layout.changes.folder, layout.changes.feedback),
            tests: yield* roundsOf(layout.tests.folder, layout.tests.feedback),
            fix: yield* roundsOf(layout.fix.folder, layout.fix.feedback),
        },
        reviewed: {
            plan: yield* (yield* System).exists(layout.review("plan").records),
            change: yield* (yield* System).exists(layout.review("change").records),
        },
        planApproved: yield* (yield* System).exists(layout.implementRequest),
        applied,
        checks: { afterTests: yield* checksOf("afterTests"), afterCode: yield* checksOf("afterCode") },
        manifests: { afterTests: yield* manifestOf("afterTests"), afterCode: yield* manifestOf("afterCode") },
        files: yield* filesOf(plan.codebase, applied.base, [layout.changes.files, layout.tests.files], deletes),
        testFiles: yield* (yield* System).listFiles(layout.tests.files),
    };
});

export type Run = Effect.Success<ReturnType<typeof readRun>>;
