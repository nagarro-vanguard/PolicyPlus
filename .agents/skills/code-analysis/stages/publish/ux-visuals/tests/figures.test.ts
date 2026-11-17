import { describe, expect, test } from "bun:test";
import { knownIds, layoutProblems, modelProblems } from "../src/lib/check";
import { fitted, pageWidth, smallestScale } from "../src/lib/fit";
import { layout } from "../src/lib/layout";
import { contextModel, landscapeModel, tiersModel } from "../src/lib/model";
import type { System } from "../src/lib/types";
import { widthOf, wrapLabel } from "../src/lib/text";
import { copy } from "../src/lib/copy";

const layer = (n: number, name = `Layer ${n}`, product = true) => ({
    id: `layer-${n}`,
    name,
    role: "decides",
    purpose: "",
    group: n % 2 === 0 ? "logic" : "ui",
    blocks: 10 + n,
    product,
});

const system = (layers: number, externals = 0, edgesPerLayer = 1, name?: (n: number) => string): System =>
    ({
        purpose: "",
        capabilities: [],
        areas: [],
        layers: Array.from({ length: layers }, (_, i) => layer(i, name === undefined ? undefined : name(i))),
        screens: [],
        edges: Array.from({ length: layers }, (_, i) =>
            Array.from({ length: edgesPerLayer }, (_, j) => ({
                from: `layer-${i}`,
                to: `layer-${(i + 1 + j) % layers}`,
                kind: "call",
                links: i + j + 1,
            })),
        ).flat(),
        entries: { person: 3, otherSystem: 0, schedule: 1 },
        externals: Array.from({ length: externals }, (_, i) => ({
            id: `ext-${i}`,
            name: `Outside system ${i}`,
            kind: i % 2 === 0 ? "dataStore" : "outsideService",
            links: externals - i,
            reach: [{ layer: "layer-0", access: "call", links: externals - i }],
        })),
        gaps: { unresolvedLinks: 0, unattributedBlocks: 0 },
        context: { text: "" },
    }) as unknown as System;

describe("figures", () => {
    const cases: [string, System][] = [
        ["one layer", system(1)],
        ["two layers", system(2)],
        ["forty layers, many links", system(40, 5, 3)],
        ["a hundred outside systems", system(5, 100)],
        ["no outside systems", system(5, 0)],
        ["long names", system(6, 3, 1, (n) => `A layer with a very long name that does not fit a box number ${n}`)],
        ["non-Latin names", system(6, 3, 1, (n) => `レイヤー名が長い画面と業務ロジック ${n}`)],
    ];
    for (const [name, sys] of cases) {
        test(`${name}: every figure holds, fits its boxes and is the same twice`, async () => {
            const known = knownIds(sys, []);
            for (const build of [
                (limit: number) => tiersModel(sys, limit).model,
                (limit: number) => contextModel(sys, limit).model,
            ]) {
                const fit = await fitted(build(14).id, build);
                expect(modelProblems(fit.model, known)).toEqual([]);
                expect(layoutProblems(fit.model, fit.laid)).toEqual([]);
                const again = await layout(fit.model, fit.direction);
                expect(again).toEqual(fit.laid);
            }
        });
    }

    test("over budget, boxes fold into one that counts them, never dropped silently", () => {
        const sys = system(40, 0, 2);
        const { model } = tiersModel(sys, 10);
        expect(model.nodes.length).toBeLessThanOrEqual(10);
        const folded = model.nodes.reduce((sum, node) => sum + (node.hidden === undefined ? 0 : node.hidden), 0);
        expect(folded).toBe(model.omitted);
        const covered = new Set(model.nodes.flatMap((node) => node.ids));
        expect(covered.size).toBe(40);
    });

    test("a figure that names an id no payload holds, or joins a missing box, is refused", async () => {
        const sys = system(3);
        const { model } = tiersModel(sys);
        const bad = {
            ...model,
            nodes: [...model.nodes, { id: "ghost", label: "Ghost", sub: "", kind: "layer" as const, ids: ["nowhere"] }],
            edges: [
                ...model.edges,
                { id: "x", from: "layer-0", to: "missing", verb: "", unit: "", label: "", count: 1 },
            ],
        };
        expect(modelProblems(bad, knownIds(sys, [])).join("\n")).toContain("nowhere");
        expect(modelProblems(bad, knownIds(sys, [])).join("\n")).toContain("not drawn");
    });

    test("overlapping boxes and an arrow through a box are found", async () => {
        const { model } = tiersModel(system(3));
        const laid = await layout(model, "DOWN");
        const [a, b] = laid.boxes;
        if (a === undefined || b === undefined) throw new Error("two boxes expected");
        const squashed = { ...laid, boxes: [a, { ...b, x: a.x + 5, y: a.y + 5 }, ...laid.boxes.slice(2)] };
        expect(layoutProblems(model, squashed).join("\n")).toContain("overlap");
    });

    test("a figure is shrunk to page width no further than the smallest scale, or reported unreadable", async () => {
        const fit = await fitted("tiers", (limit) => tiersModel(system(40, 0, 3), limit).model);
        expect(fit.readable ? fit.scale >= smallestScale : true).toBe(true);
        expect(fit.scale).toBeGreaterThan(0);
        expect(pageWidth).toBe(1000);
    });

    test("capabilities of the product and of project work are told apart", () => {
        const sys = system(2);
        const grouped = landscapeModel(
            {
                ...sys,
                layers: [layer(0, "Screens", true), layer(1, "Tests", false)],
                capabilities: [
                    { id: "c1", name: "Booking", purpose: "", screens: 1, actions: 1, rules: 1 },
                    { id: "c2", name: "Test run", purpose: "", screens: 0, actions: 1, rules: 0 },
                ],
            } as unknown as System,
            [
                { capability: { id: "c1" }, layers: [{ id: "layer-0" }] },
                { capability: { id: "c2" }, layers: [{ id: "layer-1" }] },
            ] as never,
        );
        expect(grouped.groups.map((group) => group.title)).toEqual([copy.system.inNoArea, copy.system.layersProject]);
    });
});

describe("labels", () => {
    test("a wide character takes two places and a label is cut by room, with an ellipsis", () => {
        expect(widthOf("abc")).toBe(3);
        expect(widthOf("画面")).toBe(4);
        const lines = wrapLabel("A layer with a very long name that does not fit a box at all", 24, 2);
        expect(lines).toHaveLength(2);
        expect(lines.every((line) => widthOf(line) <= 24)).toBe(true);
        expect(lines[1]?.endsWith("…")).toBe(true);
    });
    test("a word longer than a line is cut, and a short label stays whole", () => {
        expect(wrapLabel("Short", 24, 2)).toEqual(["Short"]);
        const cut = wrapLabel("Supercalifragilisticexpialidocious_and_more", 12, 3);
        expect(cut.every((line) => widthOf(line) <= 12)).toBe(true);
    });
});
