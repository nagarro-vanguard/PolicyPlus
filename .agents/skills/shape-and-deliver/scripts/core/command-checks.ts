import { join } from "node:path";
import { Console, Effect } from "effect";
import type { Codebase } from "./codebase";
import type { CommandRun, LayerRun } from "./layer-proof";
import { outputKept } from "./policy";
import { readRecords, recordsOf } from "./record-files";
import type { RunLayout } from "./run-layout";
import { System } from "./system";

/** The check commands a plan names for criteria no test runner reaches: a command and the layer it runs in. */
type CommandCheck = { readonly id: string; readonly ac: string; readonly command: string; readonly layer: string };

/**
 * Reads the command checks the plan's tests stage recorded: each AcceptanceTest that names a command and a layer.
 * @param layout the run's layout
 * @returns the checks, in record order
 * Fails: FileUnreadable.
 */
const commandChecksOf = Effect.fnUntraced(function* (layout: RunLayout) {
    const tests = yield* recordsOf(yield* readRecords(layout.tests.records), "AcceptanceTest");
    return tests.flatMap((test): CommandCheck[] =>
        test.command === undefined || test.layer === undefined
            ? []
            : [{ id: test.id, ac: test.ac, command: test.command, layer: test.layer }],
    );
});

/**
 * Runs one command check from its layer's folder with EVIDENCE_DIR and WORK_ITEM_ID set, and keeps the whole output
 * as a file beside the layer's other evidence.
 * @param codebase the codebase
 * @param layout the run's layout
 * @param workItemId the work item's id
 * @param check the check
 * @returns the layer it ran in, its command run and the test it makes, or undefined when its layer is not in the codebase
 * Writes: `command-check-<id>.txt` in the layer's evidence folder for the code phase.
 */
const runCommandCheck = Effect.fnUntraced(function* (
    codebase: Codebase,
    layout: RunLayout,
    workItemId: string,
    check: CommandCheck,
) {
    const layer = codebase.layers.find((each) => each.name === check.layer);
    if (layer === undefined) {
        yield* Console.log(`FAIL  ${check.layer}  ${check.command}  (no such layer in the root AGENTS.md)`);
        return undefined;
    }
    const system = yield* System;
    const evidenceDir = layout.evidenceOf("afterCode", layer.name);
    const outcome = yield* system.run("sh", ["-c", check.command], join(codebase.root, layer.path), {
        EVIDENCE_DIR: evidenceDir,
        WORK_ITEM_ID: workItemId,
    });
    yield* system.writeText(join(evidenceDir, `command-check-${check.id}.txt`), outcome.output);
    yield* Console.log(`${outcome.exitCode === 0 ? "pass" : "FAIL"}  ${layer.name}  ${check.command}`);
    const run: CommandRun = {
        layer: layer.name,
        command: check.command,
        exitCode: outcome.exitCode,
        outputEnd: outcome.output.slice(-outputKept),
    };
    const test = {
        title: check.command,
        acs: [check.ac],
        passed: outcome.exitCode === 0,
        message: run.outputEnd,
    };
    return { layer, run, test };
});

/**
 * Runs the plan's command checks after the code commit and joins each to its layer's proof as a test that names its
 * criterion, so the criterion checks and the pages read it like any other test. A layer the code did not touch, but
 * which a check names, joins the run with that check alone.
 * @param codebase the codebase
 * @param layout the run's layout
 * @param workItemId the work item's id
 * @param layers each touched layer's run
 * @returns the layers' runs with the command checks in them
 * Writes: each check's output file in its layer's evidence folder.
 * Fails: FileUnreadable.
 */
export const runCommandChecks = Effect.fn("CommandChecks.runCommandChecks")(function* (
    codebase: Codebase,
    layout: RunLayout,
    workItemId: string,
    layers: readonly LayerRun[],
) {
    const ran = (yield* Effect.forEach(yield* commandChecksOf(layout), (check) =>
        runCommandCheck(codebase, layout, workItemId, check),
    )).flatMap((each) => (each === undefined ? [] : [each]));
    const names = [...new Set([...layers.map((run) => run.layer.name), ...ran.map((each) => each.layer.name)])];
    return names.flatMap((name): LayerRun[] => {
        const base = layers.find((run) => run.layer.name === name);
        const mine = ran.filter((each) => each.layer.name === name);
        const layer = base?.layer ?? mine[0]?.layer;
        if (layer === undefined) {
            return [];
        }
        const first = base ?? { layer, runs: [], proof: undefined, malformedProof: undefined };
        return [
            mine.length === 0
                ? first
                : {
                      ...first,
                      runs: [...first.runs, ...mine.map((each) => each.run)],
                      proof: {
                          tests: [...(first.proof?.tests ?? []), ...mine.map((each) => each.test)],
                          thresholds: first.proof?.thresholds ?? [],
                      },
                  },
        ];
    });
});
