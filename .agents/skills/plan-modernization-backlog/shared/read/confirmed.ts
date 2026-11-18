import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Layout } from "../model/layout";

/*
 * Whether the person confirmed the target the plan is made from. Only the files shape-target writes are read; nothing
 * here imports that skill, and the rule is the one it, the conductor and the app keep: a decision is confirmed while its
 * record is not older than the file it decides on, and that file was made after the decision before it.
 */
const gates = [
    { name: "as-is", record: "choice-as-is.json", proposal: ["target", "current.json"] },
    {
        name: "journeys",
        record: "choice-journeys.json",
        proposal: [".shape-target", "work", "records", "journey-variants.json"],
    },
    {
        name: "architecture",
        record: "choice-architecture.json",
        proposal: [".shape-target", "work", "records", "architecture-variants.json"],
    },
    { name: "components", record: "choice-components.json", proposal: ["target", "architecture.json"] },
] as const;

const at = (path: string) => (existsSync(path) ? Math.floor(statSync(path).mtimeMs) : undefined);
const confirmedAt = (path: string) => {
    try {
        return Date.parse((JSON.parse(readFileSync(path, "utf8")) as { confirmedAt?: string }).confirmedAt ?? "");
    } catch {
        return Number.NaN;
    }
};

/**
 * What stops the plan from being made on the target: each decision that is missing or no longer holds. A run with no
 * `target/` folder was never shaped and is planned from the analysis alone, so it has no gaps.
 * @param layout the run's folders
 * @returns one line per decision that is not confirmed, empty when the plan may start
 */
export const targetGaps = (layout: Layout): string[] => {
    if (!existsSync(layout.target)) return [];
    const gaps: string[] = [];
    let before: number | undefined;
    for (const gate of gates) {
        const record = confirmedAt(join(layout.target, gate.record));
        const proposal = at(join(layout.outputRoot, ...gate.proposal));
        const problem =
            proposal === undefined
                ? "has nothing proposed yet"
                : Number.isNaN(record)
                  ? "is not confirmed"
                  : record < proposal
                    ? "changed after it was confirmed"
                    : before !== undefined && proposal < before
                      ? "was made before the decision it rests on was confirmed again"
                      : undefined;
        if (problem !== undefined) gaps.push(`the ${gate.name} ${problem}`);
        before = Number.isNaN(record) ? undefined : record;
    }
    return gaps;
};
