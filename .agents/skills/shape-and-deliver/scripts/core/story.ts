import { createHash } from "node:crypto";
import { Effect, Schema } from "effect";
import { CodebaseContractBroken, RequestInvalid } from "./script-errors";
import { contractGaps, readCodebase } from "./codebase";
import { currentBranch } from "./git";
import { profilePathOf, referenceProfilePath } from "./profile";
import { runLayout, type RunLayout } from "./run-layout";
import { System } from "./system";
import { ApproveLaunch, PlanRequest, type DeliveryLaunch } from "./delivery-request";
import { readStageInput } from "./stage";
import type { Kind } from "./documents";
import { Tags, unknownTags, workflowOf } from "./workflows";

/** What the run remembers about itself between launches. */
const ProfileState = Schema.Struct({
    kind: Schema.Literals(["feature", "bug", "technical", "design"]),
    picked: Schema.optionalKey(Schema.String),
});

/** What the run remembers about itself between launches. */
export type ProfileState = typeof ProfileState.Type;

/**
 * Parses JSON text against a schema.
 * @param schema the shape the text must have
 * @param text the JSON text
 * @param what what the text is, worded for the error
 * @returns the decoded value
 * Fails: RequestInvalid when the text is not JSON of that shape.
 */
const decode = <S extends Schema.Decoder<unknown>>(schema: S, text: string, what: string) =>
    Schema.decodeUnknownEffect(Schema.fromJsonString(schema))(text).pipe(
        Effect.mapError(
            (error) =>
                new RequestInvalid({ issue: `${what} is not in the shape shape-and-deliver reads: ${error.message}` }),
        ),
    );

/** A work item as the driver read it from the tracker and wrote it to a file: optional `tags:`, `# <title>`, then its body. */
type Item = { readonly title: string; readonly body: string; readonly tags: readonly string[] };

/**
 * Reads a text file the driver wrote.
 * @param path the file
 * @param what what the file is, worded for the error
 * @returns the file's text
 * Fails: RequestInvalid when the file is missing.
 */
const readText = Effect.fnUntraced(function* (path: string, what: string) {
    const system = yield* System;
    if (!(yield* system.exists(path))) {
        return yield* new RequestInvalid({ issue: `${what} ${path} does not exist` });
    }
    return yield* system.readText(path);
});

/**
 * Reads the story's legacy attachment, which exactly the workflows with a `reference` take.
 * @param wanted whether the story's workflow carries an attachment
 * @param file the file the operator passed, if any
 * @returns the attachment's text, or undefined when the workflow has none
 * Fails: RequestInvalid when it is missing for a workflow that has one, given for one that has none, or unreadable.
 */
const readReference = Effect.fnUntraced(function* (wanted: boolean, file: string | undefined) {
    if (wanted && file === undefined) {
        return yield* new RequestInvalid({
            issue: `a modernize story carries a legacy attachment: read it as the root AGENTS.md's ## Work tracking says, write it to a file and pass --reference <file>`,
        });
    }
    if (!wanted && file !== undefined) {
        return yield* new RequestInvalid({
            issue: `--reference is for stories tagged modernize; this story's tags carry no attachment, so leave the flag out`,
        });
    }
    return file === undefined ? undefined : yield* readText(file, "the reference file");
});

/**
 * The digest of an attachment's text, which tells a changed attachment from the same one.
 * @param text the attachment's text
 * @returns the digest
 */
const digestOf = (text: string) => createHash("sha256").update(text.replaceAll("\r\n", "\n").trim()).digest("hex");

/**
 * The supporting material a run's agents are pointed to: the epic and the attachment, then the profile and, for an
 * attachment, its addendum.
 * @param layout the run's layout
 * @param kind the kind of work
 * @param hasEpic whether the story has an epic
 * @param reference the story's legacy attachment, when it has one
 * @returns the entries, as the plan request's supporting material
 */
const materialOf = (layout: RunLayout, kind: Kind, hasEpic: boolean, reference: string | undefined) => [
    ...(hasEpic ? [{ path: layout.epic, whatItIs: "the story's epic; read it first" }] : []),
    ...(reference === undefined ? [] : [{ path: layout.reference, whatItIs: "the story's legacy attachment; read it after the epic" }]),
    { path: profilePathOf(kind), whatItIs: "the profile this run is in" },
    ...(reference === undefined ? [] : [{ path: referenceProfilePath, whatItIs: "how to build from the attachment" }]),
];

/**
 * The launch's fields for the attachment: where it is kept and its digest.
 * @param layout the run's layout
 * @param reference the attachment's text, when there is one
 * @returns the fields, or none
 */
const referenceFields = (layout: RunLayout, reference: string | undefined) =>
    reference === undefined ? {} : { reference: layout.reference, referenceDigest: digestOf(reference) };

/**
 * Reads a work item file: an optional front matter between two `---` lines holding `tags: a, b`, then `# <title>` and
 * the body.
 * @param path the file
 * @param what what the file is, worded for the error
 * @returns the item's title, body and tags
 * Fails: RequestInvalid when the file is missing or does not start with `# <title>` after its front matter.
 */
const readItem = Effect.fnUntraced(function* (path: string, what: string) {
    const system = yield* System;
    if (!(yield* system.exists(path))) {
        return yield* new RequestInvalid({ issue: `${what} ${path} does not exist` });
    }
    const lines = (yield* system.readText(path)).trim().split("\n");
    const closing = lines[0]?.trim() === "---" ? lines.findIndex((line, at) => at > 0 && line.trim() === "---") : -1;
    const front = closing < 0 ? [] : lines.slice(1, closing);
    const tagsLine = front.find((line) => line.trim().startsWith("tags:"));
    const tags =
        tagsLine === undefined
            ? []
            : tagsLine
                  .slice(tagsLine.indexOf(":") + 1)
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter((tag) => tag !== "");
    const [first = "", ...rest] = lines.slice(closing + 1);
    if (!first.startsWith("# ")) {
        return yield* new RequestInvalid({ issue: `${what} ${path} does not start with "# <title>"` });
    }
    return { title: first.slice(2).trim(), body: rest.join("\n").trim(), tags } satisfies Item;
});

/**
 * The story as the plan is judged against: its title and body, with line ends and trailing spaces normalised, so a tracker
 * that renders the same story differently is not a change. Its tags are the run's kind and are left out.
 * @param item the story
 * @returns the text
 */
const storyText = (item: Item) =>
    `# ${item.title}\n\n${item.body}`
        .replaceAll("\r\n", "\n")
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .trim();

/** What launching a story needs: its address, the person's instructions, and the codebase. */
export type StoryInput = {
    readonly url: string;
    /** The story as the driver read it from the tracker; required unless a plan is being approved. */
    readonly storyFile: string | undefined;
    /** The story's epic as the driver read it, when the story has one. */
    readonly epicFile: string | undefined;
    /** The story's legacy attachment as the driver wrote it; required by a workflow with a `reference`, refused otherwise. */
    readonly referenceFile?: string | undefined;
    readonly instructions: string | undefined;
    readonly approve: boolean;
    /** The codebase's absolute path; the entry script resolves what the operator typed. */
    readonly codebase: string;
};

/**
 * Takes the story's number from the last part of its address.
 * @param url the address, which may end in a query string
 * @returns the number as text
 * Fails: RequestInvalid when the address does not end in an issue number.
 */
const numberOf = (url: string) => {
    const last =
        url
            .split("?")[0]
            ?.split("/")
            .filter((part) => part !== "")
            .at(-1) ?? "";
    return last !== "" && [...last].every((char) => char >= "0" && char <= "9")
        ? Effect.succeed(last)
        : Effect.fail(new RequestInvalid({ issue: `${url} does not end in an issue number` }));
};

/**
 * Finds the workflow a story's tags name.
 * @param tagged the story's tags
 * @returns the workflow
 * Fails: RequestInvalid when the tags name no workflow or the work item is an epic.
 */
const workflowNamed = Effect.fnUntraced(function* (tagged: readonly string[]) {
    const decoded = yield* Schema.decodeUnknownEffect(Tags)(tagged).pipe(
        Effect.mapError(() => new RequestInvalid({ issue: unknownTags(tagged) })),
    );
    if (decoded.includes("epic")) {
        return yield* new RequestInvalid({ issue: "this work item is an epic: it is cut into stories, not delivered" });
    }
    const workflow = workflowOf(decoded);
    if (workflow === undefined) {
        return yield* new RequestInvalid({ issue: unknownTags(tagged) });
    }
    return workflow;
});

/**
 * Decides the kind of work a story runs as now, from the workflow its tags name: a design stays a design until a
 * variant is picked, and then the story is built.
 * @param workflow the workflow the story's tags name
 * @param earlier what the run remembers of itself
 * @returns the kind
 * Fails: RequestInvalid when the story waits for a person's pick.
 */
const kindNow = Effect.fnUntraced(function* (
    workflow: Effect.Success<ReturnType<typeof workflowNamed>>,
    earlier: ProfileState | undefined,
) {
    if (workflow.kind === "wait" && earlier?.picked !== undefined) {
        return "feature" as const;
    }
    if (workflow.kind === "wait") {
        return yield* new RequestInvalid({
            issue: "this story waits for the stakeholders to pick a variant: record the pick, then start it again",
        });
    }
    return workflow.kind === "design" && earlier?.picked !== undefined ? ("feature" as const) : workflow.kind;
});

/**
 * Finds the design a build follows: the picked variant, read from the plan request an earlier launch left. A later launch of the build keeps what its first launch recorded.
 * @param layout the run's layout
 * @param kind the kind the story starts as now
 * @param picked the variant picked, when one was
 * @returns the design, or undefined when the run is not a build after a design
 * Fails: StageOutputMissing, RequestInvalid.
 */
const designBehind = Effect.fnUntraced(function* (layout: RunLayout, kind: Kind, picked: string | undefined) {
    const system = yield* System;
    if (kind !== "feature" || picked === undefined || !(yield* system.exists(layout.planRequest))) {
        return undefined;
    }
    const earlier = yield* readStageInput("launch", layout.planRequest, PlanRequest);
    if (earlier.kind === "design") {
        return { variant: picked };
    }
    return earlier.fromDesign === undefined ? undefined : { variant: earlier.fromDesign.variant };
});

/**
 * Reads the approval marker a passed plan review left, and the branch now checked out.
 * @param layout the run's layout
 * @param number the story's number
 * @param root the codebase root
 * @param kind the kind the run remembers
 * @returns the typed approval launch, the branch and the kind
 * Fails: RequestInvalid when no plan passed review or the marker is unreadable as an approval, GitFailed.
 */
const approvalLaunch = Effect.fnUntraced(function* (layout: RunLayout, number: string, root: string, kind: Kind) {
    const system = yield* System;
    if (!(yield* system.exists(layout.implementRequest))) {
        return yield* new RequestInvalid({
            issue: `story ${number} has no plan that passed review, so there is nothing to approve; when the plan changed after its review, run next.ts to have it reviewed again`,
        });
    }
    const launch: DeliveryLaunch = yield* decode(
        ApproveLaunch,
        yield* system.readText(layout.implementRequest),
        "the plan's approval marker",
    );
    return { launch, branch: yield* currentBranch(root), kind };
});

/**
 * Builds the typed launch for a story: it reads the story, decides its kind, checks the profiles and the checked-out
 * branch, and records the epic and the run's profile state. With `approve` it only reads the approval a passed plan
 * review left.
 * @param input the story's address, the person's instructions and the codebase
 * @returns the launch, the branch and the kind
 * Writes: the epic file when the story has an epic, the profile file.
 * Fails: RequestInvalid, CodebaseContractBroken, GitFailed, StageOutputMissing, FileNotFound, FileUnreadable,
 * WriteFailed.
 */
export const launchStory = Effect.fn("Story.launchStory")(function* (input: StoryInput) {
    const system = yield* System;
    const root = input.codebase;
    const number = yield* numberOf(input.url);
    const layout = runLayout(root, number);
    const earlier = (yield* system.exists(layout.profile))
        ? yield* decode(ProfileState, yield* system.readText(layout.profile), "the run's profile file")
        : undefined;
    if (input.approve) {
        return yield* approvalLaunch(layout, number, root, earlier?.kind ?? "feature");
    }
    const gaps = contractGaps(yield* readCodebase(root), "shape-and-deliver, reading a story");
    if (gaps.length > 0) {
        return yield* new CodebaseContractBroken({ issue: gaps.join("; ") });
    }
    if (input.storyFile === undefined) {
        return yield* new RequestInvalid({
            issue: `read the story from the tracker as the root AGENTS.md's ## Work tracking says, write it to a file as "# <title>" and its body, and pass --story <file>`,
        });
    }
    const story = yield* readItem(input.storyFile, "the story file");
    const workflow = yield* workflowNamed(story.tags);
    const kind = yield* kindNow(workflow, earlier);
    const reference = yield* readReference("reference" in workflow, input.referenceFile);
    const branch = yield* currentBranch(root);
    const epic = input.epicFile === undefined ? undefined : yield* readItem(input.epicFile, "the epic file");
    if (epic !== undefined) {
        yield* system.writeText(layout.epic, `# ${epic.title}\n\n${epic.body}\n`);
    }
    if (reference !== undefined) {
        yield* system.writeText(layout.reference, reference);
    }
    const material = materialOf(layout, kind, epic !== undefined, reference);
    yield* rememberProfile(layout, { kind, ...(earlier?.picked === undefined ? {} : { picked: earlier.picked }) });
    const fromDesign = yield* designBehind(layout, kind, earlier?.picked);
    const launch: DeliveryLaunch = {
        mode: "plan",
        kind,
        codebase: root,
        workItemId: number,
        workItem: input.url,
        supportingMaterial: material,
        customInstructions: input.instructions ?? "",
        story: storyText(story),
        ...referenceFields(layout, reference),
        ...(fromDesign === undefined ? {} : { fromDesign }),
    };
    return { launch, branch, kind };
});

/**
 * Saves what the run remembers about itself between launches, in the one shape that is read back.
 * @param layout the run's layout
 * @param state the profile state
 * @returns nothing once written
 * Writes: the run's profile file.
 */
export const rememberProfile = Effect.fn("Story.rememberProfile")(function* (layout: RunLayout, state: ProfileState) {
    yield* (yield* System).writeText(layout.profile, JSON.stringify(state, null, 2));
});
