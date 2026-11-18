import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/** What the conductor asks of whoever drives it: one action at a time. It never does the work itself. */
export type Action =
    | { action: "run"; step: string; command: string; why: string }
    | { action: "invoke"; step: string; skill: string; instruction: string }
    | { action: "prompt"; step: string; text: string; why: string }
    | { action: "wait"; step: string; message: string }
    | { action: "stop"; step: string; message: string }
    | { action: "done"; message: string };

export type Settings = { worktrees: string; base: string; parallel: number };
export type State = { request: string; settings: Settings; steps: Record<string, { inputs: string; at: string }> };

export const skillsOf = (conductorRoot: string) => resolve(conductorRoot, "..");

export const hashFiles = (paths: readonly string[]) => {
    const hash = createHash("sha256");
    const walk = (path: string): string[] =>
        !existsSync(path)
            ? []
            : statSync(path).isDirectory()
              ? readdirSync(path)
                    .sort()
                    .flatMap((name) => walk(join(path, name)))
              : [path];
    for (const file of paths.flatMap(walk)) {
        hash.update(file);
        hash.update(readFileSync(file));
    }
    return hash.digest("hex").slice(0, 16);
};

export type Paths = ReturnType<typeof pathsOf>;
/** The folders of a run: the same fixed layout every skill uses under the Output Root. */
export const pathsOf = (root: string) => ({
    root,
    state: join(root, "state.json"),
    analysisRequest: join(root, "analysis-request.md"),
    requestJson: join(root, ".modernization-backlog/work/request.json"),
    analysis: join(root, ".code-analysis"),
    payloads: join(root, ".code-analysis/payloads"),
    bundles: join(root, ".code-analysis/bundles"),
    records: join(root, ".modernization-backlog/work/records"),
    plan: join(root, ".modernization-backlog/payloads/plan.json"),
    backlog: join(root, ".modernization-backlog"),
    manifest: join(root, "work-items/manifest.json"),
    ledger: join(root, "work-items/ledger.json"),
    app: join(root, "app"),
});

export type Step = {
    name: string;
    /** Files or folders whose content decides whether the step must run again. */
    inputs: (paths: Paths) => string[];
    /** What must exist when the step is done. */
    makes: (paths: Paths) => string[];
    action: (ctx: { paths: Paths; skills: string; settings: Settings; request: string }) => Action;
};

const bun = (skills: string, skill: string, script: string, args: string) =>
    `bun ${join(skills, skill, "cli", script)} ${args}`;

/** The steps in order, as data: a step is due when what it makes is missing or its inputs changed since it ran. */
export const steps: Step[] = [
    {
        name: "request",
        inputs: () => [],
        makes: (p) => [p.requestJson],
        action: ({ skills, request }) => ({
            action: "run",
            step: "request",
            command: bun(skills, "plan-modernization-backlog", "read-request.ts", request),
            why: "check the request; an empty Target Stack stops here",
        }),
    },
    {
        name: "analysis-request",
        inputs: (p) => [p.requestJson],
        makes: (p) => [p.analysisRequest],
        action: ({ skills, paths }) => ({
            action: "run",
            step: "analysis-request",
            command: bun(skills, "plan-modernization-backlog", "analysis-request.ts", paths.root),
            why: "derive the code-analysis request, leaving out the target, the output and the skills",
        }),
    },
    {
        name: "analysis",
        inputs: (p) => [p.analysisRequest],
        makes: (p) => [join(p.payloads, "system.json")],
        action: ({ paths, skills }) => ({
            action: "invoke",
            step: "analysis",
            skill: "code-analysis",
            instruction: `Run the code-analysis skill on ${paths.analysisRequest} through Publish, then write its payloads with \`CODE_ANALYSIS_ROOT=${paths.analysis} bun ${join(skills, "code-analysis/cli/write-payloads.ts")}\`. Do not build its site: the app is built once, after the plan.`,
        }),
    },
    {
        name: "bundles",
        inputs: (p) => [p.payloads],
        makes: (p) =>
            existsSync(p.bundles) &&
            readdirSync(p.bundles).some((name) => name.startsWith("screen-") && name.includes("--"))
                ? [p.bundles]
                : [join(p.bundles, "screen-*--*.md")],
        action: ({ paths, skills }) => ({
            action: "run",
            step: "bundles",
            command: `CODE_ANALYSIS_ROOT=${paths.analysis} ${bun(skills, "code-analysis", "build-bundle.ts", "all --with-source")}`,
            why: "one bundle for every surface of every capability, for the plan's agents to read",
        }),
    },
    {
        name: "foundation",
        inputs: (p) => [p.payloads, p.requestJson],
        makes: (p) => [join(p.records, "layers.json"), join(p.records, "decisions.json")],
        action: ({ paths, skills }) => ({
            action: "invoke",
            step: "foundation",
            skill: "plan-modernization-backlog",
            instruction: `Run the plan-modernization-backlog skill's foundation stage for ${paths.root}: prepare it, drive its jobs, then finish it (see its SKILL.md; its scripts are in ${join(skills, "plan-modernization-backlog/cli")}).`,
        }),
    },
    {
        name: "stories",
        inputs: (p) => [join(p.records, "decisions.json"), p.bundles],
        makes: (p) => [join(p.records, "stories.json")],
        action: ({ paths, skills }) => ({
            action: "invoke",
            step: "stories",
            skill: "plan-modernization-backlog",
            instruction: `Run the plan-modernization-backlog skill's stories stage for ${paths.root}: prepare it, drive its jobs, then finish it (scripts in ${join(skills, "plan-modernization-backlog/cli")}).`,
        }),
    },
    {
        name: "plan",
        inputs: (p) => [p.records],
        makes: (p) => [p.plan, p.manifest],
        action: ({ paths, skills }) => ({
            action: "run",
            step: "plan",
            command: bun(
                skills,
                "plan-modernization-backlog",
                "plan.ts",
                `build ${paths.root} --work-tracking <the workspace AGENTS.md>`,
            ),
            why: "derive the plan and check every gate; on exit 1 the failing gates name what to re-run",
        }),
    },
    {
        name: "app",
        inputs: (p) => [p.plan, p.payloads],
        makes: (p) => [join(p.app, "index.html")],
        action: ({ paths, skills }) => ({
            action: "run",
            step: "app",
            command: `CODE_ANALYSIS_ROOT=${paths.analysis} ${bun(skills, "code-analysis", "build-app.ts", `--analysis ${paths.payloads} --plan ${paths.root} --out ${paths.app}`)}`,
            why: "build the one app that shows the analysis and the plan",
        }),
    },
];
