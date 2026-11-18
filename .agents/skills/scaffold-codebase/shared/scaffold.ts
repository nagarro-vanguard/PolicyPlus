import { spawnSync } from "node:child_process";
import {
    appendFileSync,
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

export const AGENTS_MD_MAX_LINES = 30;
export const EX_UNAVAILABLE = 69;

export type PlanLayer = {
    id: string;
    name: string;
    path: string;
    kind: string;
    purpose: string;
    carries: number[];
    check: string;
    dependsOn: string[];
};
export type Loaded = { root: string; target: string; stack: string[]; layers: PlanLayer[] };
export type LayerJob = {
    name: string;
    path: string;
    check: string;
    purpose: string;
    stack: string[];
    agentsMd: string;
    dependsOn: string[];
};

export const slug = (text: string) =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

const readJson = (path: string): unknown => {
    if (!existsSync(path)) throw new Error(`missing ${path}`);
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
        throw new Error(`${path} is not JSON: ${(error as Error).message}`);
    }
};

/** Reads the plan's layers and the request's target and stack from an Output Root. */
export const load = (root: string): Loaded => {
    const plan = readJson(join(root, ".modernization-backlog/payloads/plan.json")) as { layers?: PlanLayer[] };
    const request = readJson(join(root, ".modernization-backlog/work/request.json")) as {
        target?: string;
        stack?: string[];
    };
    if (!Array.isArray(plan.layers)) throw new Error("plan.json has no layers");
    if (typeof request.target !== "string" || !isAbsolute(request.target))
        throw new Error("request.json has no absolute target");
    return { root: resolve(root), target: resolve(request.target), stack: request.stack ?? [], layers: plan.layers };
};

export const agentsMdSource = (root: string, layer: PlanLayer) =>
    join(root, "work-items/agents-md", slug(layer.name), "AGENTS.md");

/** The folder of a layer inside the target; throws when the path leaves the target or is the root. */
export const layerFolder = (target: string, layer: PlanLayer) => {
    const folder = resolve(target, layer.path);
    const rel = relative(target, folder);
    if (rel === "" || rel.startsWith("..") || isAbsolute(rel))
        throw new Error(`layer "${layer.name}" has path "${layer.path}", which is not inside the target`);
    return folder;
};

/** The layers ordered so each follows the layers it depends on; the plan's order breaks ties. */
export const layerJobs = (loaded: Loaded): LayerJob[] => {
    const byId = new Map(loaded.layers.map((layer) => [layer.id, layer]));
    const done = new Set<string>();
    const ordered: PlanLayer[] = [];
    const visiting = new Set<string>();
    const visit = (layer: PlanLayer) => {
        if (done.has(layer.id)) return;
        if (visiting.has(layer.id)) throw new Error(`layers depend on each other at "${layer.name}"`);
        visiting.add(layer.id);
        for (const id of layer.dependsOn) {
            const dep = byId.get(id);
            if (!dep) throw new Error(`layer "${layer.name}" depends on unknown layer ${id}`);
            visit(dep);
        }
        visiting.delete(layer.id);
        done.add(layer.id);
        ordered.push(layer);
    };
    loaded.layers.forEach(visit);
    return ordered.map((layer) => ({
        name: layer.name,
        path: layer.path,
        check: layer.check,
        purpose: layer.purpose,
        stack: layer.carries.map((n) => loaded.stack[n - 1]).filter((line): line is string => line !== undefined),
        agentsMd: join(layerFolder(loaded.target, layer), "AGENTS.md"),
        dependsOn: layer.dependsOn.map((id) => byId.get(id)!.name),
    }));
};

/** The text of a `## <heading>` section, or undefined. */
export const sectionOf = (markdown: string, heading: string) => {
    const lines = markdown.split("\n");
    const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
    if (start < 0) return undefined;
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((line) => line.startsWith("## "));
    return rest
        .slice(0, end < 0 ? rest.length : end)
        .join("\n")
        .trim();
};

/** Replaces the body of `## Work tracking` in `markdown` with `body`. */
export const replaceSection = (markdown: string, heading: string, body: string) => {
    const lines = markdown.split("\n");
    const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
    if (start < 0) throw new Error(`the root AGENTS.md has no "## ${heading}" section`);
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((line) => line.startsWith("## "));
    const tail = end < 0 ? [] : rest.slice(end);
    return [...lines.slice(0, start + 1), "", body.trim(), "", ...tail].join("\n").replace(/\n+$/, "\n");
};

/** `differs` holds one sentence per AGENTS.md left alone because its content differs. */
export type WorkspaceResult = { written: string[]; unchanged: string[]; differs: string[]; templates: string[] };

/** Walks up from `from` to the repository toolkit's `.agents/shared/templates`. */
export const findTemplates = (from: string) => {
    let dir = resolve(from);
    for (;;) {
        const candidate = join(dir, ".agents/shared/templates");
        if (existsSync(candidate)) return candidate;
        const parent = dirname(dir);
        if (parent === dir) throw new Error(`no .agents/shared/templates above ${from}`);
        dir = parent;
    }
};

/** One line saying how a differing file differs, for the report. */
export const describeDifference = (path: string, expected: string) => {
    const a = readFileSync(path, "utf8").split("\n");
    const b = expected.split("\n");
    const at = a.findIndex((line, i) => line !== b[i]);
    const line = at < 0 ? Math.min(a.length, b.length) : at;
    return `${path} differs from the projection at line ${line + 1} (have ${JSON.stringify(a[line] ?? "")}, expected ${JSON.stringify(b[line] ?? "")}); use --force to overwrite`;
};

const putFile = (path: string, content: string, force: boolean, result: WorkspaceResult) => {
    if (existsSync(path)) {
        const current = readFileSync(path, "utf8");
        if (current === content) return void result.unchanged.push(path);
        if (!force) return void result.differs.push(describeDifference(path, content));
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    result.written.push(path);
};

const copyMissing = (from: string, to: string, base: string, result: WorkspaceResult) => {
    mkdirSync(to, { recursive: true });
    for (const name of readdirSync(from)) {
        const source = join(from, name);
        const dest = join(to, name);
        if (statSync(source).isDirectory()) copyMissing(source, dest, base, result);
        else if (!existsSync(dest)) {
            copyFileSync(source, dest);
            result.templates.push(relative(base, dest));
        }
    }
};

/**
 * Writes the target's root AGENTS.md, every layer's folder and AGENTS.md, templates and the `.artifacts/` ignore line.
 * Never writes outside the target and never replaces a differing AGENTS.md unless forced.
 */
export const workspace = (
    root: string,
    workTrackingFile: string,
    options: { force?: boolean; templates?: string; skillDir: string },
): WorkspaceResult => {
    const loaded = load(root);
    const result: WorkspaceResult = { written: [], unchanged: [], differs: [], templates: [] };
    if (!existsSync(workTrackingFile)) throw new Error(`work tracking file ${workTrackingFile} does not exist`);
    const tracking = sectionOf(readFileSync(workTrackingFile, "utf8"), "Work tracking");
    if (!tracking) throw new Error(`${workTrackingFile} has no non-empty "## Work tracking" section`);
    const rootSource = join(loaded.root, "work-items/agents-md/AGENTS.md");
    if (!existsSync(rootSource)) throw new Error(`missing ${rootSource}`);
    const rootContent = replaceSection(readFileSync(rootSource, "utf8"), "Work tracking", tracking);
    const folders = loaded.layers.map((layer) => ({ layer, folder: layerFolder(loaded.target, layer) }));
    const sources = folders.map(({ layer }) => {
        const source = agentsMdSource(loaded.root, layer);
        if (!existsSync(source)) throw new Error(`missing ${source}`);
        return readFileSync(source, "utf8");
    });
    const templates = options.templates ?? findTemplates(options.skillDir);

    mkdirSync(loaded.target, { recursive: true });
    putFile(join(loaded.target, "AGENTS.md"), rootContent, options.force ?? false, result);
    folders.forEach(({ folder }, i) => putFile(join(folder, "AGENTS.md"), sources[i]!, options.force ?? false, result));
    copyMissing(templates, join(loaded.target, "templates"), loaded.target, result);

    const ignore = join(loaded.target, ".gitignore");
    const current = existsSync(ignore) ? readFileSync(ignore, "utf8") : "";
    if (!current.split("\n").some((line) => line.trim() === ".artifacts/" || line.trim() === ".artifacts")) {
        appendFileSync(ignore, `${current === "" || current.endsWith("\n") ? "" : "\n"}.artifacts/\n`);
        result.written.push(ignore);
    }
    return result;
};

// ---------------------------------------------------------------- readiness

export type TableRow = { layer: string; path: string; kind: string; dependsOn: string[] };

const cells = (line: string) =>
    line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim());

/** Parses the `## Layers` table of an AGENTS.md; returns rows, or a problem. */
export const parseLayers = (markdown: string): { rows: TableRow[]; problems: string[] } => {
    const section = sectionOf(markdown, "Layers");
    if (section === undefined) return { rows: [], problems: ["root AGENTS.md has no ## Layers section"] };
    const table = section.split("\n").filter((line) => line.trim().startsWith("|"));
    if (table.length < 3) return { rows: [], problems: ["## Layers has no table with rows"] };
    const header = cells(table[0]!).map((c) => c.toLowerCase());
    const want = ["layer", "path", "kind", "depends on"];
    if (want.some((name, i) => header[i] !== name))
        return { rows: [], problems: ["## Layers columns must be Layer | Path | Kind | Depends on"] };
    const rows = table.slice(2).map((line) => {
        const [layer = "", path = "", kind = "", dep = ""] = cells(line);
        const names =
            dep.replace(/\[[^\]]*\]/g, "").trim() === "-"
                ? []
                : dep
                      .replace(/\[[^\]]*\]/g, "")
                      .split(",")
                      .map((n) => n.trim())
                      .filter(Boolean);
        return { layer, path, kind, dependsOn: names };
    });
    return { rows, problems: [] };
};

/** The commands of a `## Verify` section, each from a `- \`command\`` line. */
export const verifyCommands = (markdown: string) =>
    (sectionOf(markdown, "Verify") ?? "")
        .split("\n")
        .map((line) => /^- `(.+)`\s*$/.exec(line.trim())?.[1])
        .filter((command): command is string => command !== undefined);

export const countedLines = (text: string) =>
    text.split("\n").filter((line) => line.trim() !== "" && !line.startsWith("|")).length;

/** Reads the results a layer's run left: problems, and how many tests it found. */
export const readResults = (dir: string, label: string): string[] => {
    const proof = join(dir, "proof.json");
    const failures: string[] = [];
    let count = 0;
    if (existsSync(proof)) {
        let data: any;
        try {
            data = JSON.parse(readFileSync(proof, "utf8"));
        } catch {
            return [`${label}: proof.json is not valid JSON`];
        }
        if (!data || !Array.isArray(data.tests) || data.tests.some((t: any) => typeof t?.title !== "string"))
            return [`${label}: proof.json is not shaped { tests: [{ title, acs, passed }], thresholds }`];
        for (const test of data.tests) {
            count++;
            if (test.passed !== true)
                failures.push(`${label}: test failed: ${test.title}${test.message ? ` (${test.message})` : ""}`);
        }
        for (const t of Array.isArray(data.thresholds) ? data.thresholds : [])
            if (t?.held === false) failures.push(`${label}: threshold not held: ${t.metric ?? t.ac}`);
    } else {
        for (const file of readdirSync(dir).filter((name) => name.endsWith(".xml"))) {
            const xml = readFileSync(join(dir, file), "utf8");
            if (!/<testsuites?\b/.test(xml)) return [`${label}: ${file} is not JUnit XML`];
            for (const match of xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
                count++;
                const name = /\bname="([^"]*)"/.exec(match[1] ?? "")?.[1] ?? "(unnamed)";
                if (/<(failure|error)\b/.test(match[2] ?? "")) failures.push(`${label}: test failed: ${name}`);
            }
        }
    }
    if (count === 0) return [`${label}: no test results in $EVIDENCE_DIR, so the layer proves no criterion`];
    return failures;
};

const git = (cwd: string, args: string[]) =>
    spawnSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/** The readiness check: every problem as one line; empty means ready. */
export const ready = (root: string): string[] => {
    const loaded = load(root);
    const target = loaded.target;
    const problems: string[] = [];
    const rootFile = join(target, "AGENTS.md");
    if (!existsSync(rootFile)) return [`${rootFile} does not exist: run workspace first`];

    // (c) prerequisites
    if (git(target, ["rev-parse", "--is-inside-work-tree"]).status !== 0)
        problems.push("the target is not inside a git repository");
    else if (git(target, ["rev-parse", "--verify", "HEAD"]).status !== 0)
        problems.push("the git repository has no commit");
    if (!Bun.which("bun")) problems.push("bun is not on PATH");
    if (git(target, ["check-ignore", "-q", ".artifacts/probe"]).status !== 0)
        problems.push(".artifacts/ is not git-ignored");
    if (!existsSync(join(target, "templates/pr-template.md"))) problems.push("templates/pr-template.md is missing");

    // (a) the contract
    const rootText = readFileSync(rootFile, "utf8");
    const { rows, problems: tableProblems } = parseLayers(rootText);
    problems.push(...tableProblems);
    if (!sectionOf(rootText, "Work tracking") || /^\(Written from/.test(sectionOf(rootText, "Work tracking")!))
        problems.push("root AGENTS.md has no ## Work tracking text");
    if (countedLines(rootText) > AGENTS_MD_MAX_LINES)
        problems.push(`root AGENTS.md has ${countedLines(rootText)} lines, more than ${AGENTS_MD_MAX_LINES}`);
    const names = new Set(rows.map((row) => row.layer));
    for (const row of rows) {
        if (!["code", "test"].includes(row.kind))
            problems.push(`${row.layer}: kind "${row.kind}" is neither code nor test`);
        for (const dep of row.dependsOn)
            if (!names.has(dep)) problems.push(`${row.layer}: depends on unknown layer "${dep}"`);
    }
    for (const row of rows) {
        const isRoot = resolve(target, row.path) === target;
        const folder = resolve(target, row.path);
        if (relative(target, folder).startsWith("..")) {
            problems.push(`${row.layer}: path ${row.path} is outside the target`);
            continue;
        }
        const file = isRoot ? rootFile : join(folder, "AGENTS.md");
        if (!existsSync(file)) {
            problems.push(`${row.layer}: ${relative(target, file)} does not exist`);
            continue;
        }
        const text = readFileSync(file, "utf8");
        if (!isRoot && countedLines(text) > AGENTS_MD_MAX_LINES)
            problems.push(`${row.layer}: AGENTS.md has ${countedLines(text)} lines, more than ${AGENTS_MD_MAX_LINES}`);
        const commands = verifyCommands(text);
        if (commands.length === 0) {
            if (!isRoot) problems.push(`${row.layer}: AGENTS.md has no ## Verify command as - \`command\``);
            continue;
        }
        // (b) run the layer's checks and read the results
        const evidence = mkdtempSync(join(tmpdir(), "scaffold-ready-"));
        let unavailable = false;
        let failed = false;
        for (const command of commands) {
            const run = spawnSync("sh", ["-c", command], {
                cwd: folder,
                encoding: "utf8",
                timeout: 600_000,
                env: { ...process.env, EVIDENCE_DIR: evidence, WORK_ITEM_ID: "readiness" },
            });
            if (run.status === EX_UNAVAILABLE) {
                problems.push(`${row.layer}: environment unavailable (exit 69) running \`${command}\``);
                unavailable = true;
            } else if (run.status !== 0) {
                failed = true;
                const tail = `${run.stderr ?? ""}${run.stdout ?? ""}`.trim().split("\n").slice(-1)[0] ?? "";
                problems.push(
                    `${row.layer}: \`${command}\` exited ${run.status ?? "by signal"}${tail ? `: ${tail}` : ""}`,
                );
            }
        }
        if (!unavailable && !failed) problems.push(...readResults(evidence, row.layer));
    }
    return problems;
};
