import { describe, expect, test } from "bun:test";
import { externalsOf, judgeLayers } from "../shared/read/payload-facts";

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
