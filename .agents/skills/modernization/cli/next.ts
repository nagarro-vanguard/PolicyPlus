import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { hashFiles, pathsOf, skillsOf, steps, type Action, type Paths, type Settings, type State } from "./steps";
import { deliveryAction } from "./delivery";

const conductorRoot = resolve(import.meta.dir, "..");
const skills = skillsOf(conductorRoot);

const read = <T>(path: string) => JSON.parse(readFileSync(path, "utf8")) as T;
const save = (path: string, value: unknown) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

const git = (cwd: string, ...args: string[]) => {
    try {
        return execFileSync("git", ["-C", cwd, ...args], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    } catch {
        return "";
    }
};

/** The repository's default branch, never assumed: the remote's head, else the branch checked out now. */
export const defaultBranch = (cwd: string) =>
    git(cwd, "symbolic-ref", "--short", "refs/remotes/origin/HEAD").replace(/^origin\//, "") ||
    git(cwd, "rev-parse", "--abbrev-ref", "HEAD");

export const settingsFor = (root: string, firstSource: string | undefined): Settings => ({
    worktrees: `${root}-worktrees`,
    base: firstSource ? defaultBranch(firstSource) || "main" : "main",
    parallel: 1,
});

/** The steps whose inputs are the target and the plan itself, which created work items depend on. */
const lateStep = (name: string) => name.startsWith("target-") || name === "foundation" || name === "stories";

/** Whether any work item has been created: from then on the target and the plan are not redone. */
const itemsCreated = (ledger: string) =>
    existsSync(ledger) &&
    Object.values(read<{ items: Record<string, { status: string }> }>(ledger).items).some(
        (entry) => entry.status !== "planned",
    );

/**
 * The next action: the first step that is due, else delivery. Pure over the files on disk, so a restart loses nothing.
 * @param root the Output Root
 * @param request the request file, needed until the state remembers it
 * @returns one action
 */
export const next = (root: string, request: string | undefined): Action => {
    const paths: Paths = pathsOf(root);
    const state: State = existsSync(paths.state)
        ? read<State>(paths.state)
        : { request: request ?? "", settings: settingsFor(root, undefined), steps: {} };
    if (state.request === "")
        return { action: "stop", step: "request", message: "the first call needs --request <file>" };
    if (existsSync(paths.requestJson)) {
        const sources = read<{ sourceRoots: string[] }>(paths.requestJson).sourceRoots;
        if (state.settings.base === "main" && sources[0])
            state.settings = { ...state.settings, base: defaultBranch(sources[0]) || "main" };
    }
    save(paths.state, state);
    for (const step of steps) {
        const missing = step.makes(paths).filter((path) => !existsSync(path));
        const recorded = state.steps[step.name]?.inputs;
        const current = hashFiles(step.inputs(paths));
        const problems = step.valid?.(paths) ?? [];
        // A step that says whether its record still holds is decided by that, not by the hash of its inputs.
        const stale = step.valid === undefined ? recorded !== undefined && recorded !== current : problems.length > 0;
        if (stale && lateStep(step.name) && itemsCreated(paths.ledger))
            return {
                action: "stop",
                step: step.name,
                message: `${step.name} is out of date, because the target or the plan changed after work items were created. Re-plan only the items not yet created, by hand: created items are locked.`,
            };
        if (missing.length > 0 || stale) {
            return step.action({ paths, skills, settings: state.settings, request: state.request });
        }
        if (recorded === undefined) {
            state.steps[step.name] = { inputs: current, at: new Date().toISOString() };
            save(paths.state, state);
        }
    }
    return deliveryAction({ paths, skills, settings: state.settings });
};

/**
 * Records that a step's driver finished it: the step's outputs must exist, and its inputs are remembered, so the step
 * runs again only when they change.
 * @param root the Output Root
 * @param step the step's name
 * @returns a message, or a problem when the outputs are missing
 */
export const markDone = (root: string, step: string): { ok: boolean; message: string } => {
    const paths = pathsOf(root);
    const entry = steps.find((each) => each.name === step);
    if (entry === undefined) return { ok: false, message: `no step ${step}` };
    const missing = entry.makes(paths).filter((path) => !existsSync(path));
    if (missing.length > 0) return { ok: false, message: `step ${step} did not make: ${missing.join(", ")}` };
    const state = read<State>(paths.state);
    state.steps[step] = { inputs: hashFiles(entry.inputs(paths)), at: new Date().toISOString() };
    save(paths.state, state);
    return { ok: true, message: `${step}: done` };
};

if (import.meta.main) {
    const args = process.argv.slice(2);
    const flag = (name: string) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
    const root = flag("root");
    if (root === undefined || args.includes("--help")) {
        console.log(`Usage: bun next.ts --root <Output Root> [--request <file>] [--done <step>]

Prints the one next action as JSON: run a command, invoke a skill, show a prompt to the person, wait for the person, stop, or done.
After a step's work is finished, call it again with --done <step> so its inputs are remembered; the step runs again only when they change.`);
        process.exit(root === undefined ? 2 : 0);
    }
    const resolved = resolve(root);
    const request = flag("request");
    const done = flag("done");
    if (done !== undefined) {
        next(resolved, request ? resolve(request) : undefined);
        const result = markDone(resolved, done);
        console.log(result.message);
        process.exit(result.ok ? 0 : 1);
    }
    const action = next(resolved, request ? resolve(request) : undefined);
    console.log(JSON.stringify(action, null, 2));
    process.exit(action.action === "stop" ? 1 : 0);
}
void join;
