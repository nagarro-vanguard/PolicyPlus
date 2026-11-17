import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { capabilitySchema } from "./generated/capability";
import { knowledgeSchema } from "./generated/knowledge";
import { systemSchema } from "./generated/system";

const dir = process.env.PAYLOADS_DIR;
if (dir === undefined || dir === "") {
    throw new Error("PAYLOADS_DIR is not set: build through cli/build-ux-visuals.ts");
}

// The payloads, validated against Zod generated from the same Effect schemas that wrote them: a payload that does not
// match fails the build.
export const collections = {
    system: defineCollection({ loader: glob({ pattern: "system.json", base: dir }), schema: systemSchema }),
    knowledge: defineCollection({ loader: glob({ pattern: "knowledge.json", base: dir }), schema: knowledgeSchema }),
    capabilities: defineCollection({
        loader: glob({ pattern: "capability-*.json", base: dir }),
        schema: capabilitySchema,
    }),
};
