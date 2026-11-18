import { Effect } from "effect";
import { parseWorkItem, WorkItemIncomplete } from "./work-item-parser";
import type { Kind } from "./documents";
import { StageOutputMissing } from "./script-errors";
import { System } from "./system";
import { runLayout } from "./run-layout";
import { readPlanRequest } from "./stage";

/**
 * Checks a work item's markdown for its kind. The shared parser knows the tracker's kinds; a design is a feature that
 * also shows screens, so it is read as a feature and must list them.
 * @param text the work item's markdown
 * @param id the work item's id
 * @param kind its kind
 * @returns the checked work item
 * Fails: WorkItemIncomplete (naming what is missing).
 * @public
 */
export const parseDeliveryWorkItem = Effect.fn("WorkItem.parseDeliveryWorkItem")(function* (
    text: string,
    id: string,
    kind: Kind,
) {
    if (kind !== "design") {
        return yield* parseWorkItem(text, id, kind);
    }
    const item = yield* parseWorkItem(text, id, "feature");
    if (item.screens === undefined) {
        return yield* new WorkItemIncomplete({ workItem: id, missing: ['"screens" section'] });
    }
    return { ...item, kind };
});

/**
 * Reads a work item's markdown, checks it holds what its kind needs, and numbers its criteria AC-1, AC-2 and so on.
 * @param path the work item's markdown
 * @param id the work item's id
 * @param kind its kind
 * @returns the checked work item
 * Fails: FileNotFound, FileUnreadable, WorkItemIncomplete (naming every missing field).
 */
export const readWorkItem = Effect.fn("WorkItem.readWorkItem")(function* (path: string, id: string, kind: Kind) {
    return yield* parseDeliveryWorkItem(yield* (yield* System).readText(path), id, kind);
});

/**
 * Checks the run's work item for its kind and writes it, with its criteria numbered, as the run's work-item.json.
 * @param runFolder the run's folder
 * @returns the work item
 * Writes: work-item.json.
 * Fails: StageOutputMissing when the plan request or work-item.md is missing, RequestInvalid, WorkItemIncomplete.
 */
export const recordWorkItem = Effect.fn("WorkItem.recordWorkItem")(function* (runFolder: string) {
    const system = yield* System;
    const request = yield* readPlanRequest("read-work-item", runFolder);
    const layout = runLayout(request.codebase, request.workItemId);
    if (!(yield* system.exists(layout.workItemMarkdown))) {
        return yield* new StageOutputMissing({ stage: "read-work-item", path: layout.workItemMarkdown });
    }
    const workItem = yield* readWorkItem(layout.workItemMarkdown, request.workItemId, request.kind);
    yield* system.writeText(layout.workItem, JSON.stringify(workItem, null, 2));
    return workItem;
});
