import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { markDone, next } from "../cli/next";
import { pathsOf } from "../cli/steps";

const put = (path: string, text = "{}") => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
};
const fresh = () => {
    const root = mkdtempSync(`${tmpdir()}/conductor-`);
    const request = join(root, "request.md");
    put(request, "## Output Root\n");
    return { root, request, paths: pathsOf(root) };
};
/** A decision's record, dated now: written after the proposal it decides on and before the next proposal. */
const decide = (path: string) => put(path, JSON.stringify({ confirmedAt: new Date().toISOString() }));
const pageMarkers = (paths: ReturnType<typeof pathsOf>) => {
    for (const gate of ["as-is", "journeys", "architecture", "components"]) put(paths.pages(gate), "");
};
/** The whole target in order, every decision confirmed after its proposal. */
const wholeTarget = (paths: ReturnType<typeof pathsOf>, text = "{}") => {
    put(paths.legacy);
    put(paths.current, text);
    decide(paths.choiceAsIs);
    put(paths.journeyVariants, text);
    decide(paths.choiceJourneys);
    put(paths.journeys, text);
    put(paths.architectureVariants, text);
    decide(paths.choiceArchitecture);
    put(paths.architecture, text);
    decide(paths.choiceComponents);
    pageMarkers(paths);
};
const targetSteps = [
    "target-as-is",
    "target-as-is-pages",
    "target-as-is-choose",
    "target-journeys",
    "target-journeys-pages",
    "target-journeys-choose",
    "target-architecture",
    "target-architecture-pages",
    "target-architecture-choose",
    "target-components",
    "target-components-pages",
    "target-components-choose",
];
const stepOf = (action: ReturnType<typeof next>) => ("step" in action ? action.step : action.action);

describe("the conductor's steps", () => {
    test("with nothing made, the first action is to read the request", () => {
        const { root, request } = fresh();
        const action = next(root, request);
        expect(action.action).toBe("run");
        expect(stepOf(action)).toBe("request");
    });
    test("the first call needs the request", () => {
        const { root } = fresh();
        expect(next(root, undefined).action).toBe("stop");
    });
    test("each step comes due in order as the files of the one before appear", () => {
        const { root, request, paths } = fresh();
        const seen: string[] = [];
        const step = () => {
            const action = next(root, request);
            seen.push(stepOf(action));
            return action;
        };
        step();
        put(paths.requestJson, JSON.stringify({ sourceRoots: [root] }));
        step();
        put(paths.analysisRequest, "x");
        const invoke = step();
        expect(invoke.action).toBe("invoke");
        put(join(paths.payloads, "system.json"));
        step();
        put(join(paths.bundles, "screen-a--b.md"), "x");
        step();
        const rebuilt = (name: string) => {
            step(); // the pages are built again once the decision is recorded
            markDone(root, name);
        };
        put(paths.legacy);
        step();
        put(paths.current);
        step();
        put(paths.pages("as-is"));
        step();
        decide(paths.choiceAsIs);
        rebuilt("target-as-is-pages");
        step();
        put(paths.journeyVariants);
        step();
        put(paths.pages("journeys"));
        step();
        decide(paths.choiceJourneys);
        put(paths.journeys);
        rebuilt("target-journeys-pages");
        step();
        put(paths.architectureVariants);
        step();
        put(paths.pages("architecture"));
        step();
        decide(paths.choiceArchitecture);
        rebuilt("target-architecture-pages");
        step();
        put(paths.architecture);
        step();
        put(paths.pages("components"));
        step();
        decide(paths.choiceComponents);
        rebuilt("target-components-pages");
        step();
        put(join(paths.records, "layers.json"), "[]");
        put(join(paths.records, "decisions.json"), "[]");
        step();
        put(join(paths.records, "stories.json"), "[]");
        step();
        put(paths.plan);
        put(paths.manifest, JSON.stringify({ items: [] }));
        step();
        expect(seen).toEqual([
            "request",
            "analysis-request",
            "analysis",
            "bundles",
            "derive-legacy",
            "target-as-is",
            "target-as-is-pages",
            "target-as-is-choose",
            "target-as-is-pages",
            "target-journeys",
            "target-journeys-pages",
            "target-journeys-choose",
            "target-journeys-pages",
            "target-architecture",
            "target-architecture-pages",
            "target-architecture-choose",
            "target-architecture-pages",
            "target-components",
            "target-components-pages",
            "target-components-choose",
            "target-components-pages",
            "foundation",
            "stories",
            "plan",
            "app",
        ]);
    });
    test("a step whose inputs changed since it was done comes due again", () => {
        const { root, request, paths } = fresh();
        put(paths.requestJson, JSON.stringify({ sourceRoots: [root] }));
        put(paths.analysisRequest, "first");
        put(join(paths.payloads, "system.json"), "one");
        next(root, request);
        expect(markDone(root, "analysis-request").ok).toBe(true);
        expect(markDone(root, "analysis").ok).toBe(true);
        put(paths.analysisRequest, "second");
        const action = next(root, request);
        expect(stepOf(action)).toBe("analysis");
    });
    test("marking a step done fails while its files are missing", () => {
        const { root, request } = fresh();
        next(root, request);
        expect(markDone(root, "analysis").ok).toBe(false);
        expect(markDone(root, "nonsense").ok).toBe(false);
    });
});

describe("delivery from the ledger", () => {
    const item = (key: string, kind: "epic" | "story", sequence: number, extra: Record<string, unknown> = {}) => ({
        key,
        kind,
        title: key,
        parent: null,
        blockedBy: [],
        comesAfter: [],
        sequence,
        builder: "shape-and-deliver",
        body: "",
        attachment: null,
        ...extra,
    });
    const setup = (ledger: object) => {
        const { root, request, paths } = fresh();
        put(paths.requestJson, JSON.stringify({ sourceRoots: [root] }));
        put(paths.analysisRequest, "x");
        put(join(paths.payloads, "system.json"));
        put(join(paths.bundles, "screen-a--b.md"), "x");
        wholeTarget(paths);
        for (const name of ["layers", "decisions", "stories"]) put(join(paths.records, `${name}.json`), "[]");
        put(paths.plan);
        put(paths.app + "/index.html", "x");
        put(
            paths.manifest,
            JSON.stringify({
                items: [
                    item("e1", "epic", 1),
                    item("s0", "story", 1, { parent: "e1", builder: "scaffold-codebase" }),
                    item("e2", "epic", 2, { comesAfter: ["e1"] }),
                    item("s1", "story", 2, { parent: "e2" }),
                    item("s2", "story", 3, { parent: "e2", blockedBy: ["s1"] }),
                ],
            }),
        );
        put(paths.ledger, JSON.stringify(ledger));
        // Remember every step as done so only delivery is due.
        next(root, request);
        for (const name of [
            "request",
            "analysis-request",
            "analysis",
            "bundles",
            "derive-legacy",
            ...targetSteps,
            "foundation",
            "stories",
            "plan",
            "app",
        ])
            markDone(root, name);
        return { root, request };
    };
    const created = { status: "created" };
    test("the plan is shown to the person first, and nothing is created before they have reviewed it", () => {
        const { root, request } = setup({ items: {} });
        const action = next(root, request);
        expect(action.action).toBe("wait");
        expect(stepOf(action)).toBe("review");
    });
    test("epics are created in order, one at a time, by the person pasting a prompt", () => {
        const { root, request } = setup({ reviewed: "now", items: {} });
        const action = next(root, request);
        expect(action.action).toBe("prompt");
        expect(action.action === "prompt" && action.text).toContain('epic "e1"');
    });
    test("an epic is not asked for before the epics it comes after are fully created", () => {
        const { root, request } = setup({ reviewed: "now", items: { e1: created } });
        const action = next(root, request);
        expect(action.action === "prompt" && action.text).toContain('epic "e1"');
    });
    test("then the scaffold, then stories one at a time in order, each waiting for its blockers to be merged", () => {
        const all = { e1: created, s0: created, e2: created, s1: created, s2: created };
        let { root, request } = setup({ reviewed: "now", items: all });
        let action = next(root, request);
        expect(action.action === "prompt" && action.text).toContain("scaffold");
        ({ root, request } = setup({ reviewed: "now", items: { ...all, s0: { status: "merged" } } }));
        action = next(root, request);
        expect(action.action === "prompt" && action.text).toContain('deliver "s1"');
        ({ root, request } = setup({
            reviewed: "now",
            items: { ...all, s0: { status: "merged" }, s1: { status: "built" } },
        }));
        action = next(root, request);
        expect(action.action).toBe("wait");
        ({ root, request } = setup({
            reviewed: "now",
            items: { ...all, s0: { status: "merged" }, s1: { status: "merged" } },
        }));
        action = next(root, request);
        expect(action.action === "prompt" && action.text).toContain('deliver "s2"');
    });
    test("a blocked story waits for the person and nothing advances past it", () => {
        const all = { e1: created, s0: { status: "merged" }, e2: created, s1: { status: "blocked" }, s2: created };
        const { root, request } = setup({ reviewed: "now", items: all });
        const action = next(root, request);
        expect(action.action).toBe("wait");
    });
    test("when every story is merged the conductor is done", () => {
        const merged = { status: "merged" };
        const { root, request } = setup({
            reviewed: "now",
            items: { e1: created, e2: created, s0: merged, s1: merged, s2: merged },
        });
        expect(next(root, request).action).toBe("done");
    });
});

describe("the target's decisions", () => {
    test("each decision waits for the person with the command that records it", () => {
        const { root, request, paths } = fresh();
        put(paths.requestJson, JSON.stringify({ sourceRoots: [root] }));
        put(paths.analysisRequest, "x");
        put(join(paths.payloads, "system.json"));
        put(join(paths.bundles, "screen-a--b.md"), "x");
        put(paths.legacy);
        put(paths.current);
        next(root, request);
        for (const name of ["analysis-request", "analysis", "bundles", "derive-legacy", "target-as-is"])
            markDone(root, name);
        const pages = next(root, request);
        expect(pages.action).toBe("run");
        expect(stepOf(pages)).toBe("target-as-is-pages");
        expect(JSON.stringify(pages)).toContain("--target");
        put(paths.pages("as-is"));
        const action = next(root, request);
        expect(action.action).toBe("wait");
        expect(stepOf(action)).toBe("target-as-is-choose");
        expect(JSON.stringify(action)).toContain("choose.ts");
        expect(JSON.stringify(action)).toContain("redo");
    });
    test("a decision is asked again when its proposal changed after it was confirmed, and no --done is needed once it holds", () => {
        const { root, request, paths } = fresh();
        put(paths.requestJson, JSON.stringify({ sourceRoots: [root] }));
        put(paths.analysisRequest, "x");
        put(join(paths.payloads, "system.json"));
        put(join(paths.bundles, "screen-a--b.md"), "x");
        wholeTarget(paths);
        next(root, request);
        expect(next(root, request).action).not.toBe("wait");
        const later = new Date(Date.now() + 60_000);
        utimesSync(paths.journeyVariants, later, later);
        expect(stepOf(next(root, request))).toBe("target-journeys-choose");
        put(paths.choiceJourneys, JSON.stringify({ confirmedAt: new Date(Date.now() + 120_000).toISOString() }));
        expect(stepOf(next(root, request))).toBe("target-journeys-pages");
        markDone(root, "target-journeys-pages");
        // the architecture rests on a journeys decision that is now newer than its own proposal: its pages come first
        expect(stepOf(next(root, request))).toBe("target-architecture-pages");
        markDone(root, "target-architecture-pages");
        expect(stepOf(next(root, request))).toBe("target-architecture-choose");
    });
    test("a record made before dates were kept asks again, and the question is not offered before its pages are built", () => {
        const { root, request, paths } = fresh();
        put(paths.requestJson, JSON.stringify({ sourceRoots: [root] }));
        put(paths.analysisRequest, "x");
        put(join(paths.payloads, "system.json"));
        put(join(paths.bundles, "screen-a--b.md"), "x");
        wholeTarget(paths);
        next(root, request);
        put(paths.choiceAsIs, "{}");
        expect(stepOf(next(root, request))).toBe("target-as-is-pages");
        markDone(root, "target-as-is-pages");
        expect(stepOf(next(root, request))).toBe("target-as-is-choose");
        // confirmed again, the journeys that rest on it are made again
        decide(paths.choiceAsIs);
        markDone(root, "target-as-is-pages");
        expect(stepOf(next(root, request))).toBe("target-journeys");
    });
    test("the foundation is not offered while the components are not confirmed", () => {
        const { root, request, paths } = fresh();
        put(paths.requestJson, JSON.stringify({ sourceRoots: [root] }));
        put(paths.analysisRequest, "x");
        put(join(paths.payloads, "system.json"));
        put(join(paths.bundles, "screen-a--b.md"), "x");
        wholeTarget(paths);
        rmSync(paths.choiceComponents);
        next(root, request);
        expect(stepOf(next(root, request))).toBe("target-components-choose");
    });
    test("a target that changes after work items were created stops the run instead of redoing the plan", () => {
        const { root, request, paths } = (() => {
            const made = fresh();
            put(made.paths.requestJson, JSON.stringify({ sourceRoots: [made.root] }));
            put(made.paths.analysisRequest, "x");
            put(join(made.paths.payloads, "system.json"));
            put(join(made.paths.bundles, "screen-a--b.md"), "x");
            wholeTarget(made.paths, "one");
            for (const name of ["layers", "decisions", "stories"]) put(join(made.paths.records, `${name}.json`), "[]");
            put(made.paths.plan);
            put(made.paths.manifest, JSON.stringify({ items: [] }));
            put(made.paths.app + "/index.html", "x");
            put(made.paths.ledger, JSON.stringify({ items: { s0: { status: "created" } } }));
            next(made.root, made.request);
            return made;
        })();
        put(paths.journeys, "two");
        const action = next(root, request);
        expect(action.action).toBe("stop");
        expect(JSON.stringify(action)).toContain("created items are locked");
    });
    test("a decision that no longer holds stops the run once work items exist", () => {
        const { root, request, paths } = fresh();
        put(paths.requestJson, JSON.stringify({ sourceRoots: [root] }));
        put(paths.analysisRequest, "x");
        put(join(paths.payloads, "system.json"));
        put(join(paths.bundles, "screen-a--b.md"), "x");
        wholeTarget(paths, "one");
        for (const name of ["layers", "decisions", "stories"]) put(join(paths.records, `${name}.json`), "[]");
        put(paths.plan);
        put(paths.manifest, JSON.stringify({ items: [] }));
        put(paths.app + "/index.html", "x");
        put(paths.ledger, JSON.stringify({ items: { s0: { status: "created" } } }));
        next(root, request);
        const later = new Date(Date.now() + 60_000);
        utimesSync(paths.architecture, later, later);
        expect(JSON.stringify(next(root, request))).toContain("created items are locked");
    });
});
