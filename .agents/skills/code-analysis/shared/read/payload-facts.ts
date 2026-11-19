import type { ExternalSystem } from "../model/schemas/external-system";
import { compareText, known } from "../run/collections";

type PartUse = { readonly id: string; readonly partKind: string | null; readonly blocks: number };

type ExternalUse = {
    readonly externalSystem: string;
    readonly name: string;
    readonly kind: typeof ExternalSystem.fields.kind.Type;
    readonly layer: string | null;
    readonly access: string;
    readonly links: number;
};

/**
 * Whether a layer is the product, from the kinds of part its blocks lie in: it is not when half or more of its blocks lie
 * in tooling or tests parts.
 * @param uses the part kinds of its blocks, with how many blocks each
 * @returns true unless tooling and tests hold half or more of its blocks
 */
const isProduct = (uses: readonly PartUse[]) => {
    const total = uses.reduce((sum, use) => sum + use.blocks, 0);
    const outside = uses
        .filter((use) => use.partKind === "tests" || use.partKind === "tool")
        .reduce((sum, use) => sum + use.blocks, 0);
    return total === 0 || outside * 2 < total;
};

/**
 * Each layer's role once what the boundary view cannot see is settled: a layer whose blocks all check other code (they
 * lie in a tests part, or their code kind's places are test suites) is `checksCode`, whoever starts them; otherwise one
 * where at least half the entry points sit in build or install scripts is `runsAsTooling`; otherwise its role stands.
 * @param roles each layer with the role its entry points and store reach give it
 * @param facts each layer's blocks, how many are test code, its entry points and how many of them sit in scripts
 * @returns the same layers, each with its settled role, in the same order
 */
export const settleRoles = <L extends { readonly layer: string; readonly role: string }>(
    roles: readonly L[],
    facts: readonly {
        readonly layer: string;
        readonly blocks: number;
        readonly entryPoints: number;
        readonly scripts: number;
        readonly testBlocks: number;
    }[],
) => {
    const scripted = new Set(
        facts.filter((row) => row.entryPoints > 0 && row.scripts * 2 >= row.entryPoints).map((row) => row.layer),
    );
    const checks = new Set(
        facts.filter((row) => row.blocks > 0 && row.testBlocks === row.blocks).map((row) => row.layer),
    );
    return roles.map((row) =>
        checks.has(row.layer)
            ? { ...row, role: "checksCode" }
            : scripted.has(row.layer)
              ? { ...row, role: "runsAsTooling" }
              : row,
    );
};

/**
 * Each layer with whether it is the product. A layer is not the product when its blocks lie mostly in tooling or tests
 * parts, or when the code derives its role as build or install scripts or as code that checks other code.
 * @param layers the layers with their roles
 * @param parts the parts each layer's blocks lie in
 * @returns the same layers, each with `product`, in the same order
 */
export const judgeLayers = <L extends { readonly layer: string; readonly role: string }>(
    layers: readonly L[],
    parts: readonly PartUse[],
) =>
    layers.map((each) => ({
        ...each,
        product:
            each.role !== "runsAsTooling" &&
            each.role !== "checksCode" &&
            isProduct(parts.filter((use) => use.id === each.layer)),
    }));

/**
 * What the code reaches outside itself, most reached first.
 * @param rows one row per external system, layer and kind of link
 * @returns one entry per external system with its layers and how many links reach it
 */
export const externalsOf = (rows: readonly ExternalUse[]) => {
    const byId = new Map<string, ExternalUse[]>();
    for (const row of rows) {
        byId.set(
            row.externalSystem,
            byId.has(row.externalSystem) ? [...known(byId, row.externalSystem, "set"), row] : [row],
        );
    }
    return [...byId]
        .map(([id, uses]) => {
            const [first] = uses;
            if (first === undefined) {
                throw new Error(`${id} has no use`);
            }
            return {
                id,
                name: first.name,
                kind: first.kind,
                links: uses.reduce((sum, use) => sum + use.links, 0),
                reach: uses.map((use) => ({
                    layer: use.layer === null ? "" : use.layer,
                    access: use.access,
                    links: use.links,
                })),
            };
        })
        .toSorted((one, other) => other.links - one.links || compareText(one.name, other.name));
};
