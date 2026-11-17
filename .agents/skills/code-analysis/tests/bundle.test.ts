import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Schema } from "effect";
import { derive, makeRoot, type Spec } from "./fixture";
import { CapabilityPayload } from "../shared/model/schemas/payloads";
import { KnowledgePayload } from "../shared/model/schemas/knowledge-payload";
import { SystemPayload } from "../shared/model/schemas/system-payload";
import { bundleText, capabilityBundle, screenBundle } from "../shared/read/bundle";

const spec: Spec = {
    layers: [
        { id: "layer-ui", name: "Screens" },
        { id: "layer-data", name: "Storage" },
    ],
    codeKinds: [
        { id: "codekind-ui", name: "Handler", layer: "layer-ui" },
        { id: "codekind-data", name: "Reader", layer: "layer-data" },
    ],
    externalSystems: [{ id: "external-db", kind: "dataStore" }],
    blocks: [
        { id: "block-handler", first: 1, last: 9, codeKind: "codekind-ui", entry: true, container: "FindById" },
        { id: "block-reader", first: 20, last: 29, codeKind: "codekind-data" },
    ],
    links: [
        { id: "link-1", from: "block-handler", to: "block-reader", kind: "call" },
        { id: "link-3", from: "block-reader", kind: "reads", toExternal: "external-db" },
    ],
    rules: [{ id: "rule-2", block: "block-reader", says: "Only enabled rows are read." }],
};

const written = async () => {
    const root = makeRoot(spec);
    await derive(root);
    const child = Bun.spawn(["bun", join(import.meta.dir, "..", "cli", "write-payloads.ts")], {
        env: { ...process.env, CODE_ANALYSIS_ROOT: root },
        stdout: "pipe",
        stderr: "pipe",
    });
    await child.exited;
    const read = <S extends Schema.ConstraintDecoder<unknown>>(name: string, schema: S) =>
        Schema.decodeUnknownSync(schema)(JSON.parse(readFileSync(join(root, "payloads", name), "utf8")));
    const system = read("system.json", SystemPayload);
    const knowledge = read("knowledge.json", KnowledgePayload);
    const capabilities = system.capabilities.map((each) => read(`${each.id}.json`, CapabilityPayload));
    return { system, knowledge, capabilities };
};

describe("bundles", () => {
    test("a capability's bundle holds its rules, its files and what the code cannot tell", async () => {
        const payloads = await written();
        const [capability] = payloads.capabilities;
        expect(capability).toBeDefined();
        if (capability === undefined) {
            return;
        }
        const bundle = capabilityBundle(payloads, capability.capability.id);
        expect(bundle).toBeDefined();
        if (bundle === undefined) {
            return;
        }
        const text = bundleText(bundle, () => undefined);
        expect(text).toContain("Only enabled rows are read.");
        expect(text).toContain("Ask:");
        expect(text).toContain("What the code cannot tell you");
        expect(bundle.files.length).toBeGreaterThan(0);
        expect(bundleText(bundle, () => undefined)).toBe(bundleText(bundle, () => undefined));
    });

    test("embeds the source of the files it names when it is given, and names an unknown place as none", async () => {
        const payloads = await written();
        const [capability] = payloads.capabilities;
        if (capability === undefined) {
            return;
        }
        const bundle = capabilityBundle(payloads, capability.capability.id);
        if (bundle === undefined) {
            return;
        }
        expect(bundleText(bundle, (path) => `source of ${path}`)).toContain("source of ");
        expect(screenBundle(payloads, "no-such-screen")).toBeUndefined();
        expect(capabilityBundle(payloads, "capability-none")).toBeUndefined();
    });
});
