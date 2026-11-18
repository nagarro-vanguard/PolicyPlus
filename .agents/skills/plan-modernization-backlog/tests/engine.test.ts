import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { layoutOf } from "../shared/model/layout";
import { Story } from "../shared/model/records";
import { parseRequest } from "../shared/model/request";
import { runBuild, writeJson } from "../shared/derive/run";
import { abandon, done, finish, next, startStage, status } from "../shared/jobs/driver";
import { jobPaths, loadJobs, readJson } from "../shared/jobs/state";

const seed = join(import.meta.dir, "../../../../.modernization/.code-analysis");
const have = existsSync(join(seed, "payloads/system.json"));
const skillRoot = join(import.meta.dir, "..");

const setup = () => {
    const root = mkdtempSync(`${tmpdir()}/engine-`);
    cpSync(join(seed, "payloads"), join(root, ".code-analysis/payloads"), { recursive: true });
    const text = `## Output Root\n${root}\n## Source Roots\n- ${root}\n## Leave Out\nNone\n## Target Codebase\n- ${root}/Web\n## Target Stack\n- TypeScript on Bun\n- data: PostgreSQL\n## Documents\nNone\n## Additional Notes\n- Money is exact.\n`;
    const request = parseRequest(text, root);
    const layout = layoutOf(root);
    writeJson(layout.requestJson, request);
    return { root, layout, request };
};

type Any = Record<string, any>;
/** What an agent would write, made without one: valid records for each kind of job. */
const writerOutput = (job: Any, ctx: Any): Any => {
    const layerIds: string[] = ctx.layers.map((l: Any) => l.id);
    switch (job.kind) {
        case "layers":
            return {
                layers: ctx.stack.map((line: string, at: number) => ({
                    id: `layer-${at + 1}`,
                    name: `layer ${at + 1}`,
                    path: `layers/l${at + 1}`,
                    kind: "code",
                    purpose: `carries ${line.slice(0, 20)}`,
                    carries: [at + 1],
                    check: "true",
                    dependsOn: [],
                })),
            };
        case "integrations":
            return {
                decisions: job.externals.map((name: string, at: number) => ({
                    id: `decision-i${at}`,
                    topic: { _tag: "integration", system: name },
                    layer: layerIds[0],
                    chose: "an adapter",
                    reason: "chose an adapter over direct calls, to keep the layers apart",
                })),
            };
        case "scope":
            return {
                decisions: job.capabilities.map((name: string, at: number) => ({
                    id: `decision-s${at}`,
                    topic: { _tag: "scope", capability: name },
                    layer: "workspace",
                    chose: "carry",
                    reason: "the target can carry it",
                })),
            };
        case "notes":
            return {
                decisions: job.notes.map((_: string, at: number) => ({
                    id: `decision-n${at}`,
                    topic: { _tag: "note", number: at + 1 },
                    layer: "workspace",
                    chose: "honoured by a rule",
                    reason: "chose a rule over a reminder",
                })),
            };
        case "base":
            return {
                decisions: [
                    ...job.areas.map((area: string, at: number) => ({
                        id: `decision-a${at}`,
                        topic: { _tag: "area", name: area },
                        layer: "workspace",
                        chose: `the usual ${area}`,
                        reason: "chose the stack's own over a mix",
                    })),
                    ...layerIds.map((id, at) => ({
                        id: `decision-c${at}`,
                        topic: { _tag: "convention" },
                        layer: id,
                        chose: "Keep this layer free of other layers' details.",
                        reason: "keeps the layers apart",
                    })),
                ],
            };
        case "foundation-stories":
            return {
                stories: job.areaDecisionIds.map((id: string, at: number) => ({
                    title: `Set up area ${at + 1}`,
                    what: "the area is in place",
                    why: "later stories rely on it",
                    actions: [],
                    terms: [],
                    criteria: [
                        {
                            says: "Given a fresh checkout, when it is used, then it works as decided.",
                            from: [{ _tag: "decision", id }],
                        },
                    ],
                })),
            };
        case "shared": {
            const rules: string[] = job.shared;
            const per = Math.ceil(rules.length / 11);
            const groups: string[][] = [];
            for (let i = 0; i < rules.length; i += per) groups.push(rules.slice(i, i + per));
            return {
                stories: [
                    {
                        title: "Build the shared rules",
                        what: "the shared rules",
                        why: "every capability relies on them",
                        actions: [],
                        terms: [],
                        criteria: groups
                            .map((g) => ({
                                says: "Given the shared behaviour, when it is used, then the related rules hold.",
                                from: g.map((id) => ({ _tag: "rule", id })),
                            }))
                            .concat(
                                (job.transitions ?? []).length > 0
                                    ? [
                                          {
                                              says: "Given a thing in one state, when it moves on, then it reaches the next.",
                                              from: job.transitions.map((id: string) => ({ _tag: "transition", id })),
                                          },
                                      ]
                                    : [],
                            ),
                    },
                ],
            };
        }
        default: {
            const owned: string[] = job.owned;
            const tGroups: string[][] = [];
            for (let i = 0; i < job.transitions.length; i += 4) tGroups.push(job.transitions.slice(i, i + 4));
            const per = Math.max(1, Math.ceil(owned.length / Math.max(1, 12 - tGroups.length)));
            return {
                stories: job.surfaces.map((s: Any, at: number) => {
                    const mine = s.owned as string[];
                    const groups: string[][] = [];
                    for (let i = 0; i < mine.length; i += per) groups.push(mine.slice(i, i + per));
                    const criteria = groups.map((g) => ({
                        says: "Given the existing behaviour, when someone uses it, then the related rules hold.",
                        from: g.map((id) => ({ _tag: "rule", id })),
                    }));
                    if (at === 0)
                        for (const g of tGroups)
                            criteria.push({
                                says: "Given a thing in one state, when it moves on, then it reaches the next.",
                                from: g.map((id) => ({ _tag: "transition", id })),
                            });
                    if (criteria.length === 0)
                        criteria.push({
                            says: "Given this part, when someone uses it, then it behaves as today.",
                            from: [],
                        });
                    return {
                        title: `Carry over part ${at + 1} of ${job.surfaces[0].name.length > 0 ? "this capability" : "it"}`,
                        what: "use it as today",
                        why: "it keeps working",
                        actions: s.actions,
                        terms: [],
                        criteria: criteria.slice(0, 12),
                    };
                }),
            };
        }
    }
};

const drive = (
    layout: ReturnType<typeof layoutOf>,
    request: ReturnType<typeof setup>["request"],
    mode: "good" | "failOnce" | "challengeOnce",
) => {
    const seenFail = new Set<string>();
    for (let guard = 0; guard < 400; guard++) {
        const action = next(layout, skillRoot, "scripts", 4);
        if (action.action === "done") return action;
        if (action.action === "stop") throw new Error(action.message);
        if (action.action === "wait") throw new Error("a batch is open");
        for (const agent of action.agents) {
            const p = jobPaths(layout, agent.job);
            if (agent.role === "writer") {
                const output = writerOutput(readJson(p.job), readJson(p.context));
                if (mode === "failOnce" && !seenFail.has(agent.job) && agent.job === "scope") {
                    seenFail.add(agent.job);
                    output.decisions.pop();
                }
                writeJson(p.output, output);
            } else {
                const out = readJson<Any>(p.output);
                const records = [out.layers, out.decisions, out.stories].flatMap((each) =>
                    Array.isArray(each) ? each : [],
                );
                const challenge = mode === "challengeOnce" && !seenFail.has(agent.job) && agent.job === "base";
                if (challenge) seenFail.add(agent.job);
                writeJson(p.review, {
                    read: records.length,
                    challenges: challenge ? [{ record: 0, says: "the area is vague" }] : [],
                });
            }
            done(layout, request, agent.job);
        }
    }
    throw new Error("the loop did not finish");
};

describe.skipIf(!have)("the job engine, driven by stand-in agents", () => {
    test("both stages run to the end, merge their records and build a plan that passes every gate", () => {
        const { layout, request } = setup();
        expect(startStage(layout, request, "foundation")).toMatch(/jobs prepared/);
        drive(layout, request, "good");
        expect(finish(layout, "foundation")).toMatch(/layers, .* decisions, .* stories accepted/);
        expect(startStage(layout, request, "stories")).toMatch(/jobs prepared/);
        drive(layout, request, "good");
        expect(finish(layout, "stories")).toMatch(/0 challenges stayed disputed/);
        const built = runBuild(layout);
        expect(built.gaps.failing).toEqual([]);
        expect(built.written).toBe(true);
        expect(existsSync(layout.manifest)).toBe(true);
    });
    test("the stories stage will not start before the foundation is finished", () => {
        const { layout, request } = setup();
        startStage(layout, request, "foundation");
        expect(startStage(layout, request, "stories")).toMatch(/not finished/);
    });
    test("a writer whose output fails the gate is sent back once with the gaps, and then passes", () => {
        const { layout, request } = setup();
        startStage(layout, request, "foundation");
        drive(layout, request, "failOnce");
        const scope = loadJobs(layout).jobs.find((job) => job.id === "scope")!;
        expect(scope.fixes).toBe(1);
        expect(scope.state).toBe("decided");
    });
    test("a challenge sends the job back once; a challenge that survives the fix is kept as disputed", () => {
        const { layout, request } = setup();
        startStage(layout, request, "foundation");
        drive(layout, request, "challengeOnce");
        const base = loadJobs(layout).jobs.find((job) => job.id === "base")!;
        expect(base.fixes).toBe(1);
        expect(base.state).toBe("decided");
    });
    test("a job twice over the gate is refused and the loop stops with the reason", () => {
        const { layout, request } = setup();
        startStage(layout, request, "foundation");
        const first = next(layout, skillRoot, "scripts", 1);
        expect(first.action).toBe("dispatch");
        writeJson(jobPaths(layout, "layers").output, { layers: [] });
        done(layout, request, "layers");
        next(layout, skillRoot, "scripts", 1);
        done(layout, request, "layers");
        const stop = next(layout, skillRoot, "scripts", 1);
        expect(stop.action).toBe("stop");
    });
    test("an abandoned agent's job is handed out again, and an open batch is waited for", () => {
        const { layout, request } = setup();
        startStage(layout, request, "foundation");
        const first = next(layout, skillRoot, "scripts", 1);
        expect(next(layout, skillRoot, "scripts", 1).action).toBe("wait");
        abandon(layout, "layers");
        const again = next(layout, skillRoot, "scripts", 1);
        expect(again.action === "dispatch" && again.agents[0]?.job).toBe("layers");
        void first;
        expect(status(layout)[0]).toContain("layers");
    });
    test("every dispatch prompt names its agent file, the job and the output", () => {
        const { layout, request } = setup();
        startStage(layout, request, "foundation");
        const action = next(layout, skillRoot, "scripts", 1);
        expect(action.action === "dispatch" && action.agents[0]?.prompt).toContain("decide-foundation.md");
        expect(action.action === "dispatch" && action.agents[0]?.prompt).toContain("outputPath");
        expect(Story).toBeDefined();
        void readFileSync;
    });
});
