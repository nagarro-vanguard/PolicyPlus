import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "zod";
import { bundleSchema } from "./generated/bundle";
import { capabilitySchema } from "./generated/capability";
import { knowledgeSchema } from "./generated/knowledge";
import { ledgerSchema } from "./generated/ledger";
import { planSchema } from "./generated/plan";
import { systemSchema } from "./generated/system";
import { todaySchema, waySchema } from "./lib/journey-schema";
import { chosenSource, consideredSource, todaySource } from "./lib/journey-sources";

const dir = process.env.ANALYSIS_PAYLOADS_DIR;
if (dir === undefined || dir === "") {
    throw new Error("ANALYSIS_PAYLOADS_DIR is not set: build through a skill's build-app command");
}

// The payloads, validated against Zod generated from the same Effect schemas that wrote them: a payload that does not
// match fails the build.
const analysis = {
    system: defineCollection({ loader: glob({ pattern: "system.json", base: dir }), schema: systemSchema }),
    knowledge: defineCollection({ loader: glob({ pattern: "knowledge.json", base: dir }), schema: knowledgeSchema }),
    bundle: defineCollection({ loader: glob({ pattern: "bundle.json", base: dir }), schema: bundleSchema }),
    capabilities: defineCollection({
        loader: glob({ pattern: "capability-*.json", base: dir }),
        schema: capabilitySchema,
    }),
};

// A modernization plan, only when PLAN_DIR names the folder holding it. The plan and the ledger are validated against
// the schemas the plan skill emits; the prompts are ready-made texts the pages show as they are.
const planDir = process.env.PLAN_DIR ?? "";
const payloads = `${planDir}/.modernization-backlog/payloads`;
// Without a plan the three collections exist and are empty, so the pages' types do not depend on whether there is one.
const none = () => [];
const plan = {
    plan: defineCollection({
        loader: planDir === "" ? none : glob({ pattern: "plan.json", base: payloads }),
        schema: planSchema,
    }),
    ledger: defineCollection({
        loader: planDir === "" ? none : glob({ pattern: "ledger.json", base: `${planDir}/work-items` }),
        schema: ledgerSchema,
    }),
    prompts: defineCollection({
        loader: planDir === "" ? none : glob({ pattern: "prompts.json", base: payloads }),
        schema: z.object({
            epics: z.record(z.string(), z.string()),
            scaffold: z.string(),
            deliver: z.record(z.string(), z.string()),
        }),
    }),
};

// The journeys: today's, read from the analysis (or, until a run has them, from the target's old file), and the ways proposed
// for them. Each is validated against its schema, so a record that does not match fails the build; a folder without one of
// the files simply has none.
const targetDir = process.env.TARGET_DIR ?? "";
const journeys = {
    journeys: defineCollection({ loader: () => todaySource(dir, targetDir).records as { id: string }[], schema: todaySchema }),
    ways: defineCollection({ loader: () => chosenSource(targetDir) as { id: string }[], schema: waySchema }),
    considered: defineCollection({ loader: () => consideredSource(targetDir) as { id: string }[], schema: waySchema }),
};

export const collections = { ...analysis, ...plan, ...journeys };
