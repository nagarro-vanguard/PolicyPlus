import type { ApproveLaunch } from "./delivery-request";

/**
 * The text of the approval marker, the typed launch that approves the plan, which is written when the plan's review
 * passes. A build runs only while the marker exists, and planning again removes it.
 * @param codebase the codebase root
 * @param workItemId the work item's id
 * @returns the marker's JSON text
 */
export const approvalMarkerText = (codebase: string, workItemId: string) =>
    JSON.stringify({ mode: "implement", codebase, workItemId } satisfies ApproveLaunch, null, 2);
