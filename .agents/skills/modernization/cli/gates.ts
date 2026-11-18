import { existsSync, readFileSync, statSync } from "node:fs";
import type { Paths } from "./steps";

export type Gate = "as-is" | "journeys" | "architecture" | "components";

/** The file a gate's stage wrote for the person to read, and the record of the person's decision. */
const files = (p: Paths): Record<Gate, { proposal: string; record: string; before?: Gate }> => ({
    "as-is": { proposal: p.current, record: p.choiceAsIs },
    journeys: { proposal: p.journeyVariants, record: p.choiceJourneys, before: "as-is" },
    architecture: { proposal: p.architectureVariants, record: p.choiceArchitecture, before: "journeys" },
    components: { proposal: p.architecture, record: p.choiceComponents, before: "architecture" },
});

const confirmedAt = (path: string) => {
    try {
        return Date.parse((JSON.parse(readFileSync(path, "utf8")) as { confirmedAt?: string }).confirmedAt ?? "");
    } catch {
        return Number.NaN;
    }
};

/**
 * Why a recorded decision no longer holds, or nothing. The rule is the one the shape-target skill, the plan and the app
 * keep (they never import each other): a record is confirmed while it is not older than the file it decides on, and
 * that file was made after the decision before it. A decision not recorded yet has no problem here: its step is due
 * because the record is missing.
 * @param paths the run's folders
 * @param gate the decision
 * @returns the problems, empty when the decision holds or is not made yet
 */
export const gateProblems = (paths: Paths, gate: Gate): string[] => {
    const own = files(paths)[gate];
    if (!existsSync(own.record) || !existsSync(own.proposal)) return [];
    const record = confirmedAt(own.record);
    const proposal = Math.floor(statSync(own.proposal).mtimeMs);
    const before = own.before === undefined ? undefined : files(paths)[own.before].record;
    if (Number.isNaN(record)) return [`the ${gate} decision has no date`];
    if (record < proposal) return [`the ${gate} proposal changed after it was confirmed`];
    if (before !== undefined && proposal < confirmedAt(before))
        return [`the ${gate} proposal was made before the decision it rests on was confirmed again`];
    return [];
};
