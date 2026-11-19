// Opt-in (bun run test:contract): the reader-contract detectors catch what they must and leave the product's own
// words alone. Not part of `bun test`: the file name has no `.test` so the default run does not find it.
import { describe, expect, test } from "bun:test";
import {
    copyFindings,
    dataFindings,
    enumsOf,
    pageFindings,
    parsePage,
    stringsOfSource,
    type ContractFinding,
} from "../../src/lib/reader-contract";

const page = (body: string) => `<!doctype html><html><head><title>Overview</title></head><body>${body}</body></html>`;
const checks = (found: readonly ContractFinding[]) => found.map((finding) => `${finding.check}:${finding.mode}`);
const textOf = (parsed: { segments: readonly { text: string }[] }) =>
    parsed.segments
        .map((segment) => segment.text)
        .join("")
        .replaceAll(/\s+/g, " ")
        .trim();
const hard = (found: readonly ContractFinding[]) => found.filter((finding) => finding.mode === "hard");
const onPage = (body: string, where = "capability/x.html", enums?: Set<string>) =>
    pageFindings(page(body), where, { enums });

describe("the parser", () => {
    test("a '<' inside an attribute does not cut the tag short", async () => {
        const parsed = await parsePage(
            page(`<button data-command="run --reason &quot;<why>&quot;">Show the command</button>`),
        );
        expect(textOf(parsed)).toBe("Overview Show the command");
        expect(parsed.attributes.find((attribute) => attribute.name === "data-command")?.value).toBe(
            'run --reason "<why>"',
        );
    });
    test("scripts and styles are not reader text", async () => {
        const parsed = await parsePage(
            page(`<script>const a = "story-4ad991d72a87";</script><style>.x{}</style><p>Hello</p>`),
        );
        expect(textOf(parsed)).toBe("Overview Hello");
    });
});

describe("C1 record ids and keys", () => {
    test("in text, in an address hash, in a data attribute and in the file name", async () => {
        const found = await onPage(
            `<p>Rule businessrule-12414618955963878773 applies.</p><a href="#o=story%3Astory-4ad991d72a87">Open</a><div data-id="block-123456789">x</div>`,
            "rule/businessrule-12414618955963878773.html",
        );
        expect(found.filter((finding) => finding.check === "C1").map((finding) => finding.at)).toEqual([
            "text",
            "attr:href",
            "attr:data-id",
            "file",
        ]);
    });
    test("an epic key is caught; a heading colon is not", async () => {
        expect(checks(await onPage(`<p>capability:finding-policies</p>`))).toContain("C1:hard");
        expect(checks(await onPage(`<p>Each capability: what it does.</p>`))).not.toContain("C1:hard");
    });
});

describe("C2 pipeline vocabulary", () => {
    test("a home folder, a command and a skill name are caught anywhere a reader looks", async () => {
        const found = await onPage(
            `<p>Run bun cli/build-bundle.ts from .agents/skills/code-analysis</p><button title="bun /Users/someone/x/choose.ts as-is">Show</button>`,
        );
        const rules = found.filter((finding) => finding.check === "C2").map((finding) => finding.rule);
        expect(rules).toEqual(
            expect.arrayContaining(["a command", "a folder of the pipeline", "a skill's name", "a home folder"]),
        );
    });
    test("an address of the product is not a home folder", async () => {
        const found = await onPage(`<p>The page calls GET /Api/Users/{id} and /api/users/me.</p>`);
        expect(found.filter((finding) => finding.check === "C2")).toEqual([]);
    });
    test("'held' in the product's own words is not a pipeline word; in app or agent text it is", async () => {
        expect(await onPage(`<p>A seat already held by another booking cannot be picked.</p>`)).toEqual([]);
        const marked = await onPage(`<p data-written-by="app">This plan is waiting: held by decision one.</p>`);
        expect(marked.filter((finding) => finding.check === "C2").map((finding) => finding.hit)).toHaveLength(1);
    });
    test("pipeline states are caught everywhere", async () => {
        const found = await onPage(
            `<span>Plan held</span><span>From the current plan, written 2026-11-18T16:35:18Z</span>`,
        );
        expect(found.filter((finding) => finding.check === "C2")).toHaveLength(3);
    });
    test("what is marked for the assistant is exempt", async () => {
        const found = await onPage(
            `<div data-for-assistant><p>bun cli/x.ts story-4ad991d72a87 in .modernization/plan.json</p></div><button data-copy-text="story-4ad991d72a87 bun x.ts">Copy</button>`,
        );
        expect(found).toEqual([]);
    });
});

describe("C3 raw values", () => {
    test("an enum value or a camelCase token as the whole text of an element is caught once", async () => {
        const found = await onPage(
            `<td><span>inferred</span></td><td>outsideService</td><td>Inferred</td>`,
            "x.html",
            new Set(["inferred"]),
        );
        expect(found.filter((finding) => finding.check === "C3").map((finding) => finding.hit)).toEqual([
            "inferred",
            "outsideService",
            "Inferred",
        ]);
    });
    test("a word inside a sentence and code shown as code are not", async () => {
        const found = await onPage(
            `<p>The step was inferred from the code.</p><code>startedBy</code>`,
            "x.html",
            new Set(["inferred"]),
        );
        expect(found.filter((finding) => finding.check === "C3")).toEqual([]);
    });
});

describe("C7 to C11 on a page", () => {
    test("a long sentence is reported, a very long one fails", async () => {
        const long = (n: number) => `${Array.from({ length: n }, () => "word").join(" ")}.`;
        const found = await onPage(`<p>${long(30)}</p><p>${long(45)}</p>`);
        expect(checks(found.filter((finding) => finding.check === "C7"))).toEqual(["C7:report", "C7:hard"]);
    });
    test("jargon is reported unless its first use is defined", async () => {
        expect(checks(await onPage(`<p>Each adapter talks to the registry.</p>`))).toContain("C8:report");
        expect(
            checks(await onPage(`<p>Each <abbr title="a part that talks to the outside">adapter</abbr> talks.</p>`)),
        ).not.toContain("C8:report");
    });
    test("bookkeeping numbers are reported outside a fold, hard on the overview, and left alone in a fold", async () => {
        expect(checks(await onPage(`<p>162 entry points</p>`))).toContain("C9:report");
        expect(checks(await onPage(`<p>162 entry points</p>`, "index.html"))).toContain("C9:hard");
        expect(
            checks(await onPage(`<details><summary>How we count</summary><p>162 entry points</p></details>`)),
        ).not.toContain("C9:report");
    });
    test("a sentence twice on a page and a count in two sections are reported", async () => {
        const found = await onPage(
            `<h2>A</h2><p>The program reads every policy file at the start.</p><p>12 rules</p><h2>B</h2><p>The program reads every policy file at the start.</p><p>12 rules</p>`,
        );
        expect(found.filter((finding) => finding.check === "C10")).toHaveLength(2);
    });
    test("a page over its budget of reported findings fails", async () => {
        const body = Array.from({ length: 5 }, (_, i) => `<h2>S${i}</h2><p>${i + 100} entry points</p>`).join("");
        const found = await pageFindings(page(body), "x.html", { budget: 3 });
        expect(hard(found).map((finding) => finding.check)).toEqual(["C11"]);
    });
});

describe("C5 and C7 on the app's copy, C6 on data", () => {
    test("copy strings carry no tells, no pipeline words and no sentence over 20 words", async () => {
        const strings = await stringsOfSource(
            `import { x } from "./some module";\nexport const copy = { a: "Where the code picks a path, it is likely, not certain.", b: (n: number) => \`Run the \${n} stage again.\`, "key name": "Plain words here." };`,
            "copy.ts",
        );
        expect(strings.map((each) => each.text)).toEqual([
            "Where the code picks a path, it is likely, not certain.",
            "Run the N stage again.",
            "Plain words here.",
        ]);
        expect(checks(copyFindings(strings)).sort()).toEqual(["C2:hard", "C5:hard"]);
    });
    test("data fields are reported per field with their tells and length", () => {
        const found = dataFindings([
            { text: "Ultimately, the person decides.", field: "journeys.recommended" },
            { text: `${Array.from({ length: 45 }, () => "word").join(" ")}.`, field: "rules[].says" },
        ]);
        expect(found.map((finding) => `${finding.check}:${finding.where}`)).toEqual([
            "C6:journeys.recommended",
            "C7:rules[].says",
        ]);
    });
    test("the enums of a schema are collected", () => {
        expect([
            ...enumsOf([{ properties: { kind: { enum: ["outsideService", "dataStore"] }, t: { const: "x" } } }]),
        ]).toEqual(["outsideService", "dataStore", "x"]);
    });
});
