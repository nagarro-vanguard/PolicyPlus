import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveFacts, type Facts } from "../shared/derive/facts";
import { evaluatePlan, recordFiles, runBuild, writeJson } from "../shared/derive/run";
import { standin } from "../shared/derive/standin";
import { checkJob, startStage } from "../shared/jobs/driver";
import { prepareStage } from "../shared/jobs/stages";
import { jobPaths, loadJobs, writeJson as writeJobJson } from "../shared/jobs/state";
import { layoutOf } from "../shared/model/layout";
import type { Story } from "../shared/model/records";
import { parseRequest } from "../shared/model/request";
import { readAnalysis } from "../shared/read/analysis";
import { targetGaps } from "../shared/read/confirmed";

const seed = join(import.meta.dir, "../../../../.modernization/.code-analysis");
const have = existsSync(join(seed, "payloads/system.json"));
const slug = (text: string) =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
const chunks = <T>(items: readonly T[], size: number) =>
    Array.from({ length: Math.ceil(items.length / size) }, (_, at) => items.slice(at * size, at * size + size));

/** A target written without agents for a real analysis: one journey of one step for each surface, one component for each. */
const standinTarget = (facts: Facts) => {
    const journeys: Record<string, unknown>[] = [];
    const components: Record<string, unknown>[] = [
        {
            name: "shared-rules",
            domain: "Core",
            responsibility: "the rules several journeys share",
            module: "shared-rules",
            uses: [],
            serves: [],
            enforces: [...facts.shared],
            platform: "rules several journeys share",
        },
    ];
    const stories: Story[] = [];
    const tasks: { id: string; outcome: string }[] = [];
    for (const capability of facts.capabilities)
        for (const surface of capability.surfaces) {
            const name = slug(`${capability.name} ${surface.name}`);
            const journeyId = `${name}:one-step`;
            const stepId = `${journeyId}#1`;
            const actions = surface.actions.map((action) => action.id);
            tasks.push({ id: name, outcome: `Use ${surface.name.toLowerCase()} of ${capability.name.toLowerCase()}` });
            journeys.push({
                id: journeyId,
                task: name,
                actor: "person",
                name: "one step",
                strategy: "task first",
                idea: "everything in one step",
                tradeoff: "less visible detail",
                baseline: false,
                drops: [],
                steps: [
                    {
                        id: stepId,
                        intent: "Do the work",
                        system: "The system does it",
                        confidence: "sure",
                        touches: [],
                        honours: [...surface.owned],
                        link: {
                            _tag: "legacy",
                            from: actions,
                            change: "merged",
                            reason: "one step instead of several",
                            keeps: [...surface.owned],
                        },
                    },
                ],
            });
            components.push({
                name: `${name}-service`,
                domain: "Core",
                responsibility: `carries ${name}`,
                module: `${name}-service`,
                uses: ["shared-rules"],
                serves: [stepId],
                enforces: [...surface.owned],
            });
            stories.push({
                title: `Carry over ${capability.name.toLowerCase()}`.slice(0, 72),
                what: "use this part of the product as people do today",
                why: "they keep working as they always have",
                actions,
                terms: [],
                steps: [stepId],
                components: [`${name}-service`],
                criteria: (surface.owned.length === 0
                    ? [{ says: "Given the product, when someone uses it, then it behaves as it does today.", from: [] }]
                    : chunks(surface.owned, Math.max(1, Math.ceil(surface.owned.length / 12))).map((rules) => ({
                          says: `Given the existing behaviour, when someone uses it, then ${rules.length} related rules hold as they do today.`,
                          from: rules.map((id) => ({ _tag: "rule", id })),
                      }))) as unknown as Story["criteria"],
            } as unknown as Story);
        }
    stories.push({
        title: "Build the shared components",
        what: "the rules several journeys call",
        why: "every journey can rely on them",
        actions: [],
        terms: [],
        components: ["shared-rules"],
        criteria: chunks(facts.shared, Math.max(1, Math.ceil(facts.shared.length / 12))).map((rules) => ({
            says: `Given the shared behaviour, when it is used, then ${rules.length} related rules hold as they do today.`,
            from: rules.map((id) => ({ _tag: "rule", id })),
        })) as unknown as Story["criteria"],
    } as unknown as Story);
    const architecture = {
        name: "standin",
        containers: [{ name: "application", kind: "service", tech: "TypeScript on Bun", holds: ["Core"] }],
        components,
    };
    return { journeys, architecture, tasks, stories };
};

/** The four decisions of the target, each recorded after what it decides on, which was made after the one before it. */
const confirmTarget = (layout: ReturnType<typeof layoutOf>) => {
    const records = join(layout.outputRoot, ".shape-target", "work", "records");
    writeJson(join(records, "journey-variants.json"), []);
    writeJson(join(records, "architecture-variants.json"), []);
    const base = Date.now() - 100_000;
    const at = (step: number) => new Date(base + step * 1000);
    const made = (path: string, step: number) => utimesSync(path, at(step), at(step));
    const decided = (name: string, step: number) =>
        writeJson(join(layout.target, `choice-${name}.json`), { confirmedAt: at(step).toISOString() });
    made(layout.targetTasks, 0);
    decided("as-is", 1);
    made(join(records, "journey-variants.json"), 2);
    decided("journeys", 3);
    made(join(records, "architecture-variants.json"), 4);
    decided("architecture", 5);
    made(layout.targetArchitecture, 6);
    decided("components", 7);
};

describe("the target the plan may start from", () => {
    test("a run that was never shaped has nothing to confirm, a shaped one needs all four decisions to hold", () => {
        const copy = setup();
        expect(targetGaps(copy.layout)).toEqual([]);
        rmSync(join(copy.layout.target, "choice-components.json"));
        expect(targetGaps(copy.layout)).toEqual(["the components is not confirmed"]);
        const later = new Date(Date.now() + 60_000);
        utimesSync(join(copy.root, ".shape-target/work/records/journey-variants.json"), later, later);
        expect(targetGaps(copy.layout).join("\n")).toContain("the journeys changed after it was confirmed");
        expect(startStage(copy.layout, {} as never, "foundation")).toContain("the target is not confirmed");
        expect(targetGaps(layoutOf(mkdtempSync(`${tmpdir()}/plan-none-`)))).toEqual([]);
    });
});

const setup = () => {
    const root = mkdtempSync(`${tmpdir()}/plan-target-`);
    cpSync(join(seed, "payloads"), join(root, ".code-analysis/payloads"), { recursive: true });
    cpSync(join(seed, "bundles"), join(root, ".code-analysis/bundles"), { recursive: true });
    const layout = layoutOf(root);
    const request = parseRequest(
        `## Output Root\n${root}\n## Source Roots\n- ${root}\n## Leave Out\nNone\n## Target Codebase\n- ${root}/Web\n## Target Stack\n- TypeScript on Bun\n- data: PostgreSQL\n## Documents\nNone\n## Additional Notes\nNone\n`,
        root,
    );
    const analysis = readAnalysis(layout.analysis);
    const facts = deriveFacts(analysis);
    const records = standin(analysis, facts, request);
    const target = standinTarget(facts);
    const foundation = records.stories.filter(
        (story) =>
            story.actions.length === 0 && !story.criteria.some((c) => c.from.some((ref) => ref._tag !== "decision")),
    );
    const files = recordFiles(layout);
    writeJson(layout.requestJson, request);
    writeJson(files.layers, records.layers);
    writeJson(files.decisions, records.decisions);
    writeJson(files.stories, [...foundation, ...target.stories]);
    writeJson(layout.targetJourneys, target.journeys);
    writeJson(layout.targetArchitecture, target.architecture);
    writeJson(layout.targetTasks, { tasks: target.tasks });
    confirmTarget(layout);
    return { root, layout, files, target, facts, foundation };
};

describe.skipIf(!have)("a plan made from a confirmed target", () => {
    const run = setup();
    const evaluated = evaluatePlan(run.layout);

    test("every failing gate passes", () => {
        expect(evaluated.gaps.failing).toEqual([]);
        expect(evaluated.target).toBeDefined();
    });
    test("every component is built by exactly one story and every step is in exactly one", () => {
        const built = evaluated.plan.stories.flatMap((story) => story.components ?? []);
        expect(new Set(built).size).toBe(built.length);
        expect(built.length).toBe(run.target.architecture.components.length);
        const steps = evaluated.plan.stories.flatMap((story) => story.steps ?? []);
        expect(new Set(steps).size).toBe(steps.length);
        expect(steps.length).toBe(run.target.journeys.length);
    });
    test("epics are the journeys, and each has an acceptance story that comes last in it", () => {
        const journeyEpics = evaluated.plan.epics.filter((epic) => epic.task !== undefined);
        expect(journeyEpics.length).toBe(run.target.journeys.length);
        for (const epic of journeyEpics) {
            const mine = evaluated.plan.stories
                .filter((story) => story.epic === epic.key)
                .sort((a, b) => a.sequence - b.sequence);
            expect(mine.at(-1)?.title.startsWith("Prove the journey")).toBe(true);
            expect(mine.at(-1)?.tags).not.toContain("modernize");
        }
    });
    test("the order is strict: shared components first, every blocker earlier, journeys after what they call", () => {
        const sequence = new Map(evaluated.plan.stories.map((story) => [story.key, story.sequence]));
        expect(new Set(sequence.values()).size).toBe(sequence.size);
        for (const story of evaluated.plan.stories)
            for (const blocker of story.blockedBy) expect(sequence.get(blocker) ?? 0).toBeLessThan(story.sequence);
        const shared = evaluated.plan.stories.find((story) => (story.components ?? []).includes("shared-rules"));
        const functional = evaluated.plan.stories.filter((story) => story.kind === "functional");
        expect(functional.length).toBeGreaterThan(5);
        for (const story of functional) {
            expect(story.blockedBy).toContain(shared?.key as never);
            expect(story.phase).toBeGreaterThan(shared?.phase ?? 0);
        }
    });
    test("every rule is built once, and the rules a story builds are those of its components", () => {
        const built = evaluated.plan.stories.flatMap((story) => story.builds as readonly string[]);
        expect(new Set(built).size).toBe(built.length);
        expect(built.length).toBe(evaluated.facts.rules.size);
        expect(evaluated.plan.coverage.rulesBuilt).toBe(evaluated.plan.coverage.rulesTotal);
    });
    test("the same records give the same keys on a second run", () => {
        expect(evaluatePlan(run.layout).plan.stories.map((story) => story.key)).toEqual(
            evaluated.plan.stories.map((story) => story.key),
        );
    });
    test("build writes the work items, and an attachment names the steps and the components it carries", () => {
        const result = runBuild(run.layout);
        expect(result.written).toBe(true);
        const functional = evaluated.plan.stories.find(
            (story) => story.kind === "functional" && story.builds.length > 0,
        );
        const text = readFileSync(join(run.layout.attachments, `${functional?.key}.md`), "utf8");
        expect(text).toContain('"steps"');
        expect(text).toContain('"components"');
        expect(text).toContain("-service");
    });

    describe("each target gate fails on a seeded defect", () => {
        const mutate = (change: (stories: Story[]) => Story[]) => {
            const copy = setup();
            writeJson(copy.files.stories, change([...copy.foundation, ...copy.target.stories]));
            return evaluatePlan(copy.layout).gaps.failing;
        };
        const has = (gaps: string[], text: string) => expect(gaps.some((gap) => gap.includes(text))).toBe(true);
        test("a component built by two stories", () =>
            has(
                mutate((all) => [
                    ...all,
                    {
                        ...(all.find((s) => (s.components ?? []).includes("shared-rules")) as Story),
                        title: "Build the shared components again",
                    },
                ]),
                "built by two stories",
            ));
        test("a component built by no story", () =>
            has(
                mutate((all) => all.filter((s) => !(s.components ?? []).includes("shared-rules"))),
                "built by no story",
            ));
        test("a step in no story", () =>
            has(
                mutate((all) => all.filter((s, at) => at !== all.findIndex((x) => (x.steps ?? []).length > 0))),
                "journey steps are in no story",
            ));
        test("a story that cites a rule of a component it does not build", () =>
            has(
                mutate((all) =>
                    all.map((s) =>
                        (s.steps ?? []).length > 0 && s.criteria.some((c) => c.from.length > 0)
                            ? {
                                  ...s,
                                  criteria: [
                                      ...s.criteria,
                                      {
                                          says: "Given x, when y, then z.",
                                          from: [{ _tag: "rule", id: run.facts.shared[0] }],
                                      },
                                  ] as never,
                              }
                            : s,
                    ),
                ),
                "not those of the components",
            ));
        test("entry points that are not those of the steps", () =>
            has(
                mutate((all) =>
                    all.map((s, at) =>
                        at === all.findIndex((x) => x.actions.length > 0)
                            ? { ...s, actions: [...s.actions, "block-bogus" as never] }
                            : s,
                    ),
                ),
                "not those of its steps",
            ));
        test("a container no layer carries", () => {
            const copy = setup();
            writeJson(copy.layout.targetArchitecture, {
                ...copy.target.architecture,
                containers: [{ name: "application", kind: "service", tech: "Cobol", holds: ["Core"] }],
            });
            has(evaluatePlan(copy.layout).gaps.failing, "no layer carries what container application is built with");
        });
        test("no scope decision is asked for once the target has decided it", () => {
            const copy = setup();
            writeJson(
                copy.files.decisions,
                JSON.parse(readFileSync(copy.files.decisions, "utf8")).filter(
                    (d: { topic: { _tag: string } }) => d.topic._tag !== "scope",
                ),
            );
            expect(evaluatePlan(copy.layout).gaps.failing.some((gap) => gap.includes("scope decision"))).toBe(false);
        });
    });

    describe("the jobs that write the stories", () => {
        const copy = setup();
        const request = JSON.parse(readFileSync(copy.layout.requestJson, "utf8"));
        const jobs = prepareStage(copy.layout, "stories", request, loadJobs(copy.layout));
        const ids = jobs.jobs.filter((job) => job.stage === "stories").map((job) => job.id);
        test("there is one job for the shared components and one for each journey, the journeys after the shared ones", () => {
            expect(ids.filter((id) => id.startsWith("shared-")).length).toBe(1);
            expect(ids.filter((id) => id.startsWith("journey-")).length).toBe(copy.target.journeys.length);
            for (const job of jobs.jobs.filter((each) => each.kind === "journey"))
                expect(job.after).toEqual(["shared-1"]);
        });
        const output = (id: string) => {
            const job = JSON.parse(readFileSync(jobPaths(copy.layout, id).job, "utf8")) as {
                steps?: string[];
                components?: string[];
            };
            const mine = copy.target.stories.filter((story) =>
                id.startsWith("shared-")
                    ? (story.components ?? []).includes("shared-rules")
                    : (story.steps ?? []).some((step) => (job.steps ?? []).includes(step)),
            );
            return { stories: mine };
        };
        test("the stand-in stories pass every job's gate", () => {
            for (const id of ids) {
                writeJobJson(jobPaths(copy.layout, id).output, output(id));
                expect(checkJob(copy.layout, request, id)).toEqual([]);
            }
        });
        test("a journey job refuses a story that leaves a step out, and one that builds another journey's component", () => {
            const id = ids.find((each) => each.startsWith("journey-")) as string;
            writeJobJson(jobPaths(copy.layout, id).output, { stories: [] });
            expect(checkJob(copy.layout, request, id).join(" ")).toContain("steps are in no story");
            const stolen = output(id).stories.map((story) => ({ ...story, components: ["shared-rules"] }));
            writeJobJson(jobPaths(copy.layout, id).output, { stories: stolen });
            expect(checkJob(copy.layout, request, id).join(" ")).toContain("not this job's to place");
        });
    });
});

describe("the shared tier", () => {
    const component = (name: string, extra: Record<string, unknown>) => ({
        name,
        domain: "D",
        responsibility: "x",
        module: name,
        uses: [] as string[],
        serves: [] as string[],
        enforces: [] as string[],
        ...extra,
    });
    const target = {
        journeys: [
            {
                id: "j1",
                task: "t1",
                name: "one",
                idea: "",
                drops: [],
                steps: [
                    {
                        id: "j1#1",
                        intent: "a",
                        system: "b",
                        touches: [],
                        honours: [],
                        link: { _tag: "new" as const, reason: "x" },
                    },
                ],
            },
            {
                id: "j2",
                task: "t2",
                name: "two",
                idea: "",
                drops: [],
                steps: [
                    {
                        id: "j2#1",
                        intent: "a",
                        system: "b",
                        touches: [],
                        honours: [],
                        link: { _tag: "new" as const, reason: "x" },
                    },
                ],
            },
        ],
        architecture: {
            name: "a",
            containers: [],
            components: [
                component("platform", { platform: "sign-in", uses: ["helper"] }),
                component("helper", { serves: ["j1#1"] }),
                component("own", { serves: ["j2#1"] }),
            ],
        },
        outcomes: new Map<string, string>(),
    };
    test("a component a shared one calls is shared too, so no cycle can form between the tiers", async () => {
        const { sharedTier, componentOwners } = await import("../shared/derive/target-plan");
        expect(componentOwners(target).get("helper")).toBe("j1");
        expect([...sharedTier(target)].sort()).toEqual(["helper", "platform"]);
    });
});

describe("stories that wait on each other", () => {
    test("a story caught in a cycle is split by component, each piece keeping its rules, steps and entry points", async () => {
        const { splitCycles } = await import("../shared/derive/cycles");
        const component = (name: string, uses: string[], serves: string[], enforces: string[]) => ({
            name,
            domain: "D",
            responsibility: `does ${name}`,
            module: name,
            uses,
            serves,
            enforces,
        });
        const target = {
            journeys: [
                {
                    id: "j",
                    task: "t",
                    name: "n",
                    idea: "",
                    drops: [],
                    steps: [
                        {
                            id: "j#1",
                            intent: "a",
                            system: "b",
                            touches: [],
                            honours: [],
                            link: {
                                _tag: "legacy" as const,
                                from: ["block-1"],
                                change: "kept",
                                reason: "r",
                                keeps: ["businessrule-1"],
                            },
                        },
                        {
                            id: "j#2",
                            intent: "c",
                            system: "d",
                            touches: [],
                            honours: [],
                            link: {
                                _tag: "legacy" as const,
                                from: ["block-2"],
                                change: "kept",
                                reason: "r",
                                keeps: ["businessrule-2"],
                            },
                        },
                    ],
                },
            ],
            architecture: {
                name: "a",
                containers: [],
                // x uses y; y uses z; z has no calls: acyclic as components
                components: [
                    component("x", ["y"], ["j#1"], ["businessrule-1"]),
                    component("y", ["z"], [], []),
                    component("z", [], ["j#2"], ["businessrule-2"]),
                ],
            },
            outcomes: new Map<string, string>(),
        };
        const story = (title: string, components: string[], extra: Record<string, unknown> = {}) =>
            ({
                title,
                what: "w",
                why: "y",
                actions: [],
                terms: [],
                components,
                criteria: [{ says: "Given a, when b, then c.", from: [] }],
                ...extra,
            }) as never;
        // one story builds x and z, another builds y: x waits on y (other story), y waits on z (first story): a cycle
        const mixed = story("Build x and z", ["x", "z"], {
            steps: ["j#1", "j#2"],
            actions: ["block-1", "block-2"],
            criteria: [
                { says: "Given a, when b, then c.", from: [{ _tag: "rule", id: "businessrule-1" }] },
                { says: "Given d, when e, then f.", from: [{ _tag: "rule", id: "businessrule-2" }] },
            ],
        });
        const { stories, split } = splitCycles([mixed, story("Build y", ["y"])], target as never);
        expect(split).toEqual(["Build x and z"]);
        expect(stories.length).toBe(3);
        const x = stories.find((each) => (each.components ?? [])[0] === "x");
        const z = stories.find((each) => (each.components ?? [])[0] === "z");
        expect(x?.steps).toEqual(["j#1"]);
        expect(x?.actions).toEqual(["block-1"] as never);
        expect(z?.steps).toEqual(["j#2"]);
        expect(z?.criteria.some((c) => c.from.some((ref) => ref._tag === "rule" && ref.id === "businessrule-2"))).toBe(
            true,
        );
    });
});
