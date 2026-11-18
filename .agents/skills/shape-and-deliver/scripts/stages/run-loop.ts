import { DateTime, Effect, Schema } from "effect";
import { readRunInfo, recordAgentRun, type RunInfo } from "../core/agent-run";
import { randomSuffix } from "../core/random-suffix";
import { finishProducer } from "../core/record-stage";
import type { Render } from "../core/render-run";
import { finishReview, type ReviewOutcome } from "../core/review-stage";
import { Dispatch, type RunActions } from "../core/run-actions";
import { runLayout, type RunLayout } from "../core/run-layout";
import { doneForReader, stopForReader, stopKinds, type Stop } from "./stop-message";
import { UnknownJob, type ScriptError } from "../core/script-errors";
import { withRunLock } from "../core/run-lock";
import { readPlanRequest, readStageInput } from "../core/stage";
import { maxRounds } from "../core/policy";
import type { Services } from "../core/services";
import { System } from "../core/system";
import { finishFix } from "./code/fix";
import { implementWalk, planWalk, producers, refusing, type Halt, type Told, type Walk } from "./run-walk";
import { fixAgent, reviewAgent } from "../core/dispatch-prompt";

/** The batch handed out and not yet closed by its driver, with its dispatch, so a driver restarted before it recorded the batch can run it. */
const OpenBatch = Schema.Struct({
    batch: Schema.String,
    job: Schema.String,
    startedAt: Schema.optionalKey(Schema.String),
    dispatch: Dispatch,
});
const Launch = Schema.Struct({ mode: Schema.Literals(["plan", "implement"]) });
const Stopped = Schema.Struct({
    kind: Schema.Literals(stopKinds),
    review: Schema.optionalKey(Schema.Literals(["plan", "change"])),
    said: Schema.String,
});

/** What the gate before every step decides: end now with an action, or walk on, closing the open batch if there is one. */
type Gated =
    { readonly end: RunActions } | { readonly end?: undefined; readonly open: typeof OpenBatch.Type | undefined };

/**
 * The wait for an open batch, which carries the agent it handed out, so a driver that did not open it, or lost it, can
 * run it.
 * @param open the open batch
 * @param said what the driver is told
 * @param tell the lines for the operator
 * @returns the wait
 */
const waiting = (open: typeof OpenBatch.Type, said: string, tell: readonly string[]) =>
    ({
        next: "wait",
        batch: open.batch,
        dispatch: [open.dispatch],
        ...(open.startedAt === undefined ? {} : { startedAt: open.startedAt }),
        said,
        tell,
    }) satisfies RunActions;

/**
 * The lines the operator hears of the problems agents found with shape-and-deliver itself.
 * @param agent the agent that found them
 * @param problems what each says
 * @returns one line each
 */
const problemLines = (agent: string, problems: readonly string[]) =>
    problems.map((problem) => `A problem with shape-and-deliver itself, from ${agent}: ${problem}`);

/**
 * What a review's finish means for the operator: the line to tell, or why the run stops.
 * @param outcome the review's outcome
 * @returns the line to tell, or the stop
 */
const reviewHeard = (outcome: ReviewOutcome): { readonly tell: string } | { readonly stop: Stop } => {
    const name = `The ${outcome.review} review`;
    if (outcome.outcome === "accepted") {
        const open = outcome.unresolved === undefined ? 0 : outcome.unresolved.length;
        const said = outcome.unresolvedSaid === undefined ? [] : outcome.unresolvedSaid;
        const left =
            open === 0
                ? ""
                : `; ${open} defects stay open for the approver, because the rounds ran out: ${said.join(" | ")}`;
        return { tell: `${name} passed, with ${outcome.notes === undefined ? 0 : outcome.notes} notes${left}.` };
    }
    if (outcome.outcome === "stop") {
        const why = outcome.reason === undefined ? "defects remain after the rounds ran out" : outcome.reason;
        return {
            stop: {
                kind: outcome.kind === undefined ? "other" : outcome.kind,
                review: outcome.review,
                said: `${name} stopped the run: ${why}. Its page shows the findings.`,
            },
        };
    }
    const redo = outcome.redo === undefined ? [] : outcome.redo;
    return redo.length === 0
        ? { tell: `${name} failed its own check and runs again.` }
        : { tell: `${name} sent work back to ${redo.join(", ")}.` };
};

/**
 * Finish a producing stage's round and say what came of it: the problems its agent found with the skill, and whether
 * the stage is accepted, runs again for its gaps, or stops after its rounds.
 * @param producer the stage
 * @param runFolder the run folder
 * @returns why the run stops, or no halt when it goes on, with the lines told
 */
const closeProducer = Effect.fnUntraced(function* (
    producer: (typeof producers)[number],
    runFolder: string,
): Effect.fn.Return<Told<Halt | undefined>, ScriptError, Services> {
    const outcome = yield* finishProducer(producer, runFolder);
    const told = problemLines(producer.agent, outcome.skillProblems);
    if (outcome.outcome === "accepted") {
        return { halt: undefined, told: [...told, `${producer.agent} is accepted.`] };
    }
    const gaps = outcome.gaps.join("; ");
    if (outcome.outcome === "stop") {
        return {
            halt: {
                next: "stop",
                kind: "rounds",
                said: `${producer.agent} stopped after ${maxRounds} rounds with gaps: ${gaps}`,
            },
            told,
        };
    }
    return { halt: undefined, told: [...told, `${producer.agent} runs again for its gaps: ${gaps}`] };
});

/**
 * Finish the fix agent's round and say what came of it: its problems with the skill, and whether the repair is
 * accepted, runs again, stops for a question to the approver, or stops after its rounds.
 * @param runFolder the run folder
 * @returns why the run stops, or no halt when it goes on, with the lines told
 */
const closeFix = Effect.fnUntraced(function* (
    runFolder: string,
): Effect.fn.Return<Told<Halt | undefined>, ScriptError, Services> {
    const outcome = yield* finishFix(runFolder);
    const told = problemLines(fixAgent, outcome.skillProblems);
    if (outcome.outcome === "stop" && outcome.questions !== undefined) {
        return {
            halt: {
                next: "stop",
                kind: "other",
                said: `The repair needs a choice the plan does not make. For the approver: ${outcome.questions.join(" | ")}. Their answers go into the implement request's Custom Instructions.`,
            },
            told,
        };
    }
    if (outcome.outcome === "stop") {
        const gaps = outcome.gaps === undefined ? [] : outcome.gaps;
        return {
            halt: {
                next: "stop",
                kind: "rounds",
                said: `${fixAgent} stopped after ${maxRounds} rounds with gaps: ${gaps.join("; ")}`,
            },
            told,
        };
    }
    return {
        halt: undefined,
        told: [
            ...told,
            outcome.outcome === "accepted"
                ? "The repair is accepted; the checks run again."
                : "The repair runs again for its gaps.",
        ],
    };
});

/**
 * Finish the job of the batch being closed and say what came of it, with why the run stops if it does. The work
 * item's fetch has no finish and says nothing: the walk reads its output next.
 * @param walk the run
 * @param job the job the batch ran
 * @returns why the run stops, or no halt when it goes on, with the lines told
 */
const closeJob = Effect.fnUntraced(function* (
    walk: Walk,
    job: string,
): Effect.fn.Return<Told<Halt | undefined>, ScriptError, Services> {
    const producer = producers.find((stage) => stage.stage === job);
    if (producer !== undefined) {
        return yield* closeProducer(producer, walk.runFolder);
    }
    if (job === "plan-review" || job === "change-review") {
        const outcome = yield* finishReview(walk.runFolder, job === "plan-review" ? "plan" : "change");
        const told = problemLines(reviewAgent, outcome.skillProblems);
        const heard = reviewHeard(outcome);
        if ("stop" in heard) {
            return { halt: { next: "stop", ...heard.stop }, told };
        }
        return { halt: undefined, told: [...told, heard.tell] };
    }
    if (job === "code") {
        return yield* closeFix(walk.runFolder);
    }
    if (job === "work-item") {
        return { halt: undefined, told: [] };
    }
    return yield* new UnknownJob({ job });
});

/**
 * Turn what ended the walk into the action given to the driver. A stop is held until the run is launched again, a
 * done is passed on, and a dispatch is recorded as the open batch, created exclusively so that a second driver at the
 * same moment is told to wait.
 * @param layout the run's layout
 * @param halt what ended the walk
 * @param tell the lines for the operator
 * @returns the action: stop, done, wait or dispatch
 * Writes: stopped.json for a stop; batch.json for a dispatch, when no other driver created it first.
 */
const actionOf = Effect.fnUntraced(function* (layout: RunLayout, halt: Halt, tell: readonly string[]) {
    const system = yield* System;
    if (halt.next === "stop") {
        yield* system.writeText(
            layout.stopped,
            JSON.stringify({ kind: halt.kind, review: halt.review, said: halt.said }, null, 1),
        );
        return { next: "stop", said: halt.said, ...stopForReader(halt, layout), tell } satisfies RunActions;
    }
    if (halt.next === "done") {
        const { decisions, ...done } = halt;
        return {
            ...done,
            said: [...halt.said],
            ...doneForReader({ ...done, decisions }, layout),
            tell,
        } satisfies RunActions;
    }
    const batch = `${halt.dispatch.job}-${yield* randomSuffix}`;
    const startedAt = DateTime.formatIso(yield* DateTime.now);
    const record = JSON.stringify({ batch, job: halt.dispatch.job, startedAt, dispatch: halt.dispatch }, null, 1);
    if (!(yield* system.createExclusive(layout.batch, record))) {
        const open = yield* readStageInput("next", layout.batch, OpenBatch);
        const said = `another driver opened batch ${open.batch} at the same moment: only that driver closes it`;
        return waiting(open, said, tell);
    }
    return { next: "dispatch", batch, dispatch: [halt.dispatch], tell } satisfies RunActions;
});

/**
 * Check the run before any step. A held stop ends it as a stop; with no open batch, an `after` is a batch closed
 * already, so there is nothing to close and the run walks on to its current action; with an open batch, an `after`
 * that is not that batch is a batch closed already, and either ends it as a wait; otherwise it gives the batch to close, if
 * any.
 * @param layout the run's layout
 * @param after the batch the driver has finished, when it has one
 * @returns the action that ends now, or the open batch to close (undefined when none is open)
 */
const gate = Effect.fnUntraced(function* (
    layout: RunLayout,
    after: string | undefined,
): Effect.fn.Return<Gated, ScriptError, Services> {
    const system = yield* System;
    if (yield* system.exists(layout.stopped)) {
        const held = yield* readStageInput("next", layout.stopped, Stopped);
        const said = `${held.said} (launch the run again once this is resolved)`;
        return { end: { next: "stop", said, ...stopForReader(held, layout), tell: [] } satisfies RunActions };
    }
    const open = (yield* system.exists(layout.batch))
        ? yield* readStageInput("next", layout.batch, OpenBatch)
        : undefined;
    if (open === undefined) {
        return { open };
    }
    if (after === undefined) {
        const said = `batch ${open.batch} is open: run its dispatch if no agent is running for it, then next --after ${open.batch}`;
        return { end: waiting(open, said, []) };
    }
    if (after !== open.batch) {
        const said = `${after} is closed already; batch ${open.batch} is open: run its dispatch if no agent is running for it, then next --after ${open.batch}`;
        return { end: waiting(open, said, []) };
    }
    return { open };
});

/**
 * Close the batch the driver finished, then walk the launched mode's stages. The batch is removed only after its job's
 * finish has run, so a crash or a refusal in the finish leaves the batch open: the next `--after` runs the finish again
 * and the agent is not dispatched again. A finish that refuses becomes a stop with its message, and the batch stays.
 * A run the driver reports as not finished (timed out, crashed or refused) is recorded and closed with no finish, and
 * stops the run for the operator, since there is no output to read.
 * @param walk the run
 * @param open the batch to close, if any
 * @param info what the driver reported of the agent run, if anything
 * @returns what ends the walk, with every line told
 * Writes: the agent run's record, then removes batch.json once the finish has run.
 */
const closeAndWalk = Effect.fnUntraced(function* (
    walk: Walk,
    open: typeof OpenBatch.Type | undefined,
    info: RunInfo | undefined,
) {
    const system = yield* System;
    if (open !== undefined && info?.outcome !== undefined && info.outcome !== "finished") {
        yield* recordAgentRun(walk.layout, open, info);
        yield* system.remove(walk.layout.batch);
        const why = info.reason === undefined ? "" : `: ${info.reason}`;
        const said = `The ${open.dispatch.agent} agent ${info.outcome}${why}. Its output was not used and the batch is closed`;
        return { halt: { next: "stop", kind: "other", said } satisfies Halt, told: [] };
    }
    const finished: Told<Halt | undefined> =
        open === undefined
            ? { halt: undefined, told: [] }
            : yield* refusing(
                  [],
                  Effect.gen(function* () {
                      const result = yield* closeJob(walk, open.job);
                      yield* recordAgentRun(walk.layout, open, info);
                      yield* system.remove(walk.layout.batch);
                      return result;
                  }),
              );
    const kept =
        open !== undefined && finished.halt?.next === "stop" && (yield* system.exists(walk.layout.batch))
            ? ` (batch ${open.batch} stays open: run next --after ${open.batch} to finish it again)`
            : "";
    const closed: Told<Halt | undefined> =
        finished.halt?.next === "stop" && kept !== ""
            ? { ...finished, halt: { ...finished.halt, said: `${finished.halt.said}${kept}` } }
            : finished;
    if (closed.halt !== undefined) {
        return { halt: closed.halt, told: closed.told };
    }
    const launched = yield* refusing(
        closed.told,
        Effect.gen(function* () {
            const launch = yield* readStageInput("next", walk.layout.launch, Launch);
            return yield* launch.mode === "plan" ? planWalk(walk, closed.told) : implementWalk(walk, closed.told);
        }),
    );
    return { halt: launched.halt, told: launched.told };
});

/**
 * Advance a run: close the batch the driver finished, walk the launched mode's stages as far as the scripts can, and
 * give the one agent to run now, the mode's end, a wait or a stop. The pages are drawn before the action is given.
 * One driver at a time: the whole step holds the run's lock, so two drivers never both walk, and round counting and
 * the records files, which are read and rewritten here, are never raced by a second step.
 * @param render the run's render step
 * @param runFolder the run folder
 * @param after the batch the driver has finished, when it has one
 * @param runInfoPath the file of what the driver knows of that agent run, when it has one
 * @returns the action for the driver
 * Writes: batch.json and stopped.json as the action needs them, whatever the closed job and the walked stages write,
 * and the run's pages; the run's lock for the length of the step.
 * Fails: RunLocked when another driver holds the run; RunInfoInvalid when the run info cannot be used, before the batch is closed.
 */
export const advance = Effect.fn("RunLoop.advance")(function* (
    render: Render,
    runFolder: string,
    after: string | undefined,
    runInfoPath?: string,
): Effect.fn.Return<RunActions, ScriptError, Services> {
    const request = yield* readPlanRequest("next", runFolder);
    const layout = runLayout(request.codebase, request.workItemId);
    return yield* withRunLock(
        layout.lock,
        Effect.gen(function* () {
            const gated = yield* gate(layout, after);
            if (gated.end !== undefined) {
                return gated.end;
            }
            const info =
                gated.open === undefined || runInfoPath === undefined ? undefined : yield* readRunInfo(runInfoPath);
            const walk: Walk = { runFolder, layout, request };
            const { halt, told } = yield* closeAndWalk(walk, gated.open, info);
            const action = yield* actionOf(layout, halt, told);
            yield* render(runFolder);
            return action;
        }),
    );
});

/**
 * The batch a run holds open, for a durable driver that restarted after the batch was opened but before it recorded
 * it.
 * @param runFolder the run folder
 * @returns the open batch with its dispatch, or undefined when none is open
 */
export const heldBatch = Effect.fn("RunLoop.heldBatch")(function* (runFolder: string) {
    const request = yield* readPlanRequest("next", runFolder);
    const path = runLayout(request.codebase, request.workItemId).batch;
    return (yield* (yield* System).exists(path)) ? yield* readStageInput("next", path, OpenBatch) : undefined;
});
