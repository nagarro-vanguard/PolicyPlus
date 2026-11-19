import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { categoryLabel, optionsOf, ruleAnchors, splitStatement } from "../src/lib/analysis";
import type { Rule } from "../src/lib/types";

const root = join(import.meta.dir, "..");
const walk = (folder: string): string[] =>
    readdirSync(folder).flatMap((name) => {
        const path = join(folder, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });
const read = (path: string) => readFileSync(path, "utf8");

const rule = (id: string, says: string) => ({ id, says }) as unknown as Rule;

describe("the analysis pages decide their words and anchors from the data", () => {
    test("a rule's anchor is read from its first words, never from a record id, and is unique in a layer", () => {
        const anchors = ruleAnchors([rule("businessrule-123", "A policy is shown when it applies."), rule("businessrule-456", "A policy is shown when it applies."), rule("businessrule-789", "Nothing else matches here at all.")]);
        const values = [...anchors.values()];
        expect(new Set(values).size).toBe(3);
        for (const value of values) expect(value).not.toMatch(/\d{5,}/);
        expect(anchors.get("businessrule-123")).toBe("rule-a-policy-is-shown-when-it-applies");
        expect(anchors.get("businessrule-456")).toBe("rule-a-policy-is-shown-when-it-applies-2");
        // The same rules give the same anchors in any order.
        const again = ruleAnchors([rule("businessrule-789", "Nothing else matches here at all."), rule("businessrule-456", "A policy is shown when it applies."), rule("businessrule-123", "A policy is shown when it applies.")]);
        expect([...again.entries()].toSorted()).toEqual([...anchors.entries()].toSorted());
    });

    test("a long statement is cut at a colon into a title and a lede, and no word is dropped", () => {
        const text = "Several windows raise an unhandled error on ordinary input: double-clicking with no row selected, right-clicking with no category, an unnamed list entry, an unreadable import file, a malformed search wildcard, or an inspector item with no match. No program-wide handler is set.";
        const split = splitStatement(text);
        expect(split.title).toBe("Several windows raise an unhandled error on ordinary input");
        expect(split.lede.startsWith("Double-clicking")).toBe(true);
        expect(split.rest).toBe("No program-wide handler is set.");
        expect(`${split.title}: ${split.lede[0]?.toLowerCase()}${split.lede.slice(1)} ${split.rest}`).toBe(text);
        expect(splitStatement("One short sentence. And another.")).toEqual({ title: "One short sentence.", lede: "", rest: "And another." });
    });

    test("filters offer only values the rows hold, and a kind of risk is a short label", () => {
        expect(optionsOf(["high", "low", "high"])).toEqual([{ value: "high", count: 2 }, { value: "low", count: 1 }]);
        expect(optionsOf([])).toEqual([]);
        expect(categoryLabel("data-integrity")).toBe("Data integrity");
    });
});

describe("the analysis pages are built from the shared pieces", () => {
    const pages = [
        "pages/action/[cap]/[slug].astro",
        "pages/layer/[cap]/[slug].astro",
        "pages/risks.astro",
        "pages/risk/[slug].astro",
        "pages/data.astro",
    ].map((file) => ({ file, text: read(join(root, "src", file)) }));

    test("every page uses the shell, the section component and a no-data state wherever it can be empty", () => {
        for (const { file, text } of pages) {
            expect([file, text.includes("layouts/Page.astro")]).toEqual([file, true]);
            expect([file, text.includes("NoDataState") || /Answer|Assumption|RiskList|RiskGroups|RuleList|RuleLinks|Picture/.test(text)]).toEqual([file, true]);
        }
        for (const file of ["RuleList", "RuleLinks", "RiskList", "AnswerList", "AssumptionList", "Picture", "Diagram"]) expect([file, read(join(root, "src", "components", "analysis", `${file}.astro`)).includes("NoDataState")]).toEqual([file, true]);
    });

    test("the pages keep to one column, no rail and no tabs, and use no card", () => {
        for (const { file, text } of pages) {
            for (const gone of ["role=\"tab\"", "data-rail", "class=\"card\"", "class=\"cards\"", "<Landscape"]) expect([file, text.includes(gone)]).toEqual([file, false]);
        }
        expect(read(join(root, "src", "styles", "analysis.css"))).not.toMatch(/\.card\b/);
    });

    test("the analysis stylesheet names no colour, font size or font", () => {
        const css = read(join(root, "src", "styles", "analysis.css")).replaceAll(/\/\*[\s\S]*?\*\//g, "");
        expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(/);
        expect(css).not.toMatch(/font(?:-size)?\s*:[^;]*\d(?:\.\d+)?px/);
        expect(css).not.toMatch(/font-family/);
    });

    test("a figure is drawn at full size, never fitted to the width", () => {
        const css = read(join(root, "src", "styles", "analysis.css"));
        expect(css).toContain("width: var(--natural) !important");
        expect(read(join(root, "src", "components", "analysis", "Diagram.astro"))).toContain("--natural");
    });

    test("a filter is offered only above fifteen rows, and never on a list of rules", () => {
        expect(read(join(root, "src", "components", "analysis", "RuleList.astro"))).not.toContain("<Filter");
        for (const file of ["RiskList"]) expect([file, /rows?\.length > filterAbove|rules\.length > filterAbove/.test(read(join(root, "src", "components", "analysis", `${file}.astro`)))]).toEqual([file, true]);
    });
});

/** The pages as built: the build folder is named in `APP_BUILD_DIR`; without it these checks are skipped. */
const buildDir = process.env.APP_BUILD_DIR ?? "";
const built = buildDir !== "" && existsSync(join(buildDir, "risks.html"));
const html = (path: string) => read(join(buildDir, path));
const decode = (text: string) => text.replaceAll("&#39;", "'").replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
const analysisPages = () => (built ? walk(buildDir).filter((file) => file.endsWith(".html") && /^(?:action|layer|risk)\//.test(relative(buildDir, file)) || ["risks.html", "data.html"].includes(relative(buildDir, file))) : []);

describe.skipIf(!built)("the analysis pages as built", () => {
    test("every link resolves, and a link to a rule lands on a row that holds it", () => {
        const broken: string[] = [];
        for (const file of analysisPages()) {
            const text = read(file);
            for (const hit of text.matchAll(/\bhref="([^"]+)"/g)) {
                const href = decode(hit[1] ?? "");
                if (/^(?:[a-z]+:|#|\/\/)/i.test(href) || href === "") continue;
                const [path = "", fragment = ""] = href.split("#") as [string, string?];
                const target = resolve(dirname(file), path.split("?")[0] ?? "");
                if (!existsSync(target)) {
                    broken.push(`${relative(buildDir, file)} -> ${href}`);
                    continue;
                }
                if (fragment.startsWith("rule-") && !read(target).includes(`id="${fragment}"`)) broken.push(`${relative(buildDir, file)} -> ${href} (no such rule)`);
            }
        }
        expect(broken).toEqual([]);
    });

    test("a rule's full sentence is written on its layer page and on none of its actions' pages", () => {
        let checked = 0;
        const repeated: string[] = [];
        for (const layerFile of walk(join(buildDir, "layer")).filter((file) => file.endsWith(".html"))) {
            const capability = relative(join(buildDir, "layer"), layerFile).split("/")[0] ?? "";
            const sentences = [...read(layerFile).matchAll(/<li class="a-rule"[^>]*>\s*<span class="a-text">([\s\S]*?)<\/span>/g)].map((hit) => decode(hit[1] ?? "").trim()).filter((says) => says.split(/\s+/).length > 8);
            if (sentences.length === 0) continue;
            const actionDir = join(buildDir, "action", capability);
            if (!existsSync(actionDir)) continue;
            for (const actionFile of readdirSync(actionDir).filter((name) => name.endsWith(".html"))) {
                // The folded brief is text for the clipboard, held in an attribute; only what a reader sees counts.
                const page = decode(read(join(actionDir, actionFile)).replaceAll(/data-copy-text="[^"]*"/g, ""));
                for (const says of sentences) {
                    checked += 1;
                    if (page.includes(says)) repeated.push(`${capability}/${actionFile}: ${says.slice(0, 60)}`);
                }
            }
        }
        expect(checked).toBeGreaterThan(0);
        expect(repeated).toEqual([]);
    });

    test("an action page links to the layer page for its rules, with the action named in the address", () => {
        const withRules = walk(join(buildDir, "action")).filter((file) => /\?action=/.test(read(file)));
        expect(withRules.length).toBeGreaterThan(0);
        for (const file of withRules) expect(read(file)).toMatch(/href="\.\.\/\.\.\/layer\/[^"]+\.html\?action=[^"#]+#rules"/);
    });

    test("no layer, action or risks page offers a filter: the global search is the one front door", () => {
        for (const file of analysisPages()) expect([relative(buildDir, file), read(file).includes("data-a-filter=")]).toEqual([relative(buildDir, file), false]);
    });

    test("a layer that starts no action says what that means and links to who calls it", () => {
        let empty = 0;
        for (const file of walk(join(buildDir, "layer")).filter((name) => name.endsWith(".html"))) {
            const text = read(file);
            if (!text.includes("No action starts in this layer")) continue;
            empty += 1;
            expect(text).toContain("Work reaches it from the layers that start the actions below.");
            expect(text).toMatch(/Reached from[\s\S]*<a href="[^"]+\.html">/);
        }
        expect(empty).toBeGreaterThan(0);
    });

    test("no analysis page holds more than 1,500 elements, a record id in an address or a table of contents", () => {
        for (const file of analysisPages()) {
            const text = read(file);
            const name = relative(buildDir, file);
            expect([name, (text.slice(text.indexOf("<body")).match(/<[a-zA-Z]/g) ?? []).length <= 1500]).toEqual([name, true]);
            expect([name, /(?:businessrule|block|fact|layer|capability)-\d{8,}/.test(text.replaceAll(/<script[\s\S]*?<\/script>/g, ""))]).toEqual([name, false]);
            for (const gone of ["On this page", "data-toc", "data-rail"]) expect([name, text.includes(gone)]).toEqual([name, false]);
        }
    });

    test("every page has one h1, no more than six h2 in the page and the diagram pages say how to move around a drawing", () => {
        for (const file of analysisPages()) {
            const text = read(file);
            const name = relative(buildDir, file);
            expect([name, (text.match(/<h1[ >]/g) ?? []).length]).toEqual([name, 1]);
            const main = text.slice(text.indexOf("<main"), text.indexOf("</main>"));
            expect([name, (main.match(/<h2[ >]/g) ?? []).length <= 6]).toEqual([name, true]);
        }
        for (const page of ["architecture.html", "data.html"]) {
            const text = html(page);
            if (text.includes("data-a-pan")) expect(text).toContain("scroll or drag");
        }
    });
});
