import { describe, expect, test } from "bun:test";
import { confirmCommand, statesOf } from "../src/lib/confirmation";
import { draw } from "../src/lib/target-diagram";
import { changeKinds, metricsOf, todayOf } from "../src/lib/target-text";
import { components, containers, context, domainMap, erd, integration } from "../src/lib/target-views";
import type { Architecture, Journey, Task } from "../src/lib/target-types";

const architecture: Architecture = {
    name: "split",
    idea: "interface apart from service",
    risks: ["more parts"],
    tradeoff: "more to run",
    integrations: [{ need: "x1", domain: "Templates", how: "reads a folder" }],
    domains: [
        { name: "Policies", concept: "policies", facts: [{ name: "Policy", from: ["e1"], keys: ["name"], relates: [{ to: "Template", how: "defined by" }] }], rules: ["r1"], dependsOn: ["Templates"], why: "x" },
        { name: "Templates", concept: "templates", facts: [{ name: "Template", from: ["e2"], keys: ["file"], relates: [] }], rules: ["r2"], dependsOn: [], why: "x" },
    ],
    containers: [
        { name: "interface", kind: "interface", tech: "TypeScript", holds: ["Policies"] },
        { name: "service", kind: "service", tech: "TypeScript", holds: ["Templates"] },
    ],
    components: [
        { name: "policy-service", domain: "Policies", responsibility: "shows policies", module: "policy-service", uses: ["template-reader"], serves: ["s1"], enforces: ["r1"] },
        { name: "template-reader", domain: "Templates", responsibility: "reads templates", module: "template-reader", uses: [], serves: ["s2"], enforces: ["r2"], adapts: "x1" },
    ],
};
const journey: Journey = {
    id: "t1:one", task: "t1", actor: "person", name: "one", strategy: "task first", idea: "i", tradeoff: "t", baseline: false, drops: [],
    steps: [{ id: "s1", intent: "Review", system: "Shows", confidence: "sure", touches: ["e1"], honours: ["r1"], link: { _tag: "legacy", from: ["a1", "a2"], change: "merged", reason: "r", keeps: ["r1"] } }],
};
const task: Task = {
    id: "t1", outcome: "o", actor: "person", actions: ["a1", "a2"], rules: ["r1", "r2"], facts: ["e1"], needs: [],
    current: [
        { intent: "a", system: "b", from: ["a1"], confidence: "sure" },
        { intent: "c", system: "d", from: ["a2"], confidence: "sure" },
    ],
};

describe("the views drawn from the records", () => {
    test("domains and containers follow the dependencies", () => {
        expect(domainMap(architecture).edges).toEqual([{ from: "Policies", to: "Templates", label: "relies on" }]);
        expect(containers(architecture).edges).toEqual([{ from: "interface", to: "service", label: "calls" }]);
    });
    test("the context names actors and outside systems; the components view shows what lies outside the container", () => {
        const c1 = context(architecture, [journey], undefined);
        expect(c1.nodes.map((node) => node.id)).toEqual(["system", "actor:person", "outside:x1"]);
        const c3 = components(architecture, "interface");
        expect(c3.nodes.find((node) => node.id === "template-reader")?.kind).toBe("other");
        expect(integration(architecture, undefined).nodes.length).toBe(2);
    });
    test("the data of a journey marks the owner and greys the others", () => {
        const view = erd(architecture, journey);
        expect(view.nodes.find((node) => node.id === "Policy")?.kind).toBe("primary");
        expect(view.nodes.find((node) => node.id === "Template")?.kind).toBe("other");
    });
    test("a diagram is drawn as one svg", async () => {
        const svg = await draw(containers(architecture));
        expect(svg.startsWith("<svg")).toBe(true);
        expect(svg).toContain("interface");
        expect(await draw({ title: "x", nodes: [], edges: [] })).toBe("");
    });
});

describe("the comparison", () => {
    test("a step names the steps of today it takes the place of, and the metrics are mechanical", () => {
        const step = journey.steps[0];
        expect(step && todayOf(task, step)).toEqual([1, 2]);
        expect(metricsOf(task, journey)).toEqual({ today: 2, steps: 1, dropped: 0, rulesKept: 1, rulesTotal: 2 });
        expect(changeKinds(journey)).toEqual([["merged", 1]]);
    });
});

describe("where the decisions stand", () => {
    const seen = (proposal: number | undefined, record: number | undefined) => ({ proposal, record });
    test("each decision is confirmed while its record is not older than its proposal and the proposal is not older than the decision before", () => {
        expect(Object.values(statesOf({ "as-is": seen(1, 2), journeys: seen(3, 4), architecture: seen(5, 6), components: seen(7, 8) }))).toEqual(["confirmed", "confirmed", "confirmed", "confirmed"]);
        expect(statesOf({ "as-is": seen(1, 2), journeys: seen(3, 4), architecture: seen(5, 6), components: seen(7, undefined) }).components).toBe("waiting");
        expect(statesOf({ "as-is": seen(1, 2), journeys: seen(3, 4), architecture: seen(9, 6), components: seen(7, 8) }).architecture).toBe("changed");
        expect(statesOf({ "as-is": seen(1, 2), journeys: seen(3, 4), architecture: seen(9, 6), components: seen(7, 8) }).components).toBe("blocked");
        expect(statesOf({ "as-is": seen(1, 5), journeys: seen(3, 6), architecture: seen(undefined, undefined), components: seen(undefined, undefined) }).journeys).toBe("changed");
        expect(statesOf({ "as-is": seen(1, 2), journeys: seen(undefined, undefined), architecture: seen(undefined, undefined), components: seen(undefined, undefined) }).journeys).toBe("not made");
    });
    test("the command that confirms a decision names the decision", () => {
        expect(confirmCommand("components", "/run", "bun choose.ts")).toBe('bun choose.ts components /run --reason "<why>"');
    });
});
