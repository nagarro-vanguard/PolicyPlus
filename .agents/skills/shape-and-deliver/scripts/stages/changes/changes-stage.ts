import { Effect } from "effect";
import { layerOfPath, verifyCommands } from "../../core/codebase";
import { readRecords, recordsOf } from "../../core/record-files";
import { System } from "../../core/system";
import { citationGaps, uncitedInvariants } from "../../core/orient-gates";
import { decisionGaps, viewGaps } from "../../core/decision-gates";
import { baseCheckGaps, changedFilesIn, pathStepsIn } from "../../core/plan-gates";
import { sharedArguments, orientationArguments, type ProducerStage, type StageContext } from "../../core/record-stage";

/**
 * Lists what the code changes do not yet account for: steps that change or are new with no file serving them,
 * invariants no change keeps, and each layer the files touch with the Verify commands that will run on it.
 * @param context what the stage works from
 * @returns one line per step, per invariant and per layer
 */
const changesView = Effect.fnUntraced(function* (context: StageContext) {
    const steps = yield* pathStepsIn(context.layout.trace.records);
    const changes = yield* changedFilesIn(context.layout.changes.records);
    const served = new Set(changes.flatMap((change) => change.steps));
    const unserved = steps
        .filter((step) => step.status !== "exists" && !served.has(step.id))
        .map((step) => `${step.id} (${step.ac}, ${step.status}: ${step.name}) has no file serving it`);
    const layers = [...new Set(changes.map((change) => layerOfPath(context.codebase, change.path)))].flatMap((layer) =>
        layer === undefined ? [] : [layer],
    );
    const touched = yield* Effect.forEach(layers, (layer) =>
        Effect.gen(function* () {
            const verify = yield* verifyCommands(context.codebase, layer);
            const generate = changes
                .filter(
                    (change) => change.action === "generate" && layerOfPath(context.codebase, change.path) === layer,
                )
                .flatMap((change) => (change.command === undefined ? [] : [change.command]));
            const generators = generate.length > 0 ? `; the plan generates: ${generate.join("; ")}` : "";
            return `${layer.name} changes; its Verify runs: ${verify.join("; ") || "nothing"}${generators}`;
        }),
    );
    const unkept = yield* uncitedInvariants(context.layout.orient.records, changes, "keeps", "change keeping it");
    return [...unserved, ...unkept, ...touched];
});

export const changesStage: ProducerStage = {
    stage: "changes",
    agent: "propose-code-changes",
    files: (layout) => layout.changes,
    description:
        "The changes stage. Prepare prints the propose-code-changes dispatch; check runs the base check (every file in a code layer, add, modify and delete agree with the branch, every proposed file recorded), the decision, diagram, citation and design gates, then lists what the changes do not yet account for; finish accepts the output or returns the gaps as feedback.",
    arguments: (context) =>
        Effect.succeed({
            ...sharedArguments(context),
            tracePath: context.layout.trace.records,
            ...orientationArguments(context),
            filesFolder: context.layout.changes.files,
            outputPath: context.layout.changes.records,
        }),
    gaps: (context) =>
        Effect.gen(function* () {
            const steps = yield* pathStepsIn(context.layout.trace.records);
            const changes = yield* changedFilesIn(context.layout.changes.records);
            const written = yield* readRecords(context.layout.changes.records);
            const decisions = yield* recordsOf(written, "DesignDecision");
            return [
                ...(yield* baseCheckGaps(context.codebase, changes, {
                    filesFolder: context.layout.changes.files,
                    stepIds: new Set(steps.map((step) => step.id)),
                    proposedFiles: yield* (yield* System).listFiles(context.layout.changes.files),
                })),
                ...decisionGaps(context.codebase, context.workItem, {
                    changes,
                    decisions,
                    stepIds: new Set(steps.map((step) => step.id)),
                }),
                ...viewGaps(context.workItem, {
                    views: yield* recordsOf(written, "PlanView"),
                    decisions,
                    stepIds: new Set(steps.map((step) => step.id)),
                }),
                ...(yield* citationGaps(context.layout.orient.records, changes, "keeps")),
            ];
        }),
    view: changesView,
};
