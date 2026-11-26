import type { PlanInput, RequestInput } from "../inputs/plan";
import type { GoalAnswer, Target } from "../inputs/target";
import { compareText, distinct, goalsSha } from "../io";
import type { Node } from "./hierarchy";
import type { ArchitectureView, ProposedJourney } from "./journeys";
import type { PlanViews } from "./plan-views";
import type { Slugs } from "./text";

/*
 * The goals: for each goal the person wrote, whether each stage of the work considered it (the journeys, the target
 * architecture, the foundation decisions and the plan's stories), and what each stage said about it. Every mark is
 * derived from links that exist in the stage's own output and from the stamp of the goals the stage was finished with;
 * nothing here is written by an agent and nothing says a goal is implemented, proven or met: the work stops at the plan.
 * Every link is a node key, never a record id.
 */

export const stages = ["journeys", "architecture", "foundation", "stories"] as const;
export type Stage = (typeof stages)[number];

/**
 * `considered`: the stage's output holds what considers the goal; `settled`: the architecture answers that the goal is
 * settled in the foundation (no place named), so the journeys have nothing to derive; `notReached`: the answer names
 * places that serve no step of a chosen journey; `missing`: the stage's output does not hold it; `stale`: the stage was
 * finished with another list of goals than the request's now, or kept no stamp.
 */
export type MarkState = "considered" | "settled" | "notReached" | "missing" | "stale";
export type Mark = { state: MarkState; targets: string[] };

export type Goal = {
    number: number;
    key: string;
    text: string;
    label: string;
    /** `considered` when no mark is missing or stale; otherwise the state of the first stage that is. */
    summary: "considered" | "missing" | "stale";
    firstGap: Stage | null;
    marks: Record<Stage, Mark>;
    answer: { how: string; where: { name: string; node: string | null }[] } | null;
    decision: { node: string | null; chose: string; layer: string; reason: string } | null;
    stories: string[];
    epics: string[];
    components: string[];
    journeys: string[];
};

export type GoalsView = { goalsSha: string; goals: Goal[] };

/** The most words of a label. */
const labelWords = 8;

/** Words a label never ends on: cut at the limit, it would stop mid-phrase. */
const dangling = new Set(["a", "an", "the", "of", "with", "to", "and", "or", "in", "for", "by", "on", "at", "as", "from", "that", "no"]);

/**
 * A short label of a goal: its first clause (up to the first colon, semicolon or full stop), without marks, at most
 * eight words. The goal's own words stay whole beside it.
 * @param text the goal as written
 * @returns the label
 */
export const labelOf = (text: string): string => {
    const clause = (/^[^:;]*?(?:\.(?=\s|$)|[:;]|$)/.exec(text.trim())?.[0] ?? text)
        .replace(/[`*_]/g, "")
        .replace(/[:;.,\s]+$/u, "");
    const words = clause.split(/\s+/).filter((word) => word !== "");
    const kept = words.slice(0, labelWords);
    while (kept.length > 1 && dangling.has((kept[kept.length - 1] ?? "").toLowerCase().replace(/[^a-z]/g, ""))) kept.pop();
    return kept.join(" ").replace(/[,\s]+$/u, "");
};

/** What the goals need to know of the target and the plan, as compose has built them. */
export type GoalInputs = {
    request: RequestInput | undefined;
    target: Target | undefined;
    plan: PlanInput | undefined;
    architecture: ArchitectureView | undefined;
    proposed: readonly ProposedJourney[];
    views: PlanViews | undefined;
    slugs: Slugs;
};

/**
 * The goals and their marks.
 * @param input the request, the target, the plan and what compose built from them
 * @returns the goals, or nothing when the request holds none
 */
export const goalsOf = (input: GoalInputs): GoalsView | undefined => {
    const { request, target, plan, architecture, proposed, views, slugs } = input;
    if (request === undefined || request.goals.length === 0) return undefined;
    const current = goalsSha(request.goals);
    const stamps = {
        journeys: target === undefined ? undefined : target.goalsStamps.journeys,
        architecture: target === undefined ? undefined : target.goalsStamps.architecture,
        plan: plan?.plan.goalsSha,
    };
    /** `missing` when the stage's output does not exist, `stale` when its stamp is not the request's, else undefined. */
    const gate = (exists: boolean, stamp: string | undefined): "missing" | "stale" | undefined =>
        !exists ? "missing" : stamp !== current ? "stale" : undefined;
    const gates: Record<Stage, "missing" | "stale" | undefined> = {
        journeys: gate(target !== undefined && target.journeys.length > 0, stamps.journeys),
        architecture: gate(target?.architecture !== undefined, stamps.architecture),
        foundation: gate(plan !== undefined, stamps.plan),
        stories: gate(plan !== undefined, stamps.plan),
    };

    const answers = new Map<number, GoalAnswer>();
    for (const answer of target?.architecture?.goals ?? []) if (!answers.has(answer.goal)) answers.set(answer.goal, answer);

    const domains = new Map((architecture?.domains ?? []).map((domain) => [domain.name, domain]));
    const containers = new Map((architecture?.containers ?? []).map((container) => [container.name, container]));
    const stepJourney = new Map(proposed.flatMap((journey) => journey.steps.map((step) => [step.id, journey.slug] as const)));
    const decisionOf = new Map<number, NonNullable<PlanInput["plan"]["decisions"]>[number]>();
    for (const decision of plan?.plan.decisions ?? [])
        if (decision.topic?._tag === "goal" && decision.topic.number !== undefined && !decisionOf.has(decision.topic.number))
            decisionOf.set(decision.topic.number, decision);

    const goals = request.goals.map((text, at): Goal => {
        const number = at + 1;
        const answer = answers.get(number);
        const places = answer?.where ?? [];
        const whereDomains = places.filter((name) => domains.has(name));
        const heldDomains = places.flatMap((name) => containers.get(name)?.holds ?? []);
        const reachedDomains = new Set([...whereDomains, ...heldDomains]);
        const components = (architecture?.components ?? []).filter((component) => reachedDomains.has(component.domain));
        const stepIds = distinct(components.flatMap((component) => component.serves));
        const journeySlugs = distinct(stepIds.flatMap((id) => stepJourney.get(id) ?? []));
        const where = places.map((name) => ({
            name,
            node: domains.has(name)
                ? `domain/${(domains.get(name) as { slug: string }).slug}`
                : containers.has(name)
                  ? `container/${slugs.of("container", name, name)}`
                  : null,
        }));
        const decision = decisionOf.get(number);
        const decisionNode = decision === undefined ? null : `decision/${decision.id}`;
        const carriers = (views?.stories ?? []).filter((story) =>
            story.criteria.some((criterion) =>
                criterion.from.some(
                    (from) =>
                        (from.kind === "goal" && from.id === String(number)) ||
                        (decision !== undefined && from.kind === "decision" && from.id === decision.id),
                ),
            ),
        );
        const epicKeys = distinct(carriers.map((story) => story.epic));

        const journeysMark: Mark = (() => {
            const gap = gates.journeys;
            if (gap !== undefined) return { state: gap, targets: [] };
            if (answer === undefined || architecture === undefined || !architecture.confirmed) return { state: "missing", targets: [] };
            if (places.length === 0) return { state: "settled", targets: [] };
            return journeySlugs.length > 0
                ? { state: "considered", targets: journeySlugs.map((slug) => `journey/${slug}`) }
                : { state: "notReached", targets: [] };
        })();
        const architectureMark: Mark = (() => {
            const gap = gates.architecture;
            if (gap !== undefined) return { state: gap, targets: [] };
            if (answer === undefined) return { state: "missing", targets: [] };
            if (places.length === 0) return { state: "settled", targets: [] };
            return { state: "considered", targets: where.flatMap((place) => (place.node === null ? [] : [place.node])) };
        })();
        const foundationMark: Mark = (() => {
            const gap = gates.foundation;
            if (gap !== undefined) return { state: gap, targets: [] };
            return decisionNode === null ? { state: "missing", targets: [] } : { state: "considered", targets: [decisionNode] };
        })();
        const storiesMark: Mark = (() => {
            const gap = gates.stories;
            if (gap !== undefined) return { state: gap, targets: [] };
            return carriers.length === 0
                ? { state: "missing", targets: [] }
                : { state: "considered", targets: carriers.map((story) => `story/${story.sequence}`) };
        })();
        const marks = { journeys: journeysMark, architecture: architectureMark, foundation: foundationMark, stories: storiesMark };
        const firstGap = stages.find((stage) => marks[stage].state === "missing" || marks[stage].state === "stale") ?? null;
        return {
            number,
            key: `goal/${number}`,
            text,
            label: labelOf(text),
            summary: firstGap === null ? "considered" : (marks[firstGap].state as "missing" | "stale"),
            firstGap,
            marks,
            answer: answer === undefined ? null : { how: answer.how, where },
            decision:
                decision === undefined
                    ? null
                    : { node: decisionNode, chose: decision.chose, layer: decision.layer, reason: decision.reason },
            stories: carriers.map((story) => `story/${story.sequence}`).sort(compareStoryKeys),
            epics: epicKeys.map((key) => `epic/${key}`),
            components: distinct(components.map((component) => `component/${slugs.of("component", component.name, component.name)}`)),
            journeys: journeySlugs.map((slug) => `journey/${slug}`),
        };
    });
    return { goalsSha: current, goals };
};

/** Story keys are `story/<n>`: in the plan's order, not text order. */
const compareStoryKeys = (one: string, other: string) => {
    const number = (key: string) => Number(key.slice(key.indexOf("/") + 1));
    return number(one) - number(other) || compareText(one, other);
};

/**
 * The nodes of the goals, for the hierarchy: one node per goal, its name the short label and its summary the goal as
 * the person wrote it. Their children and folds are empty; the Goals section shows each goal's marks and links from
 * `goals/goals.json`, whose targets are other sections' keys.
 * @param view the goals
 * @returns the nodes, in the goals' order
 */
export const goalNodes = (view: GoalsView): Node[] =>
    view.goals.map((goal, at) => ({
        key: goal.key,
        level: "goal",
        name: goal.label,
        summary: goal.text,
        noun: { one: "goal", many: "goals" },
        ref: null,
        crumbs: ["overview"],
        up: "overview",
        prev: view.goals[at - 1]?.key ?? null,
        next: view.goals[at + 1]?.key ?? null,
        facts: [],
        children: { level: null, rows: [] },
        folds: [],
        lateral: [],
    }));

/**
 * Put the goals where the case's reader meets them: the goal nodes, and, ahead of the risks in the overview's "check
 * first" fold, the goals no stage considered or that a stage considered before they changed.
 * @param nodes the hierarchy's nodes, changed in place
 * @param view the goals
 */
export const attachGoals = (nodes: Map<string, Node>, view: GoalsView) => {
    for (const node of goalNodes(view)) nodes.set(node.key, node);
    const overview = nodes.get("overview");
    const gaps = view.goals.filter((goal) => goal.firstGap !== null).map((goal) => ({ node: goal.key }));
    if (overview === undefined || gaps.length === 0) return;
    const fold = overview.folds.find((each) => each.kind === "checkFirst");
    if (fold === undefined) overview.folds.unshift({ kind: "checkFirst", rows: gaps });
    else fold.rows = [...gaps, ...fold.rows];
};
