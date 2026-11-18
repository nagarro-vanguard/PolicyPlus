import { Schema } from "effect";
import type { Kind } from "./documents";

/** Every tag a work item may carry. A codebase maps each to its tracker's label in the root `AGENTS.md`. */
const tags = [
    "epic",
    "story",
    "functional",
    "technical",
    "bug",
    "prototypes",
    "prototypes-ready",
    "modernize",
] as const;

export type Tag = (typeof tags)[number];

/** The tags of a work item as the tracker returned them: decoded here, never trusted. */
export const Tags = Schema.Array(Schema.Literals(tags));

/** What a set of tags runs. */
type Workflow = {
    /** The exact set of tags, in any order. */
    readonly tags: readonly Tag[];
    /** The kind the run's records carry, or `wait` when a person's decision is what the story waits for. */
    readonly kind: Kind | "wait";
    /** The profile in `profiles/` whose guidance the run follows. */
    readonly profile: "build" | "design" | "bug" | "technical";
    /** True when the story carries the legacy attachment the driver passes as `--reference`, which every stage reads. */
    readonly reference?: true;
    /** The tags to move once a run of this workflow is done, for a person who waits to see its result. */
    readonly then?: { readonly remove: readonly Tag[]; readonly add: readonly Tag[] };
};

/**
 * The one place tags meet workflows: each row is a valid set of tags and what it runs. A design that waits for its
 * pick is a row of its own.
 */
export const workflows = [
    { tags: ["story", "functional"], kind: "feature", profile: "build" },
    {
        tags: ["story", "functional", "prototypes"],
        kind: "design",
        profile: "design",
        then: { remove: ["prototypes"], add: ["prototypes-ready"] },
    },
    {
        tags: ["story", "functional", "prototypes-ready"],
        kind: "wait",
        profile: "build",
    },
    { tags: ["story", "technical"], kind: "technical", profile: "technical" },
    { tags: ["story", "bug"], kind: "bug", profile: "bug" },
    { tags: ["story", "functional", "modernize"], kind: "feature", profile: "build", reference: true },
    { tags: ["story", "technical", "modernize"], kind: "technical", profile: "technical", reference: true },
] as const satisfies readonly Workflow[];

/**
 * The tags as a key that does not depend on their order or repeats.
 * @param given a set of tags
 * @returns the sorted, distinct tags joined by a space
 */
const keyOf = (given: readonly string[]) => [...new Set(given)].sort().join(" ");

/**
 * The workflow a work item's tags name.
 * @param given the work item's tags, in any order
 * @returns the workflow, or undefined when the set is not one of the valid sets
 */
export const workflowOf = (given: readonly Tag[]): ((typeof workflows)[number] & { reference?: true }) | undefined =>
    workflows.find((workflow) => keyOf(workflow.tags) === keyOf(given));

/**
 * The profile a kind of run follows.
 * @param kind the kind of a runnable workflow
 * @returns the profile's name, which is also its file's name in `profiles/`
 */
export const profileOfKind = (kind: Kind) => {
    const found = workflows.find((workflow) => workflow.kind === kind);
    if (found === undefined) {
        throw new Error(`no workflow runs the kind ${kind}`);
    }
    return found.profile;
};

/**
 * What a person is told when the tags name no workflow: the valid sets, built from the rows.
 * @param given the work item's tags
 * @returns the message
 */
export const unknownTags = (given: readonly string[]) =>
    `The tags ${given.length === 0 ? "(none)" : given.join(", ")} do not name a workflow. A work item carries exactly one of: ${workflows
        .map((workflow) => `"${workflow.tags.join(" ")}"`)
        .join(", ")}.`;

/**
 * The tags to move once a run of a kind is done, so the people waiting for it can see in the tracker that it is.
 * @param kind the kind of the run that finished
 * @returns the tags to remove and add, or undefined when the run's end changes no tag
 */
export const retagAfter = (kind: Kind) => {
    const found = workflows.find((workflow) => workflow.kind === kind);
    return found !== undefined && "then" in found ? found.then : undefined;
};
