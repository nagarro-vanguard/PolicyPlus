import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { layerJobs, load, ready, workspace } from "../shared/scaffold";

const skillDir = join(dirname(import.meta.path), "..");
const base = mkdtempSync(join(tmpdir(), "scaffold-test-"));
afterAll(() => rmSync(base, { recursive: true, force: true }));

const PROOF = `printf '{"tests":[{"title":"smoke","acs":[],"passed":true}],"thresholds":[]}' > "$EVIDENCE_DIR/proof.json"`;
const JUNIT = `printf '<testsuites><testsuite name="s"><testcase classname="c" name="smoke"/></testsuite></testsuites>' > "$EVIDENCE_DIR/r.xml"`;
const FAILING = `printf '{"tests":[{"title":"broken","acs":[],"passed":false}],"thresholds":[]}' > "$EVIDENCE_DIR/proof.json"`;
const layers = [
    { name: "alpha", check: PROOF, dependsOn: [] as string[] },
    { name: "beta", check: JUNIT, dependsOn: ["alpha"] },
    { name: "gamma", check: FAILING, dependsOn: ["alpha"] },
    { name: "delta", check: "true", dependsOn: ["beta"] },
];

/** An Output Root with a plan, a request and the projected AGENTS.md files, plus a work tracking file. */
const fixture = () => {
    const dir = mkdtempSync(join(base, "case-"));
    const root = join(dir, "out");
    const target = join(dir, "repo/App");
    const put = (path: string, text: string) => {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, text);
    };
    put(
        join(root, ".modernization-backlog/payloads/plan.json"),
        JSON.stringify({
            layers: layers.map((l) => ({
                id: `id-${l.name}`,
                name: l.name,
                path: `layers/${l.name}`,
                kind: "code",
                purpose: `the ${l.name}`,
                carries: [1],
                check: l.check,
                dependsOn: l.dependsOn.map((n) => `id-${n}`),
            })),
        }),
    );
    put(
        join(root, "request.json"),
        JSON.stringify({ target, stack: ["language: TypeScript"] }),
    );
    const rows = layers.map((l) => `| ${l.name} | layers/${l.name} | code | ${l.dependsOn.join(", ") || "-"} |`);
    put(
        join(root, "work-items/agents-md/AGENTS.md"),
        [
            "# App",
            "",
            "## Layers",
            "",
            "| Layer | Path | Kind | Depends on |",
            "| --- | --- | --- | --- |",
            "| workspace | . | code | - |",
            ...rows,
            "",
            "## Work tracking",
            "",
            "(preview)",
            "",
        ].join("\n"),
    );
    for (const l of layers)
        put(
            join(root, "work-items/agents-md", l.name, "AGENTS.md"),
            `# ${l.name}: the ${l.name}\n\n## Verify\n\n- \`${l.check}\`\n`,
        );
    const tracking = join(dir, "tracking.md");
    put(tracking, "# W\n\n## Work tracking\n\n- Tags are labels.\n\n## Other\n\nx\n");
    return { dir, root, target, tracking };
};
const git = (cwd: string, ...args: string[]) => spawnSync("git", args, { cwd, encoding: "utf8" });
const options = { skillDir };

describe("workspace", () => {
    test("writes the files, is idempotent and ignores .artifacts", () => {
        const f = fixture();
        mkdirSync(f.target, { recursive: true });
        const first = workspace(f.root, f.tracking, options);
        expect(first.differs).toEqual([]);
        expect(readFileSync(join(f.target, "AGENTS.md"), "utf8")).toContain("- Tags are labels.");
        expect(readFileSync(join(f.target, "AGENTS.md"), "utf8")).not.toContain("(preview)");
        expect(readFileSync(join(f.target, "layers/beta/AGENTS.md"), "utf8")).toContain("## Verify");
        expect(readFileSync(join(f.target, "templates/pr-template.md"), "utf8").length).toBeGreaterThan(0);
        const second = workspace(f.root, f.tracking, options);
        expect(second.written).toEqual([]);
        expect(second.templates).toEqual([]);
        expect(readFileSync(join(f.target, ".gitignore"), "utf8").match(/\.artifacts\//g)?.length).toBe(1);
    });

    test("refuses to overwrite a changed AGENTS.md unless forced", () => {
        const f = fixture();
        workspace(f.root, f.tracking, options);
        const file = join(f.target, "layers/alpha/AGENTS.md");
        writeFileSync(file, "# hand edited\n");
        const result = workspace(f.root, f.tracking, options);
        expect(result.differs).toHaveLength(1);
        expect(result.differs[0]).toContain("differs");
        expect(readFileSync(file, "utf8")).toBe("# hand edited\n");
        workspace(f.root, f.tracking, { ...options, force: true });
        expect(readFileSync(file, "utf8")).toContain("## Verify");
    });

    test("never overwrites an existing template and names a work tracking file without the section", () => {
        const f = fixture();
        mkdirSync(join(f.target, "templates"), { recursive: true });
        writeFileSync(join(f.target, "templates/pr-template.md"), "mine");
        workspace(f.root, f.tracking, options);
        expect(readFileSync(join(f.target, "templates/pr-template.md"), "utf8")).toBe("mine");
        writeFileSync(f.tracking, "# nothing\n");
        expect(() => workspace(f.root, f.tracking, options)).toThrow("Work tracking");
    });

    test("refuses a layer path that leaves the target", () => {
        const f = fixture();
        const planPath = join(f.root, ".modernization-backlog/payloads/plan.json");
        const plan = JSON.parse(readFileSync(planPath, "utf8"));
        plan.layers[0].path = "../escape";
        writeFileSync(planPath, JSON.stringify(plan));
        expect(() => workspace(f.root, f.tracking, options)).toThrow("not inside the target");
    });
});

describe("layers", () => {
    test("lists layers in dependency order with names, stack lines and the AGENTS.md path", () => {
        const f = fixture();
        const jobs = layerJobs(load(f.root));
        expect(jobs.map((j) => j.name)).toEqual(["alpha", "beta", "gamma", "delta"]);
        expect(jobs[1]).toMatchObject({ dependsOn: ["alpha"], stack: ["language: TypeScript"], path: "layers/beta" });
        expect(jobs[1]!.agentsMd).toBe(join(f.target, "layers/beta/AGENTS.md"));
    });
});

describe("ready", () => {
    test("reports exactly the failing layer and the layer with no results", () => {
        const f = fixture();
        mkdirSync(f.target, { recursive: true });
        git(f.target, "init", "-q");
        git(f.target, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "init");
        expect(ready(f.root).some((p) => p.includes("does not exist"))).toBe(true);
        workspace(f.root, f.tracking, options);
        expect(ready(f.root)).toEqual([
            "gamma: test failed: broken",
            "delta: no test results in $EVIDENCE_DIR, so the layer proves no criterion",
        ]);
    });

    test("reports missing prerequisites and an exit of 69 distinctly", () => {
        const f = fixture();
        const file = join(f.root, "work-items/agents-md/alpha/AGENTS.md");
        writeFileSync(file, "# alpha\n\n## Verify\n\n- `exit 69`\n");
        workspace(f.root, f.tracking, options);
        const problems = ready(f.root);
        expect(problems).toContain("the target is not inside a git repository");
        expect(problems).toContain(".artifacts/ is not git-ignored");
        expect(problems).toContain("alpha: environment unavailable (exit 69) running `exit 69`");
        expect(problems.some((p) => p.startsWith("alpha: no test results"))).toBe(false);
    });
});
