import type { Task } from "../model/records";
import type { RequestView } from "../model/request-view";
import { leaksIn, type LegacySheet } from "./legacy";

export type EssenceTask = {
    id: string;
    outcome: string;
    actor: string;
    /** Opaque ids with a plain statement each, in no order that carries meaning. */
    actions: { id: string; what: string }[];
    rules: { id: string; statement: string }[];
    facts: { id: string; name: string; states: string[] }[];
    needs: { id: string; name: string; kind: string }[];
};
export type Essence = { stack: string[]; notes: string[]; tasks: EssenceTask[] };

/**
 * What a designer is given: each task as an outcome with the rules, data and outside needs it rests on, and the legacy
 * only as opaque ids with a statement. Pure.
 * @param legacy the legacy sheet
 * @param tasks the decided tasks
 * @param request the stack and notes
 * @returns the essence
 */
export const deriveEssence = (legacy: LegacySheet, tasks: readonly Task[], request: RequestView): Essence => ({
    stack: [...request.stack],
    notes: [...request.notes],
    tasks: tasks.map((task) => ({
        id: task.id,
        outcome: task.outcome,
        actor: task.actor,
        actions: [...task.actions].sort().map((id) => ({ id, what: legacy.actions[id]?.what ?? "" })),
        rules: [...task.rules].sort().map((id) => ({ id, statement: legacy.rules[id]?.statement ?? "" })),
        facts: task.facts.map((id) => ({
            id,
            name: legacy.entities[id]?.name ?? "",
            states: legacy.entities[id]?.states ?? [],
        })),
        needs: task.needs.map((id) => ({
            id,
            name: legacy.externals[id]?.name ?? "",
            kind: legacy.externals[id]?.kind ?? "",
        })),
    })),
});

/**
 * Every identifier of the old system that the essence carries, with where.
 * @param essence the essence
 * @param legacy the legacy sheet
 * @returns one line per leak
 */
export const essenceLeaks = (essence: Essence, legacy: LegacySheet) =>
    essence.tasks.flatMap((task) =>
        [
            task.outcome,
            task.actor,
            ...task.actions.map((each) => each.what),
            ...task.rules.map((each) => each.statement),
            ...task.facts.flatMap((fact) => [fact.name, ...fact.states]),
        ].flatMap((text) =>
            leaksIn(text, legacy.identifiers).map((word) => `${task.id}: "${word}" in "${text.slice(0, 50)}"`),
        ),
    );
