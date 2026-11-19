import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gateProblems, type Gate } from "./gates";

export const changesFile = (records: string, gate: Gate) => join(records, `changes-${gate}.json`);
const unapplied = (records: string, gate: Gate) => {
    try {
        return (JSON.parse(readFileSync(changesFile(records, gate), "utf8")) as { applied?: boolean }[]).some(
            (each) => each.applied !== true,
        );
    } catch {
        return false;
    }
};

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

/**
 * The analysis's journeys of today are read by the as-is step and the app, which name the file themselves. A folder that
 * holds them (the analysis's payloads) is hashed without them, so a run that adopts them does not run again the steps
 * built from the rest of the analysis (the plan's agents among them).
 */
const namedByTheirReaders = new Set(["journeys.json", "journeys.schema.json"]);

/**
 * The bytes a file counts by: the file itself, or, for a JSON file named in `without`, the file with those top-level
 * fields taken out. A file that has none of them counts by its own bytes, so adding the rule changes no stored hash.
 */
const contentOf = (file: string, without: Record<string, readonly string[]>) => {
    const bytes = readFileSync(file);
    const fields = without[basename(file)];
    if (fields === undefined) return bytes;
    try {
        const value = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
        if (!fields.some((field) => field in value)) return bytes;
        for (const field of fields) delete value[field];
        return `${JSON.stringify(value, null, 2)}\n`;
    } catch {
        return bytes;
    }
};

/**
 * One fingerprint of files and folders.
 * @param paths the files and folders
 * @param without for a JSON file of that name, the top-level fields left out of the fingerprint
 * @returns the first 16 hex digits of a sha256
 */
export const hashFiles = (paths: readonly string[], without: Record<string, readonly string[]> = {}) => {
    const hash = createHash("sha256");
    const walk = (path: string, listed: boolean): string[] =>
        !existsSync(path)
            ? []
            : statSync(path).isDirectory()
              ? readdirSync(path)
                    .sort()
                    .flatMap((name) => walk(join(path, name), false))
              : !listed && namedByTheirReaders.has(basename(path))
                ? []
                : [path];
    for (const file of paths.flatMap((path) => walk(path, true))) {
        hash.update(file);
        hash.update(contentOf(file, without));
    }
    return hash.digest("hex").slice(0, 16);
};

export type Paths = ReturnType<typeof pathsOf>;
const here = dirname(fileURLToPath(import.meta.url));
/** What builds the app: its source and styles, the shared design system's stylesheet and the build command. A change in any reaches a rerun. */
const appSource = [
    join(here, "../../../shared/app/src"),
    join(here, "../../../shared/app/public"),
    join(here, "../../../shared/app/scripts"),
    join(here, "../../../shared/app/package.json"),
    join(here, "../../../shared/app/bun.lock"),
    join(here, "../../../shared/page-components/assets"),
    join(here, "../../code-analysis/shared/source"),
    join(here, "../../code-analysis/cli/build-app.ts"),
];
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
    journeysToday: join(root, ".code-analysis/payloads/journeys.json"),
    bundles: join(root, ".code-analysis/bundles"),
    records: join(root, ".modernization-backlog/work/records"),
    plan: join(root, ".modernization-backlog/payloads/plan.json"),
    backlog: join(root, ".modernization-backlog"),
    manifest: join(root, "work-items/manifest.json"),
    ledger: join(root, "work-items/ledger.json"),
    app: join(root, "app"),
    appSource,
});

export type Step = {
    name: string;
    /** Files or folders whose content decides whether the step must run again; `request` is the request file. */
    inputs: (paths: Paths, request: string) => string[];
    /** Top-level fields of a JSON input, by file name, that the step does not read: a change in them does not run it again. */
    without?: Record<string, readonly string[]>;
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
const changes = (jobs: string, gate: Gate, skills: string, root: string) =>
    `To change something instead, record their words with \`${chooseCommand(skills)} ${gate} ${root} --changes "<their words>" [--task <id> | --domain <name>]\`, then call next. (The jobs behind this decision: ${jobs}.)`;

/**
 * One decision of the target, the same three steps each time: the stage proposes, the pages show the proposal, the
 * person confirms. The pages step comes first so the question cannot be reached before the person can read the proposal;
 * its inputs include this decision's record and those before it, because the pages show what is confirmed and are rebuilt once it is.
 */
const gate = (input: {
    gate: Gate;
    stage: string;
    /** A command that makes the proposal, for a decision whose proposal is a read of the analysis and has no jobs. */
    derive?: (skills: string, p: Paths) => { command: string; why: string };
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
            action: ({ paths, skills }) =>
                input.derive === undefined
                    ? {
                          action: "invoke",
                          step: name,
                          skill: "shape-target",
                          instruction: `Run the shape-target skill's ${input.stage} stage for ${paths.root}: prepare it, drive its jobs, then finish it (see its SKILL.md; its scripts are in ${join(skills, "shape-target/cli")}).`,
                      }
                    : { action: "run", step: name, ...input.derive(skills, paths) },
        },
        {
            name: `${name}-pages`,
            inputs: (p) => [input.proposal(p), ...decided(p), ...p.appSource],
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
            action: ({ paths, skills }) =>
                unapplied(paths.records, input.gate)
                    ? {
                          action: "invoke",
                          step: `${name}-choose`,
                          skill: "shape-target",
                          instruction: `The person asked for changes to the ${input.gate} decision (${changesFile(paths.records, input.gate)}). Run \`MODERNIZATION_ROOT=${paths.root} bun ${join(skills, "shape-target/cli/stage.ts")} apply-changes ${input.gate}\`, drive the jobs it hands back, finish the ${input.gate} stage, then call next: the pages are built again and the question returns.`,
                      }
                    : {
                          action: "wait",
                          step: `${name}-choose`,
                          message: `Open ${join(paths.app, input.pages)} and show the person the proposal (${input.gate}); say what you recommend. They confirm with: ${input.ask(skills, paths)}. ${changes(input.jobs, input.gate, skills, paths.root)} Call next when it is recorded.`,
                      },
        },
    ];
};

/**
 * The fingerprint of a step's inputs, the one `next` compares and `--done` records.
 * @param step the step
 * @param paths the run's folders
 * @param request the request file
 * @returns the fingerprint
 */
export const inputsOf = (step: Step, paths: Paths, request: string) =>
    hashFiles(step.inputs(paths, request), step.without);

/**
 * The person's Goals are kept in request.json for readers and given to no agent and no derived file, so a step built
 * from the request does not run again when only they change.
 */
const goalsUnread = { "request.json": ["goals"] } as const;

/** The steps in order, as data: a step is due when what it makes is missing or its inputs changed since it ran. */
export const steps: Step[] = [
    {
        name: "request",
        // The request file itself, so an edited request is read again.
        inputs: (_, request) => [request],
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
        without: goalsUnread,
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
            instruction: `Run the code-analysis skill on ${paths.analysisRequest} through Publish (its journeys jobs write how people get their tasks done today), then write its payloads with \`CODE_ANALYSIS_ROOT=${paths.analysis} bun ${join(skills, "code-analysis/cli/write-payloads.ts")}\`. Do not build its site: the app is built once, after the plan.`,
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
        derive: (skills, p) => ({
            command: bun(skills, "shape-target", "derive.ts", `current ${p.root}`),
            why: "read today's tasks from the analysis's journeys (payloads/journeys.json); a run made before the analysis wrote them keeps its target/current.json",
        }),
        inputs: (p) => [p.legacy, p.bundles, p.journeysToday],
        proposal: (p) => p.current,
        record: (p) => [p.choiceAsIs],
        pages: "gate/as-is.html",
        ask: (skills, p) => `${chooseCommand(skills)} as-is ${p.root} --reason "<why>" [--marks <file>]`,
        jobs: "the analysis's journeys jobs (`journeys-of-<capability>`, `journeys-merge`), handed back there",
    }),
    ...gate({
        gate: "journeys",
        stage: "journeys",
        inputs: (p) => [p.current, p.choiceAsIs],
        proposal: (p) => p.journeyVariants,
        record: (p) => [p.choiceJourneys, p.journeys],
        pages: "gate/journeys.html",
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
        pages: "gate/architecture.html",
        ask: (skills, p) => `${chooseCommand(skills)} architecture ${p.root} --pick "<variant>" --reason "<why>"`,
        jobs: "the shape job",
    }),
    ...gate({
        gate: "components",
        stage: "components",
        inputs: (p) => [p.choiceArchitecture, p.journeys],
        proposal: (p) => p.architecture,
        record: (p) => [p.choiceComponents],
        pages: "gate/components.html",
        ask: (skills, p) => `${chooseCommand(skills)} components ${p.root} --reason "<why>"`,
        jobs: "the components-<domain> jobs of the domains to change and of every domain that depends on them",
    }),
    {
        name: "foundation",
        inputs: (p) => [p.payloads, p.requestJson, p.journeys, p.architecture, p.current],
        without: goalsUnread,
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
        inputs: (p) => [p.plan, p.payloads, p.journeysToday, p.target, ...p.appSource],
        makes: (p) => [join(p.app, "index.html")],
        action: ({ paths, skills }) => ({
            action: "run",
            step: "app",
            command: `CODE_ANALYSIS_ROOT=${paths.analysis} TARGET_CHOOSE="${chooseCommand(skills)}" ${bun(skills, "code-analysis", "build-app.ts", `--analysis ${paths.payloads} --plan ${paths.root} --target ${paths.root} --out ${paths.app}`)}`,
            why: "build the one app that shows the analysis and the plan",
        }),
    },
];
