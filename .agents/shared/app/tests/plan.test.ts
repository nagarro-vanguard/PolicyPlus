import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { isPlanPage, pathNamesRecordId, planFindings, visibleText } from "../src/lib/language";
import {
    blockersOf,
    coverageTree,
    decisionsByTopic,
    epicPath,
    epicsBefore,
    epicsInOrder,
    phasesWithStories,
    planProblems,
    previewFolder,
    progressOf,
    reliedOn,
    statusOf,
    storiesInOrder,
    storyPath,
    subjectOf,
} from "../src/lib/plan";
import type { Ledger, Plan, PlanStory, Prompts } from "../src/lib/plan";
import { planSearchEntries } from "../src/lib/plan-search";
import { copy } from "../src/lib/copy";

const story = (n: number, extra: Partial<PlanStory> = {}): PlanStory => ({
    key: `story-00000000000${n}`,
    title: `Do thing ${n}, part ${n}`,
    what: "a thing",
    why: "a reason",
    actions: [],
    terms: [],
    criteria: [{ says: "Given a, when b, then c." }],
    sequence: n,
    phase: 1,
    epic: "area:one",
    kind: "technical",
    builder: "shape-and-deliver",
    tags: ["story", "technical"],
    blockedBy: [],
    builds: [],
    reliesOn: [],
    ...extra,
});

// Stories deliberately out of order in the plan, to show that the order is the sequence, never the position.
const stories = [
    story(3, { phase: 2, epic: "area:two", blockedBy: ["story-000000000001", "story-000000000002"], builds: ["r1", "r2", "r3"], reliesOn: [{ rule: "r9", builtBy: "story-000000000001" }, { rule: "r8", builtBy: "story-000000000001" }, { rule: "r7", builtBy: "story-000000000002" }] }),
    story(1, { builds: ["r4"] }),
    story(2, { builds: ["r5", "r6"] }),
];
const plan: Plan = {
    layers: [
        { id: "layer-a", name: "Web screens", path: "layers/web", kind: "code", purpose: "p", check: "true", dependsOn: [] },
        { id: "layer-b", name: "Data", path: "layers/data", kind: "code", purpose: "p", check: "true", dependsOn: ["layer-a"] },
    ],
    decisions: [
        { id: "d1", topic: { _tag: "convention" }, layer: "layer-a", chose: "line", reason: "r" },
        { id: "d2", topic: { _tag: "scope", capability: "Finding things" }, layer: "workspace", chose: "carry", reason: "r" },
        { id: "d3", topic: { _tag: "integration", system: "Mail" }, layer: "workspace", chose: "keep", reason: "r" },
        { id: "d4", topic: { _tag: "scope", capability: "Saving things" }, layer: "workspace", chose: "replace", reason: "r" },
        { id: "d5", topic: { _tag: "area", name: "libraries" }, layer: "workspace", chose: "some", reason: "r" },
    ],
    epics: [
        { key: "area:two", kind: "functional", title: "Carry over two", outcome: "o", comesAfter: ["area:one"], stories: ["story-000000000003"], sequence: 2 },
        { key: "area:one", kind: "technical", title: "Set up one", outcome: "o", comesAfter: [], stories: ["story-000000000001", "story-000000000002"], sequence: 1 },
    ],
    phases: [
        { number: 2, name: "Later", why: "w", stories: ["story-000000000003"] },
        { number: 1, name: "First", why: "w", stories: ["story-000000000002", "story-000000000001"] },
    ],
    stories,
    coverage: {
        capabilities: [
            {
                name: "Finding things",
                scope: "carry",
                surfaces: [
                    { name: "Main", actions: [{ id: "a1", name: "x", story: "story-000000000002" }, { id: "a2", name: "y", story: "story-000000000001" }, { id: "a3", name: "z", story: "story-000000000002" }] },
                    { name: "Entry points without a window", actions: [{ id: "a4", name: "w", story: "story-000000000003" }] },
                ],
            },
        ],
        rulesBuilt: 6,
        rulesTotal: 6,
        unplanned: [],
    },
};
const prompts: Prompts = {
    epics: { "area:one": "e1", "area:two": "e2" },
    scaffold: "s",
    deliver: { "story-000000000001": "d1", "story-000000000002": "d2", "story-000000000003": "d3" },
};

describe("addresses", () => {
    test("a story's address is its sequence and a slug of its title, never its key", () => {
        expect(storyPath(story(12, { title: "Set up libraries" }))).toBe("plan/story/012-set-up-libraries");
        expect(storyPath(story(4, { title: "Carry over Q&A: it's here, now!" }))).toBe("plan/story/004-carry-over-q-a-it-s-here-now");
        expect(storyPath(stories[0] as PlanStory)).not.toContain("story-0");
    });
    test("an epic's address is its place and a slug of its title", () => {
        expect(epicPath({ sequence: 5, title: "Carry over Finding policies" })).toBe("plan/epic/05-carry-over-finding-policies");
    });
    test("no address names a record id", () => {
        for (const each of [...plan.stories.map(storyPath), ...plan.epics.map(epicPath)]) expect(pathNamesRecordId(each)).toBe(false);
    });
    test("the addresses of a plan are all different", () => {
        expect(planProblems(plan, prompts)).toEqual([]);
        const same = { ...plan, stories: [...stories, story(3, { key: "story-000000000009" })] };
        expect(planProblems(same, { ...prompts, deliver: { ...prompts.deliver, "story-000000000009": "x" } })).toContain("two pages would share an address");
    });
});

describe("ordering", () => {
    test("stories and epics are in sequence whatever order the plan holds them in", () => {
        expect(storiesInOrder(plan).map((each) => each.sequence)).toEqual([1, 2, 3]);
        expect(epicsInOrder(plan).map((each) => each.key)).toEqual(["area:one", "area:two"]);
    });
    test("phases come in number order, each with its stories in sequence", () => {
        const phases = phasesWithStories(plan);
        expect(phases.map((phase) => phase.number)).toEqual([1, 2]);
        expect(phases[0]?.stories.map((each) => each.sequence)).toEqual([1, 2]);
    });
    test("an epic names the epics that must be created before it, and the one just before", () => {
        const second = plan.epics.find((epic) => epic.key === "area:two");
        const before = epicsBefore(plan, second as never);
        expect(before.first.map((epic) => epic.key)).toEqual(["area:one"]);
        expect(before.previous?.key).toBe("area:one");
        expect(epicsBefore(plan, plan.epics.find((epic) => epic.key === "area:one") as never)).toEqual({ first: [], previous: undefined });
    });
    test("blockers are stories in sequence; reliance is counted per building story", () => {
        const third = stories[0] as PlanStory;
        expect(blockersOf(plan, third).map((each) => each.sequence)).toEqual([1, 2]);
        expect(reliedOn(plan, third).map((each) => [each.story.sequence, each.rules])).toEqual([[1, 2], [2, 1]]);
    });
});

describe("grouping", () => {
    test("decisions are grouped by topic in a fixed order, each in the plan's order, empty topics left out", () => {
        const groups = decisionsByTopic(plan.decisions);
        expect(groups.map((group) => group.topic)).toEqual(["scope", "integration", "convention", "area"]);
        expect(groups[0]?.decisions.map((each) => each.id)).toEqual(["d2", "d4"]);
    });
    test("a decision's subject is read from its topic", () => {
        expect(plan.decisions.map((each) => subjectOf(each, "Web screens"))).toEqual(["Web screens", "Finding things", "Mail", "Saving things", "libraries"]);
    });
    test("a layer's preview folder is the slug of its name", () => {
        expect(previewFolder({ name: "Web screens" })).toBe("web-screens");
    });
    test("the coverage tree groups each surface's actions under the stories that build them, with counts", () => {
        const [capability] = coverageTree(plan);
        expect(capability?.actions).toBe(4);
        expect(capability?.stories).toBe(3);
        const main = capability?.surfaces[0];
        expect(main?.stories.map((entry) => [entry.story.sequence, entry.actions.length])).toEqual([[1, 1], [2, 2]]);
        expect(main?.without).toEqual([]);
    });
});

describe("progress", () => {
    const ledger: Ledger = { items: { "story-000000000001": { status: "merged" }, "story-000000000003": { status: "merged" }, "story-000000000002": { status: "blocked" } } };
    test("stories are counted by ledger status and a story the ledger lacks is planned", () => {
        const progress = progressOf(plan, ledger);
        expect(progress.byStatus.merged).toBe(2);
        expect(progress.byStatus.blocked).toBe(1);
        expect(progress.byStatus.planned).toBe(0);
        expect(statusOf(ledger, "story-nothing")).toBe("planned");
        expect(progressOf(plan, undefined).byStatus.planned).toBe(3);
    });
    test("legacy rules are those built by merged stories over the total", () => {
        const progress = progressOf(plan, ledger);
        expect(progress.rulesBuilt).toBe(4);
        expect(progress.rulesTotal).toBe(6);
        expect(progressOf(plan, undefined).rulesBuilt).toBe(0);
    });
    test("a phase counts only its own stories", () => {
        const first = phasesWithStories(plan)[0];
        expect(progressOf(plan, ledger, first?.stories).merged).toBe(1);
    });
});

describe("checks on a plan", () => {
    test("a missing prompt, an unknown story and an unplanned action of a carried capability are each named", () => {
        const none = planProblems(plan, { ...prompts, epics: {}, deliver: {} });
        expect(none.filter((each) => each.includes("has no prompt")).length).toBe(5);
        const broken: Plan = { ...plan, epics: [{ ...(plan.epics[0] as Plan["epics"][number]), stories: ["story-nope"] }, plan.epics[1] as Plan["epics"][number]] };
        expect(planProblems(broken, prompts).some((each) => each.includes("names a story that is not in the plan"))).toBe(true);
        const gap: Plan = { ...plan, coverage: { ...plan.coverage, capabilities: [{ name: "Finding things", scope: "carry", surfaces: [{ name: "Main", actions: [{ id: "a", name: "n", story: null }] }] }] } };
        expect(planProblems(gap, prompts).some((each) => each.includes("has no story"))).toBe(true);
    });
});

describe("the search", () => {
    test("it holds the plan's pages, every epic and every story, each with an address that is a page", () => {
        const entries = planSearchEntries(plan, copy.plan);
        expect(entries.length).toBe(3 + plan.epics.length + plan.stories.length);
        expect(entries.filter((each) => each.k === copy.plan.searchStories).map((each) => each.h)).toContain("plan/story/002-do-thing-2-part-2.html");
    });
});

describe("the reader check of a plan page", () => {
    const page = (body: string) => `<main>${body}</main>`;
    test("a prompt box may hold keys and folders; the rest of the page may not", () => {
        const prompt = `<pre data-prompt>Deliver story-4407faad30f6 in /Users/me/x, see capability:capability-17758885276262804412</pre>`;
        expect(planFindings(page(prompt), "plan/story/001-x.html")).toEqual([]);
        expect(visibleText(page(prompt))).not.toContain("story-4407");
        expect(planFindings(page("<p>Needs story-4407faad30f6 first.</p>"), "plan.html").map((each) => each.rule)).toEqual(["a story key is shown"]);
        expect(planFindings(page("<p>Part of area:libraries.</p>"), "plan.html").map((each) => each.rule)).toContain("an epic key is shown");
        expect(planFindings(page("<p>See layer-standin-3.</p>"), "plan.html").map((each) => each.rule)).toContain("a record id is shown");
    });
    test("a name from code in running text fails, in a code element it does not", () => {
        expect(planFindings(page("<p>Runs ButtonOK_Click then stops.</p>"), "plan/coverage.html").map((each) => each.rule)).toEqual(["a code identifier is shown"]);
        expect(planFindings(page("<p>Calls AdmxBundle.Sources first.</p>"), "plan/coverage.html").length).toBe(1);
        expect(planFindings(page("<p>Edit OpenSection.vb.</p>"), "plan/coverage.html").map((each) => each.rule)).toEqual(["a source file is shown"]);
        expect(planFindings(page("<td><code>ButtonOK_Click</code> in <code>PolicyPlus/OpenSection.vb</code></td>"), "plan/coverage.html")).toEqual([]);
        expect(planFindings(page("<p>The TypeScript on Bun stack and PostgreSQL through Drizzle.</p>"), "plan/foundation.html")).toEqual([]);
    });
    test("which pages are the plan's", () => {
        expect(["plan.html", "plan/coverage.html", "plan/story/001-a.html"].every(isPlanPage)).toBe(true);
        expect(["index.html", "planning.html", "capability/plan.html"].some(isPlanPage)).toBe(false);
    });
});

// The real plan, when a build has one: the generated schema and the pages' model agree with what the plan skill wrote.
const planDir = process.env.PLAN_DIR;
const payloads = planDir === undefined ? "" : `${planDir}/.modernization-backlog/payloads`;
describe.skipIf(planDir === undefined || !existsSync(`${payloads}/plan.json`) || !existsSync("src/generated/plan.ts"))("the plan skill's plan", async () => {
    const { planSchema } = await import("../src/generated/plan");
    const read = (file: string): unknown => JSON.parse(readFileSync(`${payloads}/${file}`, "utf8"));
    test("it matches the generated schema and the pages can show it", () => {
        const parsed = planSchema.safeParse(read("plan.json"));
        expect(parsed.success).toBe(true);
        const shown = read("plan.json") as Plan;
        expect(planProblems(shown, read("prompts.json") as Prompts)).toEqual([]);
    });
});
