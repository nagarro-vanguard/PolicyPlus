import type { Plan } from "../model/plan";
import type { TargetLayer } from "../model/records";
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
}) => {
    const { plan, facts, target, layers, request } = input;
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
