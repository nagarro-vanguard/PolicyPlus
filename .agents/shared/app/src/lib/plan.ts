import { slugify } from "./slugs";

// The model of a modernization plan the pages are built from: ordering, grouping, addresses, progress and coverage. No
// page logic and no file access, so each function can be tested on its own. The shapes are the plan skill's plan.json,
// narrowed to what the pages read.

export type StoryKey = string;

export type PlanStory = {
    readonly key: StoryKey;
    readonly title: string;
    readonly what: string;
    readonly why: string;
    readonly actions: readonly string[];
    readonly terms: readonly { readonly name: string; readonly means: string; readonly entity?: string | undefined }[];
    readonly journey?: { readonly name: string; readonly steps: readonly string[] } | undefined;
    readonly criteria: readonly { readonly says: string }[];
    readonly sequence: number;
    readonly phase: number;
    readonly epic: string;
    readonly kind: "functional" | "technical";
    readonly builder: string;
    readonly tags: readonly string[];
    readonly blockedBy: readonly StoryKey[];
    readonly builds: readonly string[];
    readonly reliesOn: readonly { readonly rule: string; readonly builtBy: StoryKey }[];
    readonly capability?: string | undefined;
    readonly surface?: string | undefined;
    /** The ids of the target journey steps it delivers, for a story of a confirmed target. */
    readonly steps?: readonly string[] | undefined;
    readonly components?: readonly string[] | undefined;
};

export type PlanEpic = {
    readonly key: string;
    readonly kind: "functional" | "technical";
    readonly title: string;
    readonly outcome: string;
    readonly comesAfter: readonly string[];
    readonly stories: readonly StoryKey[];
    readonly sequence: number;
};

export type PlanPhase = {
    readonly number: number;
    readonly name: string;
    readonly why: string;
    readonly stories: readonly StoryKey[];
};

export type PlanLayer = {
    readonly id: string;
    readonly name: string;
    readonly path: string;
    readonly kind: string;
    readonly purpose: string;
    readonly check: string;
    readonly dependsOn: readonly string[];
};

export type PlanDecision = {
    readonly id: string;
    readonly topic:
        | { readonly _tag: "convention" }
        | { readonly _tag: "integration"; readonly system: string }
        | { readonly _tag: "scope"; readonly capability: string }
        | { readonly _tag: "note"; readonly number: number }
        | { readonly _tag: "area"; readonly name: string };
    readonly layer: string;
    readonly chose: string;
    readonly reason: string;
};

export type PlanCoverage = {
    readonly capabilities: readonly {
        readonly name: string;
        readonly scope: string;
        readonly surfaces: readonly {
            readonly name: string;
            readonly actions: readonly {
                readonly id: string;
                readonly name: string;
                readonly story: StoryKey | null;
            }[];
        }[];
    }[];
    readonly rulesBuilt: number;
    readonly rulesTotal: number;
    readonly unplanned: readonly {
        readonly what: string;
        readonly file: string;
        readonly firstLine: number;
        readonly lastLine: number;
    }[];
};

export type Plan = {
    readonly layers: readonly PlanLayer[];
    readonly decisions: readonly PlanDecision[];
    readonly epics: readonly PlanEpic[];
    readonly phases: readonly PlanPhase[];
    readonly stories: readonly PlanStory[];
    readonly coverage: PlanCoverage;
};

export type Prompts = {
    readonly epics: Readonly<Record<string, string>>;
    readonly scaffold: string;
    readonly deliver: Readonly<Record<StoryKey, string>>;
};

export type Ledger = {
    readonly reviewed?: string | undefined;
    readonly items: Readonly<Record<string, { readonly status: string }>>;
};

export const statuses = ["planned", "created", "branched", "approved", "built", "merged", "blocked", "failed"] as const;
export type Status = (typeof statuses)[number];

const pad = (n: number, width: number) => String(n).padStart(width, "0");

/**
 * The address of a story's page, from its place in the strict order and its title, never from its key: the same story
 * keeps its address while the plan is unchanged, and no address carries a record id.
 * @param story the story
 * @returns the path below the site's root, without the extension
 */
export const storyPath = (story: Pick<PlanStory, "sequence" | "title">) =>
    `plan/story/${pad(story.sequence, 3)}-${slugify(story.title)}`;

/**
 * The address of an epic's page, from its place in the order of epics and its title.
 * @param epic the epic
 * @returns the path below the site's root, without the extension
 */
export const epicPath = (epic: Pick<PlanEpic, "sequence" | "title">) =>
    `plan/epic/${pad(epic.sequence, 2)}-${slugify(epic.title)}`;

/** The addresses of the pages that are one each. */
export const planHomePath = "plan";
export const foundationPath = "plan/foundation";
export const coveragePath = "plan/coverage";

/**
 * The stories in the one strict order of the plan.
 * @param plan the plan
 * @returns the stories by sequence
 */
export const storiesInOrder = (plan: Pick<Plan, "stories">) =>
    plan.stories.toSorted((one, other) => one.sequence - other.sequence);

/**
 * The epics in the order they are created: the foundation first, then capabilities.
 * @param plan the plan
 * @returns the epics by sequence
 */
export const epicsInOrder = (plan: Pick<Plan, "epics">) =>
    plan.epics.toSorted((one, other) => one.sequence - other.sequence);

/**
 * The phases in order, each with its stories in sequence.
 * @param plan the plan
 * @returns the phases with their stories
 */
export const phasesWithStories = (plan: Pick<Plan, "phases" | "stories">) => {
    const byKey = new Map(plan.stories.map((story) => [story.key, story] as const));
    return plan.phases
        .toSorted((one, other) => one.number - other.number)
        .map((phase) => ({
            ...phase,
            stories: phase.stories
                .flatMap((key) => {
                    const story = byKey.get(key);
                    return story === undefined ? [] : [story];
                })
                .toSorted((one, other) => one.sequence - other.sequence),
        }));
};

/**
 * What a story's epic is, and the stories of an epic in sequence.
 * @param plan the plan
 * @param epic the epic
 * @returns the epic's stories by sequence
 */
export const storiesOfEpic = (plan: Pick<Plan, "stories">, epic: Pick<PlanEpic, "key">) =>
    storiesInOrder(plan).filter((story) => story.epic === epic.key);

/**
 * The epics that must be created before an epic, in creation order, each with the reason it is listed: the epics it
 * names as coming first. Every epic also waits for the one before it in sequence; that one is named apart.
 * @param plan the plan
 * @param epic the epic
 * @returns the epics that come first and the epic just before it, if any
 */
export const epicsBefore = (plan: Pick<Plan, "epics">, epic: Pick<PlanEpic, "comesAfter" | "sequence">) => {
    const ordered = epicsInOrder(plan);
    const first = ordered.filter((each) => epic.comesAfter.includes(each.key));
    const previous = ordered.findLast((each) => each.sequence < epic.sequence);
    return { first, previous };
};

/**
 * The stories that must be merged before a story, as stories, in sequence.
 * @param plan the plan
 * @param story the story
 * @returns its blockers
 */
export const blockersOf = (plan: Pick<Plan, "stories">, story: Pick<PlanStory, "blockedBy">) =>
    storiesInOrder(plan).filter((each) => story.blockedBy.includes(each.key));

/**
 * What a story relies on that other stories build: how many rules, grouped by the story that builds them.
 * @param plan the plan
 * @param story the story
 * @returns each building story with the count of rules, in sequence
 */
export const reliedOn = (plan: Pick<Plan, "stories">, story: Pick<PlanStory, "reliesOn">) => {
    const counts = Map.groupBy(story.reliesOn, (each) => each.builtBy);
    return storiesInOrder(plan).flatMap((each) => {
        const rules = counts.get(each.key);
        return rules === undefined ? [] : [{ story: each, rules: rules.length }];
    });
};

/**
 * Where a story stands in delivery; a story the ledger does not know is planned.
 * @param ledger the ledger, when there is one
 * @param key the work item's key
 * @returns its status
 */
export const statusOf = (ledger: Ledger | undefined, key: string): Status => {
    const found = ledger?.items[key]?.status;
    return statuses.find((status) => status === found) ?? "planned";
};

/**
 * How far delivery has come: the stories by status, and the legacy rules built by merged stories over all of them.
 * @param plan the plan
 * @param ledger the ledger, when there is one
 * @param stories which stories to count; all when omitted
 * @returns the count of stories per status (every status present), the merged count and the rules
 */
export const progressOf = (plan: Pick<Plan, "stories" | "coverage">, ledger: Ledger | undefined, stories = plan.stories) => {
    const byStatus = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<Status, number>;
    let rulesBuilt = 0;
    for (const story of stories) {
        const status = statusOf(ledger, story.key);
        byStatus[status] += 1;
        if (status === "merged") {
            rulesBuilt += story.builds.length;
        }
    }
    return {
        stories: stories.length,
        byStatus,
        merged: byStatus.merged,
        rulesBuilt,
        rulesTotal: plan.coverage.rulesTotal,
        rulesPlanned: plan.coverage.rulesBuilt,
    };
};

const topicOrder = ["scope", "integration", "convention", "area", "note"] as const;
export type Topic = (typeof topicOrder)[number];

/**
 * What a decision is about, in a few words for a reader: the capability, the outside system, the layer's convention,
 * the area or the note.
 * @param decision the decision
 * @param layerName the name of the layer it governs, or the workspace
 * @returns the subject
 */
export const subjectOf = (decision: PlanDecision, layerName: string) => {
    switch (decision.topic._tag) {
        case "scope":
            return decision.topic.capability;
        case "integration":
            return decision.topic.system;
        case "area":
            return decision.topic.name;
        case "note":
            return `Note ${decision.topic.number}`;
        case "convention":
            return layerName;
    }
};

/**
 * Every decision grouped by topic, in a fixed order of topics, each group in the order the plan holds them.
 * @param decisions the decisions
 * @returns the non-empty groups
 */
export const decisionsByTopic = (decisions: readonly PlanDecision[]) =>
    topicOrder.flatMap((topic) => {
        const own = decisions.filter((decision) => decision.topic._tag === topic);
        return own.length === 0 ? [] : [{ topic, decisions: own }];
    });

/**
 * The name of a layer by id; the workspace is its own name.
 * @param plan the plan
 * @param id the layer's id, or `workspace`
 * @returns the name
 */
export const layerName = (plan: Pick<Plan, "layers">, id: string) =>
    id === "workspace" ? "Workspace" : (plan.layers.find((layer) => layer.id === id)?.name ?? id);

/**
 * The folder an AGENTS.md preview of a layer is kept in, below the previews' folder: the slug of the layer's name.
 * @param layer the layer
 * @returns the folder name
 */
export const previewFolder = (layer: Pick<PlanLayer, "name">) => slugify(layer.name);

/**
 * The coverage tree of the plan: each capability, its surfaces, and under each surface the stories that build its
 * actions, with the counts at every level.
 * @param plan the plan
 * @returns the tree
 */
export const coverageTree = (plan: Pick<Plan, "stories" | "coverage">) => {
    const byKey = new Map(plan.stories.map((story) => [story.key, story] as const));
    return plan.coverage.capabilities.map((capability) => {
        const surfaces = capability.surfaces.map((surface) => {
            const grouped = Map.groupBy(surface.actions, (action) => action.story ?? "");
            const stories = [...grouped]
                .flatMap(([key, actions]) => {
                    const story = byKey.get(key);
                    return story === undefined ? [] : [{ story, actions }];
                })
                .toSorted((one, other) => one.story.sequence - other.story.sequence);
            const without = grouped.get("") ?? [];
            return { name: surface.name, stories, without, ids: surface.actions.map((action) => action.id), actions: surface.actions.length };
        });
        const storyKeys = new Set(surfaces.flatMap((surface) => surface.stories.map((each) => each.story.key)));
        return {
            name: capability.name,
            scope: capability.scope,
            surfaces,
            actions: surfaces.reduce((sum, surface) => sum + surface.actions, 0),
            stories: storyKeys.size,
        };
    });
};

/**
 * What is wrong with a plan as the pages would show it: a story an epic or phase names that is not there, a story or
 * epic without its prompt, an action no story builds in a carried capability, an address two pages share.
 * @param plan the plan
 * @param prompts the prompts
 * @returns the problems, in words; none when the plan can be shown
 */
export const planProblems = (plan: Plan, prompts: Prompts) => {
    const problems: string[] = [];
    const stories = new Set(plan.stories.map((story) => story.key));
    const epics = new Set(plan.epics.map((epic) => epic.key));
    for (const epic of plan.epics) {
        if (prompts.epics[epic.key] === undefined) problems.push(`the epic "${epic.title}" has no prompt`);
        for (const key of epic.stories) if (!stories.has(key)) problems.push(`the epic "${epic.title}" names a story that is not in the plan`);
        for (const key of epic.comesAfter) if (!epics.has(key)) problems.push(`the epic "${epic.title}" comes after an epic that is not in the plan`);
    }
    for (const phase of plan.phases) {
        for (const key of phase.stories) if (!stories.has(key)) problems.push(`the phase "${phase.name}" names a story that is not in the plan`);
    }
    for (const story of plan.stories) {
        if (prompts.deliver[story.key] === undefined) problems.push(`the story "${story.title}" has no prompt`);
        if (!epics.has(story.epic)) problems.push(`the story "${story.title}" is in an epic that is not in the plan`);
        for (const key of story.blockedBy) if (!stories.has(key)) problems.push(`the story "${story.title}" is blocked by a story that is not in the plan`);
    }
    for (const capability of plan.coverage.capabilities) {
        for (const surface of capability.surfaces) {
            for (const action of surface.actions) {
                if (action.story !== null && !stories.has(action.story)) problems.push(`an action of "${capability.name}" is built by a story that is not in the plan`);
                if (action.story === null && capability.scope === "carry" && !action.name.includes("(not carried:")) problems.push(`an action of "${capability.name}" has no story`);
            }
        }
    }
    const addresses = [...plan.stories.map(storyPath), ...plan.epics.map(epicPath)];
    if (new Set(addresses).size !== addresses.length) problems.push("two pages would share an address");
    return problems;
};

/**
 * The phase a story is in, as the plan names it.
 * @param plan the plan
 * @param story the story
 * @returns the phase, if the plan has it
 */
export const phaseOf = (plan: Pick<Plan, "phases">, story: Pick<PlanStory, "phase">) =>
    plan.phases.find((phase) => phase.number === story.phase);
