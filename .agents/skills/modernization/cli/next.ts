import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { inputsOf, pathsOf, skillsOf, steps, type Action, type Paths, type State } from "./steps";

const conductorRoot = resolve(import.meta.dir, "..");
const skills = skillsOf(conductorRoot);

const read = <T>(path: string) => JSON.parse(readFileSync(path, "utf8")) as T;
const save = (path: string, value: unknown) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

/**
 * The next action: the first step that is due, else done. Pure over the files on disk, so a restart loses nothing.
 * @param root the Output Root
 * @param request the request file, needed until the state remembers it
 * @returns one action
 */
export const next = (root: string, request: string | undefined): Action => {
    const paths: Paths = pathsOf(root);
    let state: State = existsSync(paths.state) ? read<State>(paths.state) : { request: request ?? "", steps: {} };
    if (state.request === "")
        return { action: "stop", step: "request", message: "the first call needs --request <file>" };
    // Only what the conductor still has is kept: a step of an older version (a decision's pages, a person's confirmation) is dropped.
    state = {
        request: state.request,
        steps: Object.fromEntries(
            Object.entries(state.steps).filter(([name]) => steps.some((step) => step.name === name)),
        ),
    };
    save(paths.state, state);
    for (const step of steps) {
        const missing = step.makes(paths).filter((path) => !existsSync(path));
        const recorded = state.steps[step.name]?.inputs;
        const current = inputsOf(step, paths, state.request);
        const problems = step.valid?.(paths) ?? [];
        // A step that says whether its record still holds is decided by that, not by the hash of its inputs.
        const stale =
            (step.valid === undefined ? recorded !== undefined && recorded !== current : problems.length > 0) ||
            (step.outdated?.(paths) ?? []).length > 0;
        if (missing.length > 0 || stale) {
            return step.action({ paths, skills, request: state.request });
        }
        if (recorded === undefined) {
            state.steps[step.name] = { inputs: current, at: new Date().toISOString() };
            save(paths.state, state);
        }
    }
    return { action: "done", message: "the plan and the app that shows it are made" };
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
    state.steps[step] = { inputs: inputsOf(entry, paths, state.request), at: new Date().toISOString() };
    save(paths.state, state);
    return { ok: true, message: `${step}: done` };
};

if (import.meta.main) {
    const args = process.argv.slice(2);
    const flag = (name: string) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
    const root = flag("root");
    if (root === undefined || args.includes("--help")) {
        console.log(`Usage: bun next.ts --root <Output Root> [--request <file>] [--done <step>]

Prints the one next action as JSON: run a command, invoke a skill, wait for a decision, stop, or done.
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
