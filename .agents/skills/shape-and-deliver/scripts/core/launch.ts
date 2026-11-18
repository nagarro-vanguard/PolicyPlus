import { isAbsolute, join } from "node:path";
import { Effect } from "effect";
import { checkDeliveryLaunch, PlanRequest, type DeliveryLaunch } from "./delivery-request";
import { RequestInvalid } from "./script-errors";
import type { Render } from "./render-run";
import { producerNames, runLayout, type Producer, type RunLayout } from "./run-layout";
import { FeedbackItem } from "./feedback";
import { readStageInput, roundsUsed, writeFeedback } from "./stage";
import { System } from "./system";

/** The plan's stages, whose work a changed plan sets aside. */
const planStages = [...producerNames, "plan-review"] as const;

/** The producing stages a build after a picked design keeps to update: the design's analysis of the story. */
const designKept: ReadonlySet<Producer> = new Set(["orient", "trace"]);

/**
 * What the plan is about: its kind and its work item. A change to either is a different plan.
 * @param request the request as stored
 * @param workItemText the work item's text, when given as text
 * @returns a text that changes exactly when what the plan is about does
 */
const planBasis = (request: PlanRequest, workItemText: string | undefined) =>
    JSON.stringify([request.kind, request.workItemUrl, workItemText]);

/**
 * Move a folder of the run's work under `earlier/<n>/`, file by file, so the old work is kept as it was.
 * @param layout the run's layout
 * @param n the number of the earlier plan
 * @param folder the folder, relative to the run's work folder
 * @returns nothing once moved
 * Writes: a copy of each file under `earlier/<n>/`; removes the folder.
 */
const moveAside = Effect.fnUntraced(function* (layout: RunLayout, n: number, folder: string) {
    const system = yield* System;
    const source = join(layout.work, folder);
    for (const file of yield* system.listFiles(source)) {
        yield* system.writeText(
            join(layout.work, "earlier", String(n), folder, file),
            yield* system.readText(join(source, file)),
        );
    }
    yield* system.remove(source);
});

/**
 * What the plan is about apart from its kind: the story's address and, for a work item given as text, its text.
 * @param request the request as stored
 * @param workItemText the work item's text, when given as text
 * @returns a text that changes exactly when the story does
 */
const storyBasis = (request: PlanRequest, workItemText: string | undefined) =>
    JSON.stringify([request.workItemUrl, workItemText]);

/**
 * Whether two plan requests carry the same story. A request from before the story was kept has none and matches.
 * @param earlier the stored request
 * @param request the new request
 * @returns true when the story is the same, or one of them is not known
 */
const sameStory = (earlier: PlanRequest, request: PlanRequest) =>
    earlier.story === undefined || request.story === undefined || earlier.story === request.story;

/**
 * Whether two plan requests carry the same legacy attachment: one text, or none in both.
 * @param earlier the stored request
 * @param request the new request
 * @returns true when the attachment is the same
 */
const sameReference = (earlier: PlanRequest, request: PlanRequest) =>
    earlier.referenceDigest === request.referenceDigest;

/** What changed between two plan requests: nothing, the plan's basis, or a build after its design. */
type Change = "none" | "basis" | "design";

/**
 * Tell what changed between the stored plan request and the new one.
 * @param earlier the stored request
 * @param earlierText the stored work item's text, when it was given as text
 * @param request the new request
 * @param text the new work item's text, when given as text
 * @returns the change
 */
const changeOf = (
    earlier: PlanRequest,
    earlierText: string | undefined,
    request: PlanRequest,
    text: string | undefined,
): Change => {
    if (
        planBasis(earlier, earlierText) === planBasis(request, text) &&
        sameStory(earlier, request) &&
        sameReference(earlier, request)
    ) {
        return "none";
    }
    const afterDesign =
        earlier.kind === "design" &&
        request.kind === "feature" &&
        request.fromDesign !== undefined &&
        storyBasis(earlier, earlierText) === storyBasis(request, text) &&
        sameStory(earlier, request) &&
        sameReference(earlier, request);
    return afterDesign ? "design" : "basis";
};

/** The folders each kind of change sets aside; the producers' records stay for their agents to update where only rounds move. */
const foldersFor = {
    design: [
        ...producerNames.filter((stage) => designKept.has(stage)).map((stage) => `${stage}/rounds`),
        ...producerNames.filter((stage) => !designKept.has(stage)),
        "plan-review",
    ],
    basis: [...planStages],
} as const;

/**
 * Give the approver's later instructions to the stages they name, one line each as `<stage>: <what to change>`, so only
 * those stages run again. The earlier request keeps its own instructions, which every agent reads from its first round.
 * @param layout the run's layout
 * @param instructions the instructions of the new launch, already trimmed
 * @returns nothing once each line is saved as feedback
 * Writes: the feedback file of each named stage; removes the plan review's accepted mark, so it judges the plan again.
 * Fails: RequestInvalid when a line names no producing stage.
 */
const routeInstructions = Effect.fnUntraced(function* (layout: RunLayout, instructions: string) {
    const items = new Map<Producer, FeedbackItem[]>();
    for (const line of instructions.split("\n").filter((text) => text.trim().length > 0)) {
        const colon = line.indexOf(":");
        const stage = line.slice(0, Math.max(colon, 0)).trim();
        const said = line.slice(colon + 1).trim();
        const owner = producerNames.find((name) => name === stage);
        if (colon < 0 || owner === undefined || said.length === 0) {
            return yield* new RequestInvalid({
                issue: `instructions after the plan began go to one stage a line, as "<${producerNames.join("|")}>: <what to change>"; got "${line.trim()}".`,
            });
        }
        items.set(owner, [...(items.get(owner) ?? []), new FeedbackItem({ from: "approver", said })]);
    }
    for (const [owner, said] of items) {
        yield* writeFeedback(layout[owner].feedback, said);
    }
    if (items.size > 0) {
        // The reopened stages will change what the plan review judged, so its acceptance no longer stands.
        const review = layout.review("plan").folder;
        const round = yield* roundsUsed(review);
        if (round > 0) {
            yield* (yield* System).remove(join(review, "rounds", String(round), "accepted"));
        }
    }
});

/**
 * Compare the new plan request with the stored one and move aside the work the change supersedes. The same request
 * leaves the work, so a stopped run resumes; a changed kind or work item moves every stage aside; a build after a
 * picked design keeps orient and trace to update. Instructions never move work aside: they go to the stage they name.
 * @param layout the run's layout
 * @param request the new request, as stored
 * @param workItemText the new work item's text, when given as text
 * @returns where the design's code changes went, when the build follows a design, and the instructions the stored
 * request keeps
 * Writes: the superseded folders under `earlier/<n>/`, with each removed from the work; feedback for the stages the
 * instructions name.
 */
const setAsideChangedPlan = Effect.fnUntraced(function* (
    layout: RunLayout,
    request: PlanRequest,
    workItemText: string | undefined,
) {
    const system = yield* System;
    const fresh = { instructions: request.customInstructions, resumed: false };
    if (!(yield* system.exists(layout.planRequest))) {
        return { changes: undefined, ...fresh };
    }
    const earlierText = (yield* system.exists(layout.workItemMarkdown))
        ? yield* system.readText(layout.workItemMarkdown)
        : "";
    const earlier = yield* readStageInput("launch", layout.planRequest, PlanRequest);
    const earlierDesign = earlier.fromDesign;
    const design = request.fromDesign;
    const kept =
        design !== undefined && earlierDesign?.variant === design.variant ? earlierDesign.changesPath : undefined;
    const change = changeOf(
        earlier,
        earlier.workItemUrl === undefined ? earlierText.trimEnd() : undefined,
        request,
        workItemText,
    );
    if (change === "none") {
        if (request.customInstructions.length > 0) {
            yield* routeInstructions(layout, request.customInstructions);
        }
        return {
            changes: kept,
            instructions: earlier.customInstructions,
            resumed: request.customInstructions.length === 0,
        };
    }
    if (change === "basis" && (yield* system.exists(layout.applied))) {
        return yield* new RequestInvalid({
            issue: `story ${request.workItemId} changed after its code was committed, so its plan cannot start again here: deliver the changed story from a new branch`,
        });
    }
    let n = 1;
    while (yield* system.exists(join(layout.work, "earlier", String(n)))) {
        n += 1;
    }
    for (const folder of foldersFor[change]) {
        yield* moveAside(layout, n, folder);
    }
    if (change === "basis") {
        // The work item is read from the tracker again, and the agent the old plan had open is of no use to the new one.
        yield* system.remove(layout.workItemMarkdown);
        yield* system.remove(layout.workItem);
        yield* system.remove(layout.batch);
    }
    return {
        changes: change === "design" ? join(layout.work, "earlier", String(n), "changes", "records.jsonl") : kept,
        ...fresh,
    };
});

/**
 * Record the mode a launch drives. A new plan also takes back the approval of the one before it, so that cannot be
 * built in its place.
 * @param layout the run's layout
 * @param mode the mode launched
 * @returns nothing once recorded
 * Writes: launch.json; removes the approval marker for a plan.
 */
const launchMode = Effect.fnUntraced(function* (layout: RunLayout, mode: "plan" | "implement") {
    const system = yield* System;
    yield* system.writeText(layout.launch, JSON.stringify({ mode }, null, 2));
    if (mode === "plan") {
        yield* system.remove(layout.implementRequest);
    }
});

/**
 * Where a launch's relative paths start when the driver names no folder: its own codebase, when that is absolute.
 * @param launch the typed launch
 * @returns the folder
 */
const startOf = (launch: DeliveryLaunch) => (isAbsolute(launch.codebase) ? launch.codebase : ".");

/**
 * Record a typed launch in its run folder: the request the mode's stages read, and the mode the run drives. A changed
 * plan sets the earlier one aside, and a stop the run held is lifted.
 * @param render the run's render step
 * @param launch the typed launch
 * @param cwd the folder the launch's relative paths start from; the launch's own codebase when left out
 * @returns the run folder
 * Writes: the plan or build request, launch.json, the work item's text when given as text, and the run's pages; the
 * superseded plan work moves under `earlier/<n>/`; removes stopped.json and, for a plan that changed or has new
 * instructions, the approval marker.
 * Fails: what the launch's checks refuse, and StageOutputMissing or RequestInvalid when the stored plan request is
 * unreadable.
 */
export const recordDeliveryRequest = Effect.fn("recordDeliveryRequest")(function* (
    render: Render,
    launch: DeliveryLaunch,
    cwd: string = startOf(launch),
) {
    const system = yield* System;
    const { request, workItemText } = yield* checkDeliveryLaunch(launch, cwd);
    const layout = runLayout(request.codebase, request.workItemId);
    const path = request.mode === "plan" ? layout.planRequest : layout.buildRequest;
    const planned =
        request.mode === "plan" ? yield* setAsideChangedPlan(layout, request, workItemText?.trimEnd()) : undefined;
    const designChanges = planned?.changes;
    const withDesign =
        request.mode === "plan" && request.fromDesign !== undefined && designChanges !== undefined
            ? { ...request, fromDesign: { ...request.fromDesign, changesPath: designChanges } }
            : request;
    const stored =
        planned === undefined || withDesign.mode !== "plan"
            ? withDesign
            : {
                  ...withDesign,
                  customInstructions: planned.instructions,
              };
    // A plan that stands is resumed as it was: its commit, its approval and the mode the run reached are kept.
    yield* system.writeText(path, JSON.stringify(stored, null, 2));
    if (planned?.resumed !== true) {
        yield* launchMode(layout, request.mode);
    }
    yield* system.remove(layout.stopped);
    if (workItemText !== undefined) {
        yield* system.writeText(layout.workItemMarkdown, `${workItemText}\n`);
    }
    yield* render(layout.root);
    return layout.root;
});
