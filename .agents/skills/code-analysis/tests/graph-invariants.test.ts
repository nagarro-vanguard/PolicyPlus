import { describe, expect, test } from "bun:test";
import { makeRoot, runCheck, sound, type Spec } from "./fixture";

/**
 * Each test builds a small store with one broken fact and expects the invariant that owns it to fail, and only it.
 * Names are compared, never record ids, which change on every run.
 */
const failing = (out: string) =>
    out
        .split("\n")
        .filter((line) => line.startsWith("FAIL"))
        .map((line) => line.slice(6).split("  ")[0]?.trim());

describe("graph invariants", () => {
    test("a sound graph passes every invariant", async () => {
        const { out, code } = await runCheck(makeRoot(sound));
        expect(failing(out)).toEqual([]);
        expect(code).toBe(0);
    });

    test("blocks that overlap partly fail invariant 2", async () => {
        const spec: Spec = {
            ...sound,
            blocks: [...sound.blocks, { id: "block-3", first: 5, last: 15, codeKind: "codekind-1" }],
        };
        const { out, code } = await runCheck(makeRoot(spec));
        expect(failing(out)).toContain("2 blocks nest");
        expect(code).toBe(1);
    });

    test("a block nested inside another passes invariant 2", async () => {
        const spec: Spec = {
            ...sound,
            blocks: [...sound.blocks, { id: "block-3", first: 3, last: 5, codeKind: "codekind-1" }],
        };
        expect(failing((await runCheck(makeRoot(spec))).out)).not.toContain("2 blocks nest");
    });

    test("a block past the end of its file fails invariant 1", async () => {
        const { out } = await runCheck(makeRoot({ ...sound, lines: 15 }));
        expect(failing(out)).toContain("1 blocks in range with a layer");
    });

    test("a link with no target and no reason fails invariant 3, and with a reason it only counts as a gap", async () => {
        const bare: Spec = {
            ...sound,
            links: [...(sound.links ?? []), { id: "link-2", from: "block-1", kind: "call" }],
        };
        expect(failing((await runCheck(makeRoot(bare))).out)).toContain("3 links have a target or a reason");
        const said: Spec = {
            ...sound,
            links: [
                ...(sound.links ?? []),
                { id: "link-2", from: "block-1", kind: "call", unresolved: "chosen at run time" },
            ],
        };
        const { out } = await runCheck(makeRoot(said));
        expect(failing(out)).not.toContain("3 links have a target or a reason");
        expect(out).toContain("1 of 2 links reach nothing the code shows");
    });

    test("an entry point with no capability fails invariant 4", async () => {
        const spec: Spec = {
            ...sound,
            blocks: [
                { ...(sound.blocks[0] ?? { id: "", first: 1, last: 1, codeKind: "" }), unassigned: true },
                ...sound.blocks.slice(1),
            ],
        };
        expect(failing((await runCheck(makeRoot(spec))).out)).toContain("4 entry points have one capability");
        expect(failing((await runCheck(makeRoot(sound))).out)).not.toContain("4 entry points have one capability");
    });

    test("two layers with one name fail invariants 6 and 7", async () => {
        const spec: Spec = { ...sound, layers: [...sound.layers, { id: "layer-2", name: "screens" }] };
        const { out } = await runCheck(makeRoot(spec));
        expect(failing(out)).toContain("7 no duplicate layers or code kinds");
        expect(failing(out)).toContain("6 layers are used");
    });

    test("a stored reach that differs from the walk fails invariant 8", async () => {
        const spec: Spec = { ...sound, reach: [["block-1", "block-1"]] };
        expect(failing((await runCheck(makeRoot(spec))).out)).toContain("8 stored reach equals recomputed reach");
    });

    test("a block no entry point reaches is a gap, not a failure", async () => {
        const spec: Spec = {
            ...sound,
            blocks: [...sound.blocks, { id: "block-3", first: 21, last: 30, codeKind: "codekind-1" }],
        };
        const { out, code } = await runCheck(makeRoot(spec));
        expect(out).toContain("1 of 3 blocks are reached by no entry point");
        expect(code).toBe(0);
    });
});

describe("derived tables", () => {
    test("a store whose derived tables were never filled fails invariant 10, and one filled from the graph passes", async () => {
        const stale = await runCheck(makeRoot(sound), { derived: false });
        expect(failing(stale.out)).toContain("10 derived tables agree with the graph");
        const filled = await runCheck(makeRoot(sound));
        expect(failing(filled.out)).not.toContain("10 derived tables agree with the graph");
    });
});
