import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Layout } from "../model/layout";
import { readJson, writeJson, type Stage } from "./state";

/** How many times a stage may fail its final checks and be run again with the gaps as instructions before the run stops. */
export const MAX_ROUNDS = 3;

export type Rounds = { count: number; text: string };

const roundsPath = (layout: Layout, stage: Stage) => join(layout.records, `rounds-${stage}.json`);

/**
 * The failed finishes of a stage since it was last prepared, with the last failure's words.
 * @param layout the run's folders
 * @param stage the stage
 * @returns the count and the last failure, or nothing when the stage has not failed
 */
export const roundsOf = (layout: Layout, stage: Stage): Rounds | undefined =>
    existsSync(roundsPath(layout, stage)) ? readJson<Rounds>(roundsPath(layout, stage)) : undefined;

/** Records one more failed finish of a stage. */
export const failRound = (layout: Layout, stage: Stage, text: string) =>
    writeJson(roundsPath(layout, stage), { count: (roundsOf(layout, stage)?.count ?? 0) + 1, text } satisfies Rounds);

/** Forgets the failures of a stage: it finished, or it is prepared again from nothing. */
export const clearRounds = (layout: Layout, stage: Stage) => rmSync(roundsPath(layout, stage), { force: true });
