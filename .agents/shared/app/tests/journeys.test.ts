import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { hrefOf } from "../src/lib/architecture-redirects";
import { alignRows, groupByArea, joinJourneys, journeySlugs, ledeOfJourney, measures, placementOf, titleOfJourney } from "../src/lib/journey-join";
import type { Journey } from "../src/lib/journey-join";
import { lensOf } from "../src/lib/journey-lens";
import { todaySchema, waySchema } from "../src/lib/journey-schema";
import type { TodayRecord, WayRecord } from "../src/lib/journey-schema";
import { areaRedirects, journeyRedirects } from "../src/lib/journey-redirects";
import { todaySource } from "../src/lib/journey-sources";
import { navGroups, navOf } from "../src/lib/nav";
import { targetRoutes } from "../src/lib/target-page";
import type { TargetData } from "../src/lib/target-types";

const root = join(import.meta.dir, "..");
const src = join(root, "src");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));

const step = (intent: string, from: string[]) => ({ intent, system: `${intent} by the system`, from, confidence: "sure" });
const task = (id: string, current: TodayRecord["current"], actions: string[] = []): TodayRecord => ({ id, outcome: `Outcome of ${id} with a few more words to read`, actor: "person", actions, rules: [], facts: [], needs: [], current });
const modern = (taskId: string, name: string, steps: WayRecord["steps"], over: Partial<WayRecord> = {}): WayRecord => ({ id: `${taskId}:${name}`, task: taskId, actor: "person", name, strategy: "s", idea: "idea", tradeoff: "cost", baseline: false, steps, drops: [], ...over });
const legacy = (id: string, intent: string, from: string[], change = "kept") => ({ id, intent, system: "does it", confidence: "sure", touches: [], honours: [], link: { _tag: "legacy" as const, from, change, reason: `why ${intent}`, keeps: [] } });
const fresh = (id: string, intent: string) => ({ id, intent, system: "does it", confidence: "sure", touches: [], honours: [], link: { _tag: "new" as const, reason: "needed" } });
const nowhere = { area: () => undefined, capability: () => undefined };

describe("today's journeys joined to the ways proposed", () => {
    const one = task("g.one", [step("a", ["x"]), step("b", ["y"])]);
    const two = task("g.two", [step("c", ["z"])]);
    const way = modern("g.one", "Better", [legacy("g.one:better#1", "ab", ["x", "y"], "merged")], { recommended: "because" });
    const other = modern("g.one", "Else", [legacy("g.one:else#1", "a", ["x"])]);
    test("a journey joins its way by id; one with none is today only", () => {
        const found = joinJourneys({ today: [one, two], chosen: [way], considered: [way, other], gate: "confirmed", placement: nowhere });
        expect(found.map((journey) => [journey.id, journey.way?.name, journey.status])).toEqual([["g.one", "Better", "decided"], ["g.two", undefined, "today only"]]);
        expect(found[0]?.others.map((each) => each.name)).toEqual(["Else"]);
    });
    test("until the decision is confirmed the recommended way is only proposed", () => {
        const found = joinJourneys({ today: [one], chosen: [], considered: [way, other], gate: "waiting", placement: nowhere });
        expect([found[0]?.way?.name, found[0]?.status]).toEqual(["Better", "proposed"]);
        expect(joinJourneys({ today: [one], chosen: [way], considered: [way], gate: "waiting", placement: nowhere })[0]?.status).toBe("proposed");
    });
    test("every journey of today is kept, in the order given, whether or not a way names it", () => {
        const found = joinJourneys({ today: [two, one], chosen: [], considered: [], gate: "other", placement: nowhere });
        expect(found.map((journey) => journey.id)).toEqual(["g.two", "g.one"]);
    });
    test("the address of a journey is its id's readable form, and two that share it are told apart the same way every build", () => {
        const slugs = journeySlugs(["a.b-c", "a.b c", "x.y"]);
        expect(new Set(slugs.values()).size).toBe(3);
        expect(journeySlugs(["x.y", "a.b c", "a.b-c"])).toEqual(slugs);
        expect(slugs.get("x.y")).toBe("x-y");
    });
    test("a journey is placed in the area of the capability that holds most of its actions", () => {
        const placement = placementOf(new Map([["a1", "c1"], ["a2", "c2"], ["a3", "c2"]]), new Map([["c1", { id: "c1", name: "One" }], ["c2", { id: "c2", name: "Two" }]]), new Map([["c2", { id: "ar", name: "Area" }]]));
        const found = joinJourneys({ today: [task("t", [], ["a1", "a2", "a3"]), task("u", [], ["a1"]), task("v", [])], chosen: [], considered: [], gate: "other", placement });
        expect(found.map((journey) => [journey.capability?.name, journey.area?.name])).toEqual([["Two", "Area"], ["One", undefined], [undefined, undefined]]);
        expect(groupByArea(found).map((group) => [group.name, group.journeys.length])).toEqual([["Area", 1], ["Other journeys", 2]]);
    });
    test("a title is at most eight words with no ellipsis, and the outcome is the lede", () => {
        const long = task("l.x", [], []);
        const journey = joinJourneys({ today: [{ ...long, outcome: "Move through the categories and policies of the loaded definitions and read what each is for." }], chosen: [], considered: [], gate: "other", placement: nowhere })[0] as Journey;
        expect(titleOfJourney(journey).split(" ").length).toBeLessThanOrEqual(8);
        expect(titleOfJourney(journey)).not.toContain("…");
        expect(ledeOfJourney(journey)).toBe("Move through the categories and policies of the loaded definitions and read what each is for.");
    });
    test("the meta line counts the rules kept and dropped and the actions dropped", () => {
        const kept = modern("g.one", "K", [{ ...legacy("s1", "a", ["x"]), link: { _tag: "legacy" as const, from: ["x"], change: "kept", reason: "r", keeps: ["r1", "r2"] } }], { drops: [{ actions: ["a9"], rules: ["r3"], reason: "gone" }] });
        const found = joinJourneys({ today: [one], chosen: [kept], considered: [kept], gate: "confirmed", placement: nowhere })[0] as Journey;
        expect(measures(found)).toEqual({ stepsToday: 2, stepsProposed: 1, rulesKept: 2, rulesDropped: 1, actionsDropped: 1 });
    });
});

describe("the two columns, row by row", () => {
    const today = [step("one", ["a"]), step("two", ["b"]), step("three", ["c"]), step("four", ["d"])];
    test("a step of the way sits beside the steps of today it replaces; a merge shares a row", () => {
        const way = modern("t", "w", [legacy("m1", "first", ["a"]), legacy("m2", "second", ["b", "c"], "merged"), legacy("m3", "third", ["d"])]);
        const rows = alignRows(today, way);
        expect(rows.map((row) => [row.today.map((each) => each.at), row.modern.map((each) => each.at)])).toEqual([[[0], [0]], [[1, 2], [1]], [[3], [2]]]);
    });
    test("a new step follows the row of the step before it, and a step nothing replaces stands alone", () => {
        const way = modern("t", "w", [legacy("m1", "first", ["a"]), fresh("m2", "brand new"), legacy("m3", "third", ["c"])]);
        const rows = alignRows(today, way);
        expect(rows.map((row) => [row.today.map((each) => each.at), row.modern.map((each) => each.at)])).toEqual([[[0], [0]], [[], [1]], [[1], []], [[2], [2]], [[3], []]]);
    });
    test("every step of both sides is in exactly one row", () => {
        const way = modern("t", "w", [legacy("m1", "first", ["a", "d"], "merged"), legacy("m2", "second", ["b"]), fresh("m3", "n")]);
        const rows = alignRows(today, way);
        expect(rows.flatMap((row) => row.today.map((each) => each.at)).sort()).toEqual([0, 1, 2, 3]);
        expect(rows.flatMap((row) => row.modern.map((each) => each.at)).sort()).toEqual([0, 1, 2]);
    });
    test("steps that share an action are not merged unless a step of the way joins them", () => {
        const same = [step("one", ["a"]), step("two", ["a"])];
        const rows = alignRows(same, modern("t", "w", [legacy("m1", "x", ["a"])]));
        expect(rows).toHaveLength(1);
        const none = alignRows(same, undefined);
        expect(none.map((row) => row.today.length)).toEqual([1, 1]);
    });
});

describe("the lens", () => {
    test("side by side is the default when a way exists, today alone when none does", () => {
        expect(lensOf("", true)).toBe("both");
        expect(lensOf("", false)).toBe("today");
        expect(lensOf("#lens=modern", false)).toBe("today");
    });
    test("the address can name another lens, and anything else is ignored", () => {
        expect(lensOf("#lens=today", true)).toBe("today");
        expect(lensOf("lens=modern", true)).toBe("modern");
        expect(lensOf("#lens=sideways", true)).toBe("both");
    });
    test("the page and its columns open on the lens the function says", () => {
        expect(readFileSync(join(src, "components", "journey", "Columns.astro"), "utf8")).toContain('lensOf("", way !== undefined)');
        expect(readFileSync(join(src, "scripts", "lens.ts"), "utf8")).toContain("lensOf(location.hash, true)");
    });
});

describe("where today's journeys are read from", () => {
    const dir = mkdtempSync(join(tmpdir(), "ia-journeys-"));
    const payloads = join(dir, "payloads");
    const target = join(dir, "target-root");
    test("the analysis's file is read first, then the target's older one, else there are none", () => {
        const make = (path: string, text: string) => {
            const folder = path.slice(0, path.lastIndexOf("/"));
            Bun.spawnSync(["mkdir", "-p", folder]);
            writeFileSync(path, text);
        };
        expect(todaySource(payloads, target)).toEqual({ records: [], from: "none" });
        make(join(target, "target", "current.json"), JSON.stringify({ tasks: [{ id: "old" }] }));
        expect(todaySource(payloads, target)).toEqual({ records: [{ id: "old" }], from: "target" });
        make(join(payloads, "journeys.json"), JSON.stringify({ journeys: [{ id: "new" }] }));
        expect(todaySource(payloads, target)).toEqual({ records: [{ id: "new" }], from: "analysis" });
        make(join(payloads, "journeys.json"), JSON.stringify({ nothing: [] }));
        expect(() => todaySource(payloads, target)).toThrow("journeys");
    });
});

describe("a record that does not match its schema is refused", () => {
    test("today's journey needs its outcome, its actions and its steps with their sources", () => {
        const good = task("g.one", [step("a", ["x"])]);
        expect(todaySchema.safeParse(good).success).toBe(true);
        expect(todaySchema.safeParse({ ...good, outcome: "" }).success).toBe(false);
        expect(todaySchema.safeParse({ ...good, current: [{ intent: "a" }] }).success).toBe(false);
        const { actions: _actions, ...without } = good;
        expect(todaySchema.safeParse(without).success).toBe(false);
    });
    test("a way needs its steps' links to say what they replace, or that they are new", () => {
        const good = modern("g.one", "w", [legacy("s1", "a", ["x"])]);
        expect(waySchema.safeParse(good).success).toBe(true);
        expect(waySchema.safeParse({ ...good, steps: [{ ...legacy("s1", "a", ["x"]), link: { _tag: "other" } }] }).success).toBe(false);
        expect(waySchema.safeParse({ ...good, baseline: "yes" }).success).toBe(false);
    });
    const payloads = "/Users/anupvasudeva/me/projects/PolicyPlus/.modernization/.code-analysis/payloads";
    test.skipIf(!existsSync(payloads))("a journeys payload that fails its schema fails the build", () => {
        const work = mkdtempSync(join(tmpdir(), "ia-bad-"));
        cpSync(payloads, join(work, "payloads"), { recursive: true });
        writeFileSync(join(work, "payloads", "journeys.json"), JSON.stringify({ journeys: [{ id: "broken", outcome: "x" }] }));
        const { PLAN_DIR: _plan, TARGET_DIR: _target, ...inherited } = process.env;
        const environment = { ...inherited, ANALYSIS_PAYLOADS_DIR: join(work, "payloads"), APP_OUT: join(work, "out") };
        const generated = spawnSync("bun", ["scripts/generate-schemas.ts"], { cwd: root, env: environment, encoding: "utf8" });
        expect(generated.status).toBe(0);
        const built = spawnSync("bun", ["--bun", "x", "astro", "build", "--outDir", join(work, "out")], { cwd: root, env: environment, encoding: "utf8" });
        expect(built.status).not.toBe(0);
        expect(`${built.stdout}${built.stderr}`).toContain("journeys");
    }, 240_000);
});

describe("the pages and the places that were removed", () => {
    const tasks = [task("tasks-a.one", []), task("tasks-b.two", [])];
    const data = { tasks, journeys: [], variants: [], gates: {}, root: "/out" } as unknown as TargetData;
    test("the target's home and each task now send the reader to the decisions and the journeys", () => {
        const redirects = journeyRedirects(data);
        expect(redirects.map((each) => [each.from, each.to])).toEqual([["target", "decisions.html"], ["target/task/tasks-a-one", "journey/tasks-a-one.html"], ["target/task/tasks-b-two", "journey/tasks-b-two.html"]]);
        const routes = new Set(targetRoutes(data));
        for (const each of redirects.filter((one) => one.from.startsWith("target/task/"))) expect(routes.has(each.to.replace(/\.html.*$/, ""))).toBe(true);
    });
    test("an area now sends the reader to its heading on the reference", () => {
        expect(areaRedirects(["reading-definitions"]).map((each) => [each.from, each.to])).toEqual([["area/reading-definitions", "reference.html#reading-definitions"]]);
    });
    test("a redirect's address is relative to the page that holds it", () => {
        expect(hrefOf({ from: "target/task/x", to: "journey/x.html", text: "t" })).toBe("../../journey/x.html");
        expect(hrefOf({ from: "target", to: "decisions.html", text: "t" })).toBe("decisions.html");
    });
    test("the redirect pages are generated from the one list, with the meta refresh and a link", () => {
        for (const file of ["target.astro", "target/task/[slug].astro", "area/[slug].astro"]) {
            const text = readFileSync(join(src, "pages", file), "utf8");
            expect([file, text.includes("<Redirect")]).toEqual([file, true]);
        }
        const redirect = readFileSync(join(src, "components", "architecture", "Redirect.astro"), "utf8");
        expect(redirect).toContain('http-equiv="refresh"');
        expect(redirect).toContain("<a href={href}>");
    });
});

describe("the route contract", () => {
    const pages = new Set(walk(join(src, "pages")).map((file) => relative(join(src, "pages"), file).replace(/\.(astro|ts)$/, "")));
    test("the pages of this part exist at the addresses the contract names", () => {
        for (const page of ["index", "journeys", "journey/[slug]", "decisions", "gate/[gate]", "reference", "rules", "target", "target/task/[slug]", "area/[slug]", "capability/[slug]", "screen", "action/[cap]/[slug]", "layer/[cap]/[slug]"]) expect([page, pages.has(page)]).toEqual([page, true]);
    });
    test("every link of the sidebar leads to a page that exists", () => {
        const has = (name: string) => pages.has(name) || pages.has("[...plan]");
        for (const group of navGroups({ risks: true, decisions: true, plan: true })) for (const link of group.links) expect([link.href, has(link.href.replace(/\.html$/, ""))]).toEqual([link.href, true]);
    });
    test("the sidebar is the groups the design names, one level, without counts", () => {
        const groups = navGroups({ risks: true, decisions: true, plan: true });
        expect(groups.map((group) => group.title)).toEqual([undefined, "Understand", "Modernization", "Reference"]);
        expect(groups.flatMap((group) => group.links.map((link) => link.text))).toEqual(["Overview", "Journeys", "Architecture", "Data", "Risks", "Decisions", "Plan", "Capabilities and screens", "Business rules"]);
        expect(groups[1]?.links.find((link) => link.id === "risks")?.dot).toBe(true);
        expect(navGroups({ risks: false, decisions: false, plan: false }).map((group) => group.title)).toEqual([undefined, "Understand", "Reference"]);
        expect(navGroups({ risks: false, decisions: true, plan: false })[2]?.links.map((link) => link.text)).toEqual(["Decisions"]);
    });
    test("a page belongs to the link of its place, and the page itself is told from a page below it", () => {
        expect(navOf("journey/open-it")).toEqual({ id: "journeys", exact: false });
        expect(navOf("journeys")).toEqual({ id: "journeys", exact: true });
        expect(navOf("gate/journeys")).toEqual({ id: "decisions", exact: false });
        expect(navOf("capability/x")).toEqual({ id: "reference", exact: false });
        expect(navOf("layer/x/y")?.id).toBe("reference");
        expect(navOf("plan/story/001-x")).toEqual({ id: "plan", exact: false });
        expect(navOf("risk/x")?.id).toBe("risks");
        expect(navOf("index")).toEqual({ id: "overview", exact: true });
        expect(navOf("kit")).toBeUndefined();
    });
    test("the layout keeps the sidebar across pages, prefetches its links and uses the router", () => {
        const layout = readFileSync(join(src, "layouts", "Page.astro"), "utf8");
        expect(layout).toContain("<ClientRouter");
        expect(layout).toContain('transition:persist="sidebar"');
        expect(layout).toContain('data-astro-prefetch="hover"');
        expect(layout).toContain("aria-current");
    });
});

describe("the words of the app", () => {
    test("neither Target nor Rebuild is written anywhere a reader could meet it", () => {
        const files = [...walk(src), join(root, "public", "site.js")].filter((file) => /\.(astro|ts|tsx|js|css)$/.test(file));
        const found = files.filter((file) => /\b(?:Target|Rebuild)\b/.test(readFileSync(file, "utf8"))).map((file) => relative(root, file));
        expect(found).toEqual([]);
    });
});
