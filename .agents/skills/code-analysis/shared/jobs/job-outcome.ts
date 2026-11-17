import { Effect } from "effect";
import type { Stage } from "../run/analysis-layout";
import { JobStates } from "./job-state";

/**
 * Whether a job ended refused: its checks still failing after its fix, or its review failing its own check twice. Read
 * from the job's state, never from which files exist.
 * @param stage the stage
 * @param key the job's key
 * @returns true for a refused job; false for a job in any other state or with none
 */
export const isRefused = Effect.fnUntraced(function* (stage: Stage, key: string) {
    const row = yield* (yield* JobStates).get(stage, key);
    return row !== undefined && row.state === "refused";
});
