import { join } from "node:path";
import { Console, Effect } from "effect";
import { Command } from "effect/cli";
import { runFolderArgument } from "../../core/arguments";
import { ImplementRequest } from "../../core/delivery-request";
import { readCodebase } from "../../core/codebase";
import { pathsOutsidePlan, plannedLayerNames } from "../../core/plan-containment";
import { changedFilesSince, headCommit, uncommittedFiles } from "../../core/git";
import { FeedbackItem } from "../../core/feedback";
import { readRecords, recordsOf } from "../../core/record-files";
import { runLayout, type RunLayout } from "../../core/run-layout";
import { needsAction, printOutcome } from "../../core/run-script";
import { StageOutputMissing } from "../../core/script-errors";
import {
    approverFeedback,
    checkCommand,
    handBackGap,
    markAccepted,
    prepareAgent,
    printPrepared,
    ranLastRound,
    readApplied,
    readPlanRequest,
    readStageInput,
    skillProblemsIn,
    writeFeedback,
} from "../../core/stage";
import { maxRounds } from "../../core/policy";
import { System } from "../../core/system";
import type { Render } from "../../core/render-run";
import { renderAfter, renderCommand } from "../../core/render-step";
import { fixAgent } from "../../core/dispatch-prompt";

/**
 * Reads the plan request, the build request and what was applied, to find the commit the repair starts from: the code
 * commit, or the commit the branch was at when the plan's code was written and not committed.
 * @param runFolder the run's folder
 * @returns the plan request, the build request, the layout, that commit and what was applied
 * Fails: StageOutputMissing, when the code was neither committed nor written.
 */
const fixRun = Effect.fnUntraced(function* (runFolder: string) {
    const plan = yield* readPlanRequest(fixAgent, runFolder);
    const layout = runLayout(plan.codebase, plan.workItemId);
    const build = yield* readStageInput(fixAgent, layout.buildRequest, ImplementRequest);
    const applied = yield* readApplied(fixAgent, layout.applied);
    const codeCommit = applied.codeCommit ?? applied.pending?.base;
    if (codeCommit === undefined) {
        return yield* new StageOutputMissing({ stage: fixAgent, path: layout.applied });
    }
    return { plan, build, layout, codeCommit, applied };
});

/**
 * Finds the files on the branch that differ from the approved plan, whitespace included, since indentation is code in some languages. A file differs when it is
 * planned and its content on the branch is not the planned content, or when it changed since the code commit (by the
 * git diff or uncommitted) and the plan does not name it, as a restored deletion does.
 * @param root the codebase root
 * @param layout the run's layout
 * @param codeCommit the code commit the plan made
 * @returns the differing paths, each once, sorted
 */
const filesDifferingFromPlan = Effect.fnUntraced(function* (root: string, layout: RunLayout, codeCommit: string) {
    const system = yield* System;
    const differing = new Set<string>();
    for (const folder of [layout.changes.files, layout.tests.files]) {
        for (const file of yield* system.listFiles(folder)) {
            const onBranch = (yield* system.exists(join(root, file))) ? yield* system.readText(join(root, file)) : "";
            if (onBranch !== (yield* system.readText(join(folder, file)))) {
                differing.add(file);
            }
        }
    }
    const planned = new Set([
        ...(yield* system.listFiles(layout.changes.files)),
        ...(yield* system.listFiles(layout.tests.files)),
    ]);
    const sinceCode = yield* changedFilesSince(root, codeCommit);
    for (const file of [...sinceCode, ...(yield* uncommittedFiles(root))]) {
        if (!planned.has(file)) {
            differing.add(file);
        }
    }
    return [...differing].sort();
});

/**
 * Checks that every file differing from the approved plan is in a layer the plan changes and has a Deviation, and that the work is committed.
 * @param runFolder the run's folder
 * @returns one sentence per gap
 */
const fixGaps = Effect.fnUntraced(function* (runFolder: string) {
    const { plan, layout, codeCommit } = yield* fixRun(runFolder);
    const explained = new Set(
        (yield* recordsOf(yield* readRecords(layout.fix.records), "Deviation")).map((deviation) => deviation.file),
    );
    const differing = yield* filesDifferingFromPlan(plan.codebase, layout, codeCommit);
    const codebase = yield* readCodebase(plan.codebase);
    const plannedLayers = yield* plannedLayerNames(codebase, layout);
    const outside = pathsOutsidePlan(codebase, plannedLayers, differing);
    const unexplained = differing.filter((file) => !explained.has(file) && !outside.includes(file));
    const uncommitted = yield* uncommittedFiles(plan.codebase);
    return [
        ...outside.map(
            (file) =>
                `${file} is outside the layers the approved plan changes; a Deviation cannot excuse it, so put it back or ask the approver to change the plan`,
        ),
        ...unexplained.map((file) => `${file} differs from the approved plan and has no Deviation`),
        ...(uncommitted.length > 0 ? [`these changes are not committed: ${uncommitted.join(", ")}`] : []),
    ];
});

/**
 * Lists the repair agent's blocker questions the approver has not answered; any other question is taken at its
 * recommendation. The approver answers in the implement request's
 * Custom Instructions, so once those are given the questions stand answered: they no longer stop the repair or lift its
 * round limit.
 * @param runFolder the run's folder
 * @returns the questions still open
 */
export const openFixQuestions = Effect.fn("Fix.openFixQuestions")(function* (runFolder: string) {
    const { build, layout } = yield* fixRun(runFolder);
    const asked = (yield* recordsOf(yield* readRecords(layout.fix.records), "Question")).filter(
        (question) => question.blocker === true,
    );
    return build.customInstructions.trim().length > 0 ? [] : asked;
});

/** What finish prints: accepted, or the gaps with a redo or a stop, and the agent's problems with shape-and-deliver. */
type FixOutcome = {
    readonly stage: typeof fixAgent;
    readonly outcome: "accepted" | "redo" | "stop";
    /** Why it stopped for the approver. */
    readonly reason?: string;
    /** The agent's questions, for the approver. */
    readonly questions?: readonly string[];
    readonly gaps?: readonly string[];
    readonly skillProblems: readonly string[];
};

/**
 * Prepares the repair agent's next round, with the failing checks or the review's defects as its feedback.
 * @param runFolder the run's folder
 * @returns the dispatch to send, or the accepted note
 * Writes: the round's files and the removal of the feedback file, when a new round opens.
 */
export const prepareFix = Effect.fn("Fix.prepareFix")(function* (runFolder: string) {
    const { plan, build, layout, codeCommit } = yield* fixRun(runFolder);
    return yield* prepareAgent({
        job: "code",
        files: {
            folder: layout.fix.folder,
            output: layout.fix.records,
            handBack: layout.fix.handBack,
            feedback: layout.fix.feedback,
        },
        agent: fixAgent,
        check: checkCommand(fixAgent, runFolder),
        args: {
            codebase: plan.codebase,
            workItemPath: layout.workItem,
            changesPath: layout.changes.records,
            testsPath: layout.tests.records,
            outputPath: layout.fix.records,
        },
        approver: approverFeedback(plan.customInstructions, build.customInstructions),
        work: [
            `your deviations, ${layout.fix.records}`,
            `your commits on the branch since ${codeCommit}`,
            `your hand-back, ${layout.fix.handBack}`,
        ],
    });
});

/**
 * Decides the repair: it stops on an open question, accepts when every difference from the plan is explained and
 * committed and the agent handed back, and otherwise saves the gaps as feedback for a redo, or stops once the rounds
 * are spent. A missing hand-back counts as a gap.
 * @param runFolder the run's folder
 * @returns the outcome
 * Writes: when accepted, the accepted mark, and it deletes the feedback, the after-code checks and the after-code manifest; otherwise the feedback file.
 */
export const finishFix = Effect.fn("Fix.finishFix")(function* (runFolder: string) {
    const { plan, layout, applied } = yield* fixRun(runFolder);
    const questions = yield* openFixQuestions(runFolder);
    const skillProblems = yield* skillProblemsIn(layout.fix.records);
    if (questions.length > 0) {
        return {
            stage: fixAgent,
            outcome: "stop",
            reason: "the repair needs a choice the plan does not make",
            questions: questions.map((question) => question.question),
            skillProblems,
        } satisfies FixOutcome;
    }
    const handBack = yield* handBackGap(layout.fix.handBack);
    const gaps = [...(yield* fixGaps(runFolder)), ...(handBack === undefined ? [] : [handBack])];
    if (gaps.length === 0) {
        const system = yield* System;
        yield* system.remove(layout.fix.feedback);
        yield* system.remove(layout.layerChecks("afterCode"));
        yield* system.remove(layout.manifest("afterCode"));
        if (applied.pending !== undefined) {
            const kept = Object.fromEntries(Object.entries(applied).filter(([key]) => key !== "pending"));
            const codeCommit = yield* headCommit(plan.codebase);
            yield* system.writeText(layout.applied, JSON.stringify({ ...kept, codeCommit }, null, 2));
        }
        yield* markAccepted(layout.fix.folder);
        return { stage: fixAgent, outcome: "accepted", skillProblems } satisfies FixOutcome;
    }
    const outcome = (yield* ranLastRound(layout.fix.folder)) ? "stop" : "redo";
    yield* writeFeedback(
        layout.fix.feedback,
        gaps.map((said) => new FeedbackItem({ from: "check", said })),
    );
    return { stage: fixAgent, outcome, gaps, skillProblems } satisfies FixOutcome;
});

/**
 * Builds the repair command, with its prepare, check, finish and render subcommands. Prepare and finish redraw the
 * run's pages afterwards.
 * @param render the run's render step
 * @returns the command
 */
export const fixCommand = (render: Render) =>
    Command.make("fix-failing-checks").pipe(
        Command.withDescription(
            "Repairs failing checks or review defects on the branch within the approved plan, recording every departure from it as a Deviation.",
        ),
        Command.withSubcommands([
            Command.make(
                "prepare",
                { runFolder: runFolderArgument },
                Effect.fn("Fix.prepare")(
                    function* (input) {
                        yield* printPrepared(yield* prepareFix(input.runFolder));
                    },
                    (step, input) => renderAfter(render, input.runFolder)(step),
                ),
            ).pipe(
                Command.withDescription(
                    "Prints the repair agent's dispatch, with the failures to repair as its instructions, or an accepted note when its round is already accepted.",
                ),
            ),
            Command.make(
                "check",
                { runFolder: runFolderArgument },
                Effect.fn("Fix.check")(function* (input) {
                    const gaps = yield* fixGaps(input.runFolder);
                    yield* Console.log(gaps.length === 0 ? "no gap" : gaps.join("\n"));
                    if (gaps.length > 0) {
                        yield* needsAction;
                    }
                }),
            ).pipe(
                Command.withDescription(
                    "Prints each file that differs from the approved plan without a Deviation, and any work not committed, or `no gap`. It checks structure only; the layers' checks are the proof. Exit 1 when there is a gap.",
                ),
            ),
            Command.make(
                "finish",
                { runFolder: runFolderArgument },
                Effect.fn("Fix.finish")(
                    function* (input) {
                        yield* printOutcome(yield* finishFix(input.runFolder));
                    },
                    (step, input) => renderAfter(render, input.runFolder)(step),
                ),
            ).pipe(
                Command.withDescription(
                    `Prints {"outcome": "accepted" | "redo" | "stop"} and the agent's problems with shape-and-deliver. An open Question stops the run for the approver, and so do ${maxRounds} rounds of gaps. An accepted repair deletes the after-code checks and manifest, so they run again.`,
                ),
            ),
            renderCommand(render),
        ]),
    );
