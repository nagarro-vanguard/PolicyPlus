import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { headlineOf, ledeOf, summaryOf, titleOf, wordCount } from "../src/lib/derive";
import { gateReview } from "../src/lib/gate";
import { nodeOf } from "../src/lib/node-of";
import { fuzzy, parseQuery, search } from "../src/lib/palette-match";
import type { Entry } from "../src/lib/palette-match";
import { systemName } from "../src/lib/words";
import { slugsOf } from "../src/lib/slugs";
import { buildBrief, buildIndex, buildSlice, planKinds, splitIndex, viewerOfSlice } from "../src/lib/slice";
import { filterRules, groupRules, modelOf, sortRules, tagOf } from "../src/lib/slice-model";
import type { CapSlice } from "../src/lib/slice-types";
import { decodeState, defaults, encodeState } from "../src/lib/url-state";
import type { Capability, Knowledge, System } from "../src/lib/types";
import type { TargetData } from "../src/lib/target-types";

// ---- the payloads: the real ones when this checkout holds them, a small made-up system otherwise ----
const realDir = process.env.ANALYSIS_PAYLOADS_DIR ?? "";
const real = realDir !== "" && existsSync(join(realDir, "system.json"));

const made = () => {
    const place = (file: string, line: number) => ({ file, firstLine: line, lastLine: line + 3 });
    const context = (text = "brief") => ({ scope: "", inside: [], insideNotShown: 0, insideLabel: "", lookFirst: [], lookFirstNotShown: 0, layers: [], saves: [], reads: [], rules: [], rulesNotShown: 0, rulesTotal: 0, unconfirmed: [], notFollowed: [], commit: "", text });
    const rule = (n: number, says: string) => ({ id: `businessrule-${n}`, says, gates: n % 3 === 0, place: place("src/a.vb", n), alsoRestsOn: n % 4 === 0 ? ["x"] : [], screens: [], context: context() });
    const cap = (n: number): Capability =>
        ({
            capability: { id: `capability-${n}`, name: `Capability number ${n}`, purpose: "Does a thing that people need done, in a way that the analysis could read from the code." },
            area: "Area one",
            layers: [
                {
                    id: `layer-${n}`,
                    name: "Dialog windows",
                    purpose: "What a person sees.",
                    evidence: [place("src/a.vb", 1)],
                    role: "facesPerson",
                    group: "ui",
                    blocks: 3,
                    sharedBlocks: 0,
                    actions: [0, 1, 2].map((a) => ({
                        id: `block-${n}-${a}`,
                        name: `Act${a}`,
                        purpose: `Asks for the value number ${a} of the thing, checks that it is valid and free, and then adds the new entry to the file without asking twice.`,
                        startedBy: "person",
                        screen: "Window",
                        place: place("src/a.vb", a),
                        path: [{ layer: `layer-${n}`, depth: 0 }],
                        rules: [`businessrule-${n}${a}`, `businessrule-${n}${a + 1}`],
                        context: context(),
                    })),
                    rules: [0, 1, 2, 3].map((r) => rule(Number(`${n}${r}`), `Rule ${r} of capability ${n}: the list shows every loaded product ordered by name, each with its number of children, and a refused load leaves the list as it was before.`)),
                    shapes: [],
                    context: context(),
                },
            ],
            screens: [{ name: "Window", actions: 3, controls: [{ name: "Button1", declaredAs: 'Button, caption "Close"' }, { name: "Box", declaredAs: "Friend WithEvents Box As TextBox" }] }],
            concerns: [],
            data: [],
            gaps: [],
            openPoints: [],
            totals: { actions: 3, rules: 4, blocks: 3, rulesOnNoScreen: 0 },
            context: context("capability brief"),
        }) as unknown as Capability;
    const caps = [cap(1), cap(2)];
    const sys = {
        purpose: "A system.",
        capabilities: caps.map((c) => ({ id: c.capability.id, name: c.capability.name, purpose: c.capability.purpose, screens: 1, actions: 3, rules: 4 })),
        areas: [{ id: "capabilitygroup-1", name: "Area one", purpose: "Things.", capabilities: caps.map((c) => c.capability.id), context: context() }],
        layers: caps.map((c) => ({ id: `layer-${c.capability.id.slice(-1)}`, name: "Dialog windows", role: "facesPerson", purpose: "", group: "ui", blocks: 3, product: true })),
        screens: [
            { key: "window", name: "Window", purpose: "A window.", files: ["src/a.vb"], capabilities: caps.map((c) => c.capability.id), actionIds: caps.flatMap((c) => c.layers.flatMap((l) => l.actions.map((a) => a.id))), actions: 6, rules: 8, layersTouched: [], context: context() },
        ],
        edges: [],
        entries: { person: 1, otherSystem: 0, schedule: 0 },
        externals: [],
        gaps: { unresolvedLinks: 0, unattributedBlocks: 0 },
        context: context(),
    } as unknown as System;
    const know = {
        risks: [{ id: "fact-1", statement: "A failed load of policy templates leaves the workspace inconsistent. Staged items survive and make later loads fail.", category: "data-integrity", categoryWords: "Data can end up wrong", severity: "medium", subject: { kind: "system", id: "", name: "" }, places: { capabilities: [{ id: "capability-1", name: "x" }], parts: [], files: ["src/a.vb"] }, findings: [] }],
    } as unknown as Knowledge;
    return { sys, caps, know };
};

const load = () => {
    if (!real) return made();
    const read = (file: string) => JSON.parse(readFileSync(join(realDir, file), "utf8"));
    return {
        sys: read("system.json") as System,
        know: read("knowledge.json") as Knowledge,
        caps: readdirSync(realDir).filter((f) => f.startsWith("capability-")).map((f) => read(f) as Capability),
    };
};
const { sys, caps, know } = load();
const slugs = slugsOf(sys, caps, know);
const product = new Set(sys.layers.filter((layer) => layer.product).map((layer) => layer.id));
const slices: CapSlice[] = caps.map((cap) => buildSlice(cap, sys, know, slugs, product));
const index = buildIndex({ sys, caps, know, slugs });

describe("headline and summary are cut from the text, never written", () => {
    const samples = [
        "Asks for a new key name, checks it is valid and free, and adds the empty key to the policy file.",
        "A failed load of policy templates leaves the workspace inconsistent. Staged items survive and make later loads fail.",
        "Lists the chosen category's subcategories and policies, with the number of policies in each, and nothing else at all that the code does not say.",
        "Pick a folder",
        "",
    ];
    test("a headline is at most eight words and a summary at most 25", () => {
        for (const text of samples) {
            expect(wordCount(headlineOf(text))).toBeLessThanOrEqual(8);
            expect(wordCount(summaryOf(text))).toBeLessThanOrEqual(25);
        }
    });
    test("every word of a headline is a word of the text, in order", () => {
        for (const text of samples) {
            const head = headlineOf(text).replace("…", "").toLowerCase().split(/\s+/).filter(Boolean);
            const source = text.toLowerCase().split(/\s+/).map((word) => word.replaceAll(/[.,;:]/g, ""));
            let at = 0;
            for (const word of head) {
                const found = source.indexOf(word.replaceAll(/[.,;:]/g, ""), at);
                expect([word, found >= 0]).toEqual([word, true]);
                at = found + 1;
            }
        }
    });
    test("a short text is its own headline, and a cut one says so with an ellipsis", () => {
        expect(headlineOf("Pick a folder")).toBe("Pick a folder");
        expect(headlineOf("Lists the chosen category's subcategories and policies, with the number of policies in each")).toBe("Lists the chosen category's subcategories and policies");
        expect(headlineOf("Folder box and its Browse button are usable only when the This folder choice is selected")).toEndWith("…");
    });
});

describe("a row's title is the sentence, never a cut of it", () => {
    const long = "A failed load of policy templates leaves the workspace inconsistent. Staged items survive and make later loads fail, partly filled lists make retries fail on duplicate names, and a download reloads after clearing the workspace.";
    test("a sentence of 25 words or fewer is its own title", () => {
        const text = "Asks for a new key name, checks it is valid and free, and adds the empty key to the policy file under that branch.";
        expect(wordCount(text)).toBeLessThanOrEqual(25);
        expect(titleOf(text)).toBe(text);
    });
    test("a longer text gives its first sentence, whole, with no ellipsis", () => {
        expect(titleOf(long)).toBe("A failed load of policy templates leaves the workspace inconsistent.");
        expect(titleOf("One sentence that has no stop and goes on and on and on and on and on and on and on and on and on and on and on and on and on")).not.toContain("…");
    });
    test("a lede is whole sentences", () => {
        expect(ledeOf("Short.")).toBe("Short.");
        expect(ledeOf(long)).not.toContain("…");
        expect(long.startsWith(ledeOf(long))).toBe(true);
    });
    test("no title the pages show ends in an ellipsis", () => {
        const shown = [
            ...index.items.filter((item) => ["area", "capability", "screen"].includes(item.kind)).map((item) => item.summary ?? ""),
            ...slices.flatMap((slice) => [...slice.risks.map((risk) => risk.headline), ...slice.layers.map((layer) => layer.summary), ...slice.screens.map((screen) => titleOf(screen.summary)), ...slice.actions.map((action) => titleOf(action.detail)), ...slice.rules.map((rule) => titleOf(rule.detail))]),
        ];
        for (const text of shown) expect(text.endsWith("…")).toBe(false);
    });
});

describe("the slices", () => {
    test("every rule's sentence is in the slice once", () => {
        for (const slice of slices) {
            const text = JSON.stringify(slice);
            const seen = new Set<string>();
            for (const rule of slice.rules) {
                expect(seen.has(rule.detail)).toBe(false);
                seen.add(rule.detail);
                expect(text.split(JSON.stringify(rule.detail).slice(1, -1)).length - 1).toBe(1);
            }
        }
    });
    test("every reference resolves", () => {
        for (const slice of slices) {
            const rules = new Set(slice.rules.map((rule) => rule.id));
            const actions = new Set(slice.actions.map((action) => action.id));
            const layers = new Set(slice.layers.map((layer) => layer.id));
            expect(rules.size).toBe(slice.rules.length);
            expect(actions.size).toBe(slice.actions.length);
            for (const rule of slice.rules) expect(layers.has(rule.layer)).toBe(true);
            for (const action of slice.actions) {
                for (const id of action.rules) expect(rules.has(id)).toBe(true);
                for (const id of action.path) expect(layers.has(id)).toBe(true);
            }
            for (const screen of slice.screens) {
                for (const id of screen.actions) expect(actions.has(id)).toBe(true);
                for (const id of screen.rules) expect(rules.has(id)).toBe(true);
                for (const entry of screen.layers) expect(layers.has(entry.layer)).toBe(true);
            }
        }
    });
    test("headlines are at most eight words", () => {
        for (const slice of slices) {
            // The short headline is for the palette; a risk's headline is the row's title, a sentence of the risk itself.
            for (const each of [...slice.rules, ...slice.actions]) expect(wordCount(each.headline)).toBeLessThanOrEqual(8);
            for (const risk of slice.risks) expect(risk.detail.startsWith(risk.headline)).toBe(true);
            for (const each of [...slice.rules, ...slice.actions]) if (each.summary !== undefined) expect(wordCount(each.summary)).toBeLessThanOrEqual(25);
        }
    });
    test("the full text is kept as the detail", () => {
        const cap = caps[0] as Capability;
        const slice = slices[0] as CapSlice;
        const original = new Set(cap.layers.flatMap((layer) => layer.rules.map((rule) => rule.says)));
        for (const rule of slice.rules) expect(original.has(rule.detail)).toBe(true);
        expect(slice.rules.length).toBe(original.size);
    });
    test("a slice for review stays small enough to fetch on opening", () => {
        for (const slice of slices) expect(JSON.stringify(slice).length).toBeLessThan(300_000);
    });
    test("the controls read as a person reads them", () => {
        const slice = slices[0] as CapSlice;
        const controls = slice.screens.flatMap((screen) => screen.controls);
        for (const [text, kind] of controls) {
            expect(text).not.toContain("Friend WithEvents");
            expect(kind).not.toEndWith(",");
        }
    });
    test("the briefs are ready for the ids of the slice", () => {
        const brief = buildBrief(caps[0] as Capability, sys);
        const slice = slices[0] as CapSlice;
        expect(Object.keys(brief.rules).sort()).toEqual(slice.rules.map((rule) => rule.id).sort());
        expect(Object.keys(brief.actions).sort()).toEqual(slice.actions.map((action) => action.id).sort());
    });
});

describe("the index", () => {
    test("ids are unique and every parent exists", () => {
        const ids = new Set(index.items.map((item) => item.id));
        expect(ids.size).toBe(index.items.length);
        for (const item of index.items) {
            if (item.parent !== undefined) expect([item.id, ids.has(item.parent)]).toEqual([item.id, true]);
            for (const also of item.also ?? []) expect(ids.has(also)).toBe(true);
        }
    });
    test("headlines are at most eight words, and no id is a record id", () => {
        for (const item of index.items) {
            expect([item.id, wordCount(item.headline) <= 8]).toEqual([item.id, true]);
            expect(item.id).not.toMatch(/(?:capability|businessrule|block|layer|fact|entity)-\d{8,}/);
            expect(item.href).not.toMatch(/\d{12,}/);
        }
    });
    test("it holds no rule text", () => {
        const text = JSON.stringify(index);
        for (const slice of slices) for (const rule of slice.rules.slice(0, 20)) expect(text.includes(rule.detail)).toBe(false);
    });
    test("the plan is a file of its own, so a page that never looks at it never loads it", () => {
        const { main, plan } = splitIndex(index);
        expect(main.items.length + plan.items.length).toBe(index.items.length);
        for (const item of main.items) expect(planKinds.includes(item.kind)).toBe(false);
        for (const item of plan.items) expect(planKinds.includes(item.kind)).toBe(true);
    });
    test("every capability and screen is in it", () => {
        expect(index.items.filter((item) => item.kind === "capability").length).toBe(caps.length);
        expect(index.items.filter((item) => item.kind === "screen").length).toBe(sys.screens.length);
    });
});

describe("the palette matcher", () => {
    const entries: Entry[] = [
        { id: "capability:browsing-policy-definitions", kind: "capability", headline: "Browsing policy definitions", summary: "Look through the loaded templates" },
        { id: "capability:finding-policies", kind: "capability", headline: "Finding policies" },
        { id: "screen:policy-plus-main-window", kind: "screen", headline: "Policy Plus main window" },
        { id: "risk:download-package-is-not-verified", kind: "risk", headline: "Download package is not verified", tags: ["risk:high", "input-handling"] },
        { id: "risk:failed-load-leaves-workspace", kind: "risk", headline: "Failed load leaves workspace inconsistent", tags: ["risk:medium"] },
    ];
    test("a typed filter picks the kind, and risk:high picks the severity", () => {
        expect(parseQuery("screen:main")).toEqual({ kind: "screen", tag: "", text: "main" });
        expect(parseQuery("risk:high download")).toEqual({ kind: "risk", tag: "risk:high", text: "download" });
        expect(parseQuery("rule:folder remembered")).toEqual({ kind: "rule", tag: "", text: "folder remembered" });
        expect(parseQuery("nothing: here")).toEqual({ kind: "", tag: "", text: "nothing: here" });
    });
    test("a fuzzy match on the name finds a word, an abbreviation and a slug", () => {
        expect(search(entries, parseQuery("brows"))[0]?.entry.id).toBe("capability:browsing-policy-definitions");
        expect(search(entries, parseQuery("bpd"))[0]?.entry.id).toBe("capability:browsing-policy-definitions");
        expect(search(entries, parseQuery("main window"))[0]?.entry.id).toBe("screen:policy-plus-main-window");
        expect(search(entries, parseQuery("workspace load"))[0]?.entry.id).toBe("risk:failed-load-leaves-workspace");
    });
    test("a typed kind and tag narrow the result", () => {
        expect(search(entries, parseQuery("risk:")).map((hit) => hit.entry.kind)).toEqual(["risk", "risk"]);
        expect(search(entries, parseQuery("risk:high")).map((hit) => hit.entry.id)).toEqual(["risk:download-package-is-not-verified"]);
        expect(search(entries, parseQuery("screen:policy")).map((hit) => hit.entry.kind)).toEqual(["screen"]);
    });
    test("a word that is not there finds nothing, and a whole word beats a scattered one", () => {
        expect(search(entries, parseQuery("zzz"))).toEqual([]);
        expect((fuzzy("pol", "Policy Plus") as { score: number }).score).toBeGreaterThan((fuzzy("pol", "Open a list of policies") as { score: number }).score);
        expect(fuzzy("xyz", "abc")).toBeUndefined();
    });
    test("the marked letters are those of the headline", () => {
        const hit = search(entries, parseQuery("find"))[0];
        expect(hit?.marks).toEqual([0, 1, 2, 3]);
    });
});

describe("the state held in the address", () => {
    test("the defaults are no fragment", () => {
        expect(encodeState({})).toBe("");
        expect(decodeState("")).toEqual(defaults);
    });
    test("what is set comes back, in a fixed order", () => {
        const state = { ...defaults, view: "table" as const, q: "folder box", layer: "l1", tag: "refuses" as const, sort: "uses" as const, desc: true, rule: "r12" };
        const fragment = encodeState(state);
        expect(fragment).toBe("view=table&q=folder+box&layer=l1&tag=refuses&sort=uses&dir=desc&rule=r12");
        expect(decodeState(`#${fragment}`)).toEqual(state);
        expect(encodeState(decodeState(fragment))).toBe(fragment);
    });
    test("the screen page names its screen and capability", () => {
        const state = decodeState("s=policy-plus-main-window&c=browsing-policy-definitions&rule=r3");
        expect(state.s).toBe("policy-plus-main-window");
        expect(state.c).toBe("browsing-policy-definitions");
        expect(state.rule).toBe("r3");
    });
    test("a hand-edited address cannot break a page", () => {
        const state = decodeState("view=x&group=y&sort=z&rule=%3Cscript%3E&layer=../../&tag=nope&s=a/b&dir=up&q=" + "x".repeat(500));
        expect({ ...state, q: state.q.length }).toEqual({ ...defaults, q: 200 });
    });
    test("the retired tab and single-page keys are ignored", () => {
        expect(decodeState("tab=risks&single=1")).toEqual(defaults);
    });
    test("a link to a rule opens its screen", () => {
        const state = decodeState(encodeState({ s: "main", c: "browsing", rule: "r3" }));
        expect([state.s, state.c, state.rule, state.view]).toEqual(["main", "browsing", "r3", "groups"]);
    });
});

describe("rules in a slice: filter, sort, group", () => {
    const slice = slices[0] as CapSlice;
    const model = modelOf(slice);
    test("the filter takes every word, the layer and the tag", () => {
        const word = (slice.rules[0] as { detail: string }).detail.split(" ")[3] as string;
        const found = filterRules(slice.rules, { q: word, layer: "", tag: "" });
        expect(found.length).toBeGreaterThan(0);
        for (const rule of found) expect(`${rule.headline} ${rule.detail} ${rule.place}`.toLowerCase()).toContain(word.toLowerCase());
        expect(filterRules(slice.rules, { q: "zzzzqqqq", layer: "", tag: "" })).toEqual([]);
        const refusing = filterRules(slice.rules, { q: "", layer: "", tag: "refuses" });
        for (const rule of refusing) expect(tagOf(rule)).toBe("refuses");
        expect(filterRules(slice.rules, { q: "", layer: "l999", tag: "" })).toEqual([]);
    });
    test("a sort is stable and can be turned around", () => {
        const up = sortRules(slice.rules, model, "headline", false).map((rule) => rule.id);
        const down = sortRules(slice.rules, model, "headline", true).map((rule) => rule.id);
        expect(up.length).toBe(slice.rules.length);
        expect(new Set(up).size).toBe(up.length);
        expect([...down].reverse().length).toBe(up.length);
        expect(sortRules(slice.rules, model, "order", false).map((rule) => rule.id)).toEqual(slice.rules.map((rule) => rule.id));
    });
    test("groups hold every rule once by layer and by kind, and an action's rules by action", () => {
        for (const by of ["layer", "tag"] as const) {
            const groups = groupRules(slice.rules, by, model, slice.actions);
            expect(groups.reduce((sum, group) => sum + group.rules.length, 0)).toBe(slice.rules.length);
        }
        const byAction = groupRules(slice.rules, "action", model, slice.actions);
        const covered = new Set(byAction.flatMap((group) => group.rules.map((rule) => rule.id)));
        expect(covered.size).toBe(slice.rules.length);
        for (const group of byAction.filter((each) => each.key !== "none")) expect(group.rules.length).toBe(new Set(model.action.get(group.key)?.rules).size);
    });
});

describe("the name the sidebar shows", () => {
    test("it is read from the opening sentence of the system's briefing", () => {
        expect(systemName({ context: { scope: "The whole system. Policy Plus is a Windows desktop editor for Group Policy settings." } })).toBe("Policy Plus");
        expect(systemName({ context: { scope: "The whole system. Orders is the shop's back office." } })).toBe("Orders");
        expect(systemName({ context: { scope: "The whole system, and nothing named." } })).toBe("");
    });
});

describe("the shell knows which page it is on", () => {
    test("from the address", () => {
        expect(nodeOf("index")).toBe("system:system");
        expect(nodeOf("capability/browsing")).toBe("capability:browsing");
        expect(nodeOf("plan/story/012-set-up")).toBe("story:012");
        expect(nodeOf("plan/epic/03-x")).toBe("epic:03");
        expect(nodeOf("journey/get-a-thing")).toBe("journey:get-a-thing");
        expect(nodeOf("gate/architecture")).toBe("gate:architecture");
        expect(nodeOf("risks")).toBe("page:risks");
        expect(nodeOf("kit")).toBe("");
    });
});

describe("the diagram data", () => {
    test("every box names a group and a box that exist", () => {
        for (const slice of slices) {
            const data = viewerOfSlice(slice);
            for (const box of data.boxes) {
                expect(box.g).toBeGreaterThanOrEqual(0);
                expect(box.g).toBeLessThan(data.groups.length);
                for (const id of box.u) expect(id).toBeLessThan(data.boxes.length);
                for (const group of box.ug ?? []) expect(group).toBeLessThan(data.groups.length);
            }
        }
    });
});

describe("the gate pages", () => {
    const target = {
        legacy: undefined,
        tasks: [{ id: "t.one", outcome: "Make a thing", actor: "person", actions: [], rules: [], facts: [], needs: [], current: [{ intent: "a", system: "b", from: [], confidence: "sure" }] }],
        variants: [{ id: "v", task: "t.one", actor: "person", name: "Automatic", strategy: "", idea: "", tradeoff: "Less control.", recommended: "because", baseline: false, steps: [], drops: [] }],
        journeys: [],
        architectureVariants: [{ name: "One app", idea: "x", risks: [], tradeoff: "Simple.", recommended: "yes", integrations: [], domains: [{ name: "D", concept: "c", facts: [], rules: [], dependsOn: [], why: "" }], containers: [] }],
        architecture: undefined,
        choiceAsIs: undefined,
        choiceJourneys: undefined,
        choiceArchitecture: undefined,
        choiceComponents: undefined,
        gates: { "as-is": { state: "confirmed", date: "2026-01-01" }, journeys: { state: "waiting", date: undefined }, architecture: { state: "blocked", date: undefined }, components: { state: "not made", date: undefined } },
        root: "/out",
    } as unknown as TargetData;
    test("each decision shows a summary, an answer, what changes and a command", () => {
        for (const gate of ["as-is", "journeys", "architecture", "components"] as const) {
            const review = gateReview(gate, target);
            expect(review.summary.length).toBeGreaterThan(0);
            expect(review.recommended.length).toBeGreaterThan(0);
            expect(review.changes.length).toBeGreaterThan(0);
            expect(review.command).toContain(gate === "as-is" ? "as-is" : gate);
            expect(review.command).toContain("/out");
            expect(review.state).toBe(target.gates[gate].state);
        }
    });
    test("the architecture's command names the recommended one, the journeys' takes the recommended", () => {
        expect(gateReview("architecture", target).command).toContain('--pick "One app"');
        expect(gateReview("journeys", target).command).toContain("--all-recommended");
    });
});
