import { Schema } from "effect";
import { componentJobGaps, journeyGaps, shapeGaps, type ComponentContext, type DesignContext } from "../derive/checks";
import type { LegacySheet } from "../derive/legacy";
import { Architecture, Component, Journey, type Task } from "../model/records";

/** What a job hands its gate: its own inputs, written when the stage was prepared. */
export type JobFile = {
    kind: string;
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
    journeys?: unknown;
    architectures?: unknown;
    components?: unknown;
};

export const recordCount = (output: Output) =>
    [output.journeys, output.architectures, output.components].flatMap((each) => (Array.isArray(each) ? each : []))
        .length;

export const gateVariants = (job: JobFile, output: Output, tasks: readonly Task[], legacy?: LegacySheet): string[] => {
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
                legacy,
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
