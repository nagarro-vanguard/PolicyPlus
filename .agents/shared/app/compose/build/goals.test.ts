import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PlanInput } from "../inputs/plan";
import { readRequest } from "../inputs/plan";
import type { Target } from "../inputs/target";
import { goalsSha } from "../io";
import { attachGoals, goalNodes, goalsOf, labelOf, type GoalInputs } from "./goals";
import type { ArchitectureView, ProposedJourney } from "./journeys";
import { criterionOf, type PlanViews } from "./plan-views";
import { Slugs } from "./text";

const goals = ["Divide by domain: one job each.", "Type every interface.", "Keep the service independent."];
const sha = goalsSha(goals);

const architecture = {
    confirmed: true,
    domains: [
        { name: "Orders", slug: "orders" },
        { name: "Billing", slug: "billing" },
    ],
    containers: [{ name: "Service", holds: ["Orders"] }],
    components: [
        { name: "Order flow", domain: "Orders", serves: ["step-1"] },
        { name: "Invoice rules", domain: "Billing", serves: [] },
    ],
} as unknown as ArchitectureView;

const proposed = [{ slug: "place-order", steps: [{ id: "step-1" }] }] as unknown as ProposedJourney[];

const answers = [
    { goal: 1, how: "Domains are modules.", where: ["Orders"] },
    { goal: 2, how: "Settled in the foundation.", where: [] },
    { goal: 3, how: "A container of its own.", where: ["Billing"] },
];

const target = (over: Partial<Pick<Target, "goalsStamps">> & { answers?: typeof answers } = {}) =>
    ({
        journeys: [{ id: "j" }],
        architecture: { goals: over.answers ?? answers },
        goalsStamps: over.goalsStamps ?? { journeys: sha, architecture: sha },
    }) as unknown as Target;

const plan = (stamp: string | null = sha) =>
    ({
        plan: {
            goalsSha: stamp ?? undefined,
            decisions: [
                { id: "d1", layer: "workspace", chose: "a", reason: "b", topic: { _tag: "goal", number: 1 } },
                { id: "d2", layer: "workspace", chose: "c", reason: "d", topic: { _tag: "goal", number: 2 } },
                { id: "x", layer: "workspace", chose: "e", reason: "f", topic: { _tag: "layer" } },
            ],
        },
    }) as unknown as PlanInput;

const story = (sequence: number, from: { kind: string; id: string }[]) => ({
    key: `s${sequence}`,
    sequence,
    epic: "area:core",
    criteria: [{ from }],
});
const views = {
    stories: [story(1, [{ kind: "goal", id: "1" }]), story(2, [{ kind: "decision", id: "d2" }]), story(3, [{ kind: "rule", id: "r" }])],
} as unknown as PlanViews;

const inputs = (over: Partial<GoalInputs> = {}): GoalInputs => ({
    request: { goals, stack: [] },
    target: target(),
    plan: plan(),
    architecture,
    proposed,
    views,
    slugs: new Slugs(),
    ...over,
});

const states = (view: ReturnType<typeof goalsOf>, number: number) =>
    Object.fromEntries(Object.entries(view?.goals[number - 1]?.marks ?? {}).map(([stage, mark]) => [stage, mark.state]));

describe("labelOf", () => {
    test("takes the first clause and at most eight words", () => {
        expect(labelOf("Colocate by feature: a feature's route sits with its tests")).toBe("Colocate by feature");
        expect(labelOf("Handle errors through typed domain errors mapped to HTTP responses")).toBe(
            "Handle errors through typed domain errors mapped",
        );
        expect(labelOf("Type every `any` interface, always.")).toBe("Type every any interface, always");
    });
    test("never ends on a word that stops mid-phrase", () => {
        expect(labelOf("Carry the existing tests forward, colocated with the code they test")).toBe(
            "Carry the existing tests forward, colocated",
        );
    });
});

describe("goalsOf", () => {
    test("none without a request or without goals", () => {
        expect(goalsOf(inputs({ request: undefined }))).toBeUndefined();
        expect(goalsOf(inputs({ request: { goals: [], stack: [] } }))).toBeUndefined();
    });

    test("each stage that holds the goal considered it; settled in the foundation counts as considered", () => {
        const view = goalsOf(inputs());
        expect(view?.goalsSha).toBe(sha);
        expect(states(view, 1)).toEqual({ journeys: "considered", architecture: "considered", foundation: "considered", stories: "considered" });
        expect(view?.goals[0]).toMatchObject({
            key: "goal/1",
            summary: "considered",
            firstGap: null,
            components: ["component/order-flow"],
            journeys: ["journey/place-order"],
            stories: ["story/1"],
            decision: { node: "decision/d1" },
        });
        expect(states(view, 2)).toEqual({ journeys: "settled", architecture: "settled", foundation: "considered", stories: "considered" });
        expect(view?.goals[1]?.summary).toBe("considered");
    });

    test("a goal a stage lacks is missing and names the first stage that is", () => {
        const view = goalsOf(inputs());
        expect(states(view, 3)).toEqual({ journeys: "notReached", architecture: "considered", foundation: "missing", stories: "missing" });
        expect(view?.goals[2]).toMatchObject({ summary: "missing", firstGap: "foundation", decision: null, stories: [] });
        expect(view?.goals[2]?.answer?.where).toEqual([{ name: "Billing", node: "domain/billing" }]);
    });

    test("a container's answer reaches the domains it holds and a place that is neither has no node", () => {
        const view = goalsOf(
            inputs({ target: target({ answers: [{ goal: 1, how: "x", where: ["Service", "Nowhere"] }, ...answers.slice(1)] }) }),
        );
        expect(view?.goals[0]?.journeys).toEqual(["journey/place-order"]);
        expect(view?.goals[0]?.answer?.where.map((place) => place.node)).toEqual(["container/service", null]);
    });

    test("a stage finished with other goals is stale, and so is one that kept no stamp", () => {
        const other = goalsSha(goals.slice(1));
        const staleArchitecture = goalsOf(inputs({ target: target({ goalsStamps: { journeys: sha, architecture: other } }) }));
        expect(states(staleArchitecture, 1)).toMatchObject({ journeys: "considered", architecture: "stale" });
        expect(staleArchitecture?.goals[0]).toMatchObject({ summary: "stale", firstGap: "architecture" });
        const none = goalsOf(inputs({ target: target({ goalsStamps: { journeys: undefined, architecture: undefined } }), plan: plan(null) }));
        for (const goal of none?.goals ?? []) {
            expect(Object.values(goal.marks).map((mark) => mark.state)).toEqual(["stale", "stale", "stale", "stale"]);
            expect(goal.firstGap).toBe("journeys");
        }
    });

    test("an unfinished target or plan is missing, never an error", () => {
        const view = goalsOf(inputs({ target: undefined, plan: undefined, architecture: undefined, proposed: [], views: undefined }));
        expect(states(view, 1)).toEqual({ journeys: "missing", architecture: "missing", foundation: "missing", stories: "missing" });
        const proposedOnly = goalsOf(inputs({ architecture: { ...architecture, confirmed: false } }));
        expect(states(proposedOnly, 1).journeys).toBe("missing");
    });

    test("an answer that names places no step reaches is not reached, not missing", () => {
        const view = goalsOf(inputs({ architecture: { ...architecture, components: [] } }));
        expect(states(view, 1).journeys).toBe("notReached");
        expect(view?.goals[0]?.summary).toBe("considered");
    });
});

describe("goal nodes and the overview", () => {
    test("one node per goal, in order, and the gaps lead the check-first fold", () => {
        const view = goalsOf(inputs());
        if (view === undefined) throw new Error("no goals");
        const nodes = goalNodes(view);
        expect(nodes.map((node) => [node.key, node.prev, node.next, node.up])).toEqual([
            ["goal/1", null, "goal/2", "overview"],
            ["goal/2", "goal/1", "goal/3", "overview"],
            ["goal/3", "goal/2", null, "overview"],
        ]);
        expect(nodes[0]).toMatchObject({ level: "goal", summary: goals[0], noun: { one: "goal", many: "goals" } });
        const map = new Map([
            ["overview", { key: "overview", folds: [{ kind: "checkFirst", rows: [{ text: "risk" }] }] }],
        ]) as unknown as Parameters<typeof attachGoals>[0];
        attachGoals(map, view);
        expect(map.has("goal/3")).toBe(true);
        expect((map.get("overview")?.folds[0]?.rows ?? []).map((row) => row.node ?? row.text)).toEqual(["goal/3", "risk"]);
    });
});

describe("criteria and the request", () => {
    test("a goal reference carries its number as its id", () => {
        expect(criterionOf("Says.", [{ _tag: "goal", number: 2 }, { _tag: "rule", id: "r1" }]).from).toEqual([
            { kind: "goal", id: "2" },
            { kind: "rule", id: "r1" },
        ]);
    });

    test("the request's goals are a list, kept verbatim, and none when absent", () => {
        const dir = mkdtempSync(join(tmpdir(), "goals-request-"));
        writeFileSync(join(dir, "request.json"), JSON.stringify({ goals: [" Keep it. ", ""], stack: ["a"] }));
        expect(readRequest(dir)).toEqual({ goals: [" Keep it. "], stack: ["a"] });
        writeFileSync(join(dir, "request.json"), JSON.stringify({ stack: ["a"] }));
        expect(readRequest(dir)?.goals).toEqual([]);
    });
});

describe("the stamp", () => {
    test("is the sha256 of the JSON of the goals in order, and moves with order and words", () => {
        expect(goalsSha(["a", "b"])).not.toBe(goalsSha(["b", "a"]));
        expect(goalsSha(["a", "b"])).toMatch(/^[0-9a-f]{64}$/);
    });
});
