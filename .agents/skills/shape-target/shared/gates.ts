import { existsSync, readFileSync, statSync } from "node:fs";
import type { Layout } from "./model/layout";

export type Gate = "as-is" | "journeys" | "architecture" | "components";
export type GateState = "not made" | "blocked" | "waiting" | "confirmed" | "changed";
export const gates: readonly Gate[] = ["as-is", "journeys", "architecture", "components"];

export const upstreamOf = (gate: Gate): Gate | undefined => gates[gates.indexOf(gate) - 1];
const recordOf = (layout: Layout, gate: Gate) =>
    ({
        "as-is": layout.choiceAsIs,
        journeys: layout.choiceJourneys,
        architecture: layout.choiceArchitecture,
        components: layout.choiceComponents,
    })[gate];
/** What each decision is made about: the file a stage wrote for the person to read. */
const proposalOf = (layout: Layout, gate: Gate) =>
    ({
        "as-is": layout.current,
        journeys: layout.journeyVariants,
        architecture: layout.architectureVariants,
        components: layout.architecture,
    })[gate];
const at = (path: string) => (existsSync(path) ? Math.floor(statSync(path).mtimeMs) : undefined);
const confirmedAt = (path: string) => {
    if (!existsSync(path)) return undefined;
    try {
        return Date.parse((JSON.parse(readFileSync(path, "utf8")) as { confirmedAt?: string }).confirmedAt ?? "");
    } catch {
        return Number.NaN;
    }
};

/**
 * Where a decision stands, by time alone (the same rule is kept by the conductor, the plan and the app, which never
 * import this skill): it is confirmed when its record is not older than what it decides on, that was made after the
 * decision before it, and that one is confirmed too.
 * @param layout the run's folders
 * @param gate the decision
 * @returns not made (nothing to decide yet), blocked (the decision before it is not confirmed), waiting, confirmed, or changed since confirmed
 */
export const gateState = (layout: Layout, gate: Gate): GateState => {
    const proposal = at(proposalOf(layout, gate));
    if (proposal === undefined) return "not made";
    const before = upstreamOf(gate);
    if (before !== undefined && gateState(layout, before) !== "confirmed") return "blocked";
    const record = confirmedAt(recordOf(layout, gate));
    if (record === undefined || Number.isNaN(record)) return "waiting";
    const earlier = before === undefined ? undefined : confirmedAt(recordOf(layout, before));
    return record >= proposal && (earlier === undefined || proposal >= earlier) ? "confirmed" : "changed";
};

/** Whether the person has confirmed a decision and nothing it rests on changed since. */
export const confirmed = (layout: Layout, gate: Gate) => gateState(layout, gate) === "confirmed";
