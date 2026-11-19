import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import fixture from "./fixtures/contradictions.json" with { type: "json" };
import { dedupeCarriers } from "../shared/derive/carriers";
import { changedRuleProblems, ruleChangesOf, statesChange } from "../shared/derive/consistency";
import { splitCycles } from "../shared/derive/cycles";
import { CRITERION_MAX_WORDS, criterionLengthProblems, mechanicalProblems } from "../shared/derive/language";
import { componentLayer, storyLayers, type Stack } from "../shared/derive/layers";
import { headline, imperativeOf, pieceTitle } from "../shared/derive/target-plan";
import { gateJob } from "../shared/jobs/gates";
import type { Decision, Story, TargetLayer } from "../shared/model/records";
import { fingerprintOf, hashFiles } from "../shared/read/fingerprint";
import type { Target } from "../shared/read/target";

const put = (path: string, text: string) => {
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, text);
};

describe("one fingerprint of files", () => {
    test("a folder is hashed without today's journeys, a file named on its own is not, and a moved folder keeps its hash", () => {
        const a = mkdtempSync(`${tmpdir()}/print-a-`);
        const b = mkdtempSync(`${tmpdir()}/print-b-`);
        for (const root of [a, b]) put(join(root, "system.json"), "{}");
        const before = fingerprintOf(a);
        expect(fingerprintOf(b)).toBe(before);
        put(join(a, "journeys.json"), "[]");
        put(join(a, "schema", "journeys.schema.json"), "{}");
        expect(fingerprintOf(a)).toBe(before);
        expect(hashFiles([a, join(a, "journeys.json")])).not.toBe(hashFiles([a]));
        put(join(a, "system.json"), "{ }");
        expect(fingerprintOf(a)).not.toBe(before);
    });
});

describe("titles", () => {
    test("a cut title is refused: an ellipsis or a last word that waits for more", () => {
        expect(mechanicalProblems("Load policy definitions from a folder o...: Template file source adapter")).toEqual(
            [],
        );
        expect(mechanicalProblems("Load policy definitions from a folder o...").join()).toContain("ellipsis");
        expect(mechanicalProblems("Prove the journey: keep every policy and their").join()).toContain('"their"');
        expect(mechanicalProblems("Find each template and its text in the …").join()).toContain("ellipsis");
        expect(mechanicalProblems("Read what a category or policy is for")).toEqual([]);
        expect(mechanicalProblems("Let a person sign in")).toEqual([]);
    });
    test("a piece of a split story is titled by what its component does, as an imperative", () => {
        expect(imperativeOf("Finds the template files in a chosen folder")).toBe(
            "Find the template files in a chosen folder",
        );
        expect(imperativeOf("Empties the list")).toBe("Empty the list");
        expect(imperativeOf("Switches the view")).toBe("Switch the view");
        expect(imperativeOf("An adapter for files")).toBeUndefined();
        expect(
            pieceTitle(
                "Template folder scanner",
                "Finds the template files in a chosen folder and ignores everything else; reads them through the outside parser.",
            ),
        ).toBe("Find the template files in a chosen folder");
        expect(pieceTitle("Language text reader", "Reads a language file and refuses flawed ones.")).toBe(
            "Read a language file",
        );
        expect(pieceTitle("Session", "Holds the text being brought in, from a file or typed.")).toBe(
            "Hold the text being brought in",
        );
        expect(pieceTitle("Package fetcher", "After a download, the package is kept.")).toBe(
            "Build the package fetcher",
        );
        expect(headline("Keep each policy where it belongs and in the order people chose it", 8, 46)).not.toMatch(
            /\b(where|it|the)$/,
        );
    });
    test("a split story keeps its full title as splitFrom, each piece shows only the steps it builds", () => {
        const long =
            "Find each template and its text in the person's language, whatever folder they keep them in today";
        const step = (id: string, intent: string, from: string) => ({
            id,
            intent,
            system: "s",
            touches: [],
            honours: [],
            link: { _tag: "legacy" as const, from: [from], change: "kept", reason: "r", keeps: [] },
        });
        const component = (name: string, uses: string[], serves: string[], responsibility: string) => ({
            name,
            domain: "D",
            responsibility,
            module: name,
            uses,
            serves,
            enforces: [],
        });
        const target = {
            journeys: [
                {
                    id: "j",
                    task: "t",
                    name: "n",
                    idea: "",
                    drops: [],
                    steps: [step("j#1", "Choose a folder", "block-1"), step("j#2", "Read the texts", "block-2")],
                },
            ],
            architecture: {
                name: "a",
                containers: [],
                components: [
                    component("Template folder scanner", ["Middle"], ["j#1"], "Finds the template files in a folder."),
                    component("Middle", ["Language text reader"], [], "Joins what the others find."),
                    component("Language text reader", [], ["j#2"], "Reads a language file and refuses flawed ones."),
                ],
            },
            outcomes: new Map<string, string>(),
        } as unknown as Target;
        const story = {
            title: long.slice(0, 72),
            what: "w",
            why: "y",
            actions: ["block-1", "block-2"],
            terms: [],
            steps: ["j#1", "j#2"],
            components: ["Template folder scanner", "Language text reader"],
            journey: { name: "Find templates", steps: ["Choose a folder", "Read the texts"] },
            criteria: [{ says: "Given a, when b, then c.", from: [] }],
        } as unknown as Story;
        const other = { ...story, title: "Join", steps: [], actions: [], components: ["Middle"] } as unknown as Story;
        delete (other as { journey?: unknown }).journey;
        const { stories } = splitCycles([story, other], target);
        const pieces = stories.filter((piece) => piece.part !== undefined);
        expect(pieces.map((piece) => piece.title)).toEqual([
            "Find the template files in a folder",
            "Read a language file",
        ]);
        for (const piece of pieces) {
            expect(piece.splitFrom).toBe(story.title);
            expect(piece.part).toBe(piece.components?.[0]);
            expect(mechanicalProblems(piece.title)).toEqual([]);
            expect(piece.journey?.steps.length).toBe(piece.steps?.length);
        }
        expect(pieces[1]?.journey?.steps).toEqual(["Read the texts"] as never);
    });
});

describe("criteria", () => {
    const words = (n: number) => `Given ${Array.from({ length: n - 1 }, () => "word").join(" ")}`;
    test(`a criterion over ${CRITERION_MAX_WORDS} words is refused where it is written`, () => {
        expect(criterionLengthProblems([words(60)])).toEqual([]);
        expect(criterionLengthProblems([words(61)]).join()).toContain("61 words");
        const story = {
            title: "Keep the shared rules",
            what: "w",
            why: "y",
            actions: [],
            terms: [],
            criteria: [{ says: words(61), from: [{ _tag: "rule", id: "r1" }] }],
        };
        expect(gateJob({ kind: "shared", shared: ["r1"] }, { stories: [story] }, { stack: [] }).join()).toContain(
            "over 60",
        );
    });

    describe("a criterion resting on a rule a journey step changes", () => {
        const cases = fixture.cases;
        const changes = new Map(cases.map((each) => [each.rule, [{ step: each.step, to: each.to }]]));
        test("each of the 11 contradictions found in the Policy Plus plan is caught", () => {
            expect(cases.length).toBe(11);
            for (const each of cases) {
                const problems = changedRuleProblems([{ says: each.says, from: each.from } as never], changes);
                expect(problems.some((problem) => problem.includes("but not the step"))).toBe(true);
            }
            // The statement check alone sees 7 of them; the other 4 share enough words with the new behaviour to pass it,
            // so the cited step is what makes the check sure.
            const unsaid = cases.filter((each) => !statesChange(each.says, each.to));
            expect(unsaid.length).toBe(7);
        });
        test("one that cites the step and says what the rule does now passes", () => {
            for (const each of cases) {
                const fixed = {
                    says: `Given the person is on the step, when it runs, then ${each.to.charAt(0).toLowerCase()}${each.to.slice(1)}`,
                    from: [...each.from, { _tag: "step", id: each.step }],
                };
                expect(changedRuleProblems([fixed as never], changes)).toEqual([]);
            }
        });
        test("the journey job refuses it, and the changes are read from the target's steps", () => {
            const target = {
                journeys: [
                    {
                        steps: [
                            { id: "j#1", changes: [{ rule: "r1", to: "Says plainly when a quote was never closed." }] },
                        ],
                    },
                ],
            } as unknown as Target;
            const read = ruleChangesOf(target);
            expect(read.get("r1")).toEqual([{ step: "j#1", to: "Says plainly when a quote was never closed." }]);
            const story = (from: unknown[], says: string) => ({
                title: "Find policies by words",
                what: "w",
                why: "y",
                actions: [],
                terms: [],
                steps: ["j#1"],
                components: ["c"],
                criteria: [{ says, from }],
            });
            const job = {
                kind: "journey" as const,
                steps: ["j#1"],
                components: ["c"],
                cite: ["r1"],
                componentRules: { c: ["r1"] },
                ruleChanges: { r1: [...(read.get("r1") ?? [])] },
            };
            const old = gateJob(
                job,
                {
                    stories: [
                        story(
                            [{ _tag: "rule", id: "r1" }],
                            "Given an open quote, when searching, then the phrase is left out.",
                        ),
                    ],
                },
                { stack: [] },
            );
            expect(old.join()).toContain("but not the step");
            const now = gateJob(
                job,
                {
                    stories: [
                        story(
                            [
                                { _tag: "rule", id: "r1" },
                                { _tag: "step", id: "j#1" },
                            ],
                            "Given an open quote, when searching, then the search says plainly the quote was never closed.",
                        ),
                    ],
                },
                { stack: [] },
            );
            expect(now).toEqual([]);
        });
    });
});

describe("the stack", () => {
    const layer = (id: string, path: string, extra: Partial<TargetLayer> = {}) =>
        ({
            id,
            name: id,
            path,
            kind: "code",
            purpose: "p",
            carries: [1],
            check: "c",
            dependsOn: [],
            ...extra,
        }) as TargetLayer;
    const layers = [
        layer("contracts", "packages/contracts", { role: "contracts" }),
        layer("domain", "packages/domain", { role: "rules", dependsOn: ["contracts"] as never }),
        layer("api", "apps/api", { role: "service", container: "app", dependsOn: ["domain"] as never }),
        layer("ui", "packages/ui", { role: "ui-kit" }),
        layer("e2e", "apps/e2e", { kind: "test" }),
    ];
    const decisions = [
        { id: "d1", topic: { _tag: "integration", system: "File system" }, layer: "api", chose: "c", reason: "r" },
        { id: "d2", topic: { _tag: "area", name: "libraries" }, layer: "workspace", chose: "c", reason: "r" },
        { id: "d3", topic: { _tag: "convention" }, layer: "domain", chose: "c", reason: "r" },
    ] as unknown as Decision[];
    const component = (name: string, extra: Record<string, unknown>) => ({
        name,
        domain: "Core",
        responsibility: "r",
        module: name,
        uses: [],
        serves: [],
        enforces: [],
        ...extra,
    });
    const target = {
        journeys: [],
        architecture: {
            name: "a",
            containers: [{ name: "app", kind: "interface", tech: "t", holds: ["Core"] }],
            components: [
                component("Text Terms Parser", { kind: "rules" }),
                component("File adapter", { adapts: "external-1" }),
                component("Unknown", {}),
            ],
        },
        outcomes: new Map(),
    } as unknown as Target;
    const stack: Stack = { layers, decisions, target, externals: [{ id: "external-1", name: "File system" }] };
    test("a component is built in the layer its kind needs, an adapter where its outside system is decided, else nowhere", () => {
        expect(componentLayer("Text Terms Parser", stack)?.path).toBe("packages/domain");
        expect(componentLayer("File adapter", stack)?.path).toBe("apps/api");
        expect(componentLayer("Unknown", stack)).toBeUndefined();
    });
    test("a story's layers: the test layer for an acceptance story, the layers its decisions and refs name", () => {
        const story = (from: unknown[], components: string[] = []) =>
            ({
                title: "t",
                what: "w",
                why: "y",
                actions: [],
                terms: [],
                components,
                criteria: [{ says: "s", from }],
            }) as never;
        expect(storyLayers(story([]), { scaffold: false, acceptance: true }, stack)).toEqual(["e2e"] as never);
        expect(
            storyLayers(
                story([
                    { _tag: "decision", id: "d3" },
                    { _tag: "decision", id: "d2" },
                    { _tag: "layer", id: "contracts" },
                ]),
                { scaffold: false, acceptance: false },
                stack,
            ),
        ).toEqual(["contracts", "domain"] as never);
        expect(storyLayers(story([], ["Text Terms Parser"]), { scaffold: false, acceptance: false }, stack)).toEqual([
            "domain",
        ] as never);
        expect(storyLayers(story([]), { scaffold: true, acceptance: false }, stack).length).toBe(layers.length);
    });
    test("each outside system is built once: what a foundation story says about an adapted system moves to the adapter's story", () => {
        const foundation = {
            title: "Read and write files on the machine",
            what: "w",
            why: "y",
            actions: [],
            terms: [],
            criteria: [
                { says: "Given a folder, when read, then listed.", from: [{ _tag: "decision", id: "d1" }] },
                { says: "Given a path, when used, then checked.", from: [{ _tag: "decision", id: "d3" }] },
            ],
        } as unknown as Story;
        const adapter = {
            title: "Reach the files",
            what: "w",
            why: "y",
            actions: [],
            terms: [],
            components: ["File adapter"],
            criteria: [{ says: "Given x, when y, then z.", from: [] }],
        } as unknown as Story;
        const { stories, moved } = dedupeCarriers([foundation, adapter], decisions, target, stack.externals);
        expect(stories.length).toBe(1);
        expect(stories[0]?.criteria.length).toBe(3);
        expect(moved.join()).toContain("not built twice");
        const kept = {
            ...foundation,
            criteria: [
                ...foundation.criteria,
                { says: "Given a, when b, then c.", from: [{ _tag: "layer", id: "api" }] },
            ],
        } as unknown as Story;
        const partly = dedupeCarriers([kept, adapter], decisions, target, stack.externals).stories;
        expect(partly.length).toBe(2);
        expect(partly[0]?.criteria.length).toBe(2);
        expect(partly[1]?.criteria.length).toBe(2);
    });
    test("the layers job refuses a part the architecture does not have, and two layers with one role in one part", () => {
        const gaps = gateJob(
            { kind: "layers", containers: ["app"] },
            {
                layers: [
                    layer("api", "apps/api", { role: "service", container: "app", carries: [] }),
                    layer("web", "apps/web", { role: "service", container: "app", carries: [] }),
                    layer("x", "apps/x", { container: "elsewhere", carries: [] }),
                ],
            },
            { stack: [] },
        );
        expect(gaps.join()).toContain("does not have: elsewhere");
        expect(gaps.join()).toContain("two layers are the service of app");
    });
});
