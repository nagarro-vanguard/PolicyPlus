// Where the journey records are read from, in plain files, for the content collections' loaders. Today's journeys are the code
// analysis's `payloads/journeys.json` (`{ journeys: Task[] }`); until a run has it, the target's `current.json`
// (`{ tasks: Task[] }`). The ways proposed are the chosen ones in the target's `journeys.json` and, when the skill kept them,
// every variant it considered.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

/**
 * The records of today's journeys and which file they came from.
 * @param payloads the analysis's payloads folder
 * @param target the Output Root of the target, when there is one
 * @returns the raw records and the source; none when no file holds them
 */
export const todaySource = (payloads: string, target: string): { readonly records: unknown[]; readonly from: "analysis" | "target" | "none" } => {
    const own = join(payloads, "journeys.json");
    if (existsSync(own)) {
        const found = (read(own) as { journeys?: unknown[] }).journeys;
        if (!Array.isArray(found)) throw new Error(`${own} holds no "journeys" list`);
        return { records: found, from: "analysis" };
    }
    const old = target === "" ? "" : join(target, "target", "current.json");
    if (old !== "" && existsSync(old)) {
        const found = (read(old) as { tasks?: unknown[] }).tasks;
        if (!Array.isArray(found)) throw new Error(`${old} holds no "tasks" list`);
        return { records: found, from: "target" };
    }
    return { records: [], from: "none" };
};

/**
 * The chosen ways, one per journey, as the target wrote them.
 * @param target the Output Root, or empty when there is no target
 * @returns the raw records with an id each; none without a target
 */
export const chosenSource = (target: string): unknown[] => {
    const file = target === "" ? "" : join(target, "target", "journeys.json");
    return file !== "" && existsSync(file) ? (read(file) as unknown[]) : [];
};

/**
 * Every way the skill considered, the chosen ones included.
 * @param target the Output Root, or empty when there is no target
 * @returns the raw records; none when the skill kept none
 */
export const consideredSource = (target: string): unknown[] => {
    const file = target === "" ? "" : join(target, ".shape-target", "work", "records", "journey-variants.json");
    return file !== "" && existsSync(file) ? (read(file) as unknown[]) : [];
};
