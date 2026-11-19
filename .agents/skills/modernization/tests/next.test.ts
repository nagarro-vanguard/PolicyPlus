import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { markDone, next } from "../cli/next";
import { existsSync } from "node:fs";
import { hashFiles, pathsOf, steps } from "../cli/steps";

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

describe("today's tasks are the analysis's journeys", () => {
    const upToAsIs = () => {
        const made = fresh();
        const { root, request, paths } = made;
        put(paths.requestJson, JSON.stringify({ sourceRoots: [root] }));
        put(paths.analysisRequest, "x");
        put(join(paths.payloads, "system.json"));
        put(join(paths.bundles, "screen-a--b.md"), "x");
        put(paths.legacy);
        next(root, request);
        for (const name of ["analysis-request", "analysis", "bundles", "derive-legacy"]) markDone(root, name);
        return made;
    };
    test("`target-as-is` runs shape-target's `derive.ts current`, which reads the analysis's journeys, and invokes no agent", () => {
        const { root, request } = upToAsIs();
        const action = next(root, request);
        expect(stepOf(action)).toBe("target-as-is");
        expect(action.action).toBe("run");
        expect(JSON.stringify(action)).toContain("derive.ts current");
        expect(JSON.stringify(action)).toContain(root);
    });
    test("the analysis step asks for its journeys, which its Publish writes", () => {
        const { root, request } = fresh();
        const { paths } = fresh();
        void paths;
        put(pathsOf(root).requestJson, JSON.stringify({ sourceRoots: [root] }));
        put(pathsOf(root).analysisRequest, "x");
        const action = next(root, request);
        expect(stepOf(action)).toBe("analysis");
        expect(JSON.stringify(action)).toContain("journeys");
    });
    test("a run made before the analysis wrote journeys still holds: its target/current.json is the proposal and nothing runs again", () => {
        const { root, request, paths } = upToAsIs();
        put(paths.current);
        markDone(root, "target-as-is");
        // the analysis has no journeys.json: the step's inputs are what they were before the change
        expect(existsSync(paths.journeysToday)).toBe(false);
        put(paths.pages("as-is"));
        expect(stepOf(next(root, request))).toBe("target-as-is-choose");
    });
    test("the analysis's journeys arriving make the step run again, even after work items exist, without stopping the run", () => {
        const { root, request, paths } = upToAsIs();
        put(paths.current);
        markDone(root, "target-as-is");
        put(paths.ledger, JSON.stringify({ items: { s0: { status: "created" } } }));
        put(paths.journeysToday, JSON.stringify({ journeys: [] }));
        // the steps built from the rest of the analysis do not run again for it
        const action = next(root, request);
        expect(action.action).toBe("run");
        expect(stepOf(action)).toBe("target-as-is");
        markDone(root, "target-as-is");
        put(paths.pages("as-is"));
        expect(stepOf(next(root, request))).toBe("target-as-is-choose");
    });
});

describe("an edited request", () => {
    /** A run done up to the analysis request, with request.json written from the request file. */
    const readOnce = (json: object) => {
        const { root, request, paths } = fresh();
        put(paths.requestJson, `${JSON.stringify({ sourceRoots: [root], ...json }, null, 2)}\n`);
        put(paths.analysisRequest, "x");
        next(root, request);
        expect(markDone(root, "request").ok).toBe(true);
        expect(markDone(root, "analysis-request").ok).toBe(true);
        return { root, request, paths };
    };
    test("is read again once the request file changes", () => {
        const { root, request } = readOnce({});
        expect(stepOf(next(root, request))).toBe("analysis");
        put(request, "## Output Root\n\n## Goals\nStop editing policy files by hand.\n");
        expect(stepOf(next(root, request))).toBe("request");
    });
    test("a change to Goals alone runs nothing built from request.json again", () => {
        const { root, request, paths } = readOnce({});
        put(paths.requestJson, `${JSON.stringify({ sourceRoots: [root], goals: "Run in a browser." }, null, 2)}\n`);
        expect(stepOf(next(root, request))).toBe("analysis");
        put(paths.requestJson, `${JSON.stringify({ sourceRoots: [root, "/elsewhere"] }, null, 2)}\n`);
        expect(stepOf(next(root, request))).toBe("analysis-request");
    });
    test("a request.json without Goals keeps the fingerprint it had before Goals existed", () => {
        const { paths } = fresh();
        put(paths.requestJson, `${JSON.stringify({ sourceRoots: ["/a"] }, null, 2)}\n`);
        const step = steps.find((each) => each.name === "foundation")!;
        expect(hashFiles([paths.requestJson], step.without)).toBe(hashFiles([paths.requestJson]));
    });
});

describe("hashing the analysis's payloads", () => {
    test("the journeys of today are not part of a folder's hash, but a file named on its own is", () => {
        const { paths } = fresh();
        put(join(paths.payloads, "system.json"), "one");
        const folder = hashFiles([paths.payloads]);
        const named = hashFiles([paths.payloads, paths.journeysToday]);
        put(paths.journeysToday, "{}");
        put(join(paths.payloads, "schema", "journeys.schema.json"), "{}");
        expect(hashFiles([paths.payloads])).toBe(folder);
        expect(hashFiles([paths.payloads, paths.journeysToday])).not.toBe(named);
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
        expect(JSON.stringify(action)).toContain("--changes");
    });
    test("a request for changes makes the decision's step invoke apply-changes, then wait again once applied", () => {
        const { root, request, paths } = fresh();
        put(paths.requestJson, JSON.stringify({ sourceRoots: [root] }));
        put(paths.analysisRequest, "x");
        put(join(paths.payloads, "system.json"));
        put(join(paths.bundles, "screen-a--b.md"), "x");
        wholeTarget(paths);
        next(root, request);
        expect(next(root, request).action).not.toBe("wait");
        const changes = join(paths.records, "changes-journeys.json");
        rmSync(paths.choiceJourneys);
        put(changes, JSON.stringify([{ gate: "journeys", text: "x", applied: false }]));
        let action = next(root, request);
        if (stepOf(action) === "target-journeys-pages") {
            markDone(root, "target-journeys-pages");
            action = next(root, request);
        }
        expect(stepOf(action)).toBe("target-journeys-choose");
        expect(action.action).toBe("invoke");
        expect(JSON.stringify(action)).toContain("apply-changes journeys");
        put(changes, JSON.stringify([{ gate: "journeys", text: "x", applied: true }]));
        expect(next(root, request).action).toBe("wait");
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

    test("the steps that build the app depend on what builds it, so a changed app reaches a rerun", () => {
        const { paths } = fresh();
        for (const path of paths.appSource) expect(existsSync(path)).toBe(true);
        for (const name of ["app", "target-as-is-pages", "target-components-pages"]) {
            const step = steps.find((each) => each.name === name);
            expect(step?.inputs(paths, "")).toEqual(expect.arrayContaining([...paths.appSource]));
        }
        expect(hashFiles(paths.appSource)).toBe(hashFiles(paths.appSource));
    });
});

describe("one rule and one hash with the plan and shape-target", () => {
    const upToTarget = (text = "one") => {
        const made = fresh();
        const { root, request, paths } = made;
        put(paths.requestJson, JSON.stringify({ sourceRoots: [root] }));
        put(paths.analysisRequest, "x");
        put(join(paths.payloads, "system.json"));
        put(join(paths.bundles, "screen-a--b.md"), "x");
        wholeTarget(paths, text);
        next(root, request);
        return made;
    };
    test("the conductor's hash is the plan's shared function, cut as state.json keeps it", async () => {
        const shared = await import("../../plan-modernization-backlog/shared/read/fingerprint");
        const { paths } = fresh();
        put(join(paths.payloads, "system.json"), "one");
        expect(hashFiles([paths.payloads])).toBe(shared.hashFiles([paths.payloads]).slice(0, 16));
    });
    test("a decision recorded with the hash of what it decides on holds while the file keeps that hash, whatever its time", async () => {
        const { subjectOf } = await import("../../shape-target/shared/gates");
        const { root, request, paths } = upToTarget();
        put(
            paths.choiceArchitecture,
            JSON.stringify({ confirmedAt: new Date().toISOString(), subject: subjectOf(paths.architectureVariants) }),
        );
        markDone(root, "target-architecture-pages");
        const later = new Date(Date.now() + 60_000);
        utimesSync(paths.architectureVariants, later, later);
        expect(stepOf(next(root, request))).not.toBe("target-architecture-choose");
        put(paths.architectureVariants, "two");
        expect(stepOf(next(root, request))).toBe("target-architecture-pages");
        markDone(root, "target-architecture-pages");
        expect(stepOf(next(root, request))).toBe("target-architecture-choose");
    });
    test("the plan is built again when what it was built from changed, and a plan too old to say is left as it is", async () => {
        const { root, request, paths } = upToTarget();
        for (const name of ["layers", "decisions", "stories"]) put(join(paths.records, `${name}.json`), "[]");
        put(paths.manifest, JSON.stringify({ items: [] }));
        put(paths.app + "/index.html", "x");
        put(paths.plan, "{}");
        next(root, request);
        for (const name of [
            "foundation",
            "stories",
            "plan",
            "app",
            ...targetSteps,
            "request",
            "analysis-request",
            "analysis",
            "bundles",
            "derive-legacy",
        ])
            markDone(root, name);
        expect(next(root, request).action).not.toBe("run");
        put(paths.plan, JSON.stringify({ builtFrom: { analysis: "an analysis that is no longer there" } }));
        expect(stepOf(next(root, request))).toBe("plan");
        const { builtFromNow } = await import("../../plan-modernization-backlog/shared/derive/built-from");
        const { layoutOf } = await import("../../plan-modernization-backlog/shared/model/layout");
        put(paths.plan, JSON.stringify({ builtFrom: builtFromNow(layoutOf(root)) }));
        expect(stepOf(next(root, request))).not.toBe("plan");
    });
    test("the app is built with the command that writes a bundle, for the assistant copy", () => {
        const { paths } = fresh();
        for (const name of ["app", "target-as-is-pages"]) {
            const step = steps.find((each) => each.name === name)!;
            const action = step.action({
                paths,
                skills: "/skills",
                settings: { worktrees: "", base: "", parallel: 1 },
                request: "",
            });
            expect(JSON.stringify(action)).toContain(
                `BUILD_BUNDLE=\\"CODE_ANALYSIS_ROOT=${paths.analysis} bun /skills/code-analysis/cli/build-bundle.ts\\"`,
            );
        }
    });
});
