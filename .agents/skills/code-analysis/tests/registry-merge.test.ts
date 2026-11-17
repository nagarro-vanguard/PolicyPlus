import { describe, expect, test } from "bun:test";
import { registryGaps } from "../stages/map/map-proposing";

/**
 * The gate on a proposing job's merge: layers that held one tier merge first, and the code kinds on them then merge
 * and may be re-pointed; the same name held twice is refused.
 */
const layer = (id: string, name: string, mergedFrom?: string[]) => ({
    id,
    name,
    purpose: "Windows a person works in.",
    evidence: [{ file: "a.vb", firstLine: 1, lastLine: 2 }],
    ...(mergedFrom === undefined ? {} : { mergedFrom }),
});

const kind = (id: string, name: string, layerId: string, mergedFrom?: string[]) => ({
    id,
    name,
    layer: layerId,
    kind: "runs" as const,
    membershipRule: "A handler in a form's code file.",
    evidence: [{ file: "a.vb", firstLine: 1, lastLine: 2 }],
    ...(mergedFrom === undefined ? {} : { mergedFrom }),
});

const entries = (layers: ReturnType<typeof layer>[], codeKinds: ReturnType<typeof kind>[]) => ({
    layers,
    codeKinds,
    externalSystems: [],
});

// What two Map jobs wrote: one tier under two layer ids, each with its own copy of the same code kind.
const written = entries(
    [layer("layer-1", "Dialog windows"), layer("layer-2", "Dialog windows")],
    [kind("codekind-1", "Window handler", "layer-1"), kind("codekind-2", "Window handler", "layer-2")],
);
const none = entries([], []);
const run = (kept: ReturnType<typeof entries>, standing = none) =>
    registryGaps(kept as never, { standing: standing as never, written: written as never });

describe("merging layers and code kinds together", () => {
    test("merging the layers and the code kinds on them passes", () => {
        const kept = entries(
            [layer("layer-1", "Dialog windows", ["layer-2"])],
            [kind("codekind-1", "Window handler", "layer-1", ["codekind-2"])],
        );
        expect(run(kept)).toEqual([]);
    });

    test("merging the code kinds while the layers stay apart is refused, as before", () => {
        const kept = entries(
            [layer("layer-1", "Dialog windows"), layer("layer-3", "Screens")],
            [kind("codekind-1", "Window handler", "layer-1", ["codekind-2"])],
        );
        expect(run(kept).some((gap) => gap.includes("another kind or layer"))).toBe(true);
    });

    test("keeping two layers of one name is refused", () => {
        const kept = entries(
            [layer("layer-1", "Dialog windows"), layer("layer-2", "Dialog windows")],
            [kind("codekind-1", "Window handler", "layer-1"), kind("codekind-3", "Other handler", "layer-2")],
        );
        expect(run(kept).some((gap) => gap.includes("are layers of one name"))).toBe(true);
    });

    test("keeping two code kinds of one name and kind on layers that became one is refused", () => {
        const kept = entries(
            [layer("layer-1", "Dialog windows", ["layer-2"])],
            [kind("codekind-1", "Window handler", "layer-1"), kind("codekind-2", "Window handler", "layer-2")],
        );
        expect(run(kept).some((gap) => gap.includes("code kinds of one name and kind in one layer"))).toBe(true);
    });
});
