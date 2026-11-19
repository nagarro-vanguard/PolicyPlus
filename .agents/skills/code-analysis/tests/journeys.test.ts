import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Schema } from "effect";
import { JourneysPayload } from "../shared/model/schemas/journeys-payload";
import { capabilitySlugs, journeyCoverageGaps, tasksOf } from "../shared/read/payload-journeys";
import { identifiersOf, leaksIn, wordsIn } from "../shared/jobs/journey-words";
import { journeyGaps, mergeGaps } from "../stages/publish/check-journeys";
import type { MergeBrief, TasksBrief } from "../stages/publish/journeys-brief";
import { derive, makeRoot, type Spec } from "./fixture";

const place = { file: "a.vb", firstLine: 1, lastLine: 5 };
const brief: TasksBrief = {
    kind: "tasks",
    capability: { id: "capability-111111", name: "Licences", purpose: "Licences." },
    surfaces: [
        {
            name: "LicenceForm",
            actions: [
                {
                    id: "block-111111",
                    what: "Opens a licence",
                    startedBy: "person",
                    rules: ["businessrule-111111"],
                    place,
                },
                { id: "block-222222", what: "Renews a licence", startedBy: "person", rules: [], place },
            ],
        },
    ],
    rules: [{ id: "businessrule-111111", statement: "A licence must be current.", place }],
    entities: [{ id: "entity-111111", name: "Licence" }],
    externals: [{ id: "external-111111", name: "Payments", kind: "service" }],
    identifiers: identifiersOf(["LicenceForm", "frmLicence_Load", "Licence screens and their reactions"]),
};

const journey = (task: string, fields: Record<string, unknown> = {}) => ({
    id: `journey-${task.length}00000`,
    capability: "capability-111111",
    task,
    outcome: "Renew a licence before it lapses",
    actor: "person",
    actions: ["block-111111", "block-222222"],
    rules: ["businessrule-111111"],
    facts: ["entity-111111"],
    needs: ["external-111111"],
    steps: [
        { intent: "Find the licence", system: "Shows its dates", from: ["block-111111"], confidence: "sure" },
        { intent: "Renew it", system: "Extends the end date", from: ["block-222222"], confidence: "inferred" },
    ],
    ...fields,
});

describe("the gate of a tasks job", () => {
    test("a task that holds every entry point and rule of the brief once passes", () => {
        expect(journeyGaps([journey("renew")], brief)).toEqual([]);
    });

    test("names an entry point or rule left out, one in two tasks, and one that is not the brief's", () => {
        const left = journeyGaps(
            [journey("renew", { actions: ["block-111111"], steps: [journey("x").steps[0]], rules: [] })],
            brief,
        ).join("\n");
        expect(left).toContain("1 entry points belong to no task: block-222222");
        expect(left).toContain("1 rules belong to no task: businessrule-111111");
        const twice = journeyGaps([journey("renew"), journey("renewed")], brief).join("\n");
        expect(twice).toContain("block-111111 is in 2 tasks");
        expect(twice).toContain("businessrule-111111 is in 2 tasks");
        const stray = journeyGaps([journey("renew", { rules: ["businessrule-111111", "businessrule-999999"] })], brief);
        expect(stray.join("\n")).toContain("businessrule-999999 is no rule of the brief");
    });

    test("every step cites only its task's entry points, and every entry point of a task is in a step", () => {
        const wrong = journeyGaps(
            [
                journey("renew", {
                    steps: [
                        { intent: "Find", system: "Shows", from: ["block-111111", "block-777777"], confidence: "sure" },
                    ],
                }),
            ],
            brief,
        ).join("\n");
        expect(wrong).toContain("step 1: cites block-777777, which is not the task's");
        expect(wrong).toContain("1 entry points are in no step: block-222222");
    });

    test("kinds of data and outside systems come from the brief, and the task's name is kebab-case", () => {
        const gaps = journeyGaps(
            [journey("Renew It", { facts: ["entity-999999"], needs: ["external-999999"] })],
            brief,
        ).join("\n");
        expect(gaps).toContain("not kebab-case");
        expect(gaps).toContain("entity-999999 is no kind of data of the brief");
        expect(gaps).toContain("external-999999 is no outside system of the brief");
    });

    test("an outcome names no control, medium or technology, and no name the code uses", () => {
        const control = journeyGaps([journey("renew", { outcome: "Click the Renew button on the page" })], brief).join(
            "\n",
        );
        expect(control).toContain("names a medium, control or technology (click, button, page)");
        const code = journeyGaps([journey("renew", { outcome: "Renew a licence in LicenceForm" })], brief).join("\n");
        expect(code).toContain("names the code uses (LicenceForm)");
        const layer = journeyGaps(
            [
                journey("renew", {
                    steps: [
                        { intent: "Find", system: "Shows", from: ["block-111111"], confidence: "sure" },
                        {
                            intent: "Renew through the licence screens and their reactions",
                            system: "Extends",
                            from: ["block-222222"],
                            confidence: "sure",
                        },
                    ],
                }),
            ],
            brief,
        ).join("\n");
        expect(layer).toContain("names the code uses (Licence screens and their reactions)");
    });

    test("two tasks of a capability do not share a name, and a task belongs to the job's capability", () => {
        const gaps = journeyGaps(
            [
                journey("renew", { capability: "capability-222222" }),
                journey("renew", {
                    actions: ["block-333333"],
                    steps: [{ intent: "Find", system: "Shows", from: ["block-333333"], confidence: "sure" }],
                }),
            ],
            brief,
        ).join("\n");
        expect(gaps).toContain("share a name");
        expect(gaps).toContain("belongs to capability-222222");
    });
});

describe("the gate of the joining job", () => {
    const merging: MergeBrief = {
        kind: "merge",
        tasks: ["a.one", "a.two", "b.one"].map((id) => ({ id, outcome: "x", actor: "person", actions: 1, rules: 0 })),
    };
    const merge = (keep: string, absorb: string[], n = 1) => ({ id: `journeymerge-${n}00000`, keep, absorb });

    test("merges of tasks the brief lists, each task in at most one, pass; nothing to join is no records", () => {
        expect(mergeGaps([], merging)).toEqual([]);
        expect(mergeGaps([merge("a.one", ["b.one"])], merging)).toEqual([]);
    });

    test("names a task the brief does not list, one in two merges, and one kept and absorbed", () => {
        const gaps = mergeGaps(
            [merge("a.one", ["b.one"]), merge("a.two", ["b.one", "c.one"], 2), merge("a.two", ["a.two"], 3)],
            merging,
        ).join("\n");
        expect(gaps).toContain("task c.one is not in the brief");
        expect(gaps).toContain("task b.one is in two merges");
        expect(gaps).toContain("kept and absorbed");
    });
});

describe("the tasks of the payload", () => {
    const slugs = capabilitySlugs([
        { id: "capability-222222", name: "Policy files" },
        { id: "capability-111111", name: "Licences" },
        { id: "capability-333333", name: "Policy files" },
    ]);
    const stored = (task: string, capability: string, actions: string[], rules: string[]) => ({
        id: `journey-${task}`,
        capability,
        task,
        outcome: `Do ${task}`,
        actor: "person",
        actions,
        rules,
        facts: [],
        needs: [],
        steps: [{ intent: "Do", system: "Done", from: actions, confidence: "sure" as const }],
    });

    test("a capability's address is its name, made unique by a number after the second to share it", () => {
        expect(slugs.get("capability-111111")).toBe("licences");
        expect(slugs.get("capability-222222")).toBe("policy-files");
        expect(slugs.get("capability-333333")).toBe("policy-files-2");
    });

    test("ids are `<capability>.<task>`, in order; a merge joins the entry points, rules and steps of the tasks it absorbs", () => {
        const journeys = [
            stored("renew", "capability-111111", ["block-1"], ["rule-1"]),
            stored("renew-again", "capability-222222", ["block-2"], ["rule-2"]),
            stored("open", "capability-222222", ["block-3"], []),
        ];
        const alone = tasksOf(journeys, [], slugs);
        expect(alone.tasks.map((task) => task.id)).toEqual([
            "licences.renew",
            "policy-files.open",
            "policy-files.renew-again",
        ]);
        const joined = tasksOf(
            journeys,
            [{ keep: "licences.renew", absorb: ["policy-files.renew-again", "x.y"] }],
            slugs,
        );
        expect(joined.unknown).toEqual(["x.y"]);
        expect(joined.tasks.map((task) => task.id)).toEqual(["licences.renew", "policy-files.open"]);
        const renew = joined.tasks[0];
        expect(renew?.actions).toEqual(["block-1", "block-2"]);
        expect(renew?.rules).toEqual(["rule-1", "rule-2"]);
        expect(renew?.current).toHaveLength(2);
    });

    test("every entry point and rule of every capability is in exactly one task", () => {
        const payload = {
            layers: [{ actions: [{ id: "block-1" }, { id: "block-2" }], rules: [{ id: "rule-1" }] }],
        } as never;
        const tasks = tasksOf([stored("renew", "capability-111111", ["block-1"], ["rule-1"])], [], slugs).tasks;
        const gaps = journeyCoverageGaps(tasks, [payload]).join("\n");
        expect(gaps).toContain("1 entry points belong to no task: block-2");
        expect(journeyCoverageGaps([...tasks, ...tasks], [payload]).join("\n")).toContain("two tasks share an id");
    });
});

describe("the words of a task", () => {
    test("controls, media and technologies are named; the system's own names are told by their shape", () => {
        expect(wordsIn("click the button on the page")).toEqual(expect.arrayContaining(["click", "button", "page"]));
        expect(wordsIn("the system finds the policy")).toEqual([]);
        const names = identifiersOf(["frmMain_Load", "Policy", "Layer of the dialogs", "a.vb", "Licence"]);
        expect(names).toEqual(["frmMain_Load", "Layer of the dialogs", "a.vb"]);
        expect(leaksIn("opens frmMain_Load", names)).toEqual(["frmMain_Load"]);
        expect(leaksIn("opens the layer of the DIALOGS today", names)).toEqual(["Layer of the dialogs"]);
    });
});

const spec: Spec = {
    layers: [{ id: "layer-ui", name: "Screens" }],
    codeKinds: [{ id: "codekind-ui", name: "Handler", layer: "layer-ui" }],
    blocks: [
        { id: "block-handler", first: 1, last: 9, codeKind: "codekind-ui", entry: true, container: "FindById" },
        { id: "block-rule", first: 10, last: 19, codeKind: "codekind-ui" },
    ],
    links: [{ id: "link-1", from: "block-handler", to: "block-rule", kind: "call" }],
    rules: [{ id: "rule-1", block: "block-rule", says: "An id must be numeric." }],
};

const addJourney = (root: string, body: object) => {
    const db = new Database(join(root, "analysis.sqlite"));
    db.run("INSERT OR IGNORE INTO stageWrite (stage, rank, digest) VALUES ('publish', 5, 'x')");
    db.run("INSERT INTO record (id, type, stage, body) VALUES (?, 'Journey', 'publish', ?)", [
        (body as { id: string }).id,
        JSON.stringify(body),
    ]);
    db.close();
};

const writePayloads = async (root: string) => {
    const child = Bun.spawn(["bun", join(import.meta.dir, "..", "cli", "write-payloads.ts")], {
        env: { ...process.env, CODE_ANALYSIS_ROOT: root },
        stdout: "pipe",
        stderr: "pipe",
    });
    const [out, err] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
    return { out: out + err, code: await child.exited };
};

describe("payloads/journeys.json", () => {
    test("an analysis with no journeys writes none, and is not at fault", async () => {
        const root = makeRoot(spec);
        await derive(root);
        const { out, code } = await writePayloads(root);
        expect(out).toContain("no journeys of today are in the analysis");
        expect(code).toBe(0);
        expect(existsSync(join(root, "payloads", "journeys.json"))).toBe(false);
        expect(existsSync(join(root, "payloads", "schema", "journeys.schema.json"))).toBe(true);
    });

    test("the accepted journeys are written as `{ journeys: Task[] }` that decodes against the payload's schema", async () => {
        const root = makeRoot(spec);
        await derive(root);
        addJourney(root, {
            id: "journey-100000",
            capability: "capability-1",
            task: "find-by-number",
            outcome: "Find a record by its number",
            actor: "person",
            actions: ["block-handler"],
            rules: ["rule-1"],
            facts: [],
            needs: [],
            steps: [{ intent: "Look it up", system: "Shows it", from: ["block-handler"], confidence: "sure" }],
        });
        const { out, code } = await writePayloads(root);
        expect(out).toContain("payloads written");
        expect(code).toBe(0);
        const written = JSON.parse(readFileSync(join(root, "payloads", "journeys.json"), "utf8")) as unknown;
        const decoded = Schema.decodeUnknownSync(JourneysPayload)(written);
        expect(decoded.journeys.map((task) => task.id)).toEqual(["capability-1.find-by-number"]);
        expect(Object.keys((written as { journeys: object[] }).journeys[0] ?? {})).toEqual([
            "id",
            "outcome",
            "actor",
            "actions",
            "rules",
            "facts",
            "needs",
            "current",
        ]);
        const schema = JSON.parse(readFileSync(join(root, "payloads", "schema", "journeys.schema.json"), "utf8"));
        expect(Object.keys(schema.properties)).toEqual(["journeys"]);
    });

    test("a rule or entry point in no task, or in two, makes the run need action", async () => {
        const root = makeRoot(spec);
        await derive(root);
        addJourney(root, {
            id: "journey-100000",
            capability: "capability-1",
            task: "find-by-number",
            outcome: "Find a record by its number",
            actor: "person",
            actions: ["block-handler"],
            rules: [],
            facts: [],
            needs: [],
            steps: [{ intent: "Look it up", system: "Shows it", from: ["block-handler"], confidence: "sure" }],
        });
        const { out, code } = await writePayloads(root);
        expect(out).toContain("the journeys do not add up: 1 rules belong to no task: rule-1");
        expect(code).toBe(1);
    });
});

const publishPages = async (root: string, ...args: string[]) => {
    const child = Bun.spawn(["bun", join(import.meta.dir, "..", "cli", "publish-pages.ts"), ...args], {
        env: { ...process.env, CODE_ANALYSIS_ROOT: root },
        stdout: "pipe",
        stderr: "pipe",
    });
    const [out, err] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
    return { out: out + err, code: await child.exited };
};

const publishRoot = async () => {
    const root = makeRoot(spec);
    await derive(root);
    const db = new Database(join(root, "analysis.sqlite"));
    db.run("INSERT OR IGNORE INTO stageWrite (stage, rank, digest) VALUES ('capabilities-and-entities', 3, 'x')");
    db.close();
    mkdirSync(join(root, "work"), { recursive: true });
    writeFileSync(
        join(root, "work", "analysis-request.json"),
        JSON.stringify({ sourceRoots: ["/tmp"], leaveOut: [], supportingMaterial: [] }),
    );
    return root;
};

describe("the journeys jobs of Publish", () => {
    test("`prepare` lists one job per capability, writes its brief and hands the agent its arguments", async () => {
        const root = await publishRoot();
        const { out, code } = await publishPages(root, "prepare", "journeys-of-capability-1");
        expect(code).toBe(0);
        const prepared = JSON.parse(out) as { call: { agent: string; arguments: Record<string, string> } };
        expect(prepared.call.agent).toBe("publish/describe-journeys");
        expect(Object.keys(prepared.call.arguments)).toEqual([
            "scriptsCommand",
            "sourceFolder",
            "briefPath",
            "kind",
            "checkCommand",
            "carryCommand",
            "outputPath",
        ]);
        const jobs = JSON.parse(readFileSync(join(root, "work/publish/journeys/jobs.json"), "utf8")) as {
            jobId: string;
            actions: string[];
            rules: string[];
        }[];
        expect(jobs.map((job) => [job.jobId, job.actions, job.rules])).toEqual([
            ["journeys-of-capability-1", ["block-handler"], ["rule-1"]],
        ]);
        const written = JSON.parse(readFileSync(prepared.call.arguments.briefPath ?? "", "utf8")) as TasksBrief;
        expect(written.rules.map((rule) => rule.id)).toEqual(["rule-1"]);
        expect(written.identifiers).toContain("FindById");
    });

    test("`check` holds the job's output to its brief: an entry point left out is a gap", async () => {
        const root = await publishRoot();
        await publishPages(root, "prepare", "journeys-of-capability-1");
        const none = await publishPages(root, "check", "journeys-of-capability-1");
        expect(none.out).toContain("the agent wrote nothing");
        const append = Bun.spawn(
            [
                "bun",
                join(import.meta.dir, "..", "cli", "append-agent-records.ts"),
                "Journey",
                join(root, "work/publish/journeys/journeys-of-capability-1/output.jsonl"),
            ],
            { env: { ...process.env, CODE_ANALYSIS_ROOT: root }, stdout: "pipe", stderr: "pipe" },
        );
        await append.exited;
        const empty = await publishPages(root, "check", "journeys-of-capability-1");
        expect(empty.out).toContain("1 entry points belong to no task: block-handler");
        expect(empty.out).toContain("1 rules belong to no task: rule-1");
        expect(empty.code).toBe(1);
    });

    test("a key that is no job of the journeys is refused, so a mistyped key never clears the briefing", async () => {
        const root = await publishRoot();
        const { out, code } = await publishPages(root, "check", "journeys-merge");
        expect(out).toContain("names none of Publish's jobs");
        expect(code).not.toBe(0);
    });
});
