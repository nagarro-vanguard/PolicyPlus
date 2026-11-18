import { Effect } from "effect";
import { runLayout } from "../../core/run-layout";
import type { WorkItem } from "../../core/documents";
import { codebaseWithChecks, writeFiles } from "./codebase-fixture";
import { workItem as twoCriteria } from "./fixtures";

/** The work item of a planned run: one criterion, AC-1, of SHOP-1. */
const workItem: WorkItem = { ...twoCriteria, criteria: [{ ac: "AC-1", text: "I see runs." }] };

/**
 * A feature's implement run, planned but not built: the requests, the work item, the proposed code and tests.
 * @param layerFiles the files that make the codebase's layers, written over the defaults
 * @param kind the work item's kind
 * @param testFiles the proposed test files
 * @param options how the plan differs from a plan of one criterion proved by test files
 * @param options.fixed whether the proposed code makes the criterion true
 * @param options.testRecords the tests stage's records, written as they are
 * @returns the codebase root and its layout
 */
export const plannedRun = (
    layerFiles: Record<string, string>,
    kind: WorkItem["kind"],
    testFiles: string[],
    options: { readonly fixed?: boolean; readonly testRecords?: readonly object[] } = {},
) =>
    Effect.sync(() => {
        const { fixed = true, testRecords = [] } = options;
        const root = codebaseWithChecks(layerFiles);
        const layout = runLayout(root, "SHOP-1");
        const request = {
            kind,
            codebase: root,
            workItemId: "SHOP-1",
            customInstructions: "",
        };
        writeFiles(root, {
            [layout.planRequest.slice(root.length + 1)]: JSON.stringify({
                mode: "plan",
                supportingMaterial: [],
                ...request,
            }),
            [layout.buildRequest.slice(root.length + 1)]: JSON.stringify({ mode: "implement", ...request }),
            [layout.workItem.slice(root.length + 1)]: JSON.stringify({ ...workItem, kind }),
            [`${layout.changes.files.slice(root.length + 1)}/apps/api/runs.ts`]: `export const runs = []; // ${fixed ? "FIXED" : "BROKEN"}\n`,
            [layout.changes.records.slice(root.length + 1)]: [
                {
                    type: "ChangedFile",
                    id: "change-1",
                    path: "apps/api/runs.ts",
                    action: "modify",
                    steps: ["step-1"],
                    reason: "r",
                },
            ]
                .map((record) => JSON.stringify(record))
                .join("\n"),
            [layout.trace.records.slice(root.length + 1)]: JSON.stringify({
                type: "PathStep",
                id: "step-1",
                ac: "AC-1",
                order: 1,
                name: "the runs page",
                file: "apps/api/runs.ts",
                status: "new",
                start: "A reviewer opens the runs page",
            }),
            ...(testRecords.length === 0
                ? {}
                : {
                      [layout.tests.records.slice(root.length + 1)]: testRecords
                          .map((r) => JSON.stringify(r))
                          .join("\n"),
                  }),
            ...Object.fromEntries(
                testFiles.map((file) => [`${layout.tests.files.slice(root.length + 1)}/${file}`, "export {};\n"]),
            ),
        });
        return { root, layout };
    });
