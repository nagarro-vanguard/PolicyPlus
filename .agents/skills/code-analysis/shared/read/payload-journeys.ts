import { Effect, Schema } from "effect";
import type { CapabilityPayload } from "../model/schemas/payloads";
import type { TaskPayload } from "../model/schemas/journeys-payload";
import type { RecordStore } from "../store/database";
import { addToCount, compareText, known } from "../run/collections";
import { read } from "./payload-queries";
import { slugOf } from "./payload-words";

const StoredStep = Schema.Struct({
    intent: Schema.String,
    system: Schema.String,
    from: Schema.Array(Schema.String),
    confidence: Schema.Literals(["sure", "inferred"]),
});
const StoredJourney = Schema.Struct({
    id: Schema.String,
    capability: Schema.String,
    task: Schema.String,
    outcome: Schema.String,
    actor: Schema.String,
    actions: Schema.Array(Schema.String),
    rules: Schema.Array(Schema.String),
    facts: Schema.Array(Schema.String),
    needs: Schema.Array(Schema.String),
    steps: Schema.Array(StoredStep),
});
const StoredMerge = Schema.Struct({ keep: Schema.String, absorb: Schema.Array(Schema.String) });
const JourneyRow = Schema.Struct({ body: Schema.fromJsonString(StoredJourney) });
const MergeRow = Schema.Struct({ body: Schema.fromJsonString(StoredMerge) });
const NameRow = Schema.Struct({ id: Schema.String, name: Schema.String });

export type StoredJourney = typeof StoredJourney.Type;
export type StoredMerge = typeof StoredMerge.Type;

/**
 * Each capability's address in a task's id: its name as an address, made unique among the capabilities by a number
 * after the second that shares it. Decided by record id order, so the same capabilities always get the same addresses.
 * @param capabilities every capability of the analysis
 * @returns the address of each, by capability record id
 */
export const capabilitySlugs = (capabilities: ReadonlyArray<{ readonly id: string; readonly name: string }>) => {
    const used = new Map<string, number>();
    return new Map(
        capabilities
            .toSorted((left, right) => compareText(left.id, right.id))
            .map((capability) => {
                const base = slugOf(capability.name) || "capability";
                addToCount(used, base, 1);
                const times = known(used, base, "it was just counted");
                return [capability.id, times === 1 ? base : `${base}-${times}`] as const;
            }),
    );
};

/**
 * A task's stable id: its capability's address and its own name.
 * @param slug the capability's address
 * @param task the task's name
 * @returns the id
 */
export const taskIdOf = (slug: string, task: string) => `${slug}.${task}`;

/**
 * The items of several lists, each once, in first-seen order.
 * @param lists the lists
 * @returns the items
 */
const union = <T>(lists: ReadonlyArray<readonly T[]>) => [...new Set(lists.flat())];

/**
 * A task's short name as a title: its words with the first in capitals (`stamp-program-version` is `Stamp program
 * version`).
 * @param task the task's short kebab-case name
 * @returns the title
 */
const titleOf = (task: string) => {
    const words = task
        .split("-")
        .filter((word) => word !== "")
        .join(" ");
    return `${words.slice(0, 1).toUpperCase()}${words.slice(1)}`;
};

/**
 * One accepted journey as a task of the payload, carrying its title and its capability.
 * @param journey the journey
 * @param slug its capability's address
 * @returns the task
 */
const taskOf = (journey: StoredJourney, slug: string): TaskPayload => ({
    id: taskIdOf(slug, journey.task),
    title: titleOf(journey.task),
    capability: journey.capability,
    outcome: journey.outcome,
    actor: journey.actor,
    actions: [...journey.actions],
    rules: [...journey.rules],
    facts: [...journey.facts],
    needs: [...journey.needs],
    current: journey.steps.map((step) => ({
        intent: step.intent,
        system: step.system,
        from: [...step.from],
        confidence: step.confidence,
    })),
});

/**
 * The merges applied to the tasks: the task kept takes in the entry points, rules, data, outside systems and steps of
 * those it absorbs.
 * @param tasks the tasks, each with its id
 * @param merges the accepted merges
 * @returns the tasks that stay, and what the merges named that is no task
 */
const joinTasks = (tasks: readonly TaskPayload[], merges: readonly StoredMerge[]) => {
    const byId = new Map(tasks.map((task) => [task.id, task] as const));
    const unknown: string[] = [];
    const absorbed = new Set<string>();
    const joined = new Map<string, TaskPayload>();
    for (const merge of merges) {
        const keep = byId.get(merge.keep);
        if (keep === undefined) {
            unknown.push(merge.keep);
            continue;
        }
        const others = merge.absorb.flatMap((id) => {
            const found = byId.get(id);
            if (found === undefined) {
                unknown.push(id);
            }
            return found === undefined || absorbed.has(id) || id === merge.keep ? [] : [found];
        });
        others.forEach((other) => absorbed.add(other.id));
        const all = [keep, ...others];
        joined.set(keep.id, {
            ...keep,
            actions: union(all.map((task) => task.actions)),
            rules: union(all.map((task) => task.rules)),
            facts: union(all.map((task) => task.facts)),
            needs: union(all.map((task) => task.needs)),
            current: all.flatMap((task) => task.current),
        });
    }
    const stay = tasks.filter((task) => !absorbed.has(task.id));
    return {
        tasks: stay.map((task) => {
            const merged = joined.get(task.id);
            return merged === undefined ? task : merged;
        }),
        unknown,
    };
};

/**
 * The tasks of the payload: each accepted journey as a task with a stable id, then each merge applied.
 * @param journeys the accepted journeys
 * @param merges the accepted merges
 * @param slugs each capability's address
 * @returns the tasks, in the order of their ids, and what the merges named that is no task
 */
export const tasksOf = (
    journeys: readonly StoredJourney[],
    merges: readonly StoredMerge[],
    slugs: ReadonlyMap<string, string>,
) => {
    const tasks = journeys
        .map((journey) => {
            const slug = slugs.get(journey.capability);
            return taskOf(journey, slug === undefined ? slugOf(journey.capability) : slug);
        })
        .toSorted((left, right) => compareText(left.id, right.id));
    return joinTasks(tasks, merges);
};

/**
 * What the tasks must add up to: every entry point and every rule of every capability in exactly one task, and no task
 * citing one the analysis does not hold.
 * @param tasks the tasks
 * @param payloads every capability's payload
 * @returns one line per gap
 */
export const journeyCoverageGaps = (tasks: readonly TaskPayload[], payloads: readonly CapabilityPayload[]) => {
    const gaps: string[] = [];
    const ids = tasks.map((task) => task.id);
    if (new Set(ids).size !== ids.length) {
        gaps.push("two tasks share an id");
    }
    const check = (what: string, wanted: ReadonlySet<string>, pick: (task: TaskPayload) => readonly string[]) => {
        const times = new Map<string, number>();
        tasks.forEach((task) => pick(task).forEach((id) => addToCount(times, id, 1)));
        const lost = [...wanted].filter((id) => !times.has(id));
        if (lost.length > 0) {
            gaps.push(`${lost.length} ${what} belong to no task: ${lost.slice(0, 6).join(", ")}`);
        }
        for (const [id, count] of times) {
            if (!wanted.has(id)) {
                gaps.push(`${what.slice(0, -1)} ${id} is in a task but is not in the analysis`);
            } else if (count > 1) {
                gaps.push(`${what.slice(0, -1)} ${id} is in ${count} tasks, not one`);
            }
        }
    };
    check(
        "entry points",
        new Set(payloads.flatMap((payload) => payload.layers.flatMap((layer) => layer.actions.map((each) => each.id)))),
        (task) => task.actions,
    );
    check(
        "rules",
        new Set(payloads.flatMap((payload) => payload.layers.flatMap((layer) => layer.rules.map((each) => each.id)))),
        (task) => task.rules,
    );
    for (const task of tasks) {
        const own = new Set(task.actions);
        const used = new Set(task.current.flatMap((step) => step.from));
        task.current.forEach((step, at) =>
            step.from
                .filter((id) => !own.has(id))
                .forEach((id) => gaps.push(`task ${task.id}, step ${at + 1}: cites ${id}, which is not the task's`)),
        );
        const lost = task.actions.filter((id) => !used.has(id));
        if (lost.length > 0) {
            gaps.push(`task ${task.id}: ${lost.length} entry points are in no step`);
        }
    }
    return gaps;
};

/**
 * The accepted journeys and merges of the store, and the name of every capability.
 * @param store the record store, read only
 * @returns the journeys, the merges and the capabilities
 */
export const journeyRecords = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const journeys = yield* read(
        store,
        JourneyRow,
        (sql) => sql`SELECT body FROM record WHERE type = 'Journey' ORDER BY id`,
    );
    const merges = yield* read(
        store,
        MergeRow,
        (sql) => sql`SELECT body FROM record WHERE type = 'JourneyMerge' ORDER BY id`,
    );
    const capabilities = yield* read(
        store,
        NameRow,
        (sql) => sql`SELECT id, json_extract(body, '$.name') AS name FROM record WHERE type = 'Capability' ORDER BY id`,
    );
    return {
        journeys: journeys.map((row) => row.body),
        merges: merges.map((row) => row.body),
        capabilities,
    };
});
