import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fingerprintOf } from "../../plan-modernization-backlog/shared/read/fingerprint";
import { deriveLegacy } from "../shared/derive/legacy";
import { dropSteps, partLinks, risksOf, stackOf } from "../shared/derive/views";
import type { Architecture, ArchitectureRecord, Drop } from "../shared/model/records";
import { build, legacy, stack } from "./fixture";

const f = build();
const [t1] = f.tasks;
const first = f.architectures[0] as Architecture;
const second = f.architectures[1] as Architecture;

describe("what code works out for readers", () => {
    test("a risk written as a plain sentence reads as an accepted risk that cites nothing, flagged unlinked", () => {
        const older: ArchitectureRecord = { ...first, risks: ["Everything runs in one process.", ...first.risks] };
        expect(risksOf(older)).toEqual([
            { statement: "Everything runs in one process.", kind: "accepted", cites: [], unlinked: true },
            { ...(first.risks[0] as Architecture["risks"][number]), unlinked: false },
        ]);
    });
    test("a drop names the steps of today it touches and those it ends", () => {
        const byAction: Drop = { actions: ["block-2" as never], rules: ["businessrule-2" as never], reason: "x" };
        expect(dropSteps(byAction, t1 as never, legacy)).toEqual({ steps: ["t1#2", "t1#3"], ends: ["t1#2"] });
        const ruleOnly: Drop = { actions: [], rules: ["businessrule-1" as never], reason: "x" };
        expect(dropSteps(ruleOnly, t1 as never, legacy)).toEqual({ steps: ["t1#1", "t1#3"], ends: [] });
    });
    test("how parts talk: a use across parts, a store, an outside system; a use inside a part is not listed", () => {
        expect(partLinks({ ...first, components: [...f.components] })).toEqual([
            { from: "application", to: "external-1", how: "reaches" },
        ]);
        const withStore: ArchitectureRecord = {
            ...second,
            containers: [
                ...second.containers,
                {
                    name: "database",
                    kind: "store",
                    tech: "PostgreSQL",
                    holds: ["Policies"],
                    does: "Keeps.",
                    runsOn: "server",
                },
            ],
            components: [...f.components],
        };
        expect(partLinks(withStore)).toEqual([
            { from: "interface", to: "service", how: "calls" },
            { from: "interface", to: "database", how: "stores" },
            { from: "service", to: "external-1", how: "reaches" },
        ]);
        expect(partLinks(second)).toEqual([
            { from: "interface", to: "service", how: "calls" },
            { from: "service", to: "external-1", how: "reaches" },
        ]);
    });
    test("each part's line of the Target Stack is copied from the request, with its role when one line holds it", () => {
        expect(stackOf(second, stack)).toEqual([
            { container: "interface", tech: "TypeScript", lines: [stack[0] as string], role: "language and runtime" },
            {
                container: "service",
                tech: "TypeScript on Bun",
                lines: [stack[0] as string],
                role: "language and runtime",
            },
        ]);
        expect(
            stackOf(
                { containers: [{ ...(second.containers[0] as Architecture["containers"][number]), tech: "o" }] },
                stack,
            )[0],
        ).toEqual({
            container: "interface",
            tech: "o",
            lines: [...stack],
        });
    });
});

describe("the analysis's payloads, before and after it calls what holds an action a surface", () => {
    const surface = {
        key: "Forms/DetailForm",
        name: "Policy details",
        kind: "screen",
        noun: { one: "window", many: "windows" },
        unnamed: false,
    };
    const payloads = (names: { action: string; system: string }, holder = "DetailForm", system: unknown[] = []) => {
        const folder = mkdtempSync(join(tmpdir(), "shape-legacy-"));
        mkdirSync(folder, { recursive: true });
        const place = { file: "Main.vb", firstLine: 1, lastLine: 2 };
        writeFileSync(
            join(folder, "system.json"),
            JSON.stringify({
                purpose: "Edits policies.",
                layers: [{ name: "Forms" }],
                [names.system]: system,
                externals: [],
                gaps: { unattributedBlocks: 0 },
            }),
        );
        writeFileSync(
            join(folder, "capability-1.json"),
            JSON.stringify({
                capability: { id: "capability-1", name: "Browsing", purpose: "Look." },
                layers: [
                    {
                        id: "layer-1",
                        name: "Forms",
                        actions: [
                            {
                                id: "block-1",
                                name: "Open",
                                purpose: "Opens.",
                                startedBy: "person",
                                [names.action]: holder,
                                place,
                                rules: ["rule-1"],
                            },
                        ],
                        rules: [{ id: "rule-1", says: "A policy shows its name.", place }],
                    },
                ],
                data: [],
            }),
        );
        writeFileSync(join(folder, "knowledge.json"), JSON.stringify({ lifecycles: [] }));
        return folder;
    };
    test("`screen` and `screens` are read as they are today", () => {
        const sheet = deriveLegacy(
            payloads({ action: "screen", system: "screens" }, "DetailForm", [{ name: "MainForm" }]),
        );
        expect(sheet.actions["block-1"]?.surface).toBe("DetailForm");
        expect(sheet.actions["block-1"]?.surfaceKey).toBeUndefined();
        expect(sheet.surfaces).toBeUndefined();
        expect(sheet.identifiers).toEqual(expect.arrayContaining(["MainForm", "DetailForm"]));
    });
    test("an action's `surface` is a key of the system's `surfaces`: the sheet holds the key and shows the name", () => {
        const sheet = deriveLegacy(
            payloads({ action: "surface", system: "surfaces" }, surface.key, [
                surface,
                { ...surface, key: "Forms/MainForm", name: "MainForm", unnamed: true },
            ]),
        );
        expect(sheet.actions["block-1"]).toMatchObject({ surface: "Policy details", surfaceKey: "Forms/DetailForm" });
        expect(sheet.surfaces?.["Forms/DetailForm"]).toEqual({
            name: "Policy details",
            kind: "screen",
            noun: { one: "window", many: "windows" },
            unnamed: false,
        });
        expect(sheet.identifiers).toContain("MainForm");
        expect(sheet.identifiers).not.toContain("Policy details");
    });
    test("an analysis with both reads `surfaces`, and an action's screen name still shows when its key is unknown", () => {
        const folder = payloads({ action: "screen", system: "surfaces" }, "DetailForm", [surface]);
        const sheet = deriveLegacy(folder);
        expect(sheet.actions["block-1"]).toEqual(expect.objectContaining({ surface: "DetailForm" }));
        expect(sheet.actions["block-1"]?.surfaceKey).toBeUndefined();
    });
    test("an action that names neither has no surface", () => {
        const sheet = deriveLegacy(payloads({ action: "other", system: "other" }));
        expect(sheet.actions["block-1"]?.surface).toBe("");
    });
    test("the sheet's fingerprint is the one the plan and the conductor compute", () => {
        const folder = payloads({ action: "surface", system: "surfaces" }, surface.key, [surface]);
        writeFileSync(join(folder, "journeys.json"), "{}");
        const before = deriveLegacy(folder).fingerprint;
        expect(before).toBe(fingerprintOf(folder));
        writeFileSync(join(folder, "journeys.json"), '{"tasks": []}');
        expect(deriveLegacy(folder).fingerprint).toBe(before);
    });
});
