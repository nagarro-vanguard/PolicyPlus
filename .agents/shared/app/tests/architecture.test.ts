import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { countWord, footerSentence, landing, notPlaced, spreadSentence } from "../src/lib/architecture-data";
import { viewerOfToday } from "../src/lib/architecture-lenses";
import { defaultLens, lensesFor, readHash, writeHash } from "../src/lib/architecture-page";
import { analysisRedirects, hrefOf, targetRedirects } from "../src/lib/architecture-redirects";
import { riskGroups, sentenceOf } from "../src/lib/architecture-risks";
import { kindsOfData } from "../src/lib/architecture-owners";
import type { Architecture, TargetData } from "../src/lib/target-types";
import type { Capability, Knowledge, System } from "../src/lib/types";

const app = join(import.meta.dir, "..");
const read = (path: string) => readFileSync(join(app, path), "utf8");
const walk = (folder: string): string[] => readdirSync(folder).flatMap((name) => (statSync(join(folder, name)).isDirectory() ? walk(join(folder, name)) : [join(folder, name)]));

// ---- fixtures: three layers (one project work), three domains ----
const layer = (id: string, product: boolean, blocks: number) => ({ id, name: `Layer ${id}`, product, blocks });
const sys = { layers: [layer("ui", true, 30), layer("logic", true, 10), layer("tool", false, 1)], edges: [{ from: "ui", to: "logic", kind: "call", links: 3 }] } as unknown as System;
const cap = (layers: Record<string, string[]>): Capability =>
    ({ capability: { id: "c", name: "Cap" }, layers: Object.entries(layers).map(([id, rules]) => ({ id, name: id, blocks: 2, rules: rules.map((rule) => ({ id: rule })) })) }) as unknown as Capability;
const comp = (name: string, domain: string, enforces: string[]) => ({ name, domain, responsibility: "r", module: "m", uses: [], serves: [], enforces });
const arch = (components: ReturnType<typeof comp>[]): Architecture => ({
    name: "A", idea: "i", risks: [], tradeoff: "t", integrations: [],
    domains: ["D1", "D2", "D3"].map((name) => ({ name, concept: "c", facts: [], rules: [], dependsOn: [], why: "" })),
    containers: [], components,
});

describe("where it lands: the matrix", () => {
    const caps = [cap({ ui: ["r1", "r2", "r3"], logic: ["r4"], tool: ["r5"] })];
    const full = arch([comp("a", "D1", ["r1", "r4"]), comp("b", "D2", ["r2"]), comp("c", "D3", ["r3", "r5"])]);

    test("cells count the rules of a layer in a domain, and the rows and columns follow the records", () => {
        const matrix = landing(sys, caps, full);
        expect(matrix.columns).toEqual(["D1", "D2", "D3"]);
        expect(matrix.rows.map((row) => row.name)).toEqual(["Layer ui", "Layer logic", "Layer tool"]);
        expect(matrix.cells).toEqual([[1, 1, 1], [1, 0, 0], [0, 0, 1]]);
        expect(matrix.rows.map((row) => row.product)).toEqual([true, true, false]);
    });
    test("the sentence names the layer that reaches the most domains, and says all when it reaches every one", () => {
        const sentence = spreadSentence(landing(sys, caps, full));
        expect(sentence).toBe("Today's Layer ui layer (30 routines) holds rules that belong to all three of the proposed domains.");
        const part = spreadSentence(landing(sys, [cap({ ui: ["r1", "r2"], logic: ["r4"] })], arch([comp("a", "D1", ["r1", "r4"]), comp("b", "D2", ["r2"])])));
        expect(part).toContain("two of the three");
        expect(countWord(12)).toBe("12");
    });
    test("every rule in exactly one domain is claimed only when it is true", () => {
        const matrix = landing(sys, caps, full);
        expect(matrix.exactlyOne).toBe(matrix.total);
        expect(footerSentence(matrix)).toBe("Every one of the 5 rules lands in exactly one domain.");
    });
    test("a rule no component enforces gets its own column and the claim is not made", () => {
        const matrix = landing(sys, caps, arch([comp("a", "D1", ["r1", "r4"]), comp("b", "D2", ["r2"])]));
        expect(matrix.columns.at(-1)).toBe(notPlaced);
        expect(matrix.none).toBe(2);
        const line = footerSentence(matrix);
        expect(line).not.toContain("Every one");
        expect(line).toContain("3 of the 5 rules land in exactly one domain");
        expect(line).toContain("2 are enforced by no component");
        // The leftover rules are in the column, so every rule is still counted once.
        expect(matrix.cells.flat().reduce((sum, count) => sum + count, 0)).toBe(5);
    });
    test("a rule enforced in two domains is counted in each, and said", () => {
        const matrix = landing(sys, caps, arch([comp("a", "D1", ["r1", "r2", "r3", "r4", "r5"]), comp("b", "D2", ["r2"])]));
        expect(matrix.several).toBe(1);
        expect(footerSentence(matrix)).not.toContain("Every one");
        expect(footerSentence(matrix)).toContain("more than one domain");
    });
    test("no component at all leaves every rule unplaced rather than a clean claim", () => {
        const matrix = landing(sys, caps, arch([]));
        expect(matrix.exactlyOne).toBe(0);
        expect(footerSentence(matrix)).not.toContain("Every one");
    });
});

/** The payloads of the analysis and the chosen architecture, when this checkout holds them. */
const root = join(import.meta.dir, "..", "..", "..", "..");
const payloads = join(root, ".modernization", ".code-analysis", "payloads");
const chosen = join(root, ".modernization", "target", "architecture.json");
const real = existsSync(join(payloads, "system.json")) && existsSync(chosen);

describe.skipIf(!real)("the matrix against a recount from the real payloads", () => {
    const json = <T>(path: string) => JSON.parse(readFileSync(path, "utf8")) as T;
    const system = real ? json<System>(join(payloads, "system.json")) : ({} as System);
    const caps = real ? readdirSync(payloads).filter((name) => /^capability-.*\.json$/.test(name)).map((name) => json<Capability>(join(payloads, name))) : [];
    const architecture = real ? json<Architecture>(chosen) : ({} as Architecture);

    test("every cell equals the number of rules a recount finds", () => {
        const matrix = landing(system, caps, architecture);
        // The recount shares no code with the page: a rule's layer by the first capability that holds it, its domains by the components that name it.
        const layerOf = new Map<string, string>();
        for (const each of caps) for (const l of each.layers) for (const rule of l.rules) if (!layerOf.has(rule.id)) layerOf.set(rule.id, l.id);
        const domainsOf = new Map<string, Set<string>>();
        for (const c of architecture.components ?? []) for (const rule of c.enforces) domainsOf.set(rule, (domainsOf.get(rule) ?? new Set()).add(c.domain));
        expect(matrix.total).toBe(layerOf.size);
        matrix.rows.forEach((row, at) => {
            matrix.columns.forEach((column, col) => {
                const expected = [...layerOf].filter(([rule, id]) => id === row.id && (column === notPlaced ? (domainsOf.get(rule)?.size ?? 0) === 0 : domainsOf.get(rule)?.has(column) === true)).length;
                expect([row.name, column, matrix.cells[at]?.[col]]).toEqual([row.name, column, expected]);
            });
        });
        const placedOnce = [...layerOf.keys()].filter((rule) => domainsOf.get(rule)?.size === 1).length;
        expect(matrix.exactlyOne).toBe(placedOnce);
        // The footer says "every" exactly when the recount agrees.
        expect(footerSentence(matrix).startsWith("Every one")).toBe(placedOnce === layerOf.size);
    });
    test("the layer named above the matrix is the product layer that reaches the most domains", () => {
        const matrix = landing(system, caps, architecture);
        const reach = matrix.rows.filter((row) => row.product).map((row) => row.domains);
        expect(matrix.spread?.domains).toBe(Math.max(...reach));
        expect(spreadSentence(matrix)).toContain(matrix.spread?.name ?? "never");
    });
    test("today's drawing has a box in a real layer for every capability and valid links", () => {
        const view = viewerOfToday(system, caps);
        expect(view.groups.length).toBe(system.layers.length);
        for (const box of view.boxes) {
            expect(view.groups[box.g]).toBeDefined();
            for (const to of box.ug ?? []) expect(view.groups[to]).toBeDefined();
        }
    });
});

describe("the lens and the address", () => {
    test("a page with a modernized architecture opens on where it lands, otherwise on today", () => {
        expect(defaultLens(true)).toBe("landing");
        expect(defaultLens(false)).toBe("today");
        expect(lensesFor(true)).toEqual(["today", "modernized", "landing"]);
        expect(lensesFor(false)).toEqual(["today"]);
    });
    test("the address names the lens and the fold, and anything unknown falls back", () => {
        const all = lensesFor(true);
        expect(readHash("#lens=modernized", all, "landing")).toEqual({ lens: "modernized", fold: undefined });
        expect(readHash("#lens=today&fold=connections", all, "landing")).toEqual({ lens: "today", fold: "connections" });
        expect(readHash("#fold=containers", all, "landing")).toEqual({ lens: "landing", fold: "containers" });
        expect(readHash("#lens=modernized", lensesFor(false), "today").lens).toBe("today");
        expect(readHash("#lens=nope&fold=nope", all, "landing")).toEqual({ lens: "landing", fold: undefined });
        expect(writeHash("today", "data")).toBe("#lens=today&fold=data");
        expect(readHash(writeHash("modernized", undefined), all, "landing").lens).toBe("modernized");
    });
    test("the page script and the page agree on the data attributes they share", () => {
        const page = read("src/pages/architecture.astro");
        const script = read("src/scripts/architecture.ts");
        for (const attribute of ["data-arch", "data-lenses", "data-default"]) expect(page).toContain(attribute);
        for (const attribute of ["data-lens-button", "data-lens-only", "data-fold"]) expect(script).toContain(attribute);
        expect(page).toContain("defaultLens(modernized)");
    });
    test("the folds are one native group, opened one at a time", () => {
        const folds = read("src/components/architecture/Folds.astro");
        expect(folds.match(/name="arch-fold"/g)?.length).toBe(7);
        for (const id of ["context", "containers", "connections", "components", "data", "risks", "alternatives"]) expect(folds).toContain(`data-fold="${id}"`);
    });
});

describe("the pages that were removed redirect", () => {
    const task = { id: "tasks-x.do-it", outcome: "o", actor: "person", actions: [], rules: [], facts: [], needs: [], current: [] };
    const data = { tasks: [task], journeys: [{ id: "j", task: task.id, steps: [] }], architecture: arch([]) } as unknown as TargetData;
    const routes = new Set(["architecture", "journeys", "journey/tasks-x-do-it"]);
    const resolve = (from: string, href: string) => new URL(href, `http://x/${from}.html`).pathname.slice(1).replace(/\.html$/, "");

    test("each old address goes to a page of the new design, with the fold open through the fragment", () => {
        for (const each of [...analysisRedirects, ...targetRedirects(data)]) expect([each.from, routes.has(resolve(each.from, hrefOf(each)))]).toEqual([each.from, true]);
        expect(analysisRedirects.map((each) => each.from)).toEqual(["made-of", "how-it-runs", "connections"]);
        expect(analysisRedirects.find((each) => each.from === "connections")?.to).toContain("fold=connections");
        expect(analysisRedirects.find((each) => each.from === "how-it-runs")?.to).toContain("fold=containers");
        expect(targetRedirects(data).find((each) => each.from.startsWith("target/erd/"))?.to).toBe("journey/tasks-x-do-it.html#data");
    });
    test("a page of the old target exists only when its records do, as before", () => {
        const none = targetRedirects({ ...data, architecture: undefined, journeys: [] } as unknown as TargetData).map((each) => each.from);
        expect(none).toEqual(["target/architecture"]);
    });
    test("every redirect has a page file, and the page is a refresh with a link", () => {
        for (const each of analysisRedirects) expect(existsSync(join(app, "src", "pages", `${each.from}.astro`))).toBe(true);
        expect(existsSync(join(app, "src", "pages", "target", "[page].astro"))).toBe(true);
        expect(existsSync(join(app, "src", "pages", "target", "erd", "[slug].astro"))).toBe(true);
        const page = read("src/components/architecture/Redirect.astro");
        expect(page).toContain('http-equiv="refresh"');
        expect(page).toContain("<a href={href}");
    });
});

describe("risks: headings, no filter", () => {
    const risk = (severity: string, kind: string, statement: string) => ({ severity, categoryWords: kind, statement });
    const list = [risk("low", "Data", "A. B."), risk("high", "Security", "S1. x"), risk("high", "Data", "D1. x"), risk("high", "Security", "S2. x"), risk("medium", "Data", "D2. x")];

    test("severity first, most serious first, then kind with the larger first, each with a count and an address", () => {
        const groups = riskGroups(list);
        expect(groups.map((group) => [group.severity, group.count])).toEqual([["high", 3], ["medium", 1], ["low", 1]]);
        expect(groups[0]?.kinds.map((kind) => [kind.words, kind.risks.length, kind.id])).toEqual([["Security", 2, "high-security"], ["Data", 1, "high-data"]]);
        expect(new Set(groups.flatMap((group) => [group.id, ...group.kinds.map((kind) => kind.id)])).size).toBe(7);
    });
    test("a row shows the whole first sentence, never cut", () => {
        expect(sentenceOf("The first sentence stays whole. The second is left out.")).toBe("The first sentence stays whole.");
        expect(sentenceOf("No full stop here")).toBe("No full stop here");
        expect(sentenceOf("A long sentence ".repeat(30).trim() + ".")).not.toContain("…");
    });
    test("the grouped risks say why when there are none", () => {
        expect(read("src/components/architecture/RiskGroups.astro")).toContain("NoDataState");
    });
    test("the risks page has no text box, no filter chips and no select", () => {
        for (const path of ["src/pages/risks.astro", "src/components/architecture/RiskGroups.astro"]) {
            const source = read(path);
            for (const gone of ["<input", "<select", "Filter", "data-a-filter", "data-a-list", "role=\"search\"", "type=\"search\""]) expect([path, gone, source.includes(gone)]).toEqual([path, gone, false]);
        }
    });
});

describe("the data of the system", () => {
    const know = {
        lifecycles: [{ entity: { id: "e1", name: "Template" }, states: ["a", "b"] }],
        dataUse: [{ capability: { id: "c1", name: "Edit" }, entity: { id: "e1", name: "Template" }, saves: true, reads: true }, { capability: { id: "c2", name: "Browse" }, entity: { id: "e2", name: "Setting" }, saves: false, reads: true }],
    } as unknown as Knowledge;
    test("each kind names who saves and reads it, and the domain that owns it only when there is an architecture", () => {
        const today = kindsOfData(know, undefined);
        expect(today.map((kind) => [kind.name, kind.savedBy, kind.readBy, kind.owner])).toEqual([["Setting", [], ["Browse"], undefined], ["Template", ["Edit"], [], undefined]]);
        const modern = { ...arch([]), domains: [{ name: "D1", concept: "c", facts: [{ name: "Doc", from: ["e1"], keys: [], relates: [] }], rules: [], dependsOn: [], why: "" }] };
        const owned = kindsOfData(know, modern);
        expect(owned.find((kind) => kind.name === "Template")?.owner).toEqual({ domain: "D1", as: "Doc" });
        expect(owned.find((kind) => kind.name === "Setting")?.owner).toBeUndefined();
    });
    test("the page says why when there is nothing, and the owner column exists only with an architecture", () => {
        const page = read("src/pages/data.astro");
        expect(page).toContain("NoDataState");
        expect(page).toContain("owned={architecture !== undefined}");
        expect(read("src/components/architecture/Kinds.astro")).toContain("{owned && <th");
    });
});

describe("the words of the pages", () => {
    const mine = [
        ...walk(join(app, "src", "components", "architecture")),
        ...readdirSync(join(app, "src", "lib")).filter((name) => name.startsWith("architecture-")).map((name) => join(app, "src", "lib", name)),
        ...["architecture", "data", "risks", "made-of", "how-it-runs", "connections"].map((name) => join(app, "src", "pages", `${name}.astro`)),
        join(app, "src", "styles", "architecture.css"),
        join(app, "src", "scripts", "architecture.ts"),
    ];
    test("no page of this design says Target or Rebuild", () => {
        for (const file of mine) expect([file, /\b(?:Target|Rebuild)\b/.test(readFileSync(file, "utf8"))]).toEqual([file, false]);
    });
    test("the stylesheet is tokens only, and only these components import it", () => {
        const css = readFileSync(join(app, "src", "styles", "architecture.css"), "utf8").replaceAll(/\/\*[\s\S]*?\*\//g, "");
        expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(/);
        expect(css).not.toMatch(/font(?:-size)?\s*:[^;}]*?\d(?:\.\d+)?px/);
        const importers = walk(join(app, "src")).filter((file) => /\.(astro|ts)$/.test(file) && /architecture\.css/.test(readFileSync(file, "utf8")));
        for (const file of importers) expect(file.includes(join("components", "architecture")) || file.includes("tests")).toBe(true);
    });
    test("a built site, when there is one, has the pages and none of the removed words", () => {
        const out = "/tmp/pp-app-ia2";
        if (!existsSync(join(out, "architecture.html"))) return;
        for (const page of ["architecture.html", "data.html", "risks.html"]) {
            const main = /<main[\s\S]*<\/main>/.exec(readFileSync(join(out, page), "utf8"))?.[0] ?? "";
            const text = main.replaceAll(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ");
            expect([page, /\b(?:Target|Rebuild)\b/.test(text)]).toEqual([page, false]);
        }
        const risks = readFileSync(join(out, "risks.html"), "utf8");
        expect(/<main[\s\S]*<\/main>/.exec(risks)?.[0]).not.toMatch(/<input|<select/);
    });
});
