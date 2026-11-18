import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
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
