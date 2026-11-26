import { createHash } from "node:crypto";

/**
 * The stamp of a list of goals: the sha256 of the list as JSON, in the request's order. The tool that finishes a stage
 * writes it beside the stage's output, never an agent, so a reader can tell the output was made for these goals.
 * @param goals the request's goals, in order
 * @returns the hex digest
 */
export const goalsSha = (goals: readonly string[]) => createHash("sha256").update(JSON.stringify(goals)).digest("hex");
