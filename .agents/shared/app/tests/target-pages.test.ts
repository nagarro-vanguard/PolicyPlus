import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gates, statesOf } from "../src/lib/confirmation";
import type { Gate, GateState } from "../src/lib/confirmation";
import { defaultReason, quote, withChanges, withReason } from "../src/lib/gate-command";
import { gateReview } from "../src/lib/gate";
import { blockedBy, carriersOf, dataOf, decidedLine, groupOf, groupTasks, storiesOf, storyByStep, targetRoutes } from "../src/lib/target-page";
import { taskPath, taskSlug } from "../src/lib/target-text";
import { viewerOfVariant } from "../src/lib/target-viewer-data";
import type { Architecture, Journey, TargetData, Task } from "../src/lib/target-types";

const task = (id: string, facts: string[] = []): Task => ({ id, outcome: `Outcome of ${id}`, actor: "person", actions: [], rules: [], facts, needs: [], current: [{ intent: "a", system: "b", from: ["a1"], confidence: "sure" }] });
const journey = (taskId: string, touches: string[]): Journey => ({
    id: `${taskId}:way`, task: taskId, actor: "person", name: "Way", strategy: "s", idea: "i", tradeoff: "t", baseline: false, drops: [],
    steps: [{ id: `${taskId}:way#1`, intent: "Do", system: "It", confidence: "sure", touches, honours: [], link: { _tag: "legacy", from: ["a1"], change: "kept", reason: "r", keeps: ["r1"] } }],
});
const architecture: Architecture = {
    name: "One app", idea: "x", risks: [], tradeoff: "y", integrations: [],
    domains: [
        { name: "Policies", concept: "policies", facts: [{ name: "Policy", from: ["e1"], keys: ["name"], relates: [] }], rules: [], dependsOn: ["Templates"], why: "" },
        { name: "Templates", concept: "templates", facts: [], rules: [], dependsOn: [], why: "" },
    ],
    containers: [{ name: "app", kind: "interface", tech: "TS", holds: ["Policies", "Templates"] }],
    components: [{ name: "policy-service", domain: "Policies", responsibility: "r", module: "m", uses: [], serves: ["g-a.data:way#1"], enforces: [] }],
};
const states = (state: GateState): Record<Gate, { state: GateState; date: string | undefined }> => ({ "as-is": { state, date: undefined }, journeys: { state, date: undefined }, architecture: { state, date: undefined }, components: { state, date: undefined } });
const data = (over: Partial<TargetData> = {}): TargetData => ({
    legacy: undefined,
    tasks: [task("g-a.data", ["e1"]), task("g-a.none")],
    variants: [],
    journeys: [journey("g-a.data", ["e1"]), journey("g-a.none", [])],
    architectureVariants: [architecture],
    architecture,
    choiceAsIs: undefined,
    choiceJourneys: undefined,
    choiceArchitecture: undefined,
    choiceComponents: undefined,
    gates: states("confirmed"),
    root: "/out",
    ...over,
});

/** The page a link on `from` goes to, as a path below the site's root without the extension. */
const resolve = (from: string, href: string) => new URL(href, `http://x/${from}.html`).pathname.slice(1).replace(/\.html$/, "");

describe("the pages of the target and the links between them", () => {
    test("every page is listed once: the decisions, the journeys, each decision's review and each journey", () => {
        const routes = targetRoutes(data());
        expect(new Set(routes).size).toBe(routes.length);
        for (const gate of gates) expect(routes).toContain(`gate/${gate}`);
        for (const page of ["decisions", "journeys", "architecture"]) expect(routes).toContain(page);
        expect(routes.filter((route) => route.startsWith("journey/"))).toHaveLength(2);
    });
    test("every link a decision page offers resolves to a page that exists", () => {
        const target = data();
        const routes = new Set(targetRoutes(target));
        for (const gate of gates) {
            const review = gateReview(gate, target);
            const hrefs = [...review.pages.map((page) => page.href), ...review.evidence.flatMap((block) => block.items.flatMap((item) => (item.href === undefined ? [] : [item.href])))];
            expect(hrefs.length).toBeGreaterThan(0);
            for (const href of hrefs) expect([href, routes.has(resolve(`gate/${gate}`, href))]).toEqual([href, true]);
        }
    });
    test("no page offered by the target is one of the places that were removed", () => {
        const routes = targetRoutes(data());
        expect(routes.some((route) => route.startsWith("target") || route.startsWith("area/") || ["made-of", "how-it-runs", "connections"].includes(route))).toBe(false);
    });
});

describe("the data of a task", () => {
    test("a task that touches nothing stores no data, and says why", () => {
        const found = dataOf(data(), task("g-a.none"));
        expect(found.kind).toBe("none");
        expect(found.kind === "none" && found.reason).toContain("no kind of data");
    });
    test("a task that touches a kind of data names it and its owner", () => {
        const found = dataOf(data(), task("g-a.data"));
        expect(found).toEqual({ kind: "facts", facts: [{ name: "Policy", owner: "Policies", keys: ["name"] }], related: [] });
    });
    test("with no architecture, or no chosen way, the data is not known yet rather than none", () => {
        expect(dataOf(data({ architecture: undefined }), task("g-a.data")).kind).toBe("pending");
        expect(dataOf(data({ journeys: [] }), task("g-a.data")).kind).toBe("pending");
    });
});

describe("where each decision stands, on the pages", () => {
    const seen = (proposal: number | undefined, record: number | undefined) => ({ proposal, record });
    test("confirmed, waiting, changed since confirmed, blocked and not made", () => {
        const base = { "as-is": seen(1, 2), journeys: seen(3, 4), architecture: seen(5, 6), components: seen(7, 8) };
        expect(Object.values(statesOf(base))).toEqual(["confirmed", "confirmed", "confirmed", "confirmed"]);
        expect(statesOf({ ...base, components: seen(7, undefined) }).components).toBe("waiting");
        // The components were made again after they were confirmed.
        expect(statesOf({ ...base, components: seen(9, 8) }).components).toBe("changed");
        // The architecture was confirmed again after the components were made: the components are no longer valid.
        expect(statesOf({ ...base, architecture: seen(5, 10) }).components).toBe("changed");
        // An earlier decision that is not valid blocks every one after it.
        expect(statesOf({ ...base, journeys: seen(11, 4) })).toEqual({ "as-is": "confirmed", journeys: "changed", architecture: "blocked", components: "blocked" });
        expect(statesOf({ ...base, journeys: seen(undefined, undefined) }).journeys).toBe("not made");
    });
    test("what blocks a decision is the first earlier one that is not confirmed", () => {
        const target = data({ gates: { ...states("confirmed"), journeys: { state: "changed", date: "2026-01-01" }, architecture: { state: "blocked", date: undefined }, components: { state: "blocked", date: undefined } } });
        expect(blockedBy("as-is", target)).toBeUndefined();
        expect(blockedBy("architecture", target)).toBe("journeys");
        expect(blockedBy("components", target)).toBe("journeys");
    });
    test("a decision says in one sentence what it decided", () => {
        const target = data();
        for (const gate of gates) expect(decidedLine(gate, target).length).toBeGreaterThan(10);
        expect(decidedLine("components", target)).toContain("serving 1 of 2 steps");
        expect(decidedLine("architecture", data({ choiceArchitecture: { decision: "architecture", picks: [{ of: "architecture", variant: "One app" }], reason: "r", confirmedAt: "2026-01-01T00:00:00Z" } }))).toBe("Chosen: One app.");
    });
    test("a decision page names what it asks, and a changed decision tells the person so", () => {
        const review = gateReview("components", data({ gates: { ...states("confirmed"), components: { state: "changed", date: "2026-01-01" } } }));
        expect(review.ask).toContain("Confirm");
        expect(review.state).toBe("changed");
    });
});

describe("the commands a decision page copies", () => {
    test("a person's words are one shell word, quotes included", () => {
        expect(quote("it's")).toBe("'it'\\''s'");
        expect(withChanges("bun choose.ts components /run", "Split the loader; rm -rf /")).toBe("bun choose.ts components /run --changes 'Split the loader; rm -rf /'");
        expect(withChanges("bun choose.ts components /run", "  ")).toBe("bun choose.ts components /run --changes '...'");
    });
    test("the reason goes into the confirm command, and a default stands in for none", () => {
        expect(withReason('bun choose.ts components /run --reason "<why>"', "looks right")).toBe("bun choose.ts components /run --reason 'looks right'");
        expect(withReason('bun choose.ts components /run --reason "<why>"', "")).toContain(quote(defaultReason));
    });
    test("the contract with the choose command is `<choose> <gate> <root> --changes '<text>'`", () => {
        for (const gate of gates) expect(withChanges(gateReview(gate, data()).changesCommand, "x")).toBe(`bun <shape-target>/cli/choose.ts ${gate} /out --changes 'x'`);
    });
});

describe("the lists of tasks, steps and stories", () => {
    test("tasks are grouped by the part of the id before the dot", () => {
        expect(groupOf(task("tasks-using-the-product.open"))).toBe("Using the product");
        expect(groupTasks([task("tasks-a-b.x"), task("tasks-c.y"), task("tasks-a-b.z")]).map((group) => [group.name, group.tasks.length])).toEqual([["A b", 2], ["C", 1]]);
    });
    test("the stories that deliver steps come once each, in order, and the components that carry a step are named", () => {
        const stories = [{ sequence: 2, steps: ["s1", "s2"] }, { sequence: 1, steps: ["s1"] }, { sequence: 3, steps: ["s9"] }];
        expect(storiesOf(stories, ["s1", "s2"]).map((story) => story.sequence)).toEqual([1, 2]);
        expect(storyByStep(stories).get("s2")?.sequence).toBe(2);
        expect(carriersOf([{ name: "a", serves: ["s1"] }, { name: "b", serves: [] }], "s1")).toEqual(["a"]);
    });
    test("an architecture without components is drawn as parts holding domains", () => {
        const view = viewerOfVariant(architecture);
        expect(view.groups.map((group) => group.name)).toEqual(["app"]);
        expect(view.boxes.map((box) => [box.n, box.g, box.u])).toEqual([["Policies", 0, [1]], ["Templates", 0, []]]);
    });
    test("a slug of a task is the address its old page had", () => {
        expect(taskPath(task("a.b"))).toBe(`target/task/${taskSlug(task("a.b"))}`);
    });
});
