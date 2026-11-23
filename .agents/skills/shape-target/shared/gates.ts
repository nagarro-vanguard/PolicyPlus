import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Layout } from "./model/layout";

export type Gate = "as-is" | "journeys" | "architecture" | "components";
export type GateState = "not made" | "blocked" | "waiting" | "confirmed" | "changed";
export const gates: readonly Gate[] = ["as-is", "journeys", "architecture", "components"];

export const upstreamOf = (gate: Gate): Gate | undefined => gates[gates.indexOf(gate) - 1];
/** The file that records a decision. */
export const recordOf = (layout: Layout, gate: Gate) =>
    ({
        "as-is": layout.choiceAsIs,
        journeys: layout.choiceJourneys,
        architecture: layout.choiceArchitecture,
        components: layout.choiceComponents,
    })[gate];
/** What each decision is made about: the file a stage wrote. */
export const proposalOf = (layout: Layout, gate: Gate) =>
    ({
        "as-is": layout.current,
        journeys: layout.journeyVariants,
        architecture: layout.architectureVariants,
        components: layout.architecture,
    })[gate];
/** The copy of the proposal as it was confirmed, kept beside the decision. */
export const snapshotOf = (layout: Layout, gate: Gate) => join(layout.confirmed, `${gate}.json`);

/**
 * The hash a decision records of what it was made about: the sha256 of the file's bytes.
 * @param path the file
 * @returns the hex digest
 */
export const subjectOf = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

const at = (path: string) => (existsSync(path) ? Math.floor(statSync(path).mtimeMs) : undefined);
const recordAt = (path: string): { confirmedAt: number; subject: string | undefined } | undefined => {
    if (!existsSync(path)) return undefined;
    try {
        const record = JSON.parse(readFileSync(path, "utf8")) as { confirmedAt?: string; subject?: string };
        return { confirmedAt: Date.parse(record.confirmedAt ?? ""), subject: record.subject };
    } catch {
        return { confirmedAt: Number.NaN, subject: undefined };
    }
};

/**
 * Where a decision stands. It is confirmed when the decision before it is confirmed and was confirmed no later than
 * it, and what it decides on still is what was decided: the file has the hash the decision recorded. A
 * decision recorded before hashes were kept has none; it is judged by time, as before (its record is not older than
 * what it decides on, which was made after the decision before it), until it is decided again. The conductor
 * (`cli/gates.ts`) and the plan (`read/confirmed.ts`) import this rule rather than copy it; the app keeps its own copy.
 * @param layout the run's folders
 * @param gate the decision
 * @returns not made (nothing to decide yet), blocked (the decision before it is not confirmed), waiting, confirmed, or changed since confirmed
 */
export const gateState = (layout: Layout, gate: Gate): GateState => {
    const path = proposalOf(layout, gate);
    const proposal = at(path);
    if (proposal === undefined) return "not made";
    const before = upstreamOf(gate);
    if (before !== undefined && gateState(layout, before) !== "confirmed") return "blocked";
    const record = recordAt(recordOf(layout, gate));
    if (record === undefined || Number.isNaN(record.confirmedAt)) return "waiting";
    const earlier = before === undefined ? undefined : recordAt(recordOf(layout, before))?.confirmedAt;
    if (record.subject !== undefined)
        return subjectOf(path) === record.subject && (earlier === undefined || earlier <= record.confirmedAt)
            ? "confirmed"
            : "changed";
    return record.confirmedAt >= proposal && (earlier === undefined || proposal >= earlier) ? "confirmed" : "changed";
};

/** Whether a decision was made and nothing it rests on changed since. */
export const confirmed = (layout: Layout, gate: Gate) => gateState(layout, gate) === "confirmed";
