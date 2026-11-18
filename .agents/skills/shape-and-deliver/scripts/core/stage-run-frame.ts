import { Effect } from "effect";
import type { Child } from "../page-components/jsx";
import type { Counted, Decision, JobRan, Model, StageSummary } from "./stage-model";
import type { Run, Rounds } from "./run-context";
import type { Stage } from "./run-layout";
import type { RecordName } from "./records";
import type { FindingsNotReady } from "./script-errors";

/**
 * Picks the findings out of a stage's model: what its round wrote while it runs, or what it found once it waits or is
 * done.
 * @param model the stage's model
 * @returns the findings, or undefined when the stage has none to show yet
 */
export function foundOf<R, D>(model: Model<R, D>): R | D | undefined {
    if (model._tag === "running") {
        return model.justRan._tag === "ran" ? model.justRan.found : undefined;
    }
    return model._tag === "done" || model._tag === "waitingForYou" ? model.found : undefined;
}

/** Where a stage stands: not started, running, stopped with a reason, waiting for the approver, or done. */
export type Standing =
    | { readonly state: "notStarted" }
    | { readonly state: "running"; readonly ran: readonly JobRan[] | undefined }
    | { readonly state: "stopped"; readonly reason: string }
    | { readonly state: "waitingForYou" | "done" };

/** What a stage shows its readers: a verdict, the sections for the approver and the sections for the engineer. */
export type StageView = { readonly verdict?: string; readonly approver?: Child; readonly engineer?: Child };

/** What a stage drew: its model as a summary, and its view. */
export type Drawn = {
    readonly stage: Stage;
    readonly summary: StageSummary;
    readonly view: StageView;
};

/**
 * Counts how many of a set of check runs passed and how many failed.
 * @param label what ran
 * @param runs the exit code of each run
 * @returns the tally, tagged as a checks job
 */
export const checksRan = (label: string, runs: ReadonlyArray<{ readonly exitCode: number }>): JobRan => ({
    _tag: "checksRan",
    label,
    passed: runs.filter((each) => each.exitCode === 0).length,
    failed: runs.filter((each) => each.exitCode !== 0).length,
});

/**
 * Works out where a plan stage's agent stands, in this order: done when its last round was accepted or the plan was
 * approved, stopped when its rounds are spent with feedback waiting, not started before its first round, else running.
 * @param run the run
 * @param rounds the stage's rounds
 * @param label the agent's name as shown
 * @param wrote what the current round wrote, counted by type
 * @returns the standing
 */
export function agentStanding(run: Run, rounds: Rounds, label: string, wrote: readonly Counted[]): Standing {
    if (rounds.accepted || run.planApproved) {
        return { state: "done" };
    }
    if (rounds.stopped) {
        return { state: "stopped", reason: `Stopped after ${rounds.rounds} rounds: ${rounds.waiting.join(" ")}` };
    }
    if (rounds.rounds === 0) {
        return { state: "notStarted" };
    }
    return { state: "running", ran: wrote.length ? [{ _tag: "agentWrote", label, wrote }] : undefined };
}

/**
 * Counts records by type, leaving out the problems recorded against shape-and-deliver itself.
 * @param records the records, with their type
 * @returns one count per type, in the order the types first appear
 */
export function countedByType(records: ReadonlyArray<{ readonly type: RecordName }>): Counted[] {
    const counts = new Map<RecordName, number>();
    for (const record of records.filter((each) => each.type !== "SkillProblem")) {
        const held = counts.get(record.type);
        counts.set(record.type, held === undefined ? 1 : held + 1);
    }
    return [...counts].map(([of, count]) => ({ of, count }));
}

/** What a stage's reader gives: its findings, or, for a reader that needs the run to have got somewhere, an effect that may fail. */
type Reading<A> = A | Effect.Effect<A, FindingsNotReady>;

/**
 * Turns what a reader gave into an effect.
 * @param reading the findings, or the effect that gives them
 * @returns the effect
 */
const readingOf = <A>(reading: Reading<A>): Effect.Effect<A, FindingsNotReady> =>
    Effect.isEffect(reading) ? reading : Effect.succeed(reading);

type Parts<R, D> = {
    readonly stage: Stage;
    readonly standing: (run: Run) => Standing;
    readonly progress: (run: Run) => Model<R, D>["progress"];
    readonly decisions: (run: Run) => readonly Decision[];
    readonly running: (run: Run) => Reading<R>;
    readonly done: (run: Run) => Reading<D>;
    readonly headline: (done: D) => readonly Counted[];
    readonly view: (model: Model<R, D>) => StageView;
};

/**
 * Builds a stage's model from the run: its running findings while it runs, its done findings once it waits or is done.
 * @param run the run
 * @param parts the stage's readers
 * @param madeAt when the model is made, as an ISO date and time
 * @returns the model
 * Fails: FindingsNotReady when a reader needs more of the run than there is.
 */
const modelOf = Effect.fnUntraced(function* <R, D>(
    run: Run,
    parts: Parts<R, D>,
    madeAt: string,
): Effect.fn.Return<Model<R, D>, FindingsNotReady> {
    const common = {
        stage: parts.stage,
        madeAt,
        progress: parts.progress(run),
        decisions: parts.decisions(run),
    };
    const standing = parts.standing(run);
    switch (standing.state) {
        case "notStarted":
            return { _tag: "notStarted", ...common };
        case "stopped":
            return { _tag: "stopped", ...common, reason: standing.reason };
        case "running":
            return {
                _tag: "running",
                ...common,
                justRan:
                    standing.ran === undefined
                        ? { _tag: "nothingYet" }
                        : { _tag: "ran", jobs: standing.ran, found: yield* readingOf(parts.running(run)) },
            };
        default: {
            const found = yield* readingOf(parts.done(run));
            return { _tag: standing.state, ...common, headline: parts.headline(found), found };
        }
    }
});

/**
 * Makes the function that draws a stage: it builds the model from the run and builds the view. It touches nothing, so
 * the same run and time draw the same.
 * Fails: FindingsNotReady.
 * @param parts the stage's readers and view
 * @returns a function from the run and the time to the drawing
 */
export const drawWith =
    <R, D>(parts: Parts<R, D>) =>
    (run: Run, madeAt: string): Effect.Effect<Drawn, FindingsNotReady> =>
        Effect.gen(function* () {
            const model = yield* modelOf(run, parts, madeAt);
            return { stage: parts.stage, summary: model, view: parts.view(model) };
        });

export type Drawer = (run: Run, madeAt: string) => Effect.Effect<Drawn, FindingsNotReady>;
