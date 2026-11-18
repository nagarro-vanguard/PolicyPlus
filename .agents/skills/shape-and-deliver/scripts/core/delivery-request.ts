import { isAbsolute, resolve } from "node:path";
import { Effect, Schema } from "effect";
import {
    ArtifactsFolderNotIgnored,
    CodebaseContractBroken,
    PlanReviewNotPassed,
    RequestInvalid,
    StageOutputMissing,
} from "./script-errors";
import { System } from "./system";
import { contractGaps, readCodebase } from "./codebase";
import { isIgnored } from "./git";
import { Kind } from "./documents";
import { Text } from "./records";
import { artifactsFolder, runLayout } from "./run-layout";

export const PlanRequest = Schema.Struct({
    mode: Schema.Literal("plan"),
    kind: Kind,
    codebase: Text,
    workItemId: Text,
    workItemUrl: Schema.optionalKey(Text),
    supportingMaterial: Schema.Array(Schema.Struct({ path: Text, whatItIs: Schema.String })),
    customInstructions: Schema.String,
    /** The story's title and body when the plan began, so a story edited since starts the plan again. */
    story: Schema.optionalKey(Schema.String),
    /** The story's legacy attachment, kept in the run folder, and a digest of its text, so a changed one starts the plan again. */
    reference: Schema.optionalKey(Text),
    referenceDigest: Schema.optionalKey(Schema.String),
    /** Set when this build follows a picked design: its variant, and where its code changes went. */
    fromDesign: Schema.optionalKey(Schema.Struct({ variant: Text, changesPath: Schema.optionalKey(Text) })),
});

export type PlanRequest = typeof PlanRequest.Type;

export const ImplementRequest = Schema.Struct({
    mode: Schema.Literal("implement"),
    codebase: Text,
    workItemId: Text,
    customInstructions: Schema.String,
});

export type ImplementRequest = typeof ImplementRequest.Type;

/** What a driver gives to start or restart the plan of a work item. */
export const PlanLaunch = Schema.Struct({
    mode: Schema.Literal("plan"),
    kind: Kind,
    /** The folder whose root AGENTS.md lists the layers. */
    codebase: Text,
    /** The id the run folder is named after; it may be left out when the work item is a tracker URL. */
    workItemId: Schema.optionalKey(Text),
    /** A tracker URL, or the work item as text. */
    workItem: Text,
    supportingMaterial: Schema.optionalKey(Schema.Array(Schema.Struct({ path: Text, whatItIs: Schema.String }))),
    /** The approver's words; they focus or refine the work and never widen it. */
    customInstructions: Schema.optionalKey(Schema.String),
    /** The story's title and body, as the driver read them from the tracker. */
    story: Schema.optionalKey(Schema.String),
    /** The story's legacy attachment, as kept in the run folder, and a digest of its text. */
    reference: Schema.optionalKey(Text),
    referenceDigest: Schema.optionalKey(Schema.String),
    /** Set when the build follows a picked design: the variant. */
    fromDesign: Schema.optionalKey(Schema.Struct({ variant: Text })),
});

export type PlanLaunch = typeof PlanLaunch.Type;

/** What a driver gives to approve a plan that has passed review, and build it. */
export const ApproveLaunch = Schema.Struct({
    mode: Schema.Literal("implement"),
    codebase: Text,
    workItemId: Text,
    customInstructions: Schema.optionalKey(Schema.String),
});

export type ApproveLaunch = typeof ApproveLaunch.Type;

/** The typed request every driver gives shape-and-deliver: the coding agent's `start` script and the app's adapter alike. */
export const DeliveryLaunch = Schema.Union([PlanLaunch, ApproveLaunch]);

export type DeliveryLaunch = typeof DeliveryLaunch.Type;

const launchHelp = [
    'The launch is JSON: a plan `{ mode: "plan", kind, codebase, workItem, workItemId?, supportingMaterial?, customInstructions? }` or an approval `{ mode: "implement", codebase, workItemId, customInstructions? }`.',
    "`kind` is feature, bug, technical or design; `codebase` is the folder whose root AGENTS.md lists the layers; `workItem` is a tracker URL or the work item as text, and `workItemId` names the run folder (it may be left out for a URL); `supportingMaterial` is `[{ path, whatItIs }]`.",
    "An approval runs only for a plan whose review has passed, which plan mode marks in the run folder; sending it approves the plan.",
    "`customInstructions` (optional) focuses or refines the work; it never widens it.",
].join(" ");

/**
 * The error for a launch that breaks one of the rules `launchHelp` states.
 * @param issue what is wrong, as the operator reads it
 * @returns the error
 */
const invalid = (issue: string) => new RequestInvalid({ issue });

/**
 * A tracker URL's last path part, as the id of the work item it names.
 * @param url the URL
 * @returns the id, lower case
 */
const idOfUrl = (url: string) =>
    (
        (url.split("?")[0] ?? "")
            .split("/")
            .filter((part) => part.length > 0)
            .at(-1) ?? ""
    ).toLowerCase();

/**
 * Whether an id can name a folder: letters, digits, dots, dashes and underscores only.
 * @param id the id
 * @returns true when it is usable
 */
const isUsableId = (id: string) =>
    id.length > 0 &&
    [...id].every(
        (char) =>
            (char >= "a" && char <= "z") ||
            (char >= "A" && char <= "Z") ||
            (char >= "0" && char <= "9") ||
            ".-_".includes(char),
    );

/**
 * Check the codebase's AGENTS.md files give the run what the kind of work reads from them.
 * @param codebase the codebase root
 * @param kind the kind of work
 * @returns nothing when they do
 * Fails: CodebaseContractBroken, naming each gap.
 */
const checkContract = Effect.fnUntraced(function* (codebase: string, kind: string) {
    const gaps = contractGaps(yield* readCodebase(codebase), "shape-and-deliver", kind);
    if (gaps.length > 0) {
        return yield* new CodebaseContractBroken({ issue: gaps.join("; ") });
    }
});

/**
 * Check git ignores the runs' folder.
 * @param codebase the codebase root
 * @returns nothing when it does
 * Fails: ArtifactsFolderNotIgnored.
 */
const checkRunsFolderIgnored = Effect.fnUntraced(function* (codebase: string) {
    if (!(yield* isIgnored(codebase, `${artifactsFolder}/`))) {
        return yield* new ArtifactsFolderNotIgnored({ folder: `${codebase}/${artifactsFolder}/` });
    }
});

/**
 * The optional parts of a plan launch the request keeps as they are: the story, the legacy attachment and the design.
 * @param launch the plan launch
 * @param absolute how a path in the launch is made absolute
 * @returns the parts the launch has
 */
const carried = (launch: PlanLaunch, absolute: (given: string) => string) => ({
    ...(launch.story === undefined ? {} : { story: launch.story }),
    ...(launch.reference === undefined
        ? {}
        : { reference: absolute(launch.reference), referenceDigest: launch.referenceDigest }),
    ...(launch.fromDesign === undefined ? {} : { fromDesign: launch.fromDesign }),
});

/**
 * Check a plan launch (its work item id, supporting material, the codebase's contract and the branch) and make its
 * plan request.
 * @param launch the plan launch
 * @param codebase the codebase root
 * @param absolute how a path in the launch is made absolute
 * @returns the plan request, and the work item's text when it was given as text
 * Fails: RequestInvalid for an unusable work item id or a missing supporting file.
 */
const readPlanRequest = Effect.fnUntraced(function* (
    launch: PlanLaunch,
    codebase: string,
    absolute: (given: string) => string,
) {
    const system = yield* System;
    const { kind } = launch;
    const workItem = launch.workItem.trim();
    const isUrl = !workItem.includes("\n") && (workItem.startsWith("https://") || workItem.startsWith("http://"));
    const workItemId = launch.workItemId ?? (isUrl ? idOfUrl(workItem) : "");
    if (!isUsableId(workItemId)) {
        return yield* invalid(
            "workItemId is required for a work item written as text, using letters, digits, dots, dashes and underscores",
        );
    }
    const supportingMaterial = (launch.supportingMaterial ?? []).map((material) => ({
        path: absolute(material.path),
        whatItIs: material.whatItIs,
    }));
    for (const material of supportingMaterial) {
        if (!(yield* system.exists(material.path))) {
            return yield* invalid(`supporting material ${material.path} does not exist`);
        }
    }
    yield* checkContract(codebase, kind);
    yield* checkRunsFolderIgnored(codebase);
    const request: PlanRequest = {
        mode: "plan",
        kind,
        codebase,
        workItemId,
        ...(isUrl ? { workItemUrl: workItem } : {}),
        supportingMaterial,
        customInstructions: (launch.customInstructions ?? "").trim(),
        ...carried(launch, absolute),
    };
    return { request, workItemText: isUrl ? undefined : workItem };
});

/**
 * Check an approval and make the implement request. The plan must have passed review.
 * @param launch the approval
 * @param codebase the codebase root
 * @returns the implement request
 * Fails: PlanReviewNotPassed without the approval marker, StageOutputMissing without the plan request.
 */
const readImplementRequest = Effect.fnUntraced(function* (launch: ApproveLaunch, codebase: string) {
    const layout = runLayout(codebase, launch.workItemId);
    const system = yield* System;
    if (!(yield* system.exists(layout.implementRequest))) {
        return yield* new PlanReviewNotPassed({ path: layout.implementRequest });
    }
    if (!(yield* system.exists(layout.planRequest))) {
        return yield* new StageOutputMissing({ stage: "implement", path: layout.planRequest });
    }
    yield* checkRunsFolderIgnored(codebase);
    const request: ImplementRequest = {
        mode: "implement",
        codebase,
        workItemId: launch.workItemId,
        customInstructions: (launch.customInstructions ?? "").trim(),
    };
    return request;
});

/**
 * Read a typed launch from its JSON text.
 * @param text the JSON text
 * @returns the launch, a plan or an approval
 * Fails: RequestInvalid, with the launch's shape in its message, when the text is not a launch.
 */
export const decodeDeliveryLaunch = (text: string) =>
    Schema.decodeUnknownEffect(Schema.fromJsonString(DeliveryLaunch))(text).pipe(
        Effect.mapError((error) =>
            invalid(`the launch is not in the shape shape-and-deliver reads: ${error.message}. ${launchHelp}`),
        ),
    );

/**
 * Check a launch by the rules `launchHelp` states and the codebase by its AGENTS.md contract, and make the request the
 * run stores.
 * @param launch the launch
 * @param cwd the folder the launch's relative paths start from
 * @returns the plan or implement request, and for a plan given as text, the work item's text
 * Fails: RequestInvalid, CodebaseContractBroken, ArtifactsFolderNotIgnored, PlanReviewNotPassed,
 * StageOutputMissing.
 */
export const checkDeliveryLaunch = Effect.fn("DeliveryRequest.checkDeliveryLaunch")(function* (
    launch: DeliveryLaunch,
    cwd: string,
) {
    const absolute = (given: string) => (isAbsolute(given) ? given : resolve(cwd, given));
    const codebase = absolute(launch.codebase);
    yield* readCodebase(codebase);
    if (launch.mode === "plan") {
        return yield* readPlanRequest(launch, codebase, absolute);
    }
    return { request: yield* readImplementRequest(launch, codebase), workItemText: undefined };
});
