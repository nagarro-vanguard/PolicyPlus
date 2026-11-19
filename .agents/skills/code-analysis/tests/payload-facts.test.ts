import { describe, expect, test } from "bun:test";
import { externalsOf, judgeLayers, settleRoles } from "../shared/read/payload-facts";
import { groupOf } from "../shared/read/payload-words";

const layers = [
    { layer: "screens", role: "facesPerson" },
    { layer: "specs", role: "facesOtherSystems" },
    { layer: "build", role: "runsAsTooling" },
    { layer: "empty", role: "decides" },
];

describe("payload facts", () => {
    test("a layer is not the product when tooling or tests hold half of its blocks, or its role is scripts", () => {
        const parts = [
            { id: "screens", partKind: "site", blocks: 9 },
            { id: "screens", partKind: "tool", blocks: 1 },
            { id: "specs", partKind: "tests", blocks: 5 },
            { id: "specs", partKind: "service", blocks: 5 },
            { id: "build", partKind: "site", blocks: 10 },
        ];
        expect(judgeLayers(layers, parts).map((each) => [each.layer, each.product])).toEqual([
            ["screens", true],
            ["specs", false],
            ["build", false],
            ["empty", true],
        ]);
    });

    test("a layer whose blocks are all test code checks code, is not the product and is read under checks", () => {
        const roles = [
            { layer: "tests", role: "facesOtherSystems" },
            { layer: "half", role: "facesOtherSystems" },
            { layer: "build", role: "facesPerson" },
            { layer: "nothing", role: "decides" },
        ];
        const facts = [
            { layer: "tests", blocks: 12, testBlocks: 12, entryPoints: 4, scripts: 4 },
            { layer: "half", blocks: 12, testBlocks: 6, entryPoints: 0, scripts: 0 },
            { layer: "build", blocks: 3, testBlocks: 0, entryPoints: 2, scripts: 1 },
            { layer: "nothing", blocks: 0, testBlocks: 0, entryPoints: 0, scripts: 0 },
        ];
        const settled = settleRoles(roles, facts);
        expect(settled.map((each) => [each.layer, each.role])).toEqual([
            ["tests", "checksCode"],
            ["half", "facesOtherSystems"],
            ["build", "runsAsTooling"],
            ["nothing", "decides"],
        ]);
        expect(judgeLayers(settled, []).map((each) => [each.layer, each.product])).toEqual([
            ["tests", false],
            ["half", true],
            ["build", false],
            ["nothing", true],
        ]);
        expect(groupOf("checksCode")).toBe("checks");
    });

    test("external systems come most reached first, each once, with the layers that reach it", () => {
        const rows = [
            { externalSystem: "e1", name: "Mail", kind: "outsideService", layer: "l1", access: "call", links: 2 },
            { externalSystem: "e2", name: "Main database", kind: "dataStore", layer: "l1", access: "reads", links: 5 },
            { externalSystem: "e2", name: "Main database", kind: "dataStore", layer: null, access: "saves", links: 4 },
        ] as const;
        const [first, second] = externalsOf(rows);
        expect(first).toMatchObject({ id: "e2", links: 9 });
        expect(first?.reach).toEqual([
            { layer: "l1", access: "reads", links: 5 },
            { layer: "", access: "saves", links: 4 },
        ]);
        expect(second).toMatchObject({ id: "e1", links: 2 });
    });
});
