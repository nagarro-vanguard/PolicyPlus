import { join } from "node:path";
import { Effect } from "effect";
import { layerOfPath, readCodebase, type Layer } from "./codebase";
import type { RecordOf } from "./record-files";
import type { RunLayout } from "./run-layout";
import { System } from "./system";

/**
 * Names the layers the approved plan changes: those holding a file the plan's code changes or tests write.
 * @param codebase what the skill read of the codebase
 * @param codebase.layers its layers
 * @param layout the run's layout
 * @returns the layers' names
 */
export const plannedLayerNames = Effect.fn("PlanContainment.plannedLayerNames")(function* (
    codebase: { readonly layers: readonly Pick<Layer, "name" | "path">[] },
    layout: RunLayout,
) {
    const system = yield* System;
    const files = [
        ...(yield* system.listFiles(layout.changes.files)),
        ...(yield* system.listFiles(layout.tests.files)),
    ];
    return new Set(files.flatMap((file) => layerOfPath(codebase, file)?.name ?? []));
});

/**
 * Picks the paths in a layer the approved plan does not change. Only the plan's approver can widen the plan, so a
 * defect about such a path is theirs to decide, whatever its owner would say.
 * @param codebase what the skill read of the codebase
 * @param codebase.layers its layers
 * @param planned the names of the layers the plan changes
 * @param paths paths relative to the codebase root
 * @returns the paths outside the plan's layers
 */
export const pathsOutsidePlan = (
    codebase: { readonly layers: readonly Pick<Layer, "name" | "path">[] },
    planned: ReadonlySet<string>,
    paths: readonly string[],
) => paths.filter((path) => !planned.has(layerOfPath(codebase, path)?.name ?? ""));

/**
 * Keeps what names a file of the codebase, since a finding's `about` also names records and the like.
 * @param root the codebase root
 * @param about what a finding is about
 * @returns the entries that are files under the root
 */
const filesNamedIn = Effect.fn("PlanContainment.filesNamedIn")(function* (root: string, about: readonly string[]) {
    const system = yield* System;
    const files: string[] = [];
    for (const entry of about) {
        if ((yield* system.exists(join(root, entry))) && !(yield* system.isFolder(join(root, entry)))) {
            files.push(entry);
        }
    }
    return files;
});

/**
 * Picks the defects that are about a file outside the layers the approved plan changes, which only the plan's approver
 * can settle.
 * @param root the codebase root
 * @param layout the run's layout
 * @param defects a review's defects
 * @returns the defects that are the approver's
 */
export const defectsForApprover = Effect.fn("PlanContainment.defectsForApprover")(function* (
    root: string,
    layout: RunLayout,
    defects: readonly RecordOf<"Finding">[],
) {
    const codebase = yield* readCodebase(root);
    const planned = yield* plannedLayerNames(codebase, layout);
    const theirs: RecordOf<"Finding">[] = [];
    for (const finding of defects) {
        if (pathsOutsidePlan(codebase, planned, yield* filesNamedIn(root, finding.about)).length > 0) {
            theirs.push(finding);
        }
    }
    return theirs;
});
