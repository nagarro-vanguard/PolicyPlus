import { workflowOf, type Tag } from "../../../../skills/shape-and-deliver/scripts/core/workflows";
import { compareText, distinct } from "../io";
import type { PlanInput } from "../inputs/plan";
import type { RequestInput } from "../inputs/plan";
import type { ArchitectureView, ProposedJourney, StepTrace } from "./journeys";
import { sortByText } from "./text";
import { workLabels, type WorkLabel } from "./work";

export { workLabels, type WorkLabel } from "./work";

/*
 * The plan's views, every join made here: who each story unblocks, which stories are ready to start under the
 * conductor's rule, the layers each story and phase is built in, the journey by domain matrix with the stories of each
 * cell, and the challenges that survived review.
 */

export type StoryView = {
    key: string;
    title: string;
    what: string;
    why: string;
    kind: string;
    tags: string[];
    /**
     * What the tags run: the workflow's profile, and the kind of work in plain words from compose's closed catalogue
     * (`workLabels`); null when the tag set names no workflow.
     */
    work: { profile: string; reference: boolean; label: WorkLabel; words: string } | null;
    phase: number;
    epic: string;
    sequence: number;
    blockedBy: string[];
    unblocks: string[];
    builds: string[];
    reliesOn: string[];
    actions: string[];
    steps: string[];
    components: string[];
    domains: string[];
    layers: string[];
    capability: string | null;
    surface: string | null;
    /** The acceptance criteria: Given, When and Then when the sentence follows that pattern, else the sentence alone. */
    criteria: Criterion[];
    /** What the plan leaves unsettled for this story, one question each, as the plan wrote them. */
    open: string[];
    /** The reviewers' challenges about this story that are not settled. */
    challenges: string[];
    status: string;
    split: { part: string; from: string } | null;
};

export type PlanViews = {
    stories: StoryView[];
    epics: {
        key: string;
        kind: string;
        title: string;
        outcome: string;
        journey: string | null;
        label: string;
        comesAfter: string[];
        stories: string[];
        sequence: number;
    }[];
    phases: { number: number; name: string; why: string; stories: string[]; epics: string[]; builtIn: string[] }[];
    layers: {
        id: string;
        name: string;
        path: string;
        kind: string;
        purpose: string;
        role: string | null;
        container: string | null;
        dependsOn: string[];
        stack: string[];
        stories: string[];
    }[];
    decisions: { id: string; layer: string; chose: string; reason: string }[];
    ready: string[];
    matrix: {
        journeys: string[];
        domains: string[];
        cells: { journey: string; domain: string; steps: string[]; stories: string[] }[];
        rowTotals: Record<string, number>;
        columnTotals: Record<string, number>;
        total: number;
    } | null;
    conflicts: { stage: string; variant: string; says: string; resolved: boolean | null }[];
    coverage: { rulesBuilt: number; rulesTotal: number };
    /** The code the plan lists as reached by nothing it could follow, so no story builds it. */
    unplanned: { name: string; file: string; firstLine: number; lastLine: number }[];
    /** True when what the plan was built from changed since; null when the plan cannot say. */
    stale: boolean | null;
};

export type Criterion = {
    says: string;
    given: string | null;
    when: string | null;
    then: string | null;
    /** What it rests on: a legacy rule, a state change, a decision, a layer or a journey step, by kind and key. */
    from: { kind: string; id: string }[];
};


const workLabelOf = (kind: string, reference: boolean): WorkLabel =>
    kind === "design" || kind === "wait"
        ? "designed"
        : kind === "bug"
          ? "fix"
          : kind === "technical"
            ? reference
                ? "technical-rebuilt"
                : "technical"
            : reference
              ? "rebuilt"
              : "feature";

const givenWhenThen = /^\s*given\s+([\s\S]+?),\s+when\s+([\s\S]+?),\s+then\s+([\s\S]+?)\s*$/iu;

const criterionOf = (says: string, from: readonly { _tag: string; id: string }[]): Criterion => {
    const match = givenWhenThen.exec(says);
    const part = (text: string | undefined) => (text === undefined ? null : text.replace(/\.$/u, "").trim());
    return {
        says,
        given: part(match?.[1]),
        when: part(match?.[2]),
        then: part(match?.[3]),
        from: from.map((each) => ({ kind: each._tag, id: each.id })),
    };
};

/** The matrix column of steps no component serves. */
export const notPlaced = "";

/**
 * Build the plan's views.
 * @param input the plan
 * @param request the person's request, for the stack lines each layer carries
 * @param journeys the chosen journeys, when there is a target
 * @param architecture the chosen architecture, when there is one
 * @param trace the trace of each chosen step
 * @param disputes the target's surviving challenges
 * @returns the views
 */
export const planViewsOf = (
    input: PlanInput,
    request: RequestInput | undefined,
    journeys: readonly ProposedJourney[],
    architecture: ArchitectureView | undefined,
    trace: readonly StepTrace[],
    disputes: readonly { stage: string; variant: string; says: string }[],
    plain: (text: string) => string = (text) => text,
): PlanViews => {
    const { plan } = input;
    const storyKeys = new Set(plan.stories.map((story) => story.key));
    const challengesOf = new Map<string, string[]>();
    for (const each of plan.conflicts ?? [])
        if (!each.resolved && storyKeys.has(each.variant))
            challengesOf.set(each.variant, [...(challengesOf.get(each.variant) ?? []), plain(each.says)]);
    const status = (key: string) => input.status.get(key) ?? "planned";
    const domainOf = new Map((architecture?.components ?? []).map((component) => [component.name, component.domain]));
    const domainOfRule = new Map(
        (architecture?.domains ?? []).flatMap((domain) => domain.rules.map((rule) => [rule, domain.name] as const)),
    );
    const unblocks = new Map<string, string[]>();
    for (const story of plan.stories)
        for (const blocker of story.blockedBy) unblocks.set(blocker, [...(unblocks.get(blocker) ?? []), story.key]);
    const stories: StoryView[] = sortByText(plan.stories, (story) => String(story.sequence).padStart(6, "0")).map(
        (story) => {
            const components = distinct(story.components ?? []);
            const fromComponents = distinct(
                components.map((name) => domainOf.get(name) ?? "").filter((name) => name !== ""),
            );
            const workflow = workflowOf(story.tags as Tag[]);
            return {
                key: story.key,
                title: story.title,
                what: story.what,
                why: story.why,
                kind: story.kind,
                tags: [...story.tags],
                work:
                    workflow === undefined
                        ? null
                        : (() => {
                              const reference = "reference" in workflow && workflow.reference === true;
                              const label = workLabelOf(workflow.kind, reference);
                              return { profile: workflow.profile, reference, label, words: workLabels[label] };
                          })(),
                phase: story.phase,
                epic: story.epic,
                sequence: story.sequence,
                blockedBy: distinct(story.blockedBy),
                unblocks: distinct(unblocks.get(story.key) ?? []),
                builds: distinct(story.builds),
                reliesOn: distinct(story.reliesOn.map((each) => each.rule)),
                actions: distinct(story.actions),
                steps: distinct(story.steps ?? []),
                components,
                domains:
                    fromComponents.length > 0
                        ? fromComponents
                        : distinct(
                              story.builds.map((rule) => domainOfRule.get(rule) ?? "").filter((name) => name !== ""),
                          ),
                layers: distinct(story.layers ?? []),
                capability: story.capability ?? null,
                surface: story.surface ?? null,
                criteria: story.criteria.map((each) => criterionOf(plain(each.says), each.from ?? [])),
                open: (story.open ?? []).map(plain),
                challenges: distinct(challengesOf.get(story.key) ?? []),
                status: status(story.key),
                split:
                    story.part === undefined || story.splitFrom === undefined
                        ? null
                        : { part: story.part, from: story.splitFrom },
            };
        },
    );

    // Ready to start: the conductor's rule. Not merged, every blocker merged, and every story of the epics its epic
    // comes after merged.
    const merged = (key: string) => status(key) === "merged";
    const epicStories = new Map(plan.epics.map((epic) => [epic.key, epic.stories]));
    const epicOf = new Map(plan.epics.map((epic) => [epic.key, epic]));
    const ready = stories
        .filter(
            (story) =>
                !merged(story.key) &&
                story.blockedBy.every(merged) &&
                (epicOf.get(story.epic)?.comesAfter ?? []).every((key) => (epicStories.get(key) ?? []).every(merged)),
        )
        .map((story) => story.key);

    const journeyName = new Map(journeys.map((journey) => [journey.task, journey.name]));
    const layerName = new Map(plan.layers.map((layer) => [layer.id, layer.name]));
    const storyOf = new Map(stories.map((story) => [story.key, story]));

    let matrix: PlanViews["matrix"] = null;
    if (architecture !== undefined && journeys.length > 0) {
        const domains = [...architecture.domains.map((domain) => domain.name), notPlaced];
        const cells: NonNullable<PlanViews["matrix"]>["cells"] = [];
        const rowTotals: Record<string, number> = {};
        const columnTotals: Record<string, number> = Object.fromEntries(domains.map((domain) => [domain, 0]));
        for (const journey of journeys) {
            const steps = trace.filter((each) => each.journey === journey.id);
            rowTotals[journey.id] = steps.length;
            for (const domain of domains) {
                const here = steps.filter((each) => (each.primaryDomain ?? notPlaced) === domain);
                if (here.length === 0) continue;
                cells.push({
                    journey: journey.id,
                    domain,
                    steps: here.map((each) => each.step),
                    stories: distinct(here.flatMap((each) => each.stories)),
                });
                columnTotals[domain] = (columnTotals[domain] ?? 0) + here.length;
            }
        }
        matrix = {
            journeys: journeys.map((journey) => journey.id),
            domains,
            cells,
            rowTotals,
            columnTotals,
            total: trace.length,
        };
    }

    return {
        stories,
        epics: sortByText(plan.epics, (epic) => String(epic.sequence).padStart(6, "0")).map((epic) => ({
            key: epic.key,
            kind: epic.kind,
            title: epic.title,
            outcome: epic.outcome,
            journey: epic.task ?? null,
            label: (epic.task === undefined ? undefined : journeyName.get(epic.task)) ?? epic.title,
            comesAfter: [...epic.comesAfter],
            stories: [...epic.stories],
            sequence: epic.sequence,
        })),
        phases: plan.phases.map((phase) => ({
            number: phase.number,
            name: phase.name,
            why: phase.why,
            stories: [...phase.stories],
            epics: distinct(phase.stories.map((key) => storyOf.get(key)?.epic ?? "").filter((key) => key !== "")),
            builtIn: distinct(
                phase.stories.flatMap((key) => storyOf.get(key)?.layers ?? []).map((id) => layerName.get(id) ?? id),
            ),
        })),
        layers: plan.layers.map((layer) => ({
            id: layer.id,
            name: layer.name,
            path: layer.path,
            kind: layer.kind,
            purpose: layer.purpose,
            role: layer.role ?? null,
            container: layer.container ?? null,
            dependsOn: [...layer.dependsOn],
            stack: layer.carries.map((number) => request?.stack[number - 1] ?? "").filter((line) => line !== ""),
            stories: stories.filter((story) => story.layers.includes(layer.id)).map((story) => story.key),
        })),
        decisions: plan.decisions.map((each) => ({
            id: each.id,
            layer: each.layer,
            chose: each.chose,
            reason: each.reason,
        })),
        ready,
        matrix,
        conflicts: [
            ...(plan.conflicts ?? []).map((each) => ({
                stage: each.stage,
                variant: each.variant,
                says: plain(each.says),
                resolved: each.resolved,
            })),
            ...(plan.conflicts === undefined
                ? disputes.map((each) => ({ ...each, says: plain(each.says), resolved: null }))
                : []),
        ].sort(
            (one, other) =>
                compareText(one.stage, other.stage) ||
                compareText(one.variant, other.variant) ||
                compareText(one.says, other.says),
        ),
        coverage: { rulesBuilt: plan.coverage.rulesBuilt, rulesTotal: plan.coverage.rulesTotal },
        unplanned: (plan.coverage.unplanned ?? []).map((each) => ({
            name: each.what,
            file: each.file,
            firstLine: each.firstLine,
            lastLine: each.lastLine,
        })),
        stale: input.stale,
    };
};
