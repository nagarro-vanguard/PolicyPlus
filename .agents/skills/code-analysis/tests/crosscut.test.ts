import { describe, expect, test } from "bun:test";
import { crossCuttingGaps } from "../stages/publish/check-briefing";
import { derive, makeRoot, rowsOf, type Spec } from "./fixture";

const concern = (id: string, blocks: string[]) => ({
    id,
    name: "Language lookup",
    purpose: "Looks up display text for the language in use.",
    verdict: "crossCutting",
    blocks,
    evidence: [{ file: "a.vb", firstLine: 1, lastLine: 2 }],
});

describe("the cross-cutting gate", () => {
    test("every candidate in exactly one concern passes", () => {
        expect(
            crossCuttingGaps(
                [
                    concern("crosscutting-00000000000000000001", [
                        "block-00000000000000000001",
                        "block-00000000000000000002",
                    ]),
                ] as never,
                ["block-00000000000000000001", "block-00000000000000000002"],
            ),
        ).toEqual([]);
    });
    test("a candidate no concern explains, one named twice, and a block that is no candidate are refused", () => {
        const gaps = crossCuttingGaps(
            [
                concern("crosscutting-00000000000000000001", [
                    "block-00000000000000000001",
                    "block-00000000000000000009",
                ]),
                concern("crosscutting-00000000000000000002", ["block-00000000000000000001"]),
            ] as never,
            ["block-00000000000000000001", "block-00000000000000000002"],
        );
        expect(
            gaps.some(
                (gap) => gap.includes("block-00000000000000000002") && gap.includes("no CrossCuttingConcern explains"),
            ),
        ).toBe(true);
        expect(gaps.some((gap) => gap.includes("block-00000000000000000001") && gap.includes("2 times"))).toBe(true);
        expect(gaps.some((gap) => gap.includes("block-00000000000000000009") && gap.includes("no candidate"))).toBe(
            true,
        );
    });
    test("with no candidate and no concern there is nothing to explain", () => {
        expect(crossCuttingGaps([] as never, [])).toEqual([]);
    });
});

/** Entry points of several capabilities calling one helper from two layers, and a helper only one capability uses. */
const shared = (capabilities: number): Spec => ({
    layers: [
        { id: "layer-ui", name: "Screens" },
        { id: "layer-logic", name: "Logic" },
    ],
    codeKinds: [
        { id: "codekind-ui", name: "Handler", layer: "layer-ui" },
        { id: "codekind-logic", name: "Rule", layer: "layer-logic" },
    ],
    blocks: [
        { id: "block-lookup", first: 100, last: 109, codeKind: "codekind-logic", name: "Lookup" },
        { id: "block-own", first: 110, last: 119, codeKind: "codekind-logic", name: "Own" },
        { id: "block-rule", first: 120, last: 129, codeKind: "codekind-logic", name: "Rule" },
        ...Array.from({ length: capabilities }, (_, i) => ({
            id: `block-entry-${i}`,
            first: i * 10 + 1,
            last: i * 10 + 9,
            codeKind: "codekind-ui",
            entry: true,
            capability: `capability-${i}`,
        })),
    ],
    links: [
        ...Array.from({ length: capabilities }, (_, i) => ({
            id: `link-l-${i}`,
            from: `block-entry-${i}`,
            to: "block-lookup",
            kind: "call",
        })),
        { id: "link-rule", from: "block-entry-0", to: "block-rule", kind: "call" },
        { id: "link-lookup-from-logic", from: "block-rule", to: "block-lookup", kind: "call" },
        { id: "link-own", from: "block-entry-0", to: "block-own", kind: "call" },
    ],
});

describe("the candidate rule at different sizes", () => {
    for (const size of [3, 12, 30]) {
        test(`with ${size} capabilities a block they all reach from two layers is a candidate and one only the first reaches is not`, async () => {
            const root = makeRoot(shared(size));
            await derive(root);
            const blocks = rowsOf(root, "SELECT block FROM v_crosscut_candidate").map((row) => row.block);
            expect(blocks).toEqual(["block-lookup"]);
        });
    }

    test("a block reached by two of thirty capabilities is not a candidate, because two is under a third", async () => {
        const spec = shared(30);
        const links = (spec.links ?? []).filter(
            (link) => !link.id.startsWith("link-l-") || ["link-l-0", "link-l-1"].includes(link.id),
        );
        const root = makeRoot({ ...spec, links });
        await derive(root);
        expect(rowsOf(root, "SELECT block FROM v_crosscut_candidate")).toEqual([]);
    });
});
