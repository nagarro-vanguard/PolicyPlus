import { Schema } from "effect";
import { componentJobGaps, journeyGaps, shapeGaps, type ComponentContext, type DesignContext } from "../derive/checks";
import { missing } from "../derive/graph";
import type { LegacySheet } from "../derive/legacy";
import { wordsIn } from "../derive/words";
import { Architecture, Component, Journey, Merge, Task } from "../model/records";

/** What a job hands its gate: its own inputs, written when the stage was prepared. */
export type JobFile = {
    kind: string;
    actions?: string[];
    rules?: string[];
    taskIds?: string[];
    tasks?: string[];
    domain?: string;
};

const decodeWith = <A, I>(schema: Schema.Codec<A, I>, value: unknown) => {
    try {
        return { ok: true as const, value: Schema.decodeUnknownSync(schema)(value) as A };
    } catch (error) {
        return { ok: false as const, problem: String(error).split("\n").slice(0, 4).join(" ") };
    }
};

export type Output = {
    tasks?: unknown;
    merges?: unknown;
    journeys?: unknown;
    architectures?: unknown;
    components?: unknown;
};

export const recordCount = (output: Output) =>
    [output.tasks, output.merges, output.journeys, output.architectures, output.components].flatMap((each) =>
        Array.isArray(each) ? each : [],
    ).length;

/**
 * The gate of the tasks job: the job's entry points and rules are split exactly among the tasks, each task's journey
 * today cites only its own entry points, and the words say outcomes, not controls.
 * @returns every gap
 */
export const gateTasks = (job: JobFile, output: Output, legacy: LegacySheet): string[] => {
    const parsed = decodeWith(Schema.Array(Task), output.tasks);
    if (!parsed.ok) return [`tasks do not match their shape: ${parsed.problem}`];
    const tasks = parsed.value;
    const gaps: string[] = [];
    if (new Set(tasks.map((task) => task.id)).size !== tasks.length) gaps.push("two tasks share an id");
    for (const [name, owned, pick] of [
        ["entry points", job.actions ?? [], (task: Task) => task.actions as readonly string[]],
        ["rules", job.rules ?? [], (task: Task) => task.rules as readonly string[]],
    ] as const) {
        const seen = new Map<string, number>();
        for (const task of tasks) for (const id of pick(task)) seen.set(id, (seen.get(id) ?? 0) + 1);
        const lost = missing(owned, new Set(seen.keys()));
        if (lost.count > 0) gaps.push(`${lost.count} ${name} belong to no task: ${lost.text}`);
        const own = new Set(owned);
        for (const [id, count] of seen) {
            if (!own.has(id)) gaps.push(`${name.slice(0, -1)} ${id} is not this job's to place`);
            if (count > 1) gaps.push(`${name.slice(0, -1)} ${id} is in ${count} tasks, not one`);
        }
    }
    for (const task of tasks) {
        const own = new Set<string>(task.actions);
        const used = new Set<string>();
        task.current.forEach((step, at) => {
            for (const id of step.from) {
                used.add(id);
                if (!own.has(id))
                    gaps.push(`task ${task.id}, step ${at + 1} today: cites ${id}, which is not the task's`);
            }
        });
        const lost = missing(own, used);
        if (lost.count > 0)
            gaps.push(`task ${task.id}: ${lost.count} entry points are in no step of today's journey: ${lost.text}`);
        for (const id of task.facts)
            if (legacy.entities[id] === undefined) gaps.push(`task ${task.id}: unknown kind of data ${id}`);
        for (const id of task.needs)
            if (legacy.externals[id] === undefined) gaps.push(`task ${task.id}: unknown outside system ${id}`);
        const words = wordsIn(task.outcome);
        if (words.length > 0)
            gaps.push(`task ${task.id}: the outcome names a medium, control or technology (${words.join(", ")})`);
    }
    return gaps;
};

export const gateMerge = (job: JobFile, output: Output): string[] => {
    const parsed = decodeWith(Schema.Array(Merge), output.merges);
    if (!parsed.ok) return [`merges do not match their shape: ${parsed.problem}`];
    const known = new Set(job.taskIds ?? []);
    const seen = new Set<string>();
    const gaps: string[] = [];
    for (const merge of parsed.value)
        for (const id of [merge.keep, ...merge.absorb]) {
            if (!known.has(id)) gaps.push(`task ${id} does not exist`);
            if (seen.has(id)) gaps.push(`task ${id} is in two merges`);
            seen.add(id);
        }
    return gaps;
};

export const gateVariants = (job: JobFile, output: Output, tasks: readonly Task[]): string[] => {
    const parsed = decodeWith(Schema.Array(Journey), output.journeys);
    if (!parsed.ok) return [`journeys do not match their shape: ${parsed.problem}`];
    const gaps: string[] = [];
    for (const id of job.tasks ?? []) {
        const task = tasks.find((each) => each.id === id);
        if (task === undefined) {
            gaps.push(`no task ${id}`);
            continue;
        }
        gaps.push(
            ...journeyGaps(
                task,
                parsed.value.filter((journey) => journey.task === id),
            ),
        );
    }
    for (const journey of parsed.value)
        if (!(job.tasks ?? []).includes(journey.task))
            gaps.push(`a journey is for task ${journey.task}, which is not this job's`);
    return gaps;
};

export const gateShape = (output: Output, context: DesignContext): string[] => {
    const parsed = decodeWith(Schema.Array(Architecture), output.architectures);
    return parsed.ok ? shapeGaps(parsed.value, context) : [`architectures do not match their shape: ${parsed.problem}`];
};

export const gateComponents = (output: Output, context: ComponentContext): string[] => {
    const parsed = decodeWith(Schema.Array(Component), output.components);
    return parsed.ok
        ? componentJobGaps(parsed.value, context)
        : [`components do not match their shape: ${parsed.problem}`];
};

/** The review's own shape: it must have read every record. */
export const gateReview = (review: { read: number; challenges: unknown[] }, records: number) =>
    review.read === records ? [] : [`the review says it read ${review.read} records, but the output has ${records}`];
