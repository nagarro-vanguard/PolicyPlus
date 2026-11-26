import { createHash } from "node:crypto";

/**
 * The stamp of a goals list: the sha256 (hex) of the JSON of the goal strings in order. Every stage output the goals
 * shaped carries it, written by the tool that finishes the stage and never by an agent, so a goal that was edited or
 * moved after the stage ran is told apart from one it was made for. shape-target and compose count it the same way.
 * @param goals the request's goals, in order
 * @returns the stamp
 */
export const goalsSha = (goals: readonly string[]): string =>
    createHash("sha256").update(JSON.stringify(goals)).digest("hex");
