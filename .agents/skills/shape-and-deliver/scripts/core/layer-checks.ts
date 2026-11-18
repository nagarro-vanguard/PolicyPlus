import { basename, join } from "node:path";
import { Console, Effect } from "effect";
import { Argument, Command } from "effect/cli";
import { runFolderArgument } from "./arguments";
import {
    affectedLayers,
    commitsFirst,
    contractFile,
    layerOfPath,
    readCodebase,
    verifyCommands,
    type Codebase,
    type Layer,
} from "./codebase";
import { changedFilesSince, trackedFiles } from "./git";
import { runCommandChecks } from "./command-checks";
import { WorkItem, type HeldThreshold, type LayerChecks, type Manifest } from "./documents";
import { FeedbackItem } from "./feedback";
import type { PlannedTest } from "./junit";
import { readLayerProof, type CommandRun, type LayerRun } from "./layer-proof";
import { readRecords, recordsOf } from "./record-files";
import { runLayout, type Phase, type RunLayout } from "./run-layout";
import { environmentUnavailable, failureOutputKept, outputKept } from "./policy";
import { printOutcome } from "./run-script";
import { ExistingChecksFail, StageOutputMissing } from "./script-errors";
import { ranLastRound, readApplied, readPlanRequest, readStageInput, writeFeedback } from "./stage";
import { System } from "./system";
import type { Render } from "./render-run";
import { renderAfter } from "./render-step";

/** What one run of the checks decided. */
type Verdict = Pick<LayerChecks, "outcome" | "reason" | "gaps" | "kind">;

/** What a run of the checks decided, as it prints it: each gap by its first line. */
type PhaseOutcome = Verdict & { readonly phase: Phase; readonly note?: string };

/**
 * Finds what is wrong with a layer's results: a proof.json or JUnit file in the wrong shape. The fault is worded as
 * the codebase's, since the codebase writes the results. A layer that wrote none has no fault: it proves no criterion.
 * @param run the layer's run
 * @returns the gap, or undefined when the results are fine
 */
const proofGap = (run: LayerRun) =>
    run.malformedProof === undefined ? undefined : `${run.layer.name} wrote ${run.malformedProof}`;

/**
 * Words how a planned load limit failed against what the layers reported.
 * @param plannedLimit the limit the plan set
 * @param found what the layers reported for it, if anything
 * @returns not reported, reported as another limit, or not held
 */
const thresholdFate = (plannedLimit: unknown, found: typeof HeldThreshold.Type | undefined) => {
    if (found === undefined) {
        return "not reported";
    }
    if (found.limit !== plannedLimit) {
        return `reported as ${found.limit}`;
    }
    return `not held (${found.observed})`;
};

/**
 * Asks git whether a layer is new, so a scaffold is not stopped for checks of code not yet written.
 * @param codebase the codebase
 * @param layer the layer
 * @returns true when git tracks no file of the layer besides its AGENTS.md
 * Fails: GitFailed.
 */
const isNewLayer = Effect.fnUntraced(function* (codebase: Codebase, layer: Layer) {
    const tracked = yield* trackedFiles(codebase.root, layer.path);
    return !tracked.some((file) => layerOfPath(codebase, file)?.name === layer.name && basename(file) !== contractFile);
});

/**
 * Runs one layer's Verify commands from its folder with the evidence folder and work item id in their environment,
 * then reads the results the layer wrote there: proof.json, else JUnit XML, else none. It prints a pass or fail line
 * for each command and keeps running after one fails.
 * @param codebase the codebase
 * @param layer the layer
 * @param evidenceDir the folder the layer writes its evidence into
 * @param scope the work item's id, so a layer can scope its run, and the plan's acceptance tests, which credit a
 * JUnit test to a criterion
 * @returns each command's exit code and the end of its output, and the layer's proof or why it is unreadable
 * Writes: empties the evidence folder first, then leaves a `.keep` file in it; whatever the commands write.
 * Fails: CodebaseContractBroken when the layer lists no Verify command, FileUnreadable.
 */
const runLayer = Effect.fnUntraced(function* (
    codebase: Codebase,
    layer: Layer,
    evidenceDir: string,
    scope: { readonly workItemId: string; readonly planned: readonly PlannedTest[] },
) {
    const system = yield* System;
    yield* system.remove(evidenceDir);
    yield* system.writeText(join(evidenceDir, ".keep"), "");
    const runs: CommandRun[] = [];
    for (const command of yield* verifyCommands(codebase, layer)) {
        const outcome = yield* system.run("sh", ["-c", command], join(codebase.root, layer.path), {
            EVIDENCE_DIR: evidenceDir,
            WORK_ITEM_ID: scope.workItemId,
            // A cached task replays its log without writing its results into this run's fresh evidence folder.
            TURBO_FORCE: "true",
        });
        runs.push({
            layer: layer.name,
            command,
            exitCode: outcome.exitCode,
            outputEnd: outcome.output.slice(-outputKept),
        });
        yield* Console.log(`${outcome.exitCode === 0 ? "pass" : "FAIL"}  ${layer.name}  ${command}`);
    }
    return { layer, runs, ...(yield* readLayerProof(evidenceDir, scope.planned)) } satisfies LayerRun;
});

/**
 * Checks the tests committed first behave as their kind says: a bug's must fail, a technical story's must pass.
 * @param layers each layer's run
 * @param kind the work item's kind
 * @returns why the run stops, or undefined when the new tests behave as the kind says
 */
const reproductionGap = (layers: readonly LayerRun[], kind: string) => {
    const newTests = layers.flatMap(({ proof }) => (proof?.tests ?? []).filter((test) => test.acs.length > 0));
    if (kind === "bug" && newTests.length === 0) {
        return "No layer reported the reproducing test before the fix, so the bug's reproduction cannot be shown.";
    }
    if (kind === "bug" && newTests.some((test) => test.passed)) {
        return `The reproducing test already passes before the fix (${newTests
            .filter((test) => test.passed)
            .map((test) => test.title)
            .join(", ")}), so it does not reproduce the bug.`;
    }
    if (kind === "technical" && (newTests.length === 0 || newTests.some((test) => !test.passed))) {
        return "The behaviour-pinning tests must pass before the code changes; they do not, so they do not pin today's behaviour.";
    }
    return undefined;
};

/**
 * Judges the checks before the code commit: a malformed proof stops the run, the code layers' commands and the
 * existing tests must pass, and, when tests were committed first, the new tests must behave as the kind says.
 * @param layers each layer's run
 * @param kind the work item's kind
 * @param testsFirst whether any test was committed before the code
 * @returns why the run stops, or undefined when it may go on to the code commit
 * Fails: ExistingChecksFail when a code layer's command or an existing test fails.
 */
const beforeCodeVerdict = Effect.fnUntraced(function* (layers: readonly LayerRun[], kind: string, testsFirst: boolean) {
    const malformed = layers.flatMap((run) => (run.malformedProof === undefined ? [] : [proofGap(run)]));
    if (malformed.length > 0) {
        return malformed.join("; ");
    }
    for (const { layer, runs, proof } of layers) {
        const failing = runs.filter((run) => run.exitCode !== 0).map((run) => run.command);
        if (layer.kind === "code" && failing.length > 0) {
            return yield* new ExistingChecksFail({ layer: layer.name, tests: failing });
        }
        const existingFailing = (proof?.tests ?? [])
            .filter((test) => test.acs.length === 0 && !test.passed)
            .map((test) => test.title);
        if (existingFailing.length > 0) {
            return yield* new ExistingChecksFail({ layer: layer.name, tests: existingFailing });
        }
    }
    return testsFirst ? reproductionGap(layers, kind) : undefined;
});

/**
 * Lists the checks that say their environment is unavailable, which no repair can fix.
 * @param layers each layer's run
 * @returns one sentence per such command
 */
const unavailableGaps = (layers: readonly LayerRun[]) =>
    layers.flatMap(({ layer, runs }) =>
        runs
            .filter((run) => run.exitCode === environmentUnavailable)
            .map(
                (run) =>
                    `${layer.name}: \`${run.command}\` says its environment is unavailable. Its output ends:\n${run.outputEnd.slice(-failureOutputKept)}`,
            ),
    );

/**
 * Lists what fails after the code commit: a failing command, a bad proof, a criterion with no passing test (a design
 * has none, since the build after the pick proves its criteria), or a planned threshold not reported with the same limit
 * and held.
 * @param layers each layer's run
 * @param workItem the work item
 * @param thresholds the planned load thresholds
 * @returns one sentence per gap
 */
const afterCodeGaps = (
    layers: readonly LayerRun[],
    workItem: WorkItem,
    thresholds: readonly Record<string, unknown>[],
) => {
    const gaps = layers.flatMap((layerRun) => {
        const gapOfProof = proofGap(layerRun);
        return [
            ...layerRun.runs
                .filter((run) => run.exitCode !== 0)
                .map(
                    (run) =>
                        `${layerRun.layer.name}: \`${run.command}\` exited ${run.exitCode}. Its output ends:\n${run.outputEnd.slice(-failureOutputKept)}`,
                ),
            ...(gapOfProof === undefined ? [] : [gapOfProof]),
        ];
    });
    const tests = layers.flatMap(({ proof }) => proof?.tests ?? []);
    for (const { ac } of workItem.kind === "design" ? [] : workItem.criteria) {
        if (!tests.some((test) => test.acs.includes(ac) && test.passed)) {
            gaps.push(`${ac} has no passing test`);
        }
    }
    const reported = layers.flatMap(({ proof }) => proof?.thresholds ?? []);
    for (const planned of thresholds) {
        const found = reported.find((held) => held.ac === planned.ac && held.metric === planned.metric);
        if (found === undefined || found.limit !== planned.limit || !found.held) {
            gaps.push(
                `${String(planned.ac)}'s ${String(planned.metric)} limit of ${String(planned.limit)} was ${thresholdFate(planned.limit, found)}`,
            );
        }
    }
    return gaps;
};

/**
 * Reads what has been applied and requires the commit the phase checks. The tests-first phase is not run again once
 * the code is committed, since it judged the code as it was forked.
 * @param layout the run's layout
 * @param phase which run of the checks
 * @returns what has been applied, or undefined when the tests-first phase is already past
 * Fails: StageOutputMissing when the phase's commit or the commit the plan started from is not recorded.
 */
const appliedFor = Effect.fnUntraced(function* (layout: RunLayout, phase: Phase) {
    const applied = yield* readApplied("run-layer-checks", layout.applied);
    const { base } = applied;
    if ((phase === "afterTests" ? applied.testsCommit : applied.codeCommit) === undefined || base === undefined) {
        const step = `apply-change-plan ${phase === "afterTests" ? "tests" : "code"}`;
        return yield* new StageOutputMissing({ stage: step, path: layout.applied });
    }
    if (phase === "afterTests" && applied.codeCommit !== undefined) {
        return undefined;
    }
    return { ...applied, base };
});

/**
 * Runs the Verify commands of the layers the plan's changes affect, collects each layer's proof, and judges the
 * phase. It passes at once, without running, when the tests-first phase is asked for after the code is committed.
 * @param runFolder the run folder
 * @param phase which run of the checks
 * @returns the outcome, with its gaps cut to their first line
 * Writes: each layer's evidence folder, the phase's manifest and layer-checks file, and `applied.json` once the
 * tests-first phase passes; after the code commit, the fix stage's feedback when gaps remain.
 * Fails: StageOutputMissing, RequestInvalid, CodebaseContractBroken, GitFailed, FileUnreadable.
 */
export const runPhase = Effect.fn("LayerChecks.runPhase")(function* (runFolder: string, phase: Phase) {
    const system = yield* System;
    const plan = yield* readPlanRequest("run-layer-checks", runFolder);
    const layout: RunLayout = runLayout(plan.codebase, plan.workItemId);
    const applied = yield* appliedFor(layout, phase);
    if (applied === undefined) {
        const early: PhaseOutcome = { phase, outcome: "passed", note: "judged before the code commit" };
        return early;
    }
    const workItem = yield* readStageInput("run-layer-checks", layout.workItem, WorkItem);
    const codebase = yield* readCodebase(plan.codebase);
    const touched = affectedLayers(codebase, yield* changedFilesSince(plan.codebase, applied.base));
    const planned = (yield* recordsOf(yield* readRecords(layout.tests.records), "AcceptanceTest")).flatMap((test) =>
        test.file === undefined ? [] : [{ ac: test.ac, title: test.title }],
    );
    const verified = yield* Effect.forEach(touched, (layer) =>
        Effect.gen(function* () {
            if (phase === "afterTests" && (yield* isNewLayer(codebase, layer))) {
                yield* Console.log(`new   ${layer.name}  nothing to check before the code commit`);
                return { layer, runs: [], proof: undefined, malformedProof: undefined } satisfies LayerRun;
            }
            return yield* runLayer(codebase, layer, layout.evidenceOf(phase, layer.name), {
                workItemId: plan.workItemId,
                planned,
            });
        }),
    );
    const layers =
        phase === "afterCode" ? yield* runCommandChecks(codebase, layout, plan.workItemId, verified) : verified;
    const manifest: Manifest = {
        phase,
        layers: layers.flatMap(({ layer, proof }) => (proof ? [{ layer: layer.name, proof }] : [])),
    };
    yield* system.writeText(layout.manifest(phase), JSON.stringify(manifest, null, 2));
    const unavailable = unavailableGaps(layers);
    const judged = Effect.gen(function* () {
        return phase === "afterTests"
            ? yield* testsFirstVerdict(layers, plan.kind, yield* testsCommittedFirst(codebase, layout))
            : yield* codeVerdict(layout, layers, workItem);
    });
    const verdict: Verdict =
        unavailable.length > 0
            ? { outcome: "stop", reason: unavailable.join("; "), kind: "environment" }
            : yield* judged;
    const checks: LayerChecks = { phase, ...verdict, runs: layers.flatMap((layer) => layer.runs) };
    yield* system.writeText(layout.layerChecks(phase), JSON.stringify(checks, null, 2));
    if (verdict.outcome === "passed" && phase === "afterTests") {
        yield* system.writeText(layout.applied, JSON.stringify({ ...applied, testsProved: true }, null, 2));
    }
    const gaps = verdict.gaps?.map((gap) => gap.split("\n")[0] ?? gap);
    const outcome: PhaseOutcome = { phase, ...verdict, ...(gaps === undefined ? {} : { gaps }) };
    return outcome;
});

/**
 * Tells whether the plan has a test file to commit before the code, which only a test layer's is.
 * @param codebase the codebase
 * @param layout the run's layout
 * @returns true when a proposed test file is committed first
 */
const testsCommittedFirst = Effect.fnUntraced(function* (codebase: Codebase, layout: RunLayout) {
    const files = yield* (yield* System).listFiles(layout.tests.files);
    return files.some((file) => commitsFirst(codebase, file));
});

/**
 * Turns the before-code judgement into a verdict: passed, or a stop with its reason, existing checks that already
 * fail included.
 * @param layers each layer's run
 * @param kind the work item's kind
 * @param testsFirst whether any test was committed before the code
 * @returns the verdict
 */
const testsFirstVerdict = (layers: readonly LayerRun[], kind: string, testsFirst: boolean) =>
    beforeCodeVerdict(layers, kind, testsFirst).pipe(
        Effect.map((stop): Verdict => (stop === undefined ? { outcome: "passed" } : { outcome: "stop", reason: stop })),
        Effect.catchTag("ExistingChecksFail", (error) =>
            Effect.succeed<Verdict>({ outcome: "stop", reason: error.message, kind: "existing-checks" }),
        ),
    );

/**
 * Judges the checks after the code commit: passed, or the gaps, which are written as the fix agent's feedback. With
 * gaps, the verdict is stop once the fix agent has had its last round and has asked no question, and fix otherwise.
 * @param layout the run's layout
 * @param layers each layer's run
 * @param workItem the work item
 * @returns the verdict
 * Writes: the fix stage's feedback when there are gaps.
 */
const codeVerdict = Effect.fnUntraced(function* (layout: RunLayout, layers: readonly LayerRun[], workItem: WorkItem) {
    const thresholds = yield* recordsOf(yield* readRecords(layout.tests.records), "LoadThreshold");
    const gaps = afterCodeGaps(layers, workItem, thresholds);
    if (gaps.length === 0) {
        return { outcome: "passed" } satisfies Verdict;
    }
    yield* writeFeedback(
        layout.fix.feedback,
        gaps.map((said) => new FeedbackItem({ from: "check", said })),
    );
    const asked = (yield* readRecords(layout.fix.records)).some((record) => record.type === "Question");
    const outcome = (yield* ranLastRound(layout.fix.folder)) && !asked ? "stop" : "fix";
    return { outcome, gaps } satisfies Verdict;
});

/**
 * The run-layer-checks command, which runs one phase's checks and then the run's render step.
 * @param render the run's render step
 * @returns the command
 */
export const layerChecksCommand = (render: Render) =>
    Command.make(
        "run-layer-checks",
        {
            runFolder: runFolderArgument,
            phase: Argument.Literals("phase", ["afterTests", "afterCode"] as const).pipe(
                Argument.withDescription("afterTests judges the tests-first commit, afterCode the code commit."),
            ),
        },
        Effect.fn("LayerChecks.runLayerChecks")(
            function* (input) {
                yield* printOutcome(yield* runPhase(input.runFolder, input.phase));
            },
            (step, input) => renderAfter(render, input.runFolder)(step),
        ),
    ).pipe(
        Command.withDescription(
            'Runs the Verify commands of every layer the plan affects, in dependency order, keeping each layer\'s proof and a manifest, and judges the phase. After the tests-first commit, existing checks must pass, a bug\'s new test must fail and a technical story\'s must pass. After the code commit, every check passes, every criterion has a passing test and every planned threshold is held, or the gaps go to the fix agent; it prints {"outcome": "passed" | "fix" | "stop"}.',
        ),
    );
