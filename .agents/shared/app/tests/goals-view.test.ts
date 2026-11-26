import { expect, test } from "bun:test";
import type { Goal, MarkState } from "../compose/build/goals";
import { goalIndexOf, goalPageOf, goalsPageOf, type GoalLookups } from "../src/case/goals-view";
import { navOf, sectionIds, sectionOfPage, sectionsOf } from "../src/case/sections";
import { goalCoverageWords, goalStageWords, sectionWords } from "../src/lib/copy";

// The Goals section's parts that need no built case: the registry holds it only when the case holds goals/goals.json,
// every state a goal's mark can be in has a word, and the view follows the case's marks and links without inventing any.

const states: MarkState[] = ["considered", "settled", "notReached", "missing", "stale"];

const goal = (number: number, overrides: Partial<Goal> = {}): Goal => ({
    number,
    key: `goal/${number}`,
    text: `Goal ${number} as written, in full.`,
    label: `Goal ${number}`,
    summary: "considered",
    firstGap: null,
    marks: {
        journeys: { state: "considered", targets: ["journey/pay"] },
        architecture: { state: "considered", targets: ["domain/billing"] },
        foundation: { state: "considered", targets: ["decision/d1"] },
        stories: { state: "considered", targets: ["story/2"] },
    },
    answer: { how: "By domain.", where: [{ name: "Billing", node: "domain/billing" }] },
    decision: { node: "decision/d1", chose: "A lint rule", layer: "tooling", reason: "It fails the build." },
    stories: ["story/2"],
    epics: ["epic/e1"],
    components: ["component/invoices"],
    journeys: ["journey/pay"],
    ...overrides,
});

const lookups = (sections: string[] = ["journeys", "architecture", "plan", "goals"]): GoalLookups => ({
    journeyTitle: (slug) => (slug === "pay" ? "Pay an invoice" : undefined),
    storyTitle: (n) => (n === 2 ? "Build the billing module" : undefined),
    sections: new Set(sections),
});

const holds = (paths: string[]) => (path: string) => paths.includes(path);

test("the registry has the Goals section only when the case holds goals/goals.json, right after the overview", () => {
    const base = ["facts/system.json", "nodes/overview.json"];
    const without = sectionsOf(holds(base), "Reference").map((section) => section.id);
    expect(without).not.toContain("goals");
    const withGoals = sectionsOf(holds([...base, "goals/goals.json"]), "Reference");
    expect(withGoals.map((section) => section.id).slice(0, 3)).toEqual(["overview", "goals", "reference"]);
    expect(navOf(withGoals).find((section) => section.id === "goals")?.href).toBe("goals.html");
    expect(sectionIds).toContain("goals");
});

test("a goal's page belongs to the Goals section, and to nothing when the section is absent", () => {
    const sections = sectionsOf(holds(["facts/system.json", "nodes/overview.json", "goals/goals.json"]), "Reference");
    expect(sectionOfPage(goalPageOf(3), sections)).toBe("goals");
    expect(sectionOfPage("goals.html", sections)).toBe("goals");
    const none = sectionsOf(holds(["facts/system.json", "nodes/overview.json"]), "Reference");
    expect(sectionOfPage(goalPageOf(3), none)).toBe("reference");
});

test("the section asks the reader one question", () => {
    expect(sectionWords.goals.question).toBe("What must the new system achieve?");
});

test("every state a mark can be in has a plain word, a summary and a badge", () => {
    for (const state of states) {
        const words = goalCoverageWords[state];
        expect(words.word.length).toBeGreaterThan(0);
        expect(words.summary.length).toBeGreaterThan(0);
        expect(words.badge.startsWith("goal-")).toBe(true);
    }
    expect(Object.keys(goalCoverageWords).sort()).toEqual([...states].sort());
    expect(Object.keys(goalStageWords)).toEqual(["journeys", "architecture", "foundation", "stories"]);
});

test("no word says a goal is built, proven or met", () => {
    const text = JSON.stringify([goalCoverageWords, goalStageWords]).toLowerCase();
    for (const banned of ["built", "proven", "implemented", "delivered", " met"]) expect(text).not.toContain(banned);
});

test("the view keeps the person's words, the case's marks and links that exist", () => {
    const view = goalsPageOf({ goalsSha: "a", goals: [goal(1)] }, lookups());
    const [one] = view.goals;
    expect(one?.text).toBe("Goal 1 as written, in full.");
    expect(one?.page).toBe("goal/1.html");
    expect(one?.marks.map((mark) => mark.stage)).toEqual(["journeys", "architecture", "foundation", "stories"]);
    expect(one?.marks.map((mark) => mark.word)).toEqual(Array(4).fill("Considered"));
    expect(one?.journeys).toEqual([{ name: "Pay an invoice", href: "journey/pay.html" }]);
    expect(one?.stories).toEqual([{ name: "Build the billing module", href: "plan.html#story=2" }]);
    expect(one?.marks.map((mark) => mark.href)).toEqual(["journeys.html", "architecture.html#proposed", "goal/1.html#decision", "plan.html"]);
    expect(view.stale).toBe(false);
});

test("a link into a section the site lacks is dropped, and the mark falls back to the goal's own page", () => {
    const view = goalsPageOf({ goalsSha: "a", goals: [goal(1)] }, lookups(["goals"]));
    const [one] = view.goals;
    expect(one?.journeys[0]?.href).toBeUndefined();
    expect(one?.stories[0]?.href).toBeUndefined();
    expect(one?.marks[0]?.href).toBe("goal/1.html#stage-journeys");
    expect(one?.marks[3]?.href).toBe("goal/1.html#stage-stories");
});

test("a stale mark shows the app's line and marks the whole view stale", () => {
    const stale = goal(2, {
        summary: "stale",
        firstGap: "journeys",
        marks: {
            journeys: { state: "stale", targets: [] },
            architecture: { state: "settled", targets: [] },
            foundation: { state: "missing", targets: [] },
            stories: { state: "notReached", targets: [] },
        },
        answer: { how: "Left to the foundation.", where: [] },
    });
    const view = goalsPageOf({ goalsSha: "a", goals: [stale] }, lookups());
    expect(view.stale).toBe(true);
    const marks = view.goals[0]?.marks ?? [];
    expect(marks[0]?.word).toBe("Produced before this goal changed");
    expect(marks[0]?.line).toContain("another list of goals");
    expect(marks[1]?.line).toContain("foundation");
    expect(marks[3]?.line).toContain("no step");
    expect(view.goals[0]?.summaryWord).toBe("Produced before this goal changed");
});

test("a state the app has no word for fails the build", () => {
    const odd = goal(1);
    (odd.marks.journeys as { state: string }).state = "unknown";
    expect(() => goalsPageOf({ goalsSha: "a", goals: [odd] }, lookups())).toThrow(/no plain words/);
});

test("chips follow only the links a goal has, and a case with no goals has none", () => {
    const index = goalIndexOf({ goalsSha: "a", goals: [goal(1), goal(2, { journeys: [], stories: [], answer: null })] });
    expect(index.forJourney("pay").map((chip) => chip.number)).toEqual([1]);
    expect(index.forStory(2).map((chip) => chip.number)).toEqual([1]);
    expect(index.forPlace("Billing").map((chip) => chip.number)).toEqual([1]);
    expect(index.answered().map((chip) => chip.number)).toEqual([1]);
    expect(index.forJourney("other")).toEqual([]);
    expect(index.forPlace("Billing")[0]?.href).toBe("goal/1.html");
    const none = goalIndexOf(null);
    expect(none.answered()).toEqual([]);
    expect(none.forStory(1)).toEqual([]);
});
