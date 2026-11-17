import { describe, expect, it } from "vitest";
import { assetFiles, assetsFor } from "../assets";
import { cataloguePage } from "../build-catalogue.tsx";
import { foldUnchanged, lineDiff } from "../diff";
import { documentText, jsx, trusted } from "../jsx";
import { RunOverview, StagePage, type Standing } from "../components/stage.tsx";
import { visibleTextByReader } from "../visible-text";
import { contrastOf } from "../tokens";

describe("the JSX runtime", () => {
    it("escapes every text and attribute value, and places only trusted markup as it is", () => {
        const html = jsx("a", { href: '"><script>', title: "x" }, "<b>&</b>", trusted("<i>ok</i>")).html;
        expect(html).toBe('<a href="&quot;&gt;&lt;script&gt;" title="x">&lt;b&gt;&amp;&lt;/b&gt;<i>ok</i></a>');
    });

    it("writes true attributes bare and leaves out false and missing ones", () => {
        expect(jsx("details", { open: true, hidden: false, class: undefined }).html).toBe("<details open></details>");
    });
});

describe("the line diff", () => {
    it("keeps shared lines and shows a changed line as removed, then added", () => {
        expect(lineDiff("a\nb\nc\n", "a\nB\nc\n").map((line) => line.kind)).toEqual([
            "same",
            "removed",
            "added",
            "same",
        ]);
    });

    it("shows a new file as added lines and a deleted file as removed lines", () => {
        expect(lineDiff("", "x\ny\n").map((line) => line.kind)).toEqual(["added", "added"]);
        expect(lineDiff("x\n", "").map((line) => line.kind)).toEqual(["removed"]);
    });

    it("folds long unchanged runs but keeps the lines around each change", () => {
        const before = Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n");
        const folded = foldUnchanged(lineDiff(before, before.replace("line 10", "line ten")), 2);
        expect(folded.map((line) => (line.kind === "skipped" ? line.count : line.kind))).toEqual([
            8,
            "same",
            "same",
            "removed",
            "added",
            "same",
            "same",
            7,
        ]);
    });
});

describe("the tokens and the catalogue", () => {
    it("reach every contrast pair's least ratio in light and dark", () => {
        const missed = [...contrastOf("light"), ...contrastOf("dark")].filter((pair) => !pair.reaches);
        expect(missed.map((pair) => `${pair.mode}: ${pair.text} on ${pair.on} is ${pair.ratio}`)).toEqual([]);
    });

    it("builds a page that loads nothing from the network", () => {
        const { text } = cataloguePage("today");
        expect(['src="http', 'href="http', "url(http", "@import"].filter((link) => text.includes(link))).toEqual([]);
    });

    it("builds a page with no inline style or script, linking only the site's own assets", () => {
        const { text } = cataloguePage("today");
        expect(["<style", 'style="', "<script>"].filter((inline) => text.includes(inline))).toEqual([]);
        const shipped = new Set(assetFiles().map((file) => file.path));
        const linked = [assetsFor("catalogue.html").stylesheet, assetsFor("catalogue.html").script];
        expect(linked.filter((path) => !text.includes(`"${path}"`) || !shipped.has(path))).toEqual([]);
    });

    it("links a page in a subfolder to the site's assets, as many folders up as it lies deep", () => {
        expect(assetsFor("capabilities/orders.html").stylesheet).toBe("../assets/page.css");
        expect(assetsFor("index.html").script).toBe("assets/page.js");
    });
});

describe("the page patterns", () => {
    const assets = assetsFor("work/inventory/page.html");
    const madeAt = "2026-10-12T09:00:00.000Z";

    it("draw a stage's page from props alone: its standing in words, the way back, no inline style or script", () => {
        const text = documentText(
            StagePage({
                eyebrow: "A stage of the analysis",
                title: "Inventory",
                standing: "waitingForYou",
                said: "Done: 1 question waits for you.",
                madeAt,
                assets,
                runPage: { href: "../../index.html", label: "Where the analysis stands" },
                children: jsx("p", null, "Its findings."),
            }),
        );
        const seen = visibleTextByReader(text).approver ?? "";
        expect(seen).toContain("waiting for you");
        expect(seen).toContain("Its findings.");
        expect(text).toContain('href="../../index.html"');
        expect(["<style", 'style="', "<script>"].filter((inline) => text.includes(inline))).toEqual([]);
    });

    it("draw a run's page in the order a busy person asks, a stopped stage first among what needs them", () => {
        const stage = (title: string, standing: Standing) => ({
            title,
            href: `work/${title}/page.html`,
            standing,
            said: `${title} says where it stands.`,
            learned: [],
        });
        const seen =
            visibleTextByReader(
                documentText(
                    RunOverview({
                        eyebrow: "Code analysis",
                        title: "Where the analysis stands",
                        lede: "Map is running.",
                        madeAt,
                        assets: assetsFor("index.html"),
                        meta: jsx("p", null, "The overview"),
                        stages: [stage("inventory", "done"), stage("map", "stopped")],
                    }),
                ),
            ).approver ?? "";
        const order = ["Does anything need you?", "Where it is", "What it has learned so far"];
        expect(order.map((heading) => seen.indexOf(heading))).toEqual(
            [...order.map((heading) => seen.indexOf(heading))].sort((a, b) => a - b),
        );
        expect(seen.indexOf("map says where it stands.")).toBeLessThan(seen.indexOf("Where it is"));
    });
});
