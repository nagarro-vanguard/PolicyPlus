import type { Plan } from "../model/plan";
import type { Decision, TargetLayer } from "../model/records";
import { changedRuleProblems, ruleChangesOf } from "./consistency";
import { componentLayer, roleOf } from "./layers";
import type { Target } from "../read/target";
import type { ModernizationRequest } from "../model/request";
import { keptRules } from "./target-plan";
import type { Facts } from "./facts";

const some = (items: readonly string[], limit = 3) =>
    items.length <= limit ? items.join("; ") : `${items.slice(0, limit).join("; ")}; and ${items.length - limit} more`;
const short = (text: string) => (text.length > 70 ? `${text.slice(0, 67)}...` : text);

/**
 * The invariants of a plan made from a confirmed target: every component is built by exactly one story, every step is in
 * exactly one story, a story cites the rules of the components it builds and no others, every kept rule is built once, and
 * every container is carried by a layer. Pure.
 * @returns what is wrong, and what is only worth a look
 */
export const targetGaps = (input: {
    readonly plan: Plan;
    readonly facts: Facts;
    readonly target: Target;
    readonly layers: readonly TargetLayer[];
    readonly request: ModernizationRequest;
    readonly decisions?: readonly Decision[];
}) => {
    const { plan, facts, target, layers, request } = input;
    const decisions = input.decisions ?? plan.decisions;
    const changes = ruleChangesOf(target);
    const failing: string[] = [];
    const advisory: string[] = [];
    const components = new Map(target.architecture.components.map((component) => [component.name, component] as const));
    const stepJourney = new Map(
        target.journeys.flatMap((journey) => journey.steps.map((step) => [step.id, journey.id] as const)),
    );
    const stepActions = new Map(
        target.journeys.flatMap((journey) =>
            journey.steps.map((step) => [step.id, step.link._tag === "legacy" ? step.link.from : []] as const),
        ),
    );
    const builtBy = new Map<string, number>();
    const stepIn = new Map<string, number>();
    for (const story of plan.stories) {
        const label = `story "${short(story.title)}"`;
        const mine = story.components ?? [];
        for (const name of mine) {
            builtBy.set(name, (builtBy.get(name) ?? 0) + 1);
            if (!components.has(name))
                failing.push(`${label} builds a component the architecture does not have: ${name}`);
        }
        for (const id of story.steps ?? []) {
            stepIn.set(id, (stepIn.get(id) ?? 0) + 1);
            if (!stepJourney.has(id)) failing.push(`${label} names a step no chosen journey has`);
        }
        if (new Set((story.steps ?? []).map((id) => stepJourney.get(id))).size > 1)
            failing.push(`${label} spans more than one journey`);
        if (story.criteria.length > 12) failing.push(`${label} has ${story.criteria.length} criteria, over 12`);
        // A rule a journey step changes is built as the step says, not as the legacy did.
        for (const problem of changedRuleProblems(story.criteria, changes)) failing.push(`${label}: ${problem}`);
        if (story.kind === "functional") {
            const wanted = new Set((story.steps ?? []).flatMap((id) => stepActions.get(id) ?? []));
            const have = new Set<string>(story.actions);
            const off =
                [...wanted].filter((id) => !have.has(id)).length + [...have].filter((id) => !wanted.has(id)).length;
            if (off > 0) failing.push(`${label}: its entry points are not those of its steps (${off} differ)`);
            if ((story.steps ?? []).length === 0) failing.push(`${label} ports entry points but names no step`);
        }
        const enforced = new Set(mine.flatMap((name) => components.get(name)?.enforces ?? []));
        const cited = new Set<string>(story.builds);
        const lost = [...enforced].filter((id) => !cited.has(id)).length;
        const extra = [...cited].filter((id) => !enforced.has(id)).length;
        if (story.tags.includes("story") && story.builder !== "scaffold-codebase" && (lost > 0 || extra > 0))
            failing.push(
                `${label}: the rules it cites are not those of the components it builds (${lost} missing, ${extra} extra)`,
            );
    }
    const unbuilt = [...components.keys()].filter((name) => (builtBy.get(name) ?? 0) === 0);
    if (unbuilt.length > 0) failing.push(`${unbuilt.length} components are built by no story: ${some(unbuilt)}`);
    const twice = [...builtBy.entries()].filter(([, count]) => count > 1);
    if (twice.length > 0)
        failing.push(
            `${twice.length} components are built by more than one story: ${some(twice.map(([name]) => name))}`,
        );
    const uncovered = [...stepJourney.keys()].filter((id) => (stepIn.get(id) ?? 0) === 0);
    if (uncovered.length > 0) failing.push(`${uncovered.length} journey steps are in no story`);
    const stepTwice = [...stepIn.entries()].filter(([, count]) => count > 1);
    if (stepTwice.length > 0) failing.push(`${stepTwice.length} journey steps are in more than one story`);
    const built = new Set(plan.stories.flatMap((story) => story.builds as readonly string[]));
    const kept = keptRules(target);
    const lostRules = [...kept].filter((id) => !built.has(id));
    if (lostRules.length > 0)
        failing.push(
            `${lostRules.length} rules the journeys keep are built by no story, for example "${short(facts.rules.get(lostRules[0] ?? "")?.says ?? "")}"`,
        );
    const carried = new Set(layers.flatMap((layer) => layer.carries));
    for (const container of target.architecture.containers) {
        const tech = container.tech.trim().toLowerCase();
        const lines = request.stack.flatMap((line, at) => (line.toLowerCase().includes(tech) ? [at + 1] : []));
        if (lines.length === 0 || !lines.some((n) => carried.has(n)))
            failing.push(`no layer carries what container ${container.name} is built with: "${short(container.tech)}"`);
    }
    // The codebase's apps are the parts of the architecture that run: splitting one into several is a decision.
    const running = target.architecture.containers.filter((container) => container.kind !== "store");
    const apps = layers.filter((layer) => layer.kind === "code" && /^apps\//.test(layer.path));
    const splitDecided = decisions.some(
        (decision) => decision.topic._tag === "area" && /\bdeployables?\b/i.test(decision.topic.name),
    );
    if (apps.length > running.length && !splitDecided)
        failing.push(
            `the codebase has ${apps.length} apps (${apps.map((layer) => layer.name).join(", ")}) but the chosen architecture runs as ${running.length} (${running.map((container) => container.name).join(", ")}): keep one app for each, or record why in an area decision named "deployables"`,
        );
    // When the layers say what they are for and the components what they are, every component has its one layer.
    if (layers.some((layer) => layer.role !== undefined)) {
        const stack = { layers, decisions, target, externals: facts.externals };
        const unplaced = target.architecture.components
            .filter((component) => component.kind !== undefined || component.adapts !== undefined)
            .filter((component) => componentLayer(component.name, stack) === undefined)
            .map((component) => component.name);
        if (unplaced.length > 0)
            failing.push(
                `${unplaced.length} components have no layer of the role their kind needs, or more than one: ${some(unplaced)}`,
            );
        const roles = layers.flatMap((layer) => {
            const role = roleOf(layer);
            return role === undefined ? [] : [role];
        });
        if (roles.length < layers.length)
            advisory.push(`${layers.length - roles.length} layers do not say what they are for (their role)`);
    }
    // Each outside system is built once: a foundation story that still rests on how a system a component adapts is
    // reached builds it a second time.
    const adaptedSystems = new Set(
        target.architecture.components.flatMap((component) =>
            component.adapts === undefined
                ? []
                : [facts.externals.find((each) => each.id === component.adapts)?.name ?? component.adapts],
        ),
    );
    const adaptedDecisions = new Set(
        decisions
            .filter((decision) => decision.topic._tag === "integration" && adaptedSystems.has(decision.topic.system))
            .map((decision) => decision.id as string),
    );
    const twiceBuilt = plan.stories.filter(
        (story) =>
            (story.components ?? []).length === 0 &&
            story.actions.length === 0 &&
            story.builder !== "scaffold-codebase" &&
            story.criteria.some((criterion) =>
                criterion.from.some((ref) => ref._tag === "decision" && adaptedDecisions.has(ref.id)),
            ),
    );
    if (twiceBuilt.length > 0)
        advisory.push(
            `${twiceBuilt.length} foundation stories still build an outside system a component adapts: ${some(twiceBuilt.map((story) => short(story.title)))}`,
        );
    for (const journey of target.journeys) {
        const epic = plan.epics.find((each) => each.task === journey.task);
        if (epic === undefined) failing.push(`journey ${journey.name} has no epic`);
        else if (!plan.stories.some((story) => story.epic === epic.key && story.title.startsWith("Prove the journey")))
            failing.push(`journey ${journey.name} has no acceptance story`);
    }
    const citedTransitions = new Set(
        plan.stories.flatMap((story) =>
            story.criteria.flatMap((c) => c.from.flatMap((r) => (r._tag === "transition" ? [r.id as string] : []))),
        ),
    );
    const missingTransitions = facts.transitions.filter((t) => !citedTransitions.has(t.id));
    if (missingTransitions.length > 0)
        advisory.push(
            `${missingTransitions.length} changes of state are cited by no criterion, for example ${missingTransitions[0]?.entityName} to "${missingTransitions[0]?.to}"`,
        );
    return { failing, advisory };
};
