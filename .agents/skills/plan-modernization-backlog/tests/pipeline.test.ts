import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkPlan } from "../shared/derive/gates";
import { buildPlan } from "../shared/derive/plan";
import { carriedFrom } from "../shared/derive/scope";
import { deriveFacts } from "../shared/derive/facts";
import { standin } from "../shared/derive/standin";
import { layoutOf } from "../shared/model/layout";
import { Decision, Story } from "../shared/model/records";
import { parseRequest, type ModernizationRequest } from "../shared/model/request";
import { readAnalysis } from "../shared/read/analysis";
import { loadRequest, recordFiles, runBuild, writeJson } from "../shared/derive/run";

const seed = join(import.meta.dir, "../../../../.modernization/.code-analysis");
const have = existsSync(join(seed, "payloads/system.json"));
const requestText = (root: string, notes = "None") =>
    `## Output Root\n${root}\n## Source Roots\n- ${root}\n## Leave Out\nNone\n## Target Codebase\n- ${root}/Web\n## Target Stack\n- TypeScript on Bun\n- data: PostgreSQL\n## Documents\nNone\n## Additional Notes\n${notes}\n`;

const setup = (notes = "None") => {
    const root = mkdtempSync(`${tmpdir()}/plan-`);
    cpSync(join(seed, "payloads"), join(root, ".code-analysis/payloads"), { recursive: true });
    const request = parseRequest(requestText(root, notes), root);
    const analysis = readAnalysis(join(root, ".code-analysis"));
    return { root, request, analysis };
};

type Records = { layers: ReturnType<typeof standin>["layers"]; decisions: Decision[]; stories: Story[] };
const evaluate = (analysis: ReturnType<typeof readAnalysis>, request: ModernizationRequest, records: Records) => {
    const { ids } = carriedFrom(analysis, records.decisions);
    const facts = deriveFacts(analysis, ids);
    const { plan, problems } = buildPlan({ analysis, facts, request, ...records });
    return { plan, facts, gaps: checkPlan({ analysis, facts, request, ...records, plan, problems }) };
};
const fresh = (analysis: ReturnType<typeof readAnalysis>, request: ModernizationRequest): Records => {
    const records = standin(analysis, deriveFacts(analysis), request);
    return { layers: records.layers, decisions: [...records.decisions], stories: [...records.stories] };
};

describe.skipIf(!have)("the plan, derived from the PolicyPlus analysis", () => {
    const { request, analysis } = setup();
    const good = fresh(analysis, request);
    const result = evaluate(analysis, request, good);

    test("stand-in records pass every failing gate", () => {
        expect(result.gaps.failing).toEqual([]);
    });
    test("every rule is built by exactly one story and every action is in exactly one", () => {
        expect(result.plan.coverage.rulesBuilt).toBe(result.plan.coverage.rulesTotal);
        const actions = result.plan.stories.flatMap((story) => story.actions);
        expect(new Set(actions).size).toBe(actions.length);
        const builds = result.plan.stories.flatMap((story) => story.builds);
        expect(new Set(builds).size).toBe(builds.length);
    });
    test("the order is strict and every blocker comes earlier", () => {
        const seq = new Map(result.plan.stories.map((story) => [story.key as string, story.sequence]));
        expect(new Set(seq.values()).size).toBe(seq.size);
        expect([...seq.values()].sort((a, b) => a - b)).toEqual(Array.from({ length: seq.size }, (_, at) => at + 1));
        for (const story of result.plan.stories)
            for (const blocker of story.blockedBy) expect(seq.get(blocker)!).toBeLessThan(story.sequence);
        expect(result.plan.stories[0]?.builder).toBe("scaffold-codebase");
        expect(result.plan.stories[0]?.phase).toBe(0);
    });
    test("epics come after the epics they depend on, and the pilot is the smallest capability", () => {
        const order = new Map(result.plan.epics.map((epic) => [epic.key, epic.sequence]));
        for (const epic of result.plan.epics)
            for (const before of epic.comesAfter) expect(order.get(before)!).toBeLessThan(epic.sequence);
        const capabilities = result.plan.epics.filter((epic) => epic.kind === "functional");
        expect(capabilities[0]?.capability).toBe("Building and versioning Policy Plus");
    });
    test("tags follow what a story cites", () => {
        for (const story of result.plan.stories) {
            expect(story.tags[0]).toBe("story");
            expect(story.tags[1]).toBe(story.kind);
            expect(story.tags.includes("modernize")).toBe(story.builds.length > 0);
        }
    });
    test("the same records give the same keys on a second run", () => {
        const again = evaluate(analysis, request, good);
        expect(again.plan.stories.map((s) => s.key)).toEqual(result.plan.stories.map((s) => s.key));
    });

    describe("each gate fails on a seeded defect", () => {
        const with_ = (mutate: (records: Records, request: ModernizationRequest) => ModernizationRequest | void) => {
            const records = fresh(analysis, request);
            const changed = mutate(records, request) ?? request;
            return evaluate(analysis, changed, records).gaps.failing.join(" | ");
        };
        const functional = (records: Records) =>
            records.stories.findIndex((story) => story.actions.length > 1 && story.criteria.length > 1);
        test("a story is dropped", () =>
            expect(with_((r) => void r.stories.splice(functional(r), 1))).toMatch(/actions are in no story/));
        test("a rule is cited twice", () => {
            expect(
                with_((r) => {
                    const at = functional(r);
                    const rule = r.stories[at]!.criteria.flatMap((c) => c.from)[0]!;
                    r.stories.push({
                        ...r.stories[at]!,
                        actions: [],
                        criteria: [{ says: "Given x, when y, then z.", from: [rule] }],
                    } as Story);
                }),
            ).toMatch(/built by two stories|builds a rule/);
        });
        test("a story spans two surfaces", () => {
            expect(
                with_((r) => {
                    const [a, b] = r.stories.filter((s) => s.actions.length > 0);
                    r.stories[r.stories.indexOf(a!)] = { ...a!, actions: [...a!.actions, ...b!.actions] } as Story;
                }),
            ).toMatch(/spans more than one surface|more than one story/);
        });
        test("a story has too many criteria", () => {
            expect(
                with_((r) => {
                    const at = functional(r);
                    const c = r.stories[at]!.criteria[0]!;
                    r.stories[at] = {
                        ...r.stories[at]!,
                        criteria: Array.from({ length: 13 }, () => c),
                    } as unknown as Story;
                }),
            ).toMatch(/over 12/);
        });
        test("a scope decision is missing", () =>
            expect(
                with_(
                    (r) =>
                        void r.decisions.splice(
                            r.decisions.findIndex((d) => d.topic._tag === "scope"),
                            1,
                        ),
                ),
            ).toMatch(/no scope decision/));
        test("an outside system has no integration decision", () =>
            expect(
                with_(
                    (r) =>
                        void r.decisions.splice(
                            r.decisions.findIndex((d) => d.topic._tag === "integration"),
                            1,
                        ),
                ),
            ).toMatch(/no integration decision/));
        test("a note has no decision", () =>
            expect(with_((_, req) => ({ ...req, notes: ["Money is exact."] }))).toMatch(/note 1 has no decision/));
        test("a stack line is carried by no layer", () =>
            expect(with_((r) => void (r.layers[0] = { ...r.layers[0]!, carries: [] }))).toMatch(
                /no layer carries target stack line 1/,
            ));
        test("the layers depend on each other in a cycle", () => {
            expect(
                with_((r) => {
                    r.layers[0] = { ...r.layers[0]!, dependsOn: [r.layers[1]!.id] };
                    r.layers[1] = { ...r.layers[1]!, dependsOn: [r.layers[0]!.id] };
                }),
            ).toMatch(/cycle/);
        });
        test("a product owner's story shows a code identifier", () => {
            expect(
                with_((r) => {
                    const at = functional(r);
                    r.stories[at] = { ...r.stories[at]!, title: "Carry over FindByText" } as Story;
                }),
            ).toMatch(/shows the code/);
        });
        test("a state change is cited by no criterion", () => {
            expect(
                with_((r) => {
                    r.stories = r.stories.map((story) => {
                        const kept = story.criteria.filter((c) => !c.from.some((x) => x._tag === "transition"));
                        return {
                            ...story,
                            criteria: kept.length > 0 ? kept : [{ says: "Given x, when y, then z.", from: [] }],
                        } as unknown as Story;
                    });
                }),
            ).toMatch(/changes of state/);
        });
        test("a convention spans two lines", () => {
            expect(
                with_((r) => {
                    const at = r.decisions.findIndex((d) => d.topic._tag === "convention");
                    r.decisions[at] = { ...r.decisions[at]!, chose: "one\ntwo" } as Decision;
                }),
            ).toMatch(/one line/);
        });
        test("a dropped capability is no longer planned", () => {
            const records = fresh(analysis, request);
            const at = records.decisions.findIndex((d) => d.topic._tag === "scope");
            records.decisions[at] = { ...records.decisions[at]!, chose: "drop: nobody uses it" } as Decision;
            const dropped = records.decisions[at]!.topic;
            const name = dropped._tag === "scope" ? dropped.capability : "";
            const next = evaluate(analysis, request, records);
            expect(next.plan.coverage.capabilities.some((c) => c.name === name)).toBe(false);
        });
    });

    test("build writes the plan, the work items, the attachments and the AGENTS.md previews", () => {
        const { root } = setup();
        const layout = layoutOf(root);
        writeJson(layout.requestJson, request);
        const records = standin(analysis, deriveFacts(analysis), request);
        writeJson(recordFiles(layout).layers, records.layers);
        writeJson(recordFiles(layout).decisions, records.decisions);
        writeJson(recordFiles(layout).stories, records.stories);
        expect(loadRequest(layout).stack).toHaveLength(2);
        const built = runBuild(layout);
        expect(built.gaps.failing).toEqual([]);
        expect(built.written).toBe(true);
        for (const file of [layout.plan, layout.manifest, layout.ledger]) expect(existsSync(file)).toBe(true);
        const manifest = JSON.parse(readFileSync(layout.manifest, "utf8")) as {
            items: { kind: string; body: string; attachment: string | null; tags: string[] }[];
        };
        for (const item of manifest.items) expect(existsSync(join(layout.items, item.body))).toBe(true);
        for (const item of manifest.items.filter((i) => i.tags.includes("modernize")))
            expect(existsSync(join(layout.items, item.attachment!))).toBe(true);
        expect(readFileSync(join(layout.agentsFiles, "AGENTS.md"), "utf8")).toContain("## Layers");
    });
});
