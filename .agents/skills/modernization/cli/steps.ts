import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hashFiles as sharedHash } from "../../plan-modernization-backlog/shared/read/fingerprint";
import { analysisStoreOf, journeysGuard, payloadProblems } from "./analysis";
import { gateProblems, type Gate } from "./gates";
import { MAX_ROUNDS, roundsOf } from "../../shape-target/shared/jobs/rounds";
import { layoutOf as shapeLayoutOf } from "../../shape-target/shared/model/layout";
import { changedSinceBuilt } from "../../plan-modernization-backlog/shared/derive/built-from";
import { layoutOf as planLayoutOf } from "../../plan-modernization-backlog/shared/model/layout";

/** What the conductor asks of whoever drives it: one action at a time. It never does the work itself. */
export type Action =
    | { action: "run"; step: string; command: string; why: string }
    | { action: "invoke"; step: string; skill: string; instruction: string }
    | { action: "stop"; step: string; message: string }
    | { action: "done"; message: string };

export type State = { request: string; steps: Record<string, { inputs: string; at: string }> };

export const skillsOf = (conductorRoot: string) => resolve(conductorRoot, "..");

/**
 * One fingerprint of files and folders: the plan's shared function (the same files count for the plan's `builtFrom`),
 * cut to 16 hex digits as `state.json` has always kept it.
 * @param paths the files and folders
 * @param without for a JSON file of that name, the top-level fields left out of the fingerprint
 * @returns the first 16 hex digits of a sha256
 */
export const hashFiles = (paths: readonly string[], without: Record<string, readonly string[]> = {}) =>
    sharedHash(paths, { without }).slice(0, 16);

export type Paths = ReturnType<typeof pathsOf>;
const here = dirname(fileURLToPath(import.meta.url));
/** What builds the app: compose, its source and styles and the build command. A change in any reaches a rerun. */
const appSource = [
    join(here, "../../../shared/app/compose"),
    join(here, "../../../shared/app/src"),
    join(here, "../../../shared/app/public"),
    join(here, "../../../shared/app/scripts"),
    join(here, "../../../shared/app/package.json"),
    join(here, "../../../shared/app/bun.lock"),
    join(here, "../../code-analysis/shared/source"),
    join(here, "../../code-analysis/cli/build-app.ts"),
];
/** What derives the plan, its bodies and its contexts: the plan skill's code. A change in it reaches a rerun. */
const planSource = [join(here, "../../plan-modernization-backlog/shared")];
/** What writes the reader's texts of the analysis and of the target: their generators. A change in one reaches a rerun. */
const analysisContextsSource = [
    join(here, "../../code-analysis/cli/write-contexts.ts"),
    join(here, "../../code-analysis/shared/read/context-files.ts"),
    join(here, "../../code-analysis/shared/read/context-labels.ts"),
];
const targetContextsSource = [
    join(here, "../../shape-target/cli/contexts.ts"),
    join(here, "../../shape-target/shared/derive/context.ts"),
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
    architecture: join(root, "target/architecture.json"),
    analysis: join(root, ".code-analysis"),
    payloads: join(root, ".code-analysis/payloads"),
    journeysToday: join(root, ".code-analysis/payloads/journeys.json"),
    bundles: join(root, ".code-analysis/bundles"),
    contexts: join(root, ".code-analysis/contexts"),
    targetContexts: join(root, "target/contexts"),
    planContexts: join(root, "work-items/contexts"),
    analysisContextsSource,
    targetContextsSource,
    records: join(root, ".modernization-backlog/work/records"),
    plan: join(root, ".modernization-backlog/payloads/plan.json"),
    backlog: join(root, ".modernization-backlog"),
    manifest: join(root, "work-items/manifest.json"),
    bodies: join(root, "work-items/bodies"),
    attachments: join(root, "work-items/attachments"),
    app: join(root, "app"),
    case: join(root, "case"),
    appSource,
    planSource,
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
    /** What changed since the step's output was made, by what that output records it was made from; due again when any. */
    outdated?: (paths: Paths) => string[];
    action: (ctx: { paths: Paths; skills: string; request: string }) => Action;
};

/** What changed since the plan was built, by its `builtFrom`; nothing for a missing or older plan. */
const planOutdated = (root: string, plan: string): string[] => {
    if (!existsSync(plan)) return [];
    try {
        return changedSinceBuilt(planLayoutOf(root), JSON.parse(readFileSync(plan, "utf8")) as never) ?? [];
    } catch {
        return [];
    }
};

/**
 * The command that writes a bundle of the analysis, for the app's copy menu (the copied context): the app prints it as
 * it is given, with a capability or screen after it.
 */
const buildBundle = (skills: string, p: Paths) =>
    `BUILD_BUNDLE="CODE_ANALYSIS_ROOT=${p.analysis} bun ${join(skills, "code-analysis/cli/build-bundle.ts")}"`;

const bun = (skills: string, skill: string, script: string, args: string) =>
    `bun ${join(skills, skill, "cli", script)} ${args}`;

const decideCommand = (skills: string, gate: Gate, root: string) =>
    `bun "${join(skills, "shape-target/cli/decide.ts")}" ${gate} "${root}"`;

/** Why a stage that failed its final checks too many times stops the run, or nothing while it may still be run again. */
const roundsGuard = (p: Paths, gate: Gate): string | undefined => {
    if (gate === "as-is") return undefined;
    const rounds = roundsOf(shapeLayoutOf(p.root), gate);
    return rounds !== undefined && rounds.count >= MAX_ROUNDS
        ? `the ${gate} stage failed its final checks ${rounds.count} times and is not run again; the last failure was:\n${rounds.text}`
        : undefined;
};

/**
 * One decision of the target, in two steps: the stage proposes, then the decision is made from the proposal, the same
 * way every time (shape-target's `decide.ts`). Nobody is asked. A decision that no longer holds (what it decides on
 * changed) is made again without running the stage's jobs; a stage whose inputs changed runs again.
 */
const gate = (input: {
    gate: Gate;
    stage: string;
    /** A command that makes the proposal, for a decision whose proposal is a read of the analysis and has no jobs. */
    derive?: (skills: string, p: Paths) => { command: string; why: string };
    /** Why the proposal cannot be made yet, when the analysis lacks what it reads; the step then stops with it. */
    guard?: (p: Paths) => string | undefined;
    inputs: Step["inputs"];
    proposal: (p: Paths) => string;
    record: (p: Paths) => string[];
}): Step[] => {
    const name = `target-${input.gate}`;
    return [
        {
            name,
            inputs: input.inputs,
            makes: (p) => [input.proposal(p)],
            action: ({ paths, skills }) => {
                const stop = input.guard?.(paths) ?? roundsGuard(paths, input.gate);
                return stop !== undefined
                    ? { action: "stop", step: name, message: stop }
                    : input.derive === undefined
                      ? {
                            action: "invoke",
                            step: name,
                            skill: "shape-target",
                            instruction: `Run the shape-target skill's ${input.stage} stage for ${paths.root}: prepare it, drive its jobs, then finish it (see its SKILL.md; its scripts are in ${join(skills, "shape-target/cli")}). When a final check fails, finish names the gap: hand the job that should fix it back with \`redo\` and the gap as its instructions, then finish again.`,
                        }
                      : { action: "run", step: name, ...input.derive(skills, paths) };
            },
        },
        {
            name: `${name}-decide`,
            inputs: (p) => [input.proposal(p)],
            makes: (p) => input.record(p),
            valid: (p) => gateProblems(p, input.gate),
            action: ({ paths, skills }) => ({
                action: "run",
                step: `${name}-decide`,
                command: decideCommand(skills, input.gate, paths.root),
                why: `decide the ${input.gate} of the target from what its stage proposed`,
            }),
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
        name: "payloads",
        inputs: (p) => [p.payloads],
        makes: (p) => [join(p.payloads, "manifest.json")],
        // The payloads hold while their manifest says the contract these scripts read; otherwise they are written again, by script.
        valid: (p) => payloadProblems(p),
        action: ({ paths, skills }) => {
            const store = analysisStoreOf(paths);
            if (store === undefined)
                return {
                    action: "stop",
                    step: "payloads",
                    message: `${payloadProblems(paths).join("; ")}, and no analysis store is found: run the analysis here, or if it was made elsewhere name that folder with \`bun ${join(skills, "modernization/cli/locate-analysis.ts")} ${paths.root} <the folder that holds analysis.sqlite>\`, then call next`,
                };
            const write = bun(skills, "code-analysis", "write-payloads.ts", "");
            // A store beside the Output Root is its own; one elsewhere has its payloads copied in, keeping today's journeys the store does not hold.
            return {
                action: "run",
                step: "payloads",
                command:
                    store === paths.analysis
                        ? `CODE_ANALYSIS_ROOT=${store} ${write}`
                        : `CODE_ANALYSIS_ROOT=${store} ${write} && mkdir -p ${paths.payloads} && rsync -a --delete --exclude journeys.json ${store}/payloads/ ${paths.payloads}/ && ${bun(skills, "modernization", "keep-journeys.ts", paths.payloads)}`,
                why: "write the payloads again from the analysis's store, for the contract these scripts read",
            };
        },
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
        name: "contexts",
        inputs: (p) => [p.payloads, join(p.analysis, "personas.json"), ...p.analysisContextsSource],
        makes: (p) => [join(p.contexts, "index.json")],
        action: ({ paths, skills }) => ({
            action: "run",
            step: "contexts",
            command: bun(
                skills,
                "code-analysis",
                "write-contexts.ts",
                `--payloads ${paths.payloads} --out ${paths.contexts}`,
            ),
            why: "write the text a reader copies for each place of the old system, from the payloads",
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
        guard: journeysGuard,
        derive: (skills, p) => ({
            command: bun(skills, "shape-target", "derive.ts", `current ${p.root}`),
            why: "read today's tasks from the analysis's journeys (payloads/journeys.json); a run made before the analysis wrote them keeps its target/current.json",
        }),
        inputs: (p) => [p.legacy, p.bundles, p.journeysToday],
        proposal: (p) => p.current,
        record: (p) => [p.choiceAsIs],
    }),
    ...gate({
        gate: "journeys",
        stage: "journeys",
        // The request's goals are context of the journeys, so the journeys run again when a goal is edited.
        inputs: (p) => [p.current, p.choiceAsIs, p.requestJson],
        proposal: (p) => p.journeyVariants,
        record: (p) => [p.choiceJourneys, p.journeys],
    }),
    ...gate({
        gate: "architecture",
        stage: "architecture",
        // The architecture answers each goal and is designed against the target stack, so the request is read again when either changes.
        inputs: (p) => [p.journeys, p.requestJson],
        proposal: (p) => p.architectureVariants,
        record: (p) => [p.choiceArchitecture],
    }),
    ...gate({
        gate: "components",
        stage: "components",
        inputs: (p) => [p.choiceArchitecture, p.journeys],
        proposal: (p) => p.architecture,
        record: (p) => [p.choiceComponents],
    }),
    {
        name: "target-contexts",
        inputs: (p) => [p.architecture, p.journeys, p.choiceComponents, p.payloads, ...p.targetContextsSource],
        makes: (p) => [join(p.targetContexts, "index.json")],
        action: ({ paths, skills }) => ({
            action: "run",
            step: "target-contexts",
            command: bun(skills, "shape-target", "contexts.ts", paths.root),
            why: "write the text a reader copies for each journey and part of the target, from its records",
        }),
    },
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
        inputs: (p) => [p.records, p.bundles, ...p.planSource],
        makes: (p) => [p.plan, p.manifest],
        // The plan records what it was built from (`builtFrom`); a target confirmed again reaches it even when the
        // stories' records came out the same. A plan made before it kept that is left as it is.
        outdated: (p) => planOutdated(p.root, p.plan),
        action: ({ paths, skills }) => ({
            action: "run",
            step: "plan",
            command: bun(skills, "plan-modernization-backlog", "plan.ts", `build ${paths.root}`),
            why: "derive the plan and check every gate; on exit 1 the failing gates name what to re-run",
        }),
    },
    {
        name: "app",
        inputs: (p) => [
            p.plan,
            p.bodies,
            p.attachments,
            p.planContexts,
            p.contexts,
            p.targetContexts,
            p.payloads,
            p.journeysToday,
            p.target,
            ...p.appSource,
        ],
        makes: (p) => [join(p.app, "index.html")],
        action: ({ paths, skills }) => ({
            action: "run",
            step: "app",
            command: `CODE_ANALYSIS_ROOT=${paths.analysis} ${buildBundle(skills, paths)} ${bun(skills, "code-analysis", "build-app.ts", `--analysis ${paths.payloads} --plan ${paths.root} --target ${paths.root} --out ${paths.app} --case ${paths.case}`)}`,
            why: "compose the case from the analysis, the target and the plan, then build the one app that shows it",
        }),
    },
];
