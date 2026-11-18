import { describe, expect, test } from "bun:test";
import { knownIds, layoutProblems, modelProblems } from "../src/lib/check";
import { fitted, pageWidth, smallestScale } from "../src/lib/fit";
import { layout } from "../src/lib/layout";
import { contextModel, landscapeModel, tiersModel } from "../src/lib/model";
import type { System } from "../src/lib/types";
import { widthOf, wrapLabel } from "../src/lib/text";
import { copy } from "../src/lib/copy";
import { pathNamesRecordId, languageFindings } from "../src/lib/language";

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

import { integrationModel, partsModel, statesModel, dataGridModel } from "../src/lib/model";
import { briefsFor } from "../src/lib/figures";
import { risksInFiles, groupedRisks, severityCounts } from "../src/lib/risks";
import { slugsOf } from "../src/lib/slugs";
import type { Knowledge } from "../src/lib/types";

const knowledge = {
    parts: [
        { id: "part-1", name: "Website", kind: "site", purpose: "p", folders: [], technologies: [], files: 20 },
        { id: "part-2", name: "Services", kind: "library", purpose: "p", folders: [], technologies: [], files: 10 },
        { id: "part-3", name: "Database", kind: "database", purpose: "p", folders: [], technologies: [], files: 4 },
        { id: "part-4", name: "Automated tests", kind: "tests", purpose: "p", folders: [], technologies: [], files: 9 },
    ],
    technologies: [],
    answers: [],
    assumptions: [],
    lifecycles: [
        {
            id: "lifecycle-1",
            entity: { id: "entity-1", name: "Booking" },
            states: ["Being booked", "Confirmed", "Deleted"],
            transitions: [
                { from: [], to: 1, file: "a.cs", line: 1 },
                { from: [1], to: 2, file: "a.cs", line: 2 },
                { from: [1, 2], to: 3, file: "b.cs", line: 3 },
            ],
        },
    ],
    partLinks: [
        { from: "part-1", to: "part-2", kind: "call", links: 5 },
        { from: "part-2", to: "part-3", kind: "saves", links: 2 },
        { from: "part-4", to: "part-1", kind: "call", links: 7 },
        { from: "part-2", to: "ext-0", kind: "call", links: 3 },
    ],
    dataUse: [
        {
            capability: { id: "capability-1", name: "Booking" },
            entity: { id: "entity-1", name: "Booking" },
            saves: true,
            reads: true,
        },
        {
            capability: { id: "capability-2", name: "News" },
            entity: { id: "entity-1", name: "Booking" },
            saves: false,
            reads: true,
        },
        {
            capability: { id: "capability-2", name: "News" },
            entity: { id: "entity-2", name: "Article" },
            saves: true,
            reads: false,
        },
    ],
    figures: [],
    risks: [
        {
            id: "risk-1",
            statement: "Any signed-in user can read every saved card.",
            category: "access-control",
            categoryWords: "Someone can read or change what they should not",
            severity: "high",
            subject: { kind: "system", id: "", name: "The whole system" },
            findings: [],
            places: { capabilities: [], parts: [], files: ["a.cs"] },
        },
        {
            id: "risk-2",
            statement: "Any signed-in user can read every saved card elsewhere.",
            category: "access-control",
            categoryWords: "Someone can read or change what they should not",
            severity: "low",
            subject: { kind: "system", id: "", name: "The whole system" },
            findings: [],
            places: { capabilities: [], parts: [], files: ["z.cs"] },
        },
    ],
} as unknown as Knowledge;

describe("the pictures drawn from what the analysis knows", () => {
    const parts = partsModel(knowledge).model;
    const integration = integrationModel(system(1, 1), {
        ...knowledge,
        partLinks: knowledge.partLinks.map((link) => ({ ...link, to: link.to === "ext-0" ? "ext-0" : link.to })),
    } as Knowledge).model;
    const states = statesModel(knowledge.lifecycles[0] as never).model;
    test("parts leave out tests, say so, and hold every other part once", () => {
        expect(parts.nodes.map((node) => node.label).toSorted()).toEqual(["Database", "Services", "Website"]);
        expect(parts.leftOut).toEqual(["Automated tests"]);
        expect(parts.edges.map((edge) => edge.label)).toContain("calls · 5 links");
        expect(
            partsModel({
                ...knowledge,
                partLinks: [
                    { from: "part-1", to: "part-2", kind: "call", links: 5 },
                    { from: "part-1", to: "part-2", kind: "dispatches", links: 2 },
                ],
            } as Knowledge).model.edges.map((edge) => edge.label),
        ).toEqual(["calls, dispatches · 7 links"]);
        expect(parts.edges.every((edge) => edge.from !== "part-4")).toBe(true);
    });
    test("integration joins a part to an outside system with how and how many links", () => {
        expect(integration.edges.map((edge) => edge.label)).toEqual(["calls · 3 links"]);
        expect(integration.nodes.map((node) => node.label).toSorted()).toEqual(["Outside system 0", "Services"]);
    });
    test("states start where a record is created and name the places that change it", () => {
        expect(states.nodes.map((node) => node.label)).toEqual([
            "Record created",
            "Being booked",
            "Confirmed",
            "Deleted",
        ]);
        expect(states.edges.find((edge) => edge.to === "state-3" && edge.from === "state-1")?.label).toBe("1 place");
        expect(states.nodes.find((node) => node.id === "state-3")?.sub).toBe("reached in 1 place");
    });
    test("none of them shows a number without its unit, or a record id", () => {
        for (const model of [parts, integration, states]) {
            expect(model.edges.filter((edge) => /^\d+$/.test(edge.label))).toEqual([]);
            expect(
                [...model.nodes.map((node) => node.sub), ...model.edges.map((edge) => edge.label)].flatMap(
                    (text) => languageFindings(text, "figure").hard,
                ),
            ).toEqual([]);
        }
    });
    test("every figure holds its checks", async () => {
        const known = knownIds(system(1, 1), [], knowledge);
        for (const model of [parts, integration, states]) {
            expect(modelProblems(model, known)).toEqual([]);
            expect(layoutProblems(model, await layout(model, "RIGHT"))).toEqual([]);
        }
    });
    test("the data grid says who saves and who reads", () => {
        const { grid } = dataGridModel(knowledge);
        expect(grid.cell("entity-1", "capability-1")).toBe("both");
        expect(grid.cell("entity-1", "capability-2")).toBe("reads");
        expect(grid.cell("entity-2", "capability-2")).toBe("saves");
        expect(grid.cell("entity-2", "capability-1")).toBe("");
    });
});

describe("which pictures a page draws", () => {
    test("the briefing's pictures, in its order; none chosen for the page gives the shapes the records support", () => {
        const asked = {
            ...knowledge,
            figures: [{ id: "figure-1", kind: "states", question: "q", caption: "c", wanted: "", records: [] }],
        } as Knowledge;
        expect(briefsFor(["states", "data"], system(1, 1), asked).map((brief) => brief.kind)).toEqual(["states"]);
        expect(briefsFor(["parts"], system(1, 1), asked).map((brief) => brief.kind)).toEqual(["parts"]);
        expect(briefsFor(["data", "states"], system(1, 1), knowledge).map((brief) => brief.kind)).toEqual([
            "data",
            "states",
        ]);
        expect(briefsFor(["layers"], system(1, 1), knowledge)).toEqual([]);
    });
});

describe("risks", () => {
    test("are placed by the files their lines lie in, grouped by severity, and have readable addresses", () => {
        expect(risksInFiles(knowledge, ["a.cs", "b.cs"]).map((risk) => risk.id)).toEqual(["risk-1"]);
        expect(severityCounts(knowledge.risks)).toEqual({ high: 1, medium: 0, low: 1 });
        expect(groupedRisks(knowledge.risks).map((group) => group.severity)).toEqual(["high", "low"]);
        const slugs = slugsOf(system(1), [], knowledge);
        const names = knowledge.risks.map((risk) => slugs.risk(risk.id));
        expect(new Set(names).size).toBe(2);
        expect(names.some((name) => pathNamesRecordId(name))).toBe(false);
    });
});
