import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Where each of the target's four decisions stands. The rule is the one the shape-target skill, the conductor and the
// plan keep (nothing here imports them; the contract is the files): a decision is confirmed while its record is not
// older than the file it decides on, and that file was made after the decision before it.
export type Gate = "as-is" | "journeys" | "architecture" | "components";
export type GateState = "not made" | "blocked" | "waiting" | "confirmed" | "changed";
export const gates: readonly Gate[] = ["as-is", "journeys", "architecture", "components"];
export type Seen = { readonly proposal: number | undefined; readonly record: number | undefined };
export type GateView = { readonly state: GateState; readonly date: string | undefined };

/**
 * The state of every decision, from when each proposal was made and each record dated.
 * @param seen per decision: the time the proposal file was last written and the time the person confirmed, in milliseconds
 * @returns the states, in the order of the decisions
 */
export const statesOf = (seen: Readonly<Record<Gate, Seen>>): Record<Gate, GateState> => {
    const states = {} as Record<Gate, GateState>;
    gates.forEach((gate, at) => {
        const own = seen[gate];
        const before = at === 0 ? undefined : gates[at - 1];
        if (own.proposal === undefined) states[gate] = "not made";
        else if (before !== undefined && states[before] !== "confirmed") states[gate] = "blocked";
        else if (own.record === undefined) states[gate] = "waiting";
        else {
            const earlier = before === undefined ? undefined : seen[before].record;
            states[gate] = own.record >= own.proposal && (earlier === undefined || own.proposal >= earlier) ? "confirmed" : "changed";
        }
    });
    return states;
};

/** Today's journeys are proposed by the analysis's own file when a run has it, by the target's older one until then. */
const todayFile = (root: string) => {
    const own = join(process.env.ANALYSIS_PAYLOADS_DIR ?? "", "journeys.json");
    return process.env.ANALYSIS_PAYLOADS_DIR !== undefined && existsSync(own) ? own : join(root, "target", "current.json");
};

const files = (root: string): Record<Gate, { proposal: string; record: string }> => ({
    "as-is": { proposal: todayFile(root), record: join(root, "target", "choice-as-is.json") },
    journeys: { proposal: join(root, ".shape-target", "work", "records", "journey-variants.json"), record: join(root, "target", "choice-journeys.json") },
    architecture: { proposal: join(root, ".shape-target", "work", "records", "architecture-variants.json"), record: join(root, "target", "choice-architecture.json") },
    components: { proposal: join(root, "target", "architecture.json"), record: join(root, "target", "choice-components.json") },
});
const madeAt = (path: string) => (existsSync(path) ? Math.floor(statSync(path).mtimeMs) : undefined);
const confirmedAt = (path: string) => {
    if (!existsSync(path)) return undefined;
    try {
        const at = Date.parse((JSON.parse(readFileSync(path, "utf8")) as { confirmedAt?: string }).confirmedAt ?? "");
        return Number.isNaN(at) ? undefined : at;
    } catch {
        return undefined;
    }
};

/** The states of the decisions of the run whose Output Root is given, as the files stand when the pages are built. */
export const gateViews = (root: string): Record<Gate, GateView> => {
    const paths = files(root);
    const seen = Object.fromEntries(gates.map((gate) => [gate, { proposal: madeAt(paths[gate].proposal), record: confirmedAt(paths[gate].record) }])) as Record<Gate, Seen>;
    const states = statesOf(seen);
    return Object.fromEntries(gates.map((gate) => [gate, { state: states[gate], date: seen[gate].record === undefined ? undefined : new Date(seen[gate].record).toISOString().slice(0, 10) }])) as Record<Gate, GateView>;
};

/** The command that confirms a decision: the conductor names the real one when it builds the pages. */
export const confirmCommand = (gate: Gate, root: string, choose = process.env.TARGET_CHOOSE ?? "bun <shape-target>/cli/choose.ts"): string =>
    gate === "as-is"
        ? `${choose} as-is ${root} --reason "<why>" [--marks <file>]`
        : gate === "journeys"
          ? `${choose} journeys ${root} --reason "<why>" [--all-recommended] [--pick <task>=<variant>]`
          : gate === "architecture"
            ? `${choose} architecture ${root} --pick "<variant>" --reason "<why>"`
            : `${choose} components ${root} --reason "<why>"`;
