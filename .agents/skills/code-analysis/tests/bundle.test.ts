import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Schema } from "effect";
import { derive, makeRoot, type Spec } from "./fixture";
import { BundlePayload } from "../shared/model/schemas/bundle-payload";
import { CapabilityPayload } from "../shared/model/schemas/payloads";
import { KnowledgePayload } from "../shared/model/schemas/knowledge-payload";
import { SystemPayload } from "../shared/model/schemas/system-payload";
import {
    bundleGaps,
    bundleText,
    capabilityBundle,
    screenBundle,
    slug,
    surfaceBundle,
    surfaceBundleName,
    surfacePairs,
} from "../shared/read/bundle";

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
    const index = read("bundle.json", BundlePayload);
    return { root, system, knowledge, capabilities, index };
};

describe("bundles", () => {
    test("a capability's bundle holds its rules, its read order and the diagrams, and adds up", async () => {
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
        expect(text).toContain("## Product context");
        expect(text).toContain("```mermaid");
        expect(text).toContain("## Read order");
        expect(text).not.toContain("Ask:");
        expect(text).not.toContain("secrets stores");
        expect(bundle.files.length).toBeGreaterThan(0);
        expect(bundleGaps(bundle)).toEqual([]);
        expect(bundleText(bundle, () => undefined)).toBe(bundleText(bundle, () => undefined));
    });

    test("a screen's bundle names the code it runs and is its own slice", async () => {
        const payloads = await written();
        const [screen] = payloads.system.screens;
        expect(screen).toBeDefined();
        if (screen === undefined) {
            return;
        }
        const bundle = screenBundle(payloads, screen.key);
        expect(bundle).toBeDefined();
        if (bundle === undefined) {
            return;
        }
        const text = bundleText(bundle, () => undefined);
        expect(text).toContain(`# Screen: ${screen.name}`);
        expect(text).toContain("Only enabled rows are read.");
        expect(bundle.files.length).toBeGreaterThan(0);
        expect(bundleGaps(bundle)).toEqual([]);
    });

    test("embeds only the lines it names, numbered, when the source is given, and names an unknown place as none", async () => {
        const payloads = await written();
        const [capability] = payloads.capabilities;
        if (capability === undefined) {
            return;
        }
        const bundle = capabilityBundle(payloads, capability.capability.id);
        if (bundle === undefined) {
            return;
        }
        const text = bundleText(bundle, () =>
            Array.from({ length: 40 }, (_, number) => `line ${number + 1}`).join("\n"),
        );
        expect(text).toContain("## Source");
        expect(text).toMatch(/^1: line 1$/m);
        expect(screenBundle(payloads, "no-such-screen")).toBeUndefined();
        expect(capabilityBundle(payloads, "capability-none")).toBeUndefined();
    });

    test("a screen cut to one capability keeps that capability's actions and rules and adds up", async () => {
        const payloads = await written();
        const [screen] = payloads.system.screens;
        const [capability] = payloads.capabilities;
        if (screen === undefined || capability === undefined) {
            throw new Error("the fixture has a screen and a capability");
        }
        const id = capability.capability.id;
        const bundle = screenBundle(payloads, screen.key, id);
        expect(bundle).toBeDefined();
        if (bundle === undefined) {
            return;
        }
        expect(bundleText(bundle, () => undefined)).toContain("Only enabled rows are read.");
        expect(bundleGaps(bundle)).toEqual([]);
        expect(bundle.ruleIds.length).toBeGreaterThan(0);
        // a capability that holds no action of the screen has no bundle of it
        const other = { ...capability, capability: { ...capability.capability, id: "capability-other" } };
        const emptied = {
            ...other,
            layers: other.layers.map((layer) => ({ ...layer, actions: [], rules: [] })),
        };
        const both = { ...payloads, capabilities: [capability, emptied] };
        expect(screenBundle(both, screen.key, "capability-other")).toBeUndefined();
        expect(screenBundle(both, screen.key, "capability-missing")).toBeUndefined();
        expect(screenBundle(both, screen.key, id)?.ruleIds).toEqual(bundle.ruleIds);
    });

    test("a surface bundle is the actions of one container and one capability; none where there are none", async () => {
        const payloads = await written();
        const pairs = surfacePairs(payloads);
        expect(pairs.length).toBeGreaterThan(0);
        for (const pair of pairs) {
            const bundle = surfaceBundle(payloads, pair.surface, pair.capabilityId);
            expect(bundle).toBeDefined();
            expect(bundle === undefined ? ["x"] : bundleGaps(bundle)).toEqual([]);
        }
        const [capability] = payloads.capabilities;
        expect(surfaceBundle(payloads, "NoSuchContainer", capability?.capability.id ?? "")).toBeUndefined();
    });

    test("slugs are lowercase, one dash per run of other characters, none at either end", () => {
        expect(slug("Policy Plus main window")).toBe("policy-plus-main-window");
        expect(slug("  A -- b / C!! ")).toBe("a-b-c");
        expect(slug("Entry points without a window")).toBe("entry-points-without-a-window");
        expect(surfaceBundleName("Main", "Finding policies")).toBe("screen-main--finding-policies.md");
    });

    test("build-bundle all writes one file per surface and capability from payloads and the request alone", async () => {
        const payloads = await written();
        const folder = mkdtempSync(join(tmpdir(), "bundle-all-"));
        try {
            cpSync(join(payloads.root, "payloads"), join(folder, "payloads"), { recursive: true });
            mkdirSync(join(folder, "work"), { recursive: true });
            writeFileSync(
                join(folder, "work", "analysis-request.json"),
                JSON.stringify({ sourceRoots: [folder], leaveOut: [], supportingMaterial: [] }),
            );
            expect(existsSync(join(folder, "analysis.sqlite"))).toBe(false);
            const child = Bun.spawn(["bun", join(import.meta.dir, "..", "cli", "build-bundle.ts"), "all"], {
                env: { ...process.env, CODE_ANALYSIS_ROOT: folder },
                stdout: "pipe",
                stderr: "pipe",
            });
            const out = await new Response(child.stdout).text();
            expect(await child.exited).toBe(0);
            const expected = surfacePairs(payloads)
                .map((pair) => surfaceBundleName(pair.surface, pair.capability))
                .toSorted();
            expect(readdirSync(join(folder, "bundles")).toSorted()).toEqual(expected);
            expect(out).toContain(`${expected.length} bundles written`);
            expect(out).toContain("the largest is");
        } finally {
            rmSync(folder, { recursive: true, force: true });
        }
    });
});
