import { join } from "node:path";
import { Console, Effect } from "effect";
import { Command } from "effect/cli";
import { runFolderArgument } from "./arguments";
import { isFilePathInside } from "./contained-path";
import { commitsFirst, layerOfPath, readCodebase, type Codebase } from "./codebase";
import { ImplementRequest } from "./delivery-request";
import { WorkItem, type Applied } from "./documents";
import { git, gitSaysYes, headCommit, uncommittedFiles } from "./git";
import { runLayout } from "./run-layout";
import { failureOutputKept } from "./policy";
import { needsAction } from "./run-script";
import { GeneratorFailed, GitFailed, RequestInvalid, WorkingTreeNotClean } from "./script-errors";
import { readApplied, readPlanRequest, readStageInput } from "./stage";
import { System } from "./system";
import type { Render } from "./render-run";
import { renderAfter, renderCommand } from "./render-step";
import type { RecordOf } from "./record-files";
import { baseCheckGaps, changedFilesIn, pathStepsIn } from "./plan-gates";

const commitType = { feature: "feat", bug: "fix", technical: "feat", design: "feat" } as const;

/**
 * What an apply step did, in the line it prints: its part of the plan committed now (`committed`) or already there, or
 * why it stops.
 */
export type ApplyOutcome = {
    readonly outcome: "applied" | "pending" | "stop";
    /** Why a stop happened, when it is one a person must settle: the branch no longer takes the plan. */
    readonly kind?: "branch";
    readonly said: string;
    readonly committed: boolean;
};

/** The plan's files written but not committed, because a hook or a generator refused. */
type Pending = NonNullable<Applied["pending"]>;

/**
 * The outcome while the plan's files are in the tree and not committed, which the repair resolves.
 * @param pending the half-applied state
 * @returns the outcome, saying why
 */
const pendingOutcome = (pending: Pending) =>
    ({
        outcome: "pending",
        said: `the plan's code is written but not committed: ${pending.said}`,
        committed: false,
    }) satisfies ApplyOutcome;

/**
 * Prints what an apply step did, and sets the exit code to 1 when it stopped.
 * @param applied what the step did
 * @returns nothing once printed
 */
const printApplied = Effect.fnUntraced(function* (applied: ApplyOutcome) {
    yield* Console.log(applied.said);
    if (applied.outcome === "stop") {
        yield* needsAction;
    }
});

/**
 * Words a commit message: the first line is `type: subject` with the subject's first letter lowered, cut to 72
 * characters, followed by a `Refs:` line with the work item's id.
 * @param type the commit type
 * @param subject what the commit does
 * @param workItemId the work item's id
 * @returns the message
 */
const commitMessage = (type: string, subject: string, workItemId: string) => {
    const words = `${subject.charAt(0).toLowerCase()}${subject.slice(1)}`;
    return `${`${type}: ${words}`.slice(0, 72)}\n\nRefs: ${workItemId}`;
};

/**
 * Reads what an apply step needs: the run's layout, the plan and build requests, the work item, the codebase and what
 * has been applied so far.
 * @param runFolder the run's folder
 * @returns the run
 * Fails: StageOutputMissing, RequestInvalid, CodebaseContractBroken.
 */
const implementRun = Effect.fnUntraced(function* (runFolder: string) {
    const plan = yield* readPlanRequest("apply-change-plan", runFolder);
    const layout = runLayout(plan.codebase, plan.workItemId);
    const build = yield* readStageInput("apply-change-plan", layout.buildRequest, ImplementRequest);
    const workItem = yield* readStageInput("apply-change-plan", layout.workItem, WorkItem);
    const applied = yield* readApplied("apply-change-plan", layout.applied);
    return { layout, plan, build, workItem, applied, codebase: yield* readCodebase(plan.codebase) };
});

/**
 * Runs the commands the plan records for its generated files, in plan order, each from the folder of the layer of the
 * file it writes, and prints a line for each. The first one that fails stops the apply step before anything is
 * committed: a commit made over a failed generator would carry stale generated files. Each command has the System
 * runner's timeout.
 * @param codebase the codebase and its layers
 * @param changes the plan's ChangedFile records
 * @returns nothing once every command succeeded
 * Writes: whatever the commands write.
 * Fails: GeneratorFailed, naming the layer, the command, its exit code and the end of its output.
 * @public
 */
export const runGenerators = Effect.fn("Apply.runGenerators")(function* (
    codebase: Codebase,
    changes: readonly RecordOf<"ChangedFile">[],
) {
    const system = yield* System;
    for (const change of changes) {
        const { command } = change;
        if (change.action !== "generate" || command === undefined) {
            continue;
        }
        const layer = layerOfPath(codebase, change.path);
        const outcome = yield* system.run("sh", ["-c", command], join(codebase.root, layer?.path ?? "."), {});
        const named = layer?.name ?? "the root";
        yield* Console.log(`${outcome.exitCode === 0 ? "generated" : "GENERATE FAILED"}  ${named}  ${command}`);
        if (outcome.exitCode !== 0) {
            return yield* new GeneratorFailed({
                layer: named,
                command,
                exitCode: outcome.exitCode,
                outputEnd: outcome.output.slice(-failureOutputKept),
            });
        }
    }
});

/** Where proposed files are kept, and which of them this commit takes. */
type Source = { readonly folder: string; readonly keep?: (file: string) => boolean };

/**
 * Lists the files the sources propose, each with its folder, after refusing any path the plan may not write or delete.
 * @param root the codebase root
 * @param sources the folders holding the proposed files, and which of their files to take
 * @param deletes the files to delete, relative to the root
 * @returns each proposed file with the folder that holds it
 * Fails: RequestInvalid for a path that is not a file inside the codebase, or a delete that names a folder.
 */
const proposalsOf = Effect.fnUntraced(function* (root: string, sources: readonly Source[], deletes: readonly string[]) {
    const system = yield* System;
    const proposed = new Map<string, string>();
    for (const { folder, keep = () => true } of sources) {
        for (const file of (yield* system.listFiles(folder)).filter(keep)) {
            proposed.set(file, folder);
        }
    }
    for (const path of [...proposed.keys(), ...deletes]) {
        if (!isFilePathInside(path)) {
            return yield* new RequestInvalid({
                issue: `${path} is not a file inside the codebase; the plan may write or delete files only, never a folder, .git or a path outside the root`,
            });
        }
    }
    for (const file of deletes) {
        if (yield* system.isFolder(join(root, file))) {
            return yield* new RequestInvalid({
                issue: `the plan deletes ${file}, which is a folder; a delete removes one file, so list each file`,
            });
        }
    }
    return proposed;
});

/**
 * Requires a clean working tree, copies the proposed files in, deletes the files to delete, runs the generators and
 * commits all of it. When there is nothing to commit, the last commit is adopted if its message is this one, which is how a run
 * stopped before recording its commit resumes.
 * @param codebase the codebase and its layers
 * @param sources the folders holding the proposed files, laid out like the codebase, and which of their files to take
 * @param plan what else the commit does
 * @param plan.deletes the files to delete, relative to the root
 * @param plan.generated the plan's ChangedFile records, whose generate commands run after the files are applied
 * @param message the commit message
 * @returns the commit, or the half-applied state when a generator or a hook refused: the tree was clean when the call
 * began, so everything dirty afterwards is what this call wrote
 * Writes: the copied and deleted files and what the generators write; git add and commit.
 * Fails: WorkingTreeNotClean, RequestInvalid for a path that is not a file inside the codebase, GitFailed (also when nothing is to be committed and the last commit has another message).
 */
const commitFiles = Effect.fnUntraced(function* (
    codebase: Codebase,
    sources: readonly Source[],
    plan: { readonly deletes: readonly string[]; readonly generated: readonly RecordOf<"ChangedFile">[] },
    message: string,
) {
    const system = yield* System;
    const root = codebase.root;
    const { deletes, generated } = plan;
    const dirty = yield* uncommittedFiles(root);
    if (dirty.length > 0) {
        return yield* new WorkingTreeNotClean({ files: dirty });
    }
    const base = yield* headCommit(root);
    const refused = (said: string) =>
        Effect.gen(function* () {
            return { pending: { base, files: yield* uncommittedFiles(root), said } satisfies Pending };
        });
    const proposed = yield* proposalsOf(root, sources, deletes);
    const files: string[] = [];
    for (const [file, folder] of proposed) {
        yield* system.writeText(join(root, file), yield* system.readText(join(folder, file)));
        files.push(file);
    }
    for (const file of deletes) {
        yield* system.remove(join(root, file));
    }
    const beforeGenerators = new Set(yield* uncommittedFiles(root));
    const generating = yield* runGenerators(codebase, generated).pipe(
        Effect.map(() => undefined),
        Effect.catchTag("GeneratorFailed", (error) => Effect.succeed(error)),
    );
    if (generating !== undefined) {
        return yield* refused(`${generating.command} exited ${String(generating.exitCode)}: ${generating.outputEnd}`);
    }
    const written = (yield* uncommittedFiles(root)).filter((file) => !beforeGenerators.has(file));
    yield* git(root, ["add", "--all", "--", ...files, ...deletes, ...written]);
    if (!(yield* gitSaysYes(root, ["diff", "--cached", "--quiet"]))) {
        const committing = yield* git(root, ["commit", "-q", "-m", message]).pipe(
            Effect.map(() => undefined),
            Effect.catchTag("GitFailed", (error) => Effect.succeed(error)),
        );
        if (committing !== undefined) {
            return yield* refused(committing.said.slice(-failureOutputKept));
        }
        return { commit: yield* headCommit(root) };
    }
    if ((yield* git(root, ["log", "-1", "--format=%B"])).trim() !== message) {
        return yield* new GitFailed({
            root,
            said: `the plan's files are already on the branch, but not by "${message.split("\n")[0]}"`,
        });
    }
    return { commit: yield* headCommit(root) };
});

/**
 * Commits the plan's test-layer files alone, so the first checks see the code as it was forked; tests in a code layer
 * wait for the code. When no test-layer file is proposed it commits nothing and records the branch's current commit; when
 * tests are already committed it does nothing.
 * @param runFolder the run folder
 * @returns what it did, and whether it committed
 * Writes: the test-layer files and applied.json; a git commit.
 * Fails: WorkingTreeNotClean, GitFailed, StageOutputMissing, RequestInvalid, CodebaseContractBroken.
 */
export const applyTests = Effect.fn("Apply.applyTests")(function* (runFolder: string) {
    const run = yield* implementRun(runFolder);
    if (run.applied.testsCommit !== undefined) {
        return {
            outcome: "applied",
            said: `tests already committed at ${run.applied.testsCommit}`,
            committed: false,
        } satisfies ApplyOutcome;
    }
    const first = (file: string) => commitsFirst(run.codebase, file);
    const base = yield* headCommit(run.codebase.root);
    if (!(yield* (yield* System).listFiles(run.layout.tests.files)).some(first)) {
        yield* (yield* System).writeText(run.layout.applied, JSON.stringify({ base, testsCommit: base }, null, 2));
        return {
            outcome: "applied",
            said: `no test is committed first: every test sits in a layer whose tests are committed with the code (branch at ${base})`,
            committed: false,
        } satisfies ApplyOutcome;
    }
    const message = commitMessage("test", `acceptance tests for ${run.workItem.title}`, run.plan.workItemId);
    const committed = yield* commitFiles(
        run.codebase,
        [{ folder: run.layout.tests.files, keep: first }],
        { deletes: [], generated: [] },
        message,
    );
    if ("pending" in committed) {
        return {
            outcome: "stop",
            said: `the tests-only commit was refused: ${committed.pending.said}`,
            committed: false,
        } satisfies ApplyOutcome;
    }
    yield* (yield* System).writeText(
        run.layout.applied,
        JSON.stringify({ base, testsCommit: committed.commit }, null, 2),
    );
    return {
        outcome: "applied",
        said: `tests committed at ${committed.commit}`,
        committed: true,
    } satisfies ApplyOutcome;
});

/**
 * Commits the plan's code changes together with the tests of code layers, deletes, and generator output. It stops
 * without committing when the tests-first checks have not passed, or when the base check no longer passes on the branch.
 * It does nothing when the code is already committed. When a generator or a hook refuses, the files stay written and
 * are recorded as pending, which the repair commits.
 * @param runFolder the run folder
 * @returns what it did; a stop says why
 * Writes: the plan's files, the deleted files, the code layers' tests, generator output and applied.json; a git
 * commit.
 * Fails: WorkingTreeNotClean, GitFailed, StageOutputMissing, RequestInvalid, CodebaseContractBroken, RecordInvalid.
 */
export const applyCode = Effect.fn("Apply.applyCode")(function* (runFolder: string) {
    const run = yield* implementRun(runFolder);
    if (run.applied.testsCommit === undefined || run.applied.testsProved !== true) {
        return {
            outcome: "stop",
            committed: false,
            said: "The tests-first checks have not passed yet: run run-layer-checks afterTests first.",
        } satisfies ApplyOutcome;
    }
    if (run.applied.codeCommit !== undefined) {
        return {
            outcome: "applied",
            said: `code already committed at ${run.applied.codeCommit}`,
            committed: false,
        } satisfies ApplyOutcome;
    }
    if (run.applied.pending !== undefined) {
        return pendingOutcome(run.applied.pending);
    }
    const changes = yield* changedFilesIn(run.layout.changes.records);
    const steps = yield* pathStepsIn(run.layout.trace.records);
    const gaps = yield* baseCheckGaps(run.codebase, changes, {
        filesFolder: run.layout.changes.files,
        stepIds: new Set(steps.map((step) => step.id)),
        proposedFiles: yield* (yield* System).listFiles(run.layout.changes.files),
    });
    if (gaps.length > 0) {
        return { outcome: "stop", kind: "branch", said: gaps.join("\n"), committed: false } satisfies ApplyOutcome;
    }
    const deletes = changes.filter((change) => change.action === "delete").map((change) => change.path);
    const message = commitMessage(commitType[run.plan.kind], run.workItem.title, run.plan.workItemId);
    const committed = yield* commitFiles(
        run.codebase,
        [
            { folder: run.layout.changes.files },
            { folder: run.layout.tests.files, keep: (file) => !commitsFirst(run.codebase, file) },
        ],
        { deletes, generated: changes },
        message,
    );
    if ("pending" in committed) {
        yield* (yield* System).writeText(
            run.layout.applied,
            JSON.stringify({ ...run.applied, pending: committed.pending }, null, 2),
        );
        return pendingOutcome(committed.pending);
    }
    yield* (yield* System).writeText(
        run.layout.applied,
        JSON.stringify({ ...run.applied, codeCommit: committed.commit }, null, 2),
    );
    return {
        outcome: "applied",
        said: `code committed at ${committed.commit}`,
        committed: true,
    } satisfies ApplyOutcome;
});

/**
 * The apply-change-plan command with its `tests`, `code` and `render` subcommands.
 * @param render the run's render step
 * @returns the command
 */
export const applyCommand = (render: Render) =>
    Command.make("apply-change-plan").pipe(
        Command.withDescription(
            "Applies the approved plan on the work item's branch in two conventional commits: first the test layers' tests alone, then the code with the tests of any code layer. Each step refuses a dirty working tree when it has something to commit and is skipped when already made, so a stopped run resumes. The code step stops if the tests-first checks have not passed.",
        ),
        Command.withSubcommands([
            Command.make(
                "tests",
                { runFolder: runFolderArgument },
                Effect.fn("Apply.tests")(
                    function* (input) {
                        yield* printApplied(yield* applyTests(input.runFolder));
                    },
                    (step, input) => renderAfter(render, input.runFolder)(step),
                ),
            ).pipe(
                Command.withDescription(
                    "Commits the plan's test-layer files alone; commits nothing when every test sits in a code layer.",
                ),
            ),
            Command.make(
                "code",
                { runFolder: runFolderArgument },
                Effect.fn("Apply.code")(
                    function* (input) {
                        yield* printApplied(yield* applyCode(input.runFolder));
                    },
                    (step, input) => renderAfter(render, input.runFolder)(step),
                ),
            ).pipe(
                Command.withDescription(
                    "Runs the base check again, then commits the plan's code changes with the tests of any code layer. Exit 1 prints why the plan no longer applies.",
                ),
            ),
            renderCommand(render),
        ]),
    );
