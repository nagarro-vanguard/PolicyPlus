import { Effect } from "effect";
import { applyCode, applyTests } from "../core/apply";
import type { Stop } from "./stop-message";
import { dispatchOf, fixAgent } from "../core/dispatch-prompt";
import type { PlanRequest } from "../core/delivery-request";
import { LayerChecks } from "../core/documents";
import { runPhase } from "../core/layer-checks";
import { prepareProducer } from "../core/record-stage";
import { prepareReview } from "../core/review-stage";
import type { RunLayout } from "../core/run-layout";
import type { Dispatched } from "../core/run-actions";
import {
    readApplied,
    readStageInput,
    roundsSpent,
    roundsUsed,
    standsAccepted,
    writeFeedback,
    type Prepared,
} from "../core/stage";
import { maxRounds } from "../core/policy";
import type { Services } from "../core/services";
import { System } from "../core/system";
import { recordWorkItem } from "../core/work-item";
import { openFixQuestions, prepareFix } from "./code/fix";
import { FeedbackItem } from "../core/feedback";
import { readRecords, recordsOf } from "../core/record-files";
import { changesStage } from "./changes/changes-stage";
import { testsStage } from "./tests/tests-stage";
import { orientStage } from "./orient/orient-stage";
import { traceStage } from "./trace/trace-stage";
import { isScriptError, type ScriptError } from "../core/script-errors";
import { currentBranch } from "../core/git";
import { retagAfter, type Tag } from "../core/workflows";

/** What ends a walk: an agent to run, the mode's end, or a stop; a stage that stands lets the walk go on. */
export type Halt =
    | { readonly next: "dispatch"; readonly dispatch: Dispatched }
    | {
          readonly next: "done";
          readonly said: readonly string[];
          readonly implementRequest?: string;
          /** How many open questions the plan page holds, each taken at its recommendation on approval. */
          readonly decisions?: number;
          readonly retag?: {
              readonly remove: readonly Tag[];
              readonly add: readonly Tag[];
              readonly comment: string;
          };
      }
    | ({ readonly next: "stop" } & Stop);

/** One walk of a run: its folder, layout and plan request. */
export type Walk = {
    readonly runFolder: string;
    readonly layout: RunLayout;
    readonly request: PlanRequest;
};

/** What a step of a walk comes to: how it ends, and the lines the operator must hear from it, in the order told. */
export type Told<H> = { readonly halt: H; readonly told: readonly string[] };

/** What one stage comes to: a halt, or undefined when the walk goes on. */
type StageResult = Told<Halt | undefined>;

/**
 * Run a step, turning a refusal in words into a stop that carries its message, so a refusal is never retried. Any
 * other failure still fails.
 * @param told the lines told so far, kept when the step refuses
 * @param step the step
 * @returns the step's result, or the stop with the lines told so far
 */
export const refusing = <H extends Halt | undefined, E>(
    told: readonly string[],
    step: Effect.Effect<Told<H>, E, Services>,
) =>
    step.pipe(
        Effect.catch((error) =>
            isScriptError(error)
                ? Effect.succeed<Told<H | Halt>>({ halt: { next: "stop", kind: "other", said: error.message }, told })
                : Effect.fail(error),
        ),
    );

/**
 * Run the stages in order, each told what was said before it, until one halts.
 * @param stages the stages, each a step that gives its result once run
 * @param told the lines told so far
 * @returns the first halt and every line told up to it, or undefined and the lines when every stage stands
 */
const walkStages = (
    stages: readonly Effect.Effect<StageResult, ScriptError, Services>[],
    told: readonly string[],
): Effect.Effect<StageResult, ScriptError, Services> =>
    Effect.gen(function* () {
        const [first, ...rest] = stages;
        if (first === undefined) {
            return { halt: undefined, told };
        }
        const step = yield* refusing(told, first);
        const all = [...told, ...step.told];
        return step.halt === undefined ? yield* walkStages(rest, all) : { halt: step.halt, told: all };
    });

/** The plan's producing stages, in the order they run. */
export const producers = [orientStage, traceStage, changesStage, testsStage] as const;

/**
 * Walk a stage that has an agent. A stage that stands accepted lets the walk go on; one whose feedback waits with its
 * rounds used stops the run, unless it may run past its rounds; otherwise its next round is prepared and dispatched.
 * @param stage the stage: its name, folder and feedback file, and whether it may run past its rounds
 * @param stage.name the stage, as the operator reads it
 * @param stage.folder the stage's folder
 * @param stage.feedback the file its checks or review leave feedback in
 * @param stage.pastRounds true when an answered question earns it one more round
 * @param prepare its prepare step
 * @returns the dispatch or the stop, or no halt when it stands; it tells the operator nothing
 */
const agentStage = Effect.fnUntraced(function* (
    stage: { readonly name: string; readonly folder: string; readonly feedback: string; readonly pastRounds: boolean },
    prepare: Effect.Effect<Prepared, ScriptError, Services>,
): Effect.fn.Return<StageResult, ScriptError, Services> {
    if (yield* standsAccepted(stage)) {
        return { halt: undefined, told: [] };
    }
    const waiting = yield* (yield* System).exists(stage.feedback);
    if (waiting && !stage.pastRounds && roundsSpent(yield* roundsUsed(stage.folder))) {
        return {
            halt: {
                next: "stop",
                kind: "rounds",
                said: `${stage.name} has used its ${maxRounds} rounds and its output still has gaps: its page shows them`,
            },
            told: [],
        };
    }
    const prepared = yield* prepare;
    return { halt: "outcome" in prepared ? undefined : { next: "dispatch", dispatch: prepared }, told: [] };
});

/**
 * Walk the work item: when the request names a URL and no text is there yet, dispatch the agent that fetches it;
 * otherwise check and number it. The operator is told its criteria when they are new or changed.
 * @param walk the run
 * @returns the fetching agent's dispatch, or no halt once the work item is read, with the criteria told when new
 * Writes: work-item.json, when the work item is read.
 */
const workItemStage = Effect.fnUntraced(function* (walk: Walk): Effect.fn.Return<StageResult, ScriptError, Services> {
    const system = yield* System;
    const { layout, request } = walk;
    if (request.workItemUrl !== undefined && !(yield* system.exists(layout.workItemMarkdown))) {
        const focus = request.customInstructions.trim();
        const call = {
            workItemUrl: request.workItemUrl,
            outputPath: layout.workItemMarkdown,
            customInstructions: focus.length > 0 ? focus : undefined,
        };
        return {
            halt: {
                next: "dispatch",
                dispatch: dispatchOf("work-item", { agent: "fetch-work-item", arguments: call }),
            },
            told: [],
        };
    }
    const before = (yield* system.exists(layout.workItem)) ? yield* system.readText(layout.workItem) : "";
    const workItem = yield* recordWorkItem(walk.runFolder);
    if ((yield* system.readText(layout.workItem)) !== before) {
        return {
            halt: undefined,
            told: [
                `Work item: ${workItem.title} (${workItem.kind})`,
                ...workItem.criteria.map((criterion) => `${criterion.ac}: ${criterion.text}`),
            ],
        };
    }
    return { halt: undefined, told: [] };
});

/**
 * Walk plan mode: the work item, each producing stage, then the plan review, until one halts. When every one stands,
 * the plan is done and ready for the approver.
 * @param walk the run
 * @param told the lines told so far
 * @returns what ends this walk (a dispatch, a stop or done), with every line told
 * Writes: what each stage prepares for its agent.
 */
export const planWalk = Effect.fn("RunWalk.planWalk")(function* (
    walk: Walk,
    told: readonly string[],
): Effect.fn.Return<Told<Halt>, ScriptError, Services> {
    const { layout, runFolder, request } = walk;
    const walked = yield* walkStages(
        [
            workItemStage(walk),
            ...producers.map((stage) => {
                const files = stage.files(layout);
                const named = { name: stage.agent, folder: files.folder, feedback: files.feedback, pastRounds: false };
                return agentStage(named, prepareProducer(stage, runFolder));
            }),
            agentStage(
                { name: "the plan review", ...layout.review("plan"), pastRounds: true },
                prepareReview(runFolder, "plan"),
            ),
        ],
        told,
    );
    if (walked.halt !== undefined) {
        return { halt: walked.halt, told: walked.told };
    }
    const asked = new Set<string>();
    for (const stage of [layout.orient, layout.trace, layout.changes, layout.tests]) {
        for (const question of yield* recordsOf(yield* readRecords(stage.records), "Question")) {
            asked.add(question.id);
        }
    }
    return {
        halt: {
            next: "done",
            decisions: asked.size,
            said: [
                `The plan is ready for the approver: ${layout.planPage}`,
                `Once the approver agrees, run /shape-and-deliver ${request.workItemUrl ?? "<story>"} --approve; their answers otherwise go in as --instructions, one line per stage as "<stage>: <what to change>", and only those stages run again.`,
            ],
            implementRequest: layout.implementRequest,
        },
        told: walked.told,
    };
});

/**
 * Walk the tests-first stage: commit the plan's tests alone, then run the layers' checks on the code as it was forked
 * to see the tests are proved. A stage that stands, or a build already past it, is not run again.
 * @param walk the run
 * @returns a stop, or no halt once the tests are proved, with the lines told
 * Writes: the plan's test files and a git commit of them alone, the checks' results under tests-first, and applied.json.
 */
const testsFirstStage = Effect.fnUntraced(function* (walk: Walk): Effect.fn.Return<StageResult, ScriptError, Services> {
    const tests = yield* applyTests(walk.runFolder);
    const told = tests.committed ? [tests.said] : [];
    return yield* refusing(
        told,
        Effect.gen(function* () {
            const applied = yield* readApplied("next", walk.layout.applied);
            if (applied.testsProved === true || applied.codeCommit !== undefined) {
                return { halt: undefined, told };
            }
            const checks = yield* runPhase(walk.runFolder, "afterTests");
            if (checks.outcome !== "passed") {
                return {
                    halt: {
                        next: "stop" as const,
                        kind: checks.kind ?? ("other" as const),
                        said: checks.reason === undefined ? "the tests-first checks stopped" : checks.reason,
                    },
                    told,
                };
            }
            return {
                halt: undefined,
                told: [...told, "The checks on the code as it was forked hold what the plan's tests expect of it."],
            };
        }),
    );
});

/**
 * Walk the code stage: commit the plan's code, then dispatch the repair while its feedback waits (failing checks or
 * the change review's defects); otherwise run the checks after the code commit until they pass.
 * @param walk the run
 * @returns the fix agent's dispatch or a stop, or no halt once every check passes, with the lines told
 * Writes: the plan's files, deletions and generator output with a git commit of them, the checks' results under code, and applied.json.
 */
const codeStage = Effect.fnUntraced(function* (walk: Walk): Effect.fn.Return<StageResult, ScriptError, Services> {
    const { layout, runFolder } = walk;
    const code = yield* applyCode(runFolder);
    if (code.outcome === "stop") {
        return { halt: { next: "stop", kind: code.kind ?? "other", said: code.said }, told: [] };
    }
    const told = code.committed ? [code.said] : [];
    return yield* refusing(
        told,
        Effect.gen(function* () {
            const system = yield* System;
            const fix = Effect.gen(function* () {
                const asked = (yield* openFixQuestions(runFolder)).length > 0;
                const named = { name: fixAgent, folder: layout.fix.folder, feedback: layout.fix.feedback };
                return yield* agentStage({ ...named, pastRounds: asked }, prepareFix(runFolder));
            });
            const fixed = (lines: readonly string[]) =>
                refusing(
                    lines,
                    fix.pipe(Effect.map((step): StageResult => ({ halt: step.halt, told: [...lines, ...step.told] }))),
                );
            if (code.outcome === "pending" && !(yield* system.exists(layout.fix.feedback))) {
                const pending = (yield* readApplied("next", layout.applied)).pending;
                const files = pending === undefined ? "" : `; the files are ${pending.files.join(", ")}`;
                yield* writeFeedback(layout.fix.feedback, [
                    new FeedbackItem({ from: "check", said: `${code.said}${files}` }),
                ]);
            }
            if (yield* system.exists(layout.fix.feedback)) {
                return yield* fixed(told);
            }
            const path = layout.layerChecks("afterCode");
            const kept = (yield* system.exists(path)) ? yield* readStageInput("next", path, LayerChecks) : undefined;
            if (kept !== undefined && kept.outcome === "passed") {
                return { halt: undefined, told };
            }
            const checks = yield* runPhase(runFolder, "afterCode");
            if (checks.outcome === "stop") {
                return {
                    halt: {
                        next: "stop" as const,
                        kind: checks.kind ?? ("other" as const),
                        said: checks.reason === undefined ? "the checks after the code stopped" : checks.reason,
                    },
                    told,
                };
            }
            if (checks.outcome === "fix") {
                const gaps = checks.gaps === undefined ? [] : checks.gaps;
                return yield* fixed([
                    ...told,
                    `Checks fail after the code commit, so the fix agent repairs them: ${gaps.join("; ")}`,
                ]);
            }
            return { halt: undefined, told: [...told, "Every layer's checks pass after the code commit."] };
        }),
    );
});

/**
 * Walk implement mode: tests first, the code, then the change review, until one halts. When every one stands, the
 * change is done and its pull request input is given.
 * @param walk the run
 * @param told the lines told so far
 * @returns what ends this walk (a dispatch, a stop or done), with every line told
 * Writes: what each stage commits or prepares.
 */
export const implementWalk = Effect.fn("RunWalk.implementWalk")(function* (
    walk: Walk,
    told: readonly string[],
): Effect.fn.Return<Told<Halt>, ScriptError, Services> {
    const { layout, runFolder } = walk;
    const walked = yield* walkStages(
        [
            testsFirstStage(walk),
            codeStage(walk),
            agentStage(
                { name: "the change review", ...layout.review("change"), pastRounds: true },
                prepareReview(runFolder, "change"),
            ),
        ],
        told,
    );
    if (walked.halt !== undefined) {
        return { halt: walked.halt, told: walked.told };
    }
    const retag = retagAfter(walk.request.kind);
    const branch = retag === undefined ? "" : yield* currentBranch(walk.request.codebase);
    return {
        halt: {
            next: "done",
            said: [
                `The change is built, proved and reviewed. The run is finished; what it hands on is in ${layout.result}.`,
                `The evidence, for the approver and the engineers: ${layout.evidencePage}`,
            ],
            ...(retag === undefined
                ? {}
                : {
                      retag: {
                          ...retag,
                          comment: `The prototypes are ready for the stakeholders' review. Check out the branch ${branch} and start the app to see the variants side by side.`,
                      },
                  }),
        },
        told: walked.told,
    };
});
