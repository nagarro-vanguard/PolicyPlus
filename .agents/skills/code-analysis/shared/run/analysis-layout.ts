import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";
import { keysOf } from "./collections";
import { isWordCharacter } from "../model/record-ids";

export const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Whether a path lies inside a folder, the folder itself included.
 * @param folder the folder, as an absolute path
 * @param path an absolute path
 * @returns true when the path is the folder or below it
 */
export function isInsideFolder(folder: string, path: string): boolean {
    const fromFolder = relative(folder, path);
    return fromFolder === "" || (!fromFolder.startsWith("..") && !isAbsolute(fromFolder));
}

/**
 * The folder every `file` path in a record is relative to: the one source root itself, or the common parent of
 * several. It is derived from the request's roots each time it is needed, so no stored copy can disagree with them.
 * @param roots the source roots, as absolute paths; a request always names at least one
 * @returns the base folder
 */
export function sourceBase(roots: readonly [string, ...string[]]): string {
    const [first] = roots;
    if (roots.length < 2) {
        return first;
    }
    let base = dirname(first);
    while (!roots.every((root) => root.startsWith(base === "/" ? "/" : `${base}/`)) && dirname(base) !== base) {
        base = dirname(base);
    }
    return base;
}

/**
 * A path as the shell reads it: as written when it holds only letters, digits, underscores, dots, slashes and
 * hyphens, else in single quotes with any single quote inside escaped.
 * @param path the path
 * @returns the path, quoted when it needs to be
 */
export const shellWord = (path: string) =>
    path.length > 0 && [...path].every((char) => isWordCharacter(char) || "./-".includes(char))
        ? path
        : `'${path.replaceAll("'", `'\\''`)}'`;

/**
 * The command an agent runs a skill script with, `<this>/<script>.ts`: the folder of launchers in the analysis root
 * (`writeLaunchers`), each naming the root and running its script, so the call is one word that works from any
 * folder, typed or held in a variable, in any shell.
 * @param root the analysis root
 * @returns the command
 */
export const scriptsCommand = (root: string) => shellWord(join(root, "work", "scripts"));

const stageFolder = {
    inventory: "inventory",
    "how-it-runs": "how-it-runs",
    map: "map",
    "capabilities-and-entities": "capabilities-and-entities",
    "capability-rules": "capability-rules",
    publish: "publish",
} as const;

export type Stage = keyof typeof stageFolder;

export const stageNames = keysOf(stageFolder);

/**
 * A stage's work folder: everything its agents and scripts wrote for it.
 * @param root the analysis root
 * @param stage the stage
 * @returns the folder
 */
export const stageWorkFolder = (root: string, stage: Stage) => join(root, "work", stageFolder[stage]);

const stageTitles: Readonly<Record<Stage, string>> = {
    inventory: "Inventory",
    "how-it-runs": "How it runs",
    map: "The Map",
    "capabilities-and-entities": "Capabilities and entities",
    "capability-rules": "Capability rules",
    publish: "Publish",
};

/**
 * A stage as a person names it, on the run page and in `show`.
 * @param stage the stage
 * @returns its name
 */
export const stageTitle = (stage: Stage) => stageTitles[stage];

export const inventoryJobLabel = "the parts, technologies and scope";

/** The job key of Inventory's one job in the job state. */
export const inventoryJobKey = "profile-tech-stack";

/** The job key of Publish's briefing in the job state. */
export const briefingKey = "the briefing";

/**
 * A study of How it runs as a person names it (P4e.5): by what it studies.
 * @param key the job's key: its technology, its first part and how many more, or its part and which area
 * @returns its name
 */
export const studyJobLabel = (key: string) => `the study of ${key}`;

const subjectFolder = posix.join("work", "pages");

/**
 * The paths of what Inventory's scripts write beside its job: the listing, the `Unread` records a script wrote for the
 * lines no reader can read (with the ids first issued), and the copy of a source file decoded to UTF-8 with its line
 * breaks made one line feed, which agents read.
 * @param stageWork a file or folder under a stage's work folder
 * @returns the paths
 */
const inventoryPaths = (stageWork: (stage: Stage, ...parts: readonly string[]) => string) => ({
    inventory: stageWork("inventory", "inventory.jsonl"),
    unread: stageWork("inventory", "unread.jsonl"),
    decodedCopy: (path: string) => stageWork("inventory", "decoded", path),
});

/**
 * The paths of the Map's registries (P1.38): where they stand, the reviewed jobs' windows its proposing jobs read, each
 * registry as accepted, the entries Map jobs wrote, every entry together for the Map's jobs, each registry's rules,
 * and each proposing job's files.
 * @param stageWork a file or folder under a stage's work folder
 * @returns the paths
 */
const mapRegistriesPaths = (stageWork: (stage: Stage, ...parts: readonly string[]) => string) => {
    const at = (...parts: readonly string[]) => stageWork("map", "registries", ...parts);
    return {
        registry: (kind: "codeKinds" | "externalSystems") => at(`${kind}.jsonl`),
        written: at("written.jsonl"),
        both: at("registry.jsonl"),
        rules: (kind: "codeKinds" | "externalSystems") =>
            join(skillRoot, "stages", "map", "rules", kind === "codeKinds" ? "code-kinds.md" : "external-systems.md"),
        folder: (jobId: string) => at(jobId),
        /** One proposing job's brief: its commands, its rules and what to read besides. */
        brief: (jobId: string) => at(jobId, "brief.md"),
        files: (jobId: string) => ({
            outputPath: at(jobId, "output.jsonl"),
            reviewPath: at(jobId, "review.jsonl"),
            roundsFolder: at(jobId, "rounds"),
        }),
    };
};

/**
 * The paths of a stage's concluding jobs (D177): their list, and each job's topics and files.
 * @param stageWork a file or folder under a stage's work folder
 * @returns the paths, as a function of the stage
 */
const conclusionsPaths = (stageWork: (stage: Stage, ...parts: readonly string[]) => string) => (stage: Stage) => ({
    step: stageWork(stage, "conclusions"),
    list: stageWork(stage, "conclusions", "jobs.json"),
    folder: (jobId: string) => stageWork(stage, "conclusions", jobId),
    topics: (jobId: string) => stageWork(stage, "conclusions", jobId, "topics.json"),
    files: (jobId: string) => ({
        outputPath: stageWork(stage, "conclusions", jobId, "output.jsonl"),
        reviewPath: stageWork(stage, "conclusions", jobId, "review.jsonl"),
        roundsFolder: stageWork(stage, "conclusions", jobId, "rounds"),
    }),
});

/**
 * The paths of a whole stage's audit (plan 0004): the stage's accepted records as its findings, its review, its rounds,
 * its report and its feedback.
 * @param stageWork a file or folder under a stage's work folder
 * @returns the paths, as a function of the stage
 */
const stageAuditPaths = (stageWork: (stage: Stage, ...parts: readonly string[]) => string) => (stage: Stage) => ({
    outputPath: stageWork(stage, "audit", "records.jsonl"),
    reviewPath: stageWork(stage, "audit", "review.jsonl"),
    roundsFolder: stageWork(stage, "audit", "rounds"),
});

/**
 * The paths of Capabilities and entities (D30): its jobs, each job's files, its brief, rules and registry.
 * @param stageWork a file or folder under a stage's work folder
 * @returns the paths
 */
const capabilitiesAndEntitiesPaths = (stageWork: (stage: Stage, ...parts: readonly string[]) => string) => ({
    jobs: stageWork("capabilities-and-entities", "jobs.json"),
    /** One job's folder, named by its job id. */
    job: (jobId: string) => stageWork("capabilities-and-entities", "jobs", jobId),
    /** One job's units and state. */
    jobFile: (jobId: string) => stageWork("capabilities-and-entities", "jobs", jobId, "job.json"),
    /** What a proposing job wrote: the registry's entries. */
    entries: (jobId: string) => stageWork("capabilities-and-entities", "jobs", jobId, "entries.jsonl"),
    /** What an assigning job wrote: its units' assignments and notes. */
    assignments: (jobId: string) => stageWork("capabilities-and-entities", "jobs", jobId, "assignments.jsonl"),
    /** What the reviewer wrote on one job's output. */
    review: (jobId: string) => stageWork("capabilities-and-entities", "jobs", jobId, "review.jsonl"),
    /** One job's earlier outputs, one numbered folder each. */
    rounds: (jobId: string) => stageWork("capabilities-and-entities", "jobs", jobId, "rounds"),
    /** One job's brief: its commands, its rules and what to read besides. */
    jobBrief: (jobId: string) => stageWork("capabilities-and-entities", "jobs", jobId, "brief.md"),
    brief: stageWork("capabilities-and-entities", "brief.json"),
    /** The registry of one kind, as agents read it: one entry's JSON line each, written from the store. */
    registry: (kind: "capabilities" | "entities") =>
        stageWork("capabilities-and-entities", "registry", `${kind}.jsonl`),
    /** The registry of one kind as a reader reads it once merged (D241): the entries standing, each with `mergedFrom`. */
    standing: (kind: "capabilities" | "entities") =>
        stageWork("capabilities-and-entities", "registry", `${kind}-standing.jsonl`),
    written: stageWork("capabilities-and-entities", "registry", "written.jsonl"),
    /** The whole registry of one kind as the merge's jobs search it: one line per entry, seeded or written (D215). */
    toMerge: (kind: "capabilities" | "entities") =>
        stageWork("capabilities-and-entities", "registry", `${kind}-to-merge.jsonl`),
    rules: join(skillRoot, "stages", "capabilities-and-entities", "rules", "capabilities-and-entities.md"),
});

/**
 * The paths of Capability rules (D120, D124): the capabilities chosen, its jobs, each job's files, its brief, the
 * accepted lives the rules jobs choose from, and its two review checklists.
 * @param stageWork a file or folder under a stage's work folder
 * @returns the paths
 */
const capabilityRulesPaths = (stageWork: (stage: Stage, ...parts: readonly string[]) => string) => ({
    scope: stageWork("capability-rules", "scope.json"),
    jobs: stageWork("capability-rules", "jobs.json"),
    /** One job's folder, named by its job id. */
    job: (jobId: string) => stageWork("capability-rules", "jobs", jobId),
    /** One job's units and state. */
    jobFile: (jobId: string) => stageWork("capability-rules", "jobs", jobId, "job.json"),
    /** What write-entity-lifecycle wrote: one entity's life. */
    lifecycle: (jobId: string) => stageWork("capability-rules", "jobs", jobId, "lifecycle.jsonl"),
    /** What write-business-rules wrote: its blocks' rules. */
    rules: (jobId: string) => stageWork("capability-rules", "jobs", jobId, "rules.jsonl"),
    /** Every save and read of a lifecycle job's entity, the file its agent searches (D224). */
    uses: (jobId: string) => stageWork("capability-rules", "jobs", jobId, "uses.jsonl"),
    /** What the reviewer wrote on one job's output. */
    review: (jobId: string) => stageWork("capability-rules", "jobs", jobId, "review.jsonl"),
    /** The records dropped from one job's output, with why: what the next review is handed. */
    drops: (jobId: string) => stageWork("capability-rules", "jobs", jobId, "drops.jsonl"),
    /** One job's earlier outputs, one numbered folder each. */
    rounds: (jobId: string) => stageWork("capability-rules", "jobs", jobId, "rounds"),
    /** One job's brief: its commands, its rules and what to read besides. */
    jobBrief: (jobId: string) => stageWork("capability-rules", "jobs", jobId, "brief.md"),
    brief: stageWork("capability-rules", "brief.json"),
    /** The older copies of definitions a newer file repeats, which no rules job reads: every one, listed. */
    lifecycleRules: join(skillRoot, "stages", "capability-rules", "rules", "entity-lifecycle.md"),
    businessRules: join(skillRoot, "stages", "capability-rules", "rules", "business-rules.md"),
    lifecycles: stageWork("capability-rules", "lifecycles.jsonl"),
    lifecycleChecklist: join(skillRoot, "stages", "capability-rules", "checklist-lifecycle.md"),
    rulesChecklist: join(skillRoot, "stages", "capability-rules", "checklist-rules.md"),
});

/**
 * Every path the skill reads or writes under one analysis root: the record store, the work folders, and the files of each
 * stage and job.
 * @param root the analysis root
 * @returns the paths, as text and as functions of a stage, job or name
 */
export function analysisPaths(root: string) {
    const work = join(root, "work");
    /**
     * A file or folder under a stage's work folder, such as an agent's output.
     * @param stage the stage
     * @param parts the path under the stage's work folder
     * @returns the path
     */
    const stageWork = (stage: Stage, ...parts: readonly string[]) => join(work, stageFolder[stage], ...parts);
    return {
        root,
        recordStore: join(root, "analysis.sqlite"),
        skillCli: join(skillRoot, "cli"),
        jobState: join(root, "analysis.sqlite"),
        work,
        analysisRequest: join(work, "analysis-request.json"),
        launchers: join(work, "scripts"),
        assumptionsAccepted: join(work, "assumptions-accepted.json"),
        conclusions: conclusionsPaths(stageWork),
        stageAudit: stageAuditPaths(stageWork),
        pages: join(root, subjectFolder),
        /** Where the app, the pages a person reads the analysis through, is built by default. */
        app: join(root, "app"),
        ...inventoryPaths(stageWork),
        howItRunsJobs: stageWork("how-it-runs", "jobs.json"),
        /** One How it runs job's folder, named by its job id; the job's stack name is in the job list, never in a path. */
        howItRunsJob: (jobId: string) => stageWork("how-it-runs", "jobs", jobId),
        /** What study-how-it-runs wrote for one job. */
        studyOutput: (jobId: string) => stageWork("how-it-runs", "jobs", jobId, "study.jsonl"),
        /** What the reviewer wrote on one job's study. */
        reviewOutput: (jobId: string) => stageWork("how-it-runs", "jobs", jobId, "review.jsonl"),
        /** The earlier rounds of one job's study, one numbered folder each. */
        studyRounds: (jobId: string) => stageWork("how-it-runs", "jobs", jobId, "rounds"),
        /** One study's registry: its parts and the technologies they use, written by its `prepare`. */
        studyRegistry: (jobId: string) => stageWork("how-it-runs", "jobs", jobId, "registry.jsonl"),
        /** What one study is given: its topics, and an area job's area (H1). */
        studyTopics: (jobId: string) => stageWork("how-it-runs", "jobs", jobId, "topics.json"),
        blocksAndContainers: join(skillRoot, "stages", "map", "rules", "blocks-and-containers.md"),
        /** The review checklist of a stage: what wrong and missing mean there, for its reviewer. */
        reviewChecklist: (stage: Stage) => join(skillRoot, "stages", stage, "checklist.md"),
        stageChecklist: join(skillRoot, "shared", "checklists", "whole-stage.md"),
        topicsChecklist: join(skillRoot, "shared", "checklists", "topics.md"),
        registryChecklist: join(skillRoot, "shared", "checklists", "registry.md"),
        mapJobs: stageWork("map", "jobs.json"),
        /** One Map job's folder, named by its job id. */
        mapJob: (jobId: string) => stageWork("map", "jobs", jobId),
        /** One Map job's windows. */
        mapJobFile: (jobId: string) => stageWork("map", "jobs", jobId, "job.json"),
        /** What map-blocks-and-links wrote for one job. */
        mapOutput: (jobId: string) => stageWork("map", "jobs", jobId, "map.jsonl"),
        /** What the reviewer wrote on one job's map. */
        mapReview: (jobId: string) => stageWork("map", "jobs", jobId, "review.jsonl"),
        /** The earlier rounds of one Map job, one numbered folder each. */
        mapRounds: (jobId: string) => stageWork("map", "jobs", jobId, "rounds"),
        mapBrief: stageWork("map", "brief.json"),
        /** Names the Map's blocks define in more than one file, each with every copy: a highlight, nothing is merged. */
        mapRepeatedDefinitions: stageWork("map", "repeated-definitions.jsonl"),
        /** Names external links use that a block in scope defines, with the call sites and the definitions. */
        mapNamesDefinedInScope: stageWork("map", "names-defined-in-scope.jsonl"),
        mapAssumptions: stageWork("map", "assumptions.jsonl"),
        /** The record id each Map assumption was first issued, by the coordinates that identify it. */
        mapAssumptionIds: stageWork("map", "assumption-ids.json"),
        /** One Map job's brief: the stage's brief cut to the parts and technologies its windows touch. */
        mapJobBrief: (jobId: string) => stageWork("map", "jobs", jobId, "brief.json"),
        mapRegistries: mapRegistriesPaths(stageWork),
        capabilitiesAndEntities: capabilitiesAndEntitiesPaths(stageWork),
        capabilityRules: capabilityRulesPaths(stageWork),
        fileSummary: stageWork("inventory", "file-summary.json"),
        techStackOutput: stageWork("inventory", "profile-tech-stack", "output.jsonl"),
        techStackReview: stageWork("inventory", "profile-tech-stack", "review.jsonl"),
        techStackRounds: stageWork("inventory", "profile-tech-stack", "rounds"),
        briefingBrief: stageWork("publish", "briefing", "brief.jsonl"),
        briefingOutput: stageWork("publish", "briefing", "briefing.jsonl"),
        briefingReview: stageWork("publish", "briefing", "review.jsonl"),
        briefingRounds: stageWork("publish", "briefing", "rounds"),
    };
}
