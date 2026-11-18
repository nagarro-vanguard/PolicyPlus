import { slugify } from "./slugs";
import type { Architecture, Journey, Legacy, Task } from "./target-types";

export const taskSlug = (task: Task) => slugify(task.id);
export const taskPath = (task: Task) => `target/task/${taskSlug(task)}`;
export const erdPath = (task: Task) => `target/erd/${taskSlug(task)}`;
export const architecturePath = "target/architecture";
export const systemPath = "target/system";
export const lineagePath = "target/lineage";

/** The words of a rule: what the analysis says it decides. */
export const ruleSays = (legacy: Legacy | undefined, id: string) => legacy?.rules[id]?.statement ?? "a rule of the old system";
export const actionSays = (legacy: Legacy | undefined, id: string) => legacy?.actions[id]?.what ?? "an entry point of the old system";

/** The steps of today's journey that a target step takes the place of. */
export const todayOf = (task: Task, step: Journey["steps"][number]) =>
    step.link._tag === "new" ? [] : task.current.flatMap((today, at) => (today.from.some((id) => step.link._tag === "legacy" && step.link.from.includes(id)) ? [at + 1] : []));

export const changeKinds = (journey: Journey) => {
    const counts = new Map<string, number>();
    for (const step of journey.steps) {
        const kind = step.link._tag === "new" ? "new" : step.link.change;
        counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    return [...counts.entries()];
};

/** What the person can compare at a glance: steps today and in the variant, what was dropped, rules kept. */
export const metricsOf = (task: Task, journey: Journey) => {
    const kept = new Set(journey.steps.flatMap((step) => (step.link._tag === "legacy" ? step.link.keeps : [])));
    return {
        today: task.current.length,
        steps: journey.steps.length,
        dropped: journey.drops.reduce((sum, drop) => sum + drop.actions.length, 0),
        rulesKept: kept.size,
        rulesTotal: task.rules.length,
    };
};

export const chosenOf = (journeys: readonly Journey[], task: Task) => journeys.find((journey) => journey.task === task.id);
export const mainContainer = (architecture: Architecture) => architecture.containers[0]?.name ?? "";
export const marksOf = (marks: readonly { of: string; verdict: string; note?: string }[] | undefined, task: Task) =>
    (marks ?? []).filter((mark) => mark.of.startsWith(`${task.id}#`));
