import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gateProblems, type Gate } from "./gates";

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
    requestJson: join(root, "request.json"),
    target: join(root, "target"),
    legacy: join(root, "target/legacy.json"),
    current: join(root, "target/current.json"),
    choiceAsIs: join(root, "target/choice-as-is.json"),
    journeyVariants: join(root, ".shape-target/work/records/journey-variants.json"),
    choiceJourneys: join(root, "target/choice-journeys.json"),
    journeys: join(root, "target/journeys.json"),
    architectureVariants: join(root, ".shape-target/work/records/architecture-variants.json"),
    choiceArchitecture: join(root, "target/choice-architecture.json"),
    choiceComponents: join(root, "target/choice-components.json"),
    pages: (gate: string) => join(root, ".shape-target/pages", gate),
    architecture: join(root, "target/architecture.json"),
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
    /** Problems with what the step made, for a step whose record the person can leave stale; it then decides, not the inputs. */
    valid?: (paths: Paths) => string[];
    action: (ctx: { paths: Paths; skills: string; settings: Settings; request: string }) => Action;
};

const bun = (skills: string, skill: string, script: string, args: string) =>
    `bun ${join(skills, skill, "cli", script)} ${args}`;

const chooseCommand = (skills: string) => `bun ${join(skills, "shape-target/cli/choose.ts")}`;

/** What the person gives to change a decision: the jobs that wrote it, handed back with their words. */
const changes = (jobs: string) =>
    `To change something instead, hand back ${jobs} with \`redo <job> --instructions <their words>\` (shape-target's stage.ts), drive the jobs, finish the stage, then call next: the pages are built again and the question returns.`;

/**
 * One decision of the target, the same three steps each time: the stage proposes, the pages show the proposal, the
 * person confirms. The pages step comes first so the question cannot be reached before the person can read the proposal;
 * its inputs include this decision's record and those before it, because the pages show what is confirmed and are rebuilt once it is.
 */
const gate = (input: {
    gate: Gate;
    stage: string;
    inputs: Step["inputs"];
    proposal: (p: Paths) => string;
    record: (p: Paths) => string[];
    pages: string;
    ask: (skills: string, p: Paths) => string;
    jobs: string;
}): Step[] => {
    const name = `target-${input.gate}`;
    const order: Gate[] = ["as-is", "journeys", "architecture", "components"];
    const decided = (p: Paths) =>
        [p.choiceAsIs, p.choiceJourneys, p.choiceArchitecture, p.choiceComponents].slice(
            0,
            order.indexOf(input.gate) + 1,
        );
    return [
        {
            name,
            inputs: input.inputs,
            makes: (p) => [input.proposal(p)],
            action: ({ paths, skills }) => ({
                action: "invoke",
                step: name,
                skill: "shape-target",
                instruction: `Run the shape-target skill's ${input.stage} stage for ${paths.root}: prepare it, drive its jobs, then finish it (see its SKILL.md; its scripts are in ${join(skills, "shape-target/cli")}).`,
            }),
        },
        {
            name: `${name}-pages`,
            inputs: (p) => [input.proposal(p), ...decided(p)],
            makes: (p) => [p.pages(input.gate)],
            action: ({ paths, skills }) => ({
                action: "run",
                step: `${name}-pages`,
                command: `mkdir -p ${join(paths.root, ".shape-target/pages")} && CODE_ANALYSIS_ROOT=${paths.analysis} TARGET_CHOOSE="${chooseCommand(skills)}" ${bun(skills, "code-analysis", "build-app.ts", `--analysis ${paths.payloads} --target ${paths.root} --out ${paths.app}`)}; test -f ${paths.app}/language-report.json && touch ${paths.pages(input.gate)}`,
                why: `build the pages that show the ${input.gate} proposal, before the person is asked`,
            }),
        },
        {
            name: `${name}-choose`,
            inputs: (p) => [input.proposal(p)],
            makes: (p) => input.record(p),
            valid: (p) => gateProblems(p, input.gate),
            action: ({ paths, skills }) => ({
                action: "wait",
                step: `${name}-choose`,
                message: `Open ${join(paths.app, input.pages)} and show the person the proposal (${input.gate}); say what you recommend. They confirm with: ${input.ask(skills, paths)}. ${changes(input.jobs)} Call next when it is recorded.`,
            }),
        },
    ];
};

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
        name: "derive-legacy",
        inputs: (p) => [p.payloads],
        makes: (p) => [p.legacy],
        action: ({ paths, skills }) => ({
            action: "run",
            step: "derive-legacy",
            command: bun(skills, "shape-target", "derive.ts", `legacy ${paths.root}`),
            why: "write the old system's own words, kept apart from what designers read",
        }),
    },
    ...gate({
        gate: "as-is",
        stage: "as-is",
        inputs: (p) => [p.legacy, p.bundles],
        proposal: (p) => p.current,
        record: (p) => [p.choiceAsIs],
        pages: "target.html",
        ask: (skills, p) => `${chooseCommand(skills)} as-is ${p.root} --reason "<why>" [--marks <file>]`,
        jobs: "the tasks-* jobs and merge",
    }),
    ...gate({
        gate: "journeys",
        stage: "journeys",
        inputs: (p) => [p.current, p.choiceAsIs],
        proposal: (p) => p.journeyVariants,
        record: (p) => [p.choiceJourneys, p.journeys],
        pages: "target.html",
        ask: (skills, p) =>
            `${chooseCommand(skills)} journeys ${p.root} --reason "<why>" [--all-recommended] [--pick <task>=<variant>]`,
        jobs: "the variants-* jobs",
    }),
    ...gate({
        gate: "architecture",
        stage: "architecture",
        inputs: (p) => [p.journeys],
        proposal: (p) => p.architectureVariants,
        record: (p) => [p.choiceArchitecture],
        pages: "target/architecture.html",
        ask: (skills, p) => `${chooseCommand(skills)} architecture ${p.root} --pick "<variant>" --reason "<why>"`,
        jobs: "the shape job",
    }),
    ...gate({
        gate: "components",
        stage: "components",
        inputs: (p) => [p.choiceArchitecture, p.journeys],
        proposal: (p) => p.architecture,
        record: (p) => [p.choiceComponents],
        pages: "target/system.html",
        ask: (skills, p) => `${chooseCommand(skills)} components ${p.root} --reason "<why>"`,
        jobs: "the components-<domain> jobs of the domains to change and of every domain that depends on them",
    }),
    {
        name: "foundation",
        inputs: (p) => [p.payloads, p.requestJson, p.journeys, p.architecture, p.current],
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
        inputs: (p) => [join(p.records, "decisions.json"), p.bundles, p.journeys, p.architecture],
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
        inputs: (p) => [p.plan, p.payloads, p.target],
        makes: (p) => [join(p.app, "index.html")],
        action: ({ paths, skills }) => ({
            action: "run",
            step: "app",
            command: `CODE_ANALYSIS_ROOT=${paths.analysis} TARGET_CHOOSE="${chooseCommand(skills)}" ${bun(skills, "code-analysis", "build-app.ts", `--analysis ${paths.payloads} --plan ${paths.root} --target ${paths.root} --out ${paths.app}`)}`,
            why: "build the one app that shows the analysis and the plan",
        }),
    },
];
