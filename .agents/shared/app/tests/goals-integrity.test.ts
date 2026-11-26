import { expect, test } from "bun:test";
import { caseProblems } from "../src/case/integrity";
import type { Case } from "../src/case/read";

// The loader's check of the goals file: every goal is a node, numbered in order, and every link names a story, epic,
// journey, domain or decision the case holds.

const node = (key: string, level: string, up: string | null = null) => ({
    key,
    level,
    name: key,
    summary: key,
    noun: { one: level, many: level },
    ref: null,
    crumbs: key === "overview" ? [] : ["overview"],
    up,
    prev: null,
    next: null,
    facts: [],
    children: { level: null, rows: [] },
    folds: [],
    lateral: [],
});

const goal = (over: Record<string, unknown> = {}) => ({
    number: 1,
    key: "goal/1",
    stories: ["story/1"],
    epics: ["epic/area:core"],
    journeys: ["journey/place-order"],
    decision: { node: "decision/d1" },
    marks: { architecture: { targets: ["domain/orders", "container/service"] } },
    answer: { where: [{ name: "Orders", node: "domain/orders" }] },
    ...over,
});

const caseOf = (goals: unknown[], nodes = [node("overview", "overview"), node("goal/1", "goal", "overview")]): Case => {
    const files: Record<string, unknown> = {
        "nodes/overview.json": [nodes[0]],
        "nodes/goal.json": nodes.slice(1),
        "goals/goals.json": { goals },
        "plan/stories.json": [{ sequence: 1 }],
        "plan/epics.json": [{ key: "area:core" }],
        "plan/decisions.json": [{ id: "d1" }],
        "journeys/proposed.json": [{ slug: "place-order" }],
        "architecture.json": { domains: [{ slug: "orders" }] },
    };
    return { dir: "", files: new Map(), has: (path) => path in files, json: (path) => files[path] };
};

test("goals whose links all resolve raise no problem", () => {
    expect(caseProblems(caseOf([goal()]))).toEqual([]);
});

test("a link to a story, epic, journey, domain or decision the case lacks is named", () => {
    const problems = caseProblems(
        caseOf([
            goal({
                stories: ["story/9"],
                epics: ["epic/none"],
                journeys: ["journey/none"],
                decision: { node: "decision/none" },
                marks: { architecture: { targets: ["domain/none"] } },
                answer: null,
            }),
        ]),
    );
    expect(problems).toHaveLength(5);
    expect(problems.every((problem) => problem.startsWith("goal 1 links "))).toBe(true);
});

test("a goal out of place, or with no node, is named", () => {
    expect(caseProblems(caseOf([goal({ number: 2, key: "goal/2" })]))).toEqual(
        expect.arrayContaining([expect.stringContaining("goals are numbered from 1 in order"), expect.stringContaining("goal/2 is not held")]),
    );
});
