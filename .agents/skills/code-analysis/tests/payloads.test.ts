import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { derive, makeRoot, type Spec } from "./fixture";

/**
 * The payload of one capability across three layers, written by the command and read back: each entry point and rule
 * under exactly one layer, the totals matching, the layers grouped for a modernization, the gaps said.
 */
const spec: Spec = {
    layers: [
        { id: "layer-ui", name: "Screens" },
        { id: "layer-logic", name: "Logic" },
        { id: "layer-data", name: "Storage" },
    ],
    codeKinds: [
        { id: "codekind-ui", name: "Handler", layer: "layer-ui" },
        { id: "codekind-logic", name: "Rule", layer: "layer-logic" },
        { id: "codekind-data", name: "Reader", layer: "layer-data" },
    ],
    externalSystems: [{ id: "external-db", kind: "dataStore" }],
    blocks: [
        { id: "block-handler", first: 1, last: 9, codeKind: "codekind-ui", entry: true, container: "FindById" },
        { id: "block-rule", first: 10, last: 19, codeKind: "codekind-logic" },
        { id: "block-reader", first: 20, last: 29, codeKind: "codekind-data" },
    ],
    links: [
        { id: "link-1", from: "block-handler", to: "block-rule", kind: "call" },
        { id: "link-2", from: "block-rule", to: "block-reader", kind: "call" },
        { id: "link-3", from: "block-reader", kind: "reads", toExternal: "external-db" },
        { id: "link-4", from: "block-rule", kind: "call", unresolved: "chosen at run time" },
    ],
    rules: [
        { id: "rule-1", block: "block-rule", says: "An id must be numeric." },
        { id: "rule-2", block: "block-reader", says: "Only enabled rows are read." },
    ],
};

const run = async (root: string) => {
    const child = Bun.spawn(["bun", join(import.meta.dir, "..", "cli", "write-payloads.ts")], {
        env: { ...process.env, CODE_ANALYSIS_ROOT: root },
        stdout: "pipe",
        stderr: "pipe",
    });
    const [out, err] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
    return { out: out + err, code: await child.exited };
};

describe("payloads", () => {
    test("a capability's payload holds each entry point and rule once, under the layer that decides it", async () => {
        const root = makeRoot(spec);
        await derive(root);
        const { out, code } = await run(root);
        expect(out).toContain("payloads written");
        expect(code).toBe(0);
        const payload = JSON.parse(readFileSync(join(root, "payloads", "capability-capability-1.json"), "utf8"));
        expect(payload.totals).toEqual({ actions: 1, rules: 2, blocks: 3, rulesOnNoScreen: 0 });
        expect(payload.layers.map((layer: { name: string; group: string }) => [layer.name, layer.group])).toEqual([
            ["Screens", "ui"],
            ["Logic", "logic"],
            ["Storage", "data"],
        ]);
        const byLayer = Object.fromEntries(
            payload.layers.map((layer: { name: string; rules: unknown[]; actions: unknown[] }) => [
                layer.name,
                [layer.actions.length, layer.rules.length],
            ]),
        );
        expect(byLayer).toEqual({ Screens: [1, 0], Logic: [0, 1], Storage: [0, 1] });
        expect(payload.gaps).toHaveLength(1);
        expect(payload.gaps[0].reason).toBe("chosen at run time");
        expect(payload.screens).toHaveLength(1);
        expect(payload.screens[0]).toMatchObject({
            name: "FindById",
            actions: 1,
            controls: [],
            rules: ["rule-1", "rule-2"],
        });
        const schema = JSON.parse(readFileSync(join(root, "payloads", "schema", "capability.schema.json"), "utf8"));
        expect(schema.type).toBe("object");
        expect(Object.keys(schema.properties)).toContain("layers");
        expect(payload.context.text.startsWith("Ask: ")).toBe(true);
        expect(payload.context.text).toContain("Scope: Capability capability-1");
        expect(payload.context.text).toContain("Rules decided here: 2");
        expect(payload.context.text).toContain("Commit: not recorded");
        const action = payload.layers[0].actions[0];
        expect(action.path.map((step: { depth: number }) => step.depth)).toEqual([0, 1, 2]);
        expect(action.rules).toHaveLength(2);
    });

    test("the system payload lists the layers with their groups and the links between them", async () => {
        const root = makeRoot(spec);
        await derive(root);
        await run(root);
        const system = JSON.parse(readFileSync(join(root, "payloads", "system.json"), "utf8"));
        expect(system.layers.map((layer: { group: string }) => layer.group).toSorted()).toEqual([
            "data",
            "logic",
            "ui",
        ]);
        expect(system.edges).toHaveLength(2);
        expect(system.gaps).toEqual({ unresolvedLinks: 1, unattributedBlocks: 0 });
    });
});
