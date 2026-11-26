import { existsSync, readFileSync } from "node:fs";
import { goalsSha } from "./goals";
import { writeJson } from "./jobs/state";
import type { Layout } from "./model/layout";
import { loadRequest } from "./run";

export type GoalsStamps = { journeys?: string; architecture?: string };

/** The stamps written so far, per stage; nothing before a stage was finished. */
export const loadGoalsStamps = (layout: Layout): GoalsStamps =>
    existsSync(layout.goalsStamps) ? (JSON.parse(readFileSync(layout.goalsStamps, "utf8")) as GoalsStamps) : {};

/**
 * Stamps a finished stage with the sha of the request's goals as they are now.
 * @param layout the run's folders
 * @param stage the stage finished
 * @returns the stamp
 */
export const stampGoals = (layout: Layout, stage: keyof GoalsStamps) => {
    const sha = goalsSha(loadRequest(layout).goals);
    writeJson(layout.goalsStamps, { ...loadGoalsStamps(layout), [stage]: sha } satisfies GoalsStamps);
    return sha;
};
