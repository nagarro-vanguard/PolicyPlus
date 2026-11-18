import { join, resolve, sep } from "node:path";
import { artifactsOf, artifactsRoot, internalFolder, internalPath } from "./run-folder";

/** This skill's folder, the one holding `profiles/`, `agents/`, `references/` and `scripts/`. */
export const skillFolder = join(import.meta.dirname, "..", "..");

/** The folder, under the codebase, that holds every run, one `story-<n>` folder each. git must ignore it. */
export const artifactsFolder = artifactsOf("shape-and-deliver");

/** The two runs of the layers' checks: after the tests-only commit, and after the code commit. */
export type Phase = "afterTests" | "afterCode";

/** The plan's stages whose agents write records, in the order they run: each reads the ones before it. */
export const producerNames = ["orient", "trace", "changes", "tests"] as const;

export type Producer = (typeof producerNames)[number];

/** Every stage of a run, in the order its mode runs them: the plan's, then the build's. */
export const stageNames = [
    "work-item",
    ...producerNames,
    "plan-review",
    "tests-first",
    "code",
    "change-review",
] as const;

export type Stage = (typeof stageNames)[number];

/** The build stage each run of the layers' checks belongs to. */
const stageOfPhase = { afterTests: "tests-first", afterCode: "code" } as const satisfies Record<Phase, Stage>;

/**
 * A stage's folder, relative to the run folder: where its records, its model and its page live together.
 * Relative paths use `/`, since pages link by them; Node takes `/` on every host.
 * @param stage the stage
 * @returns the folder, relative to the run folder
 */
export const stageFolderOf = (stage: Stage) => `${internalFolder}/work/${stage}`;

/**
 * The plan request of a run, found from its run folder: what a step reads first, before it can build the run's layout
 * from the request.
 * @param runFolder the run's folder
 * @returns the request's path
 */
export const planRequestPath = (runFolder: string) => internalPath(runFolder, "work", "plan", "request.json");

/**
 * Every path of one run, in one place, so no script builds a run path of its own. Each stage's files live in its
 * own folder; the run's requests and the build's progress, which belong to no one stage, stay beside them.
 * @param codebase the codebase root
 * @param workItemId the work item's id
 * @returns the run's paths
 */
export function runLayout(codebase: string, workItemId: string) {
    const root = join(codebase, artifactsFolder, `story-${workItemId}`);
    const work = join(root, internalFolder, "work");
    const records = (folder: string) => ({
        folder,
        records: join(folder, "records.jsonl"),
        feedback: join(folder, "feedback.json"),
        handBack: join(folder, "hand-back.md"),
        files: join(folder, "files"),
    });
    const review = (name: "plan" | "change") => {
        const folder = join(root, stageFolderOf(name === "plan" ? "plan-review" : "change-review"));
        return {
            folder,
            records: join(folder, "findings.jsonl"),
            handBack: join(folder, "hand-back.md"),
            brief: join(folder, "brief.json"),
            /** What the review's own check found in its findings, for its one retry. */
            feedback: join(folder, "feedback.json"),
            /** The findings of a pass that failed the review's own check once: the retry's evidence and its mark. */
            rejected: join(folder, "findings.rejected.jsonl"),
        };
    };
    /** The folder of the stage a job's agent works for; the repair's records sit in the code stage's `fix` folder. */
    const jobFolderOf = (job: string) =>
        job === "code"
            ? join(root, stageFolderOf("code"), "fix")
            : join(root, stageFolderOf(stageNames.find((stage) => stage === job) ?? "work-item"));
    return {
        root,
        work,
        /** The mode the operator launched last, which `next` drives. */
        launch: join(work, "launch.json"),
        /** The agent `next` handed out and its driver has not closed yet. */
        batch: join(work, "batch.json"),
        /** Held by the driver while its step walks the run, so two drivers never walk it at once. */
        lock: join(work, "run.lock"),
        /** Why the run stopped, held until the operator launches it again. */
        stopped: join(work, "stopped.json"),
        /** Which profile the run is in, and the variant picked when it was designed. */
        profile: join(root, internalFolder, "profile.json"),
        /** The story's epic, as read from its tracker, which every plan agent reads first. */
        epic: join(root, internalFolder, "epic.md"),
        /** The story's legacy attachment, as the driver wrote it, which every plan agent reads after the epic. */
        reference: join(root, internalFolder, "reference.md"),
        planRequest: planRequestPath(root),
        buildRequest: join(work, "build", "request.json"),
        workItemMarkdown: join(root, stageFolderOf("work-item"), "work-item.md"),
        workItem: join(root, stageFolderOf("work-item"), "work-item.json"),
        /** The approval marker plan mode writes when the plan's review passes; `start --approve` reads it. */
        implementRequest: join(root, internalFolder, "implement-request.json"),
        assets: join(root, internalFolder, "assets"),
        orient: records(join(root, stageFolderOf("orient"))),
        trace: records(join(root, stageFolderOf("trace"))),
        changes: records(join(root, stageFolderOf("changes"))),
        tests: records(join(root, stageFolderOf("tests"))),
        fix: records(join(root, stageFolderOf("code"), "fix")),
        review,
        /**
         * The record of one agent run, in the folder of the round it closed: the stage's own folder for a job with no
         * rounds, and `rounds/<n>/` for one that has them.
         */
        agentRun: (job: string, round: number) =>
            join(jobFolderOf(job), ...(round > 0 ? ["rounds", String(round)] : []), "agent-run.json"),
        applied: join(work, "build", "applied.json"),
        layerChecks: (phase: Phase) => join(root, stageFolderOf(stageOfPhase[phase]), "layer-checks.json"),
        evidenceOf: (phase: Phase, layer: string) => join(root, stageFolderOf(stageOfPhase[phase]), "evidence", layer),
        manifest: (phase: Phase) => join(root, stageFolderOf(stageOfPhase[phase]), "manifest.json"),
        /**
         * What a finished build hands on, for whoever picks the work up: a JSON object of absolute paths, `workItemPath`
         * (the story as read), `manifestPath` (every test layer's proof), `orientationPath` (the facts the story could
         * break), `decisionsPath` (the code changes' decisions) and, when the build followed a design,
         * `designDecisionsPath`. Written when the change review passes.
         */
        result: join(root, "result.json"),
        runPage: join(root, "index.html"),
        planPage: join(root, "plan.html"),
        codePage: join(root, "code.html"),
        evidencePage: join(root, "evidence.html"),
    };
}

/**
 * Tells whether a path lies in the internal work folder of some run, where the agents' records are kept.
 * @param path the path, absolute or relative to the current folder
 * @returns true when it is below `.artifacts/shape-and-deliver/story-<n>/internal/work/`, with no `..` left in it
 */
export const isInRunWork = (path: string) => {
    const parts = resolve(path).split(sep);
    const at = parts.findIndex(
        (part, i) =>
            part === artifactsRoot &&
            parts[i + 1] === "shape-and-deliver" &&
            (parts[i + 2] ?? "").startsWith("story-") &&
            parts[i + 3] === internalFolder &&
            parts[i + 4] === "work",
    );
    return at >= 0 && parts.length > at + 5;
};

export type RunLayout = ReturnType<typeof runLayout>;
