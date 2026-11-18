import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";

// The Zod the pages validate against is generated from the Effect schemas that wrote the payloads. This holds them to
// each other on the payloads of a real analysis (ANALYSIS_PAYLOADS_DIR) and shows a payload that differs from its schema is refused.
const dir = process.env.ANALYSIS_PAYLOADS_DIR;
const ready = dir !== undefined && existsSync(`${dir}/system.json`) && existsSync("src/generated/system.ts");

describe.skipIf(!ready)("the generated schemas hold the payloads to the Effect schemas", async () => {
    const { capabilitySchema } = await import("../src/generated/capability");
    const { systemSchema } = await import("../src/generated/system");
    const { knowledgeSchema } = await import("../src/generated/knowledge");
    const { bundleSchema } = await import("../src/generated/bundle");
    const read = (file: string): Record<string, unknown> => JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
    test("every payload of the run is valid", () => {
        for (const file of readdirSync(dir ?? ".").filter((name) => name.endsWith(".json"))) {
            const schema =
                file === "system.json"
                    ? systemSchema
                    : file === "knowledge.json"
                      ? knowledgeSchema
                      : file === "bundle.json"
                        ? bundleSchema
                        : capabilitySchema;
            expect(schema.safeParse(read(file)).success).toBe(true);
        }
    });
    test("a payload with a field missing or a value outside its set is refused", () => {
        const system = read("system.json");
        const layers = structuredClone(system) as { layers: Record<string, unknown>[] };
        delete layers.layers[0]?.blocks;
        expect(systemSchema.safeParse(layers).success).toBe(false);
        const know = structuredClone(read("knowledge.json")) as { risks: Record<string, unknown>[] };
        if (know.risks[0] !== undefined) {
            know.risks[0].severity = "catastrophic";
            expect(knowledgeSchema.safeParse(know).success).toBe(false);
        }
        const parts = structuredClone(read("knowledge.json")) as { parts: Record<string, unknown>[] };
        delete parts.parts[0]?.purpose;
        expect(knowledgeSchema.safeParse(parts).success).toBe(false);
        const kinds = structuredClone(system) as { externals: Record<string, unknown>[] };
        if (kinds.externals[0] !== undefined) {
            kinds.externals[0].kind = "not a kind";
            expect(systemSchema.safeParse(kinds).success).toBe(false);
        }
    });
});
