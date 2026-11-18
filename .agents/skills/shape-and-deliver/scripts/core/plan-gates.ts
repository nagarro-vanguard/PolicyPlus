import { join } from "node:path";
import { Effect } from "effect";
import { layerOfPath, type Codebase } from "./codebase";
import { readRecords, recordsOf, type RecordOf, type Stored } from "./record-files";
import { System } from "./system";
import type { WorkItem } from "./documents";

/**
 * Reads the path steps from a trace's records file, leaving out the other records the file holds.
 * @param path the trace's records file
 * @returns the PathStep records
 * Fails: RecordInvalid.
 */
export const pathStepsIn = Effect.fn("PlanGates.pathStepsIn")(function* (path: string) {
    return yield* recordsOf(yield* readRecords(path), "PathStep");
});

/**
 * Reads the proposed code changes from the changes' records file, leaving out the other records the file holds.
 * @param path the code changes' records file
 * @returns the ChangedFile records
 * Fails: RecordInvalid.
 */
export const changedFilesIn = Effect.fn("PlanGates.changedFilesIn")(function* (path: string) {
    return yield* recordsOf(yield* readRecords(path), "ChangedFile");
});

/**
 * Checks the trace covers the work item: every criterion has a path whose steps are numbered 1, 2, 3 with none
 * missing, and no step names a criterion the work item lacks.
 * @param workItem the work item
 * @param steps the PathStep records, each with its criterion and its number in that criterion's path
 * @returns one sentence per gap, empty when the trace covers every criterion
 */
export function traceGaps(workItem: WorkItem, steps: readonly Pick<RecordOf<"PathStep">, "ac" | "order">[]): string[] {
    const known = new Set(workItem.criteria.map((criterion) => criterion.ac));
    const unknown = [...new Set(steps.map((step) => step.ac))].filter((ac) => !known.has(ac));
    const gaps = unknown.map((ac) => `a step names ${ac}, which the work item does not have`);
    for (const { ac } of workItem.criteria) {
        const orders = steps.filter((step) => step.ac === ac).map((step) => step.order);
        const missing =
            orders.length === 0
                ? [1]
                : [...Array(Math.max(...orders)).keys()].map((i) => i + 1).filter((n) => !orders.includes(n));
        if (orders.length === 0) {
            gaps.push(`${ac} has no path`);
        } else if (missing.length > 0) {
            gaps.push(`${ac}'s path has no step ${missing.join(", ")}`);
        }
    }
    return gaps;
}

/**
 * Checks each step's citation against the codebase as it is: a step marked new cites a file the codebase lacks, any
 * other step cites one it has, and a cited line range lies inside that file.
 * @param root the codebase root
 * @param steps the PathStep records
 * @returns one sentence per citation that cannot hold
 */
export const stepCitationGaps = Effect.fn("PlanGates.stepCitationGaps")(function* (
    root: string,
    steps: readonly RecordOf<"PathStep">[],
) {
    const system = yield* System;
    const gaps: string[] = [];
    for (const step of steps) {
        const path = step.file;
        const present = yield* system.exists(join(root, path));
        if (step.status === "new") {
            if (present) {
                gaps.push(`${step.id} is new, but ${path} already exists: mark it changes or exists`);
            }
            continue;
        }
        if (!present) {
            gaps.push(
                `${step.id} cites ${path}, which the branch does not hold: mark it new or cite the file that exists`,
            );
            continue;
        }
        const { lines } = step;
        if (lines !== undefined) {
            const text = yield* system.readText(join(root, path));
            const count = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
            if (lines.first < 1 || lines.first > lines.last || lines.last > count) {
                gaps.push(`${step.id} cites ${path} lines ${lines.first} to ${lines.last}, but the file has ${count}`);
            }
        }
    }
    return gaps;
});

/**
 * Checks a file the plan marks generated: it records the command that writes it, and the plan does not also write it.
 * @param change the ChangedFile record
 * @param filesFolder the folder holding the plan's proposed files
 * @returns one sentence per gap
 */
const generatedGaps = Effect.fnUntraced(function* (change: RecordOf<"ChangedFile">, filesFolder: string) {
    const path = change.path;
    const gaps: string[] = [];
    if (change.command === undefined || change.command.trim() === "") {
        gaps.push(
            `${change.id} marks ${path} generated, but records no command: give the command that writes it, as the layer's AGENTS.md says to run it`,
        );
    }
    if (yield* (yield* System).exists(join(filesFolder, path))) {
        gaps.push(`${change.id} marks ${path} generated, so files/${path} must not be written: its command writes it`);
    }
    return gaps;
});

/**
 * Checks a file the plan adds, modifies or deletes can be applied: an add must be absent from the codebase, a modify
 * or delete present, and an add or modify must have its whole new file in the proposed files.
 * @param root the codebase root
 * @param change the ChangedFile record
 * @param filesFolder the folder holding the plan's proposed files
 * @returns one sentence per gap
 */
const writtenGaps = Effect.fnUntraced(function* (root: string, change: RecordOf<"ChangedFile">, filesFolder: string) {
    const path = change.path;
    const gaps: string[] = [];
    const atBase = yield* (yield* System).exists(join(root, path));
    if (change.action === "add" && atBase) {
        gaps.push(`${change.id} adds ${path}, which already exists: make it a modify`);
    }
    if (change.action !== "add" && !atBase) {
        gaps.push(`${change.id} ${change.action}s ${path}, which does not exist on the branch`);
    }
    if (change.action !== "delete" && !(yield* (yield* System).exists(join(filesFolder, path)))) {
        gaps.push(`${change.id} gives no new file at files/${path}`);
    }
    return gaps;
});

/**
 * Checks the proposed code can be built: every changed file sits in a code layer and can be applied or generated,
 * every step a change serves is a traced step, and every proposed file has a ChangedFile record.
 * @param codebase the codebase and its layers
 * @param changes the ChangedFile records
 * @param context what else the check needs
 * @param context.filesFolder the folder holding the plan's proposed files
 * @param context.stepIds the ids of the traced path steps
 * @param context.proposedFiles the paths of every file under filesFolder, relative to it
 * @returns one sentence per gap, empty when the plan can be built
 */
export const baseCheckGaps = Effect.fn("PlanGates.baseCheckGaps")(function* (
    codebase: Codebase,
    changes: readonly RecordOf<"ChangedFile">[],
    context: {
        readonly filesFolder: string;
        readonly stepIds: ReadonlySet<string>;
        readonly proposedFiles: readonly string[];
    },
) {
    const gaps: string[] = [];
    for (const change of changes) {
        const { path } = change;
        if (layerOfPath(codebase, path)?.kind !== "code") {
            gaps.push(`${change.id} changes ${path}, which is in no code layer of the root AGENTS.md`);
        }
        gaps.push(
            ...(change.action !== "generate" && change.command !== undefined
                ? [`${change.id} records a command, which only a generated file has: ${path} is ${change.action}`]
                : []),
            ...(change.action === "generate"
                ? yield* generatedGaps(change, context.filesFolder)
                : yield* writtenGaps(codebase.root, change, context.filesFolder)),
        );
        for (const step of change.steps) {
            if (!context.stepIds.has(step)) {
                gaps.push(`${change.id} serves ${step}, which is no traced step`);
            }
        }
    }
    const recorded = new Set(changes.map((change) => change.path));
    for (const file of context.proposedFiles.filter((path) => !recorded.has(path))) {
        gaps.push(`files/${file} has no ChangedFile record`);
    }
    return gaps;
});

/**
 * Checks the proposed tests cover the work item: every criterion has a test, every test, threshold and support file
 * named by a record exists in the proposed files, every command check names a layer of the codebase, and every
 * proposed file sits in a layer and is named by a record. A command check has no file to find. It does not judge
 * whether the tests prove anything; the layers' checks show that.
 * @param codebase the codebase and its layers
 * @param workItem the work item
 * @param records the tests stage's records
 * @param context what else the check needs
 * @param context.filesFolder the folder holding the proposed test files
 * @param context.proposedFiles the paths of every file under filesFolder, relative to it
 * @returns one sentence per gap, empty when every criterion has a test
 */
export const coverageGaps = Effect.fn("PlanGates.coverageGaps")(function* (
    codebase: Codebase,
    workItem: WorkItem,
    records: readonly Stored[],
    context: { readonly filesFolder: string; readonly proposedFiles: readonly string[] },
) {
    const system = yield* System;
    const gaps: string[] = [];
    const criteria = new Set(workItem.criteria.map((criterion) => criterion.ac));
    const tests = yield* recordsOf(records, "AcceptanceTest");
    const proofs = [...tests, ...(yield* recordsOf(records, "LoadThreshold"))];
    const supports = yield* recordsOf(records, "TestSupportFile");
    for (const ac of criteria) {
        if (!tests.some((test) => test.ac === ac)) {
            gaps.push(`${ac} has no test`);
        }
    }
    for (const record of proofs.filter((proof) => !criteria.has(proof.ac))) {
        gaps.push(`${record.id} names ${record.ac}, which the work item does not have`);
    }
    const named = [
        ...proofs.flatMap((proof) => (proof.file === undefined ? [] : [{ id: proof.id, file: proof.file }])),
        ...supports.map((support) => ({ id: support.id, file: support.path })),
    ];
    for (const { id, file } of named) {
        if (!(yield* system.exists(join(context.filesFolder, file)))) {
            gaps.push(`${id} names ${file}, which is not under files/`);
        }
    }
    for (const check of tests.filter((test) => test.layer !== undefined)) {
        if (!codebase.layers.some((layer) => layer.name === check.layer)) {
            gaps.push(`${check.id} runs in layer ${String(check.layer)}, which is not in the root AGENTS.md's table`);
        }
    }
    const namedFiles = new Set(named.map((entry) => entry.file));
    for (const file of context.proposedFiles) {
        const layer = layerOfPath(codebase, file);
        if (layer === undefined) {
            gaps.push(`files/${file} is in no layer of the root AGENTS.md`);
        }
        if (!namedFiles.has(file)) {
            gaps.push(`files/${file} is named by no AcceptanceTest, LoadThreshold or TestSupportFile record`);
        }
    }
    return gaps;
});
