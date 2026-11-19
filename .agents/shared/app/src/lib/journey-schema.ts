// The records the Journeys pages are built from, as Zod schemas: today's journeys (the code analysis's `journeys.json`, or the
// target's `current.json` until a run has it) and the ways proposed for them (the target's `journeys.json` and the skill's
// variants). A record that does not match fails the build, as every other payload does. Plain module: no `astro:content`, so
// a test can use it.
import { z } from "zod";

export const currentStepSchema = z.object({
    intent: z.string(),
    system: z.string(),
    from: z.array(z.string()),
    confidence: z.string(),
});

/** One thing a person gets done, as the code does it today. */
export const todaySchema = z.object({
    id: z.string().min(1),
    outcome: z.string().min(1),
    actor: z.string(),
    actions: z.array(z.string()),
    rules: z.array(z.string()),
    facts: z.array(z.string()),
    needs: z.array(z.string()),
    current: z.array(currentStepSchema),
});

const linkSchema = z.discriminatedUnion("_tag", [
    z.object({ _tag: z.literal("legacy"), from: z.array(z.string()), change: z.string(), reason: z.string(), keeps: z.array(z.string()) }),
    z.object({ _tag: z.literal("new"), reason: z.string() }),
]);

export const stepSchema = z.object({
    id: z.string(),
    intent: z.string(),
    system: z.string(),
    confidence: z.string(),
    touches: z.array(z.string()),
    honours: z.array(z.string()),
    link: linkSchema,
});

/** One way of doing a task: the chosen one, or one that was considered. */
export const waySchema = z.object({
    id: z.string().min(1),
    task: z.string().min(1),
    actor: z.string(),
    name: z.string(),
    strategy: z.string(),
    idea: z.string(),
    tradeoff: z.string(),
    recommended: z.string().optional(),
    baseline: z.boolean(),
    steps: z.array(stepSchema),
    drops: z.array(z.object({ actions: z.array(z.string()), rules: z.array(z.string()), reason: z.string() })),
});

export type TodayRecord = z.infer<typeof todaySchema>;
export type WayRecord = z.infer<typeof waySchema>;
