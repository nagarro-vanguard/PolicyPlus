import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { derive, makeRoot, type Spec } from "./fixture";

/**
 * A whole run of Publish's journeys jobs over a small analysis whose records are valid as the stages write them: the
 * jobs are listed, handed out with the briefing, gated (one fix), reviewed and decided, the tasks written twice are
 * joined, `finish` stores the records, and `write-payloads` writes `payloads/journeys.json` from them.
 */
const one = "capability-000001";
const two = "capability-000002";
const spec: Spec = {
    layers: [{ id: "layer-000001", name: "Screens" }],
    codeKinds: [{ id: "codekind-000001", name: "Handler", layer: "layer-000001" }],
    blocks: [
        { id: "block-000001", first: 1, last: 9, codeKind: "codekind-000001", entry: true, capability: one },
        { id: "block-000002", first: 10, last: 19, codeKind: "codekind-000001" },
        { id: "block-000003", first: 20, last: 29, codeKind: "codekind-000001", entry: true, capability: two },
        { id: "block-000004", first: 30, last: 39, codeKind: "codekind-000001" },
    ],
    links: [
        { id: "link-000001", from: "block-000001", to: "block-000002", kind: "call" },
        { id: "link-000002", from: "block-000003", to: "block-000004", kind: "call" },
    ],
    rules: [
        { id: "businessrule-000001", block: "block-000002", says: "An id must be numeric." },
        { id: "businessrule-000002", block: "block-000004", says: "A policy must be current." },
    ],
};

const lines = (first: number, last: number) => ({ file: "a.vb", firstLine: first, lastLine: last });

const makeRun = async () => {
    const root = makeRoot(spec);
    await derive(root);
    const db = new Database(join(root, "analysis.sqlite"));
    db.run("INSERT OR IGNORE INTO stageWrite (stage, rank, digest) VALUES ('capabilities-and-entities', 3, 'x')");
    db.run("DELETE FROM record WHERE id = 'capability-1'");
    const patch = (id: string, body: object) =>
        db.run("UPDATE record SET body = ? WHERE id = ?", [JSON.stringify({ id, ...body }), id]);
    const capability = (id: string, name: string) =>
        patch(id, { name, purpose: `${name}.`, membershipRule: "x", evidence: [lines(1, 2)] });
    capability(one, "Licences");
    capability(two, "Policy files");
    patch("layer-000001", { name: "Screens", purpose: "Screens.", evidence: [lines(1, 2)] });
    patch("codekind-000001", {
        name: "Handler",
        layer: "layer-000001",
        kind: "runs",
        purpose: "Handles",
        membershipRule: "x",
        evidence: [lines(1, 2)],
    });
    for (const [id, first, last, entry] of [
        ["block-000001", 1, 9, "Finds a record by its number"],
        ["block-000002", 10, 19, undefined],
        ["block-000003", 20, 29, "Opens a policy file"],
        ["block-000004", 30, 39, undefined],
    ] as const)
        patch(id, {
            lines: lines(first, last),
            codeKind: "codekind-000001",
            ...(entry === undefined
                ? {}
                : {
                      entryPoint: { reachedBy: "a form", startedBy: "person", purpose: entry, evidence: [lines(1, 2)] },
                  }),
        });
    patch("assign-block-000001", { entryPoint: "block-000001", capability: one });
    patch("assign-block-000003", { entryPoint: "block-000003", capability: two });
    db.run("UPDATE record SET id = 'entrypointassignment-000001' WHERE id = 'assign-block-000001'");
    db.run("UPDATE record SET id = 'entrypointassignment-000002' WHERE id = 'assign-block-000003'");
    patch("entrypointassignment-000001", { entryPoint: "block-000001", capability: one });
    patch("entrypointassignment-000002", { entryPoint: "block-000003", capability: two });
    patch("link-000001", { kind: "call", lines: lines(1, 1), to: { file: "a.vb", line: 12 } });
    patch("link-000002", { kind: "call", lines: lines(20, 20), to: { file: "a.vb", line: 32 } });
    for (const [id, says, first] of [
        ["businessrule-000001", "An id must be numeric.", 10],
        ["businessrule-000002", "A policy must be current.", 30],
    ] as const)
        patch(id, { says, decidedAt: lines(first, first + 1), evidence: [] });
    const cite = (from: string, to: string) =>
        db.run(
            "INSERT OR IGNORE INTO citation (fromRecord, toRecord) SELECT f.recordNumber, t.recordNumber FROM record f, record t WHERE f.id = ? AND t.id = ?",
            [from, to],
        );
    db.run("DELETE FROM citation");
    for (const block of ["block-000001", "block-000002", "block-000003", "block-000004"])
        cite(block, "codekind-000001");
    cite("codekind-000001", "layer-000001");
    cite("entrypointassignment-000001", "block-000001");
    cite("entrypointassignment-000001", one);
    cite("entrypointassignment-000002", "block-000003");
    cite("entrypointassignment-000002", two);
    db.close();
    mkdirSync(join(root, "work"), { recursive: true });
    writeFileSync(
        join(root, "work", "analysis-request.json"),
        JSON.stringify({ sourceRoots: ["/tmp"], leaveOut: [], supportingMaterial: [] }),
    );
    return root;
};

const script = (name: string) => join(import.meta.dir, "..", "cli", name);
const run = async (root: string, file: string, ...args: string[]) => {
    const child = Bun.spawn(["bun", script(file), ...args], {
        env: { ...process.env, CODE_ANALYSIS_ROOT: root },
        stdout: "pipe",
        stderr: "pipe",
    });
    const [out, err] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
    return { out: out + err, code: await child.exited };
};

type Dispatch = {
    job: string;
    agent: string;
    arguments: { outputPath: string; customInstructions?: string; findingsPath?: string };
};
type Action = { next: string; batch?: string; dispatch?: Dispatch[]; said?: string };

const journey = (capability: string, task: string, actions: string[], rules: string[], outcome: string) => ({
    capability,
    task,
    outcome,
    actor: "person",
    actions,
    rules,
    facts: [],
    needs: [],
    steps: [{ intent: "Do it", system: "The system does it", from: actions, confidence: "sure" }],
});

describe("the journeys jobs, driven by `next`", () => {
    test("jobs are listed, gated with one fix, reviewed, joined, stored, and written as a payload", async () => {
        const root = await makeRun();
        const append = (type: string, path: string, record?: object) =>
            run(root, "append-agent-records.ts", type, path, ...(record === undefined ? [] : [JSON.stringify(record)]));
        const seen: string[] = [];
        let fixed = false;
        let action: Action = { next: "" };
        let after: string[] = [];
        for (let round = 0; round < 12; round++) {
            const next = await run(root, "publish-pages.ts", "next", "--limit", "8", ...after);
            expect(next.out.slice(0, 900)).toMatch(/^\{/);
            action = JSON.parse(next.out) as Action;
            if (action.next !== "dispatch") break;
            const batch = action.batch ?? "";
            for (const agent of action.dispatch ?? []) {
                seen.push(`${agent.agent === "review/review-agent-findings" ? "review" : "write"} ${agent.job}`);
                const out = agent.arguments.outputPath;
                if (agent.agent === "review/review-agent-findings") {
                    await append("Receipt", out, { read: [] });
                } else if (agent.job === "the briefing") {
                    await append("CapabilityGroup", out, {
                        name: "Records",
                        purpose: "Finding and opening records.",
                        capabilities: [one, two],
                    });
                    await append("Screen", out, {
                        name: "Find a record",
                        purpose: "Look a record up.",
                        kind: "screen",
                        places: ["a.vb"],
                    });
                } else if (agent.job === "journeys-of-licences") {
                    await append(
                        "Journey",
                        out,
                        journey(
                            one,
                            "find-record",
                            ["block-000001"],
                            ["businessrule-000001"],
                            "Find a record by its number",
                        ),
                    );
                } else if (agent.job === "journeys-of-policy-files" && !fixed) {
                    fixed = true;
                    await append(
                        "Journey",
                        out,
                        journey(two, "open-policy", ["block-000003"], [], "Open a policy file"),
                    );
                } else if (agent.job === "journeys-of-policy-files") {
                    expect(agent.arguments.customInstructions).toContain(
                        "1 rules belong to no task: businessrule-000002",
                    );
                    await append(
                        "Journey",
                        out,
                        journey(two, "open-policy", ["block-000003"], ["businessrule-000002"], "Open a policy file"),
                    );
                } else if (agent.job === "journeys-merge") {
                    await append("JourneyMerge", out, {
                        keep: "licences.find-record",
                        absorb: ["policy-files.open-policy"],
                    });
                }
                expect((await run(root, "publish-pages.ts", "done", agent.job)).code).toBe(0);
            }
            after = ["--after", batch];
        }
        expect(action.next).toBe("done");
        expect(seen.filter((each) => each === "write journeys-of-policy-files")).toHaveLength(2);
        expect(seen).toContain("write journeys-merge");
        expect(seen.indexOf("write journeys-merge")).toBeGreaterThan(seen.indexOf("review journeys-of-licences"));
        expect((await run(root, "write-payloads.ts")).code).toBe(0);
        const payload = JSON.parse(readFileSync(join(root, "payloads", "journeys.json"), "utf8")) as {
            journeys: { id: string; actions: string[]; rules: string[]; current: unknown[] }[];
        };
        expect(payload.journeys).toHaveLength(1);
        expect(payload.journeys[0]?.id).toBe("licences.find-record");
        expect(payload.journeys[0]?.actions).toEqual(["block-000001", "block-000003"]);
        expect(payload.journeys[0]?.rules).toEqual(["businessrule-000001", "businessrule-000002"]);
        expect(payload.journeys[0]?.current).toHaveLength(2);
    }, 240_000);
});
