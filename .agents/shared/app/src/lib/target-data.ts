import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gateViews } from "./confirmation";
import { todaySource } from "./journey-sources";
import type { TargetData } from "./target-types";

/** Whether this build has a target to show: the Output Root that holds it is named in the environment. */
export const hasTarget = () => (process.env.TARGET_DIR ?? "") !== "";

const read = <T>(path: string, fallback: T): T => (existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : fallback);

let cache: TargetData | undefined;

/**
 * The target's records, read once per build from the Output Root's `target/` folder and the skill's work records.
 * @returns the records; a record not made yet is empty or absent
 */
export const targetData = (): TargetData => {
    if (cache !== undefined) return cache;
    const root = process.env.TARGET_DIR ?? "";
    if (root === "") throw new Error("no target: TARGET_DIR is not set");
    const target = join(root, "target");
    const records = join(root, ".shape-target", "work", "records");
    cache = {
        legacy: read(join(target, "legacy.json"), undefined),
        // Today's journeys: the analysis's own file when a run has it, the target's older one until then.
        tasks: todaySource(process.env.ANALYSIS_PAYLOADS_DIR ?? "", root).records as TargetData["tasks"],
        variants: read(join(records, "journey-variants.json"), []),
        journeys: read(join(target, "journeys.json"), []),
        architectureVariants: read(join(records, "architecture-variants.json"), []),
        architecture: read(join(target, "architecture.json"), undefined),
        choiceAsIs: read(join(target, "choice-as-is.json"), undefined),
        choiceJourneys: read(join(target, "choice-journeys.json"), undefined),
        choiceArchitecture: read(join(target, "choice-architecture.json"), undefined),
        choiceComponents: read(join(target, "choice-components.json"), undefined),
        gates: gateViews(root),
        root,
    };
    return cache;
};
