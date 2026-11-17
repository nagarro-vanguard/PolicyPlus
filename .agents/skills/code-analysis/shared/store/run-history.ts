import { Effect, Schema } from "effect";
import type { SqlClient } from "effect/sql";
import type { Stage } from "../run/analysis-layout";
import { decodedRows } from "./stored-bodies";

const NumberRow = Schema.Struct({ number: Schema.Number });

/**
 * The run of a stage that is open: its latest generation, made when the stage has none yet.
 * @param sql the client
 * @param stage the stage
 * @returns the run's number
 */
export const runOf = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, stage: Stage) {
    yield* sql`INSERT INTO stageRun (stage, generation, openedAt)
        SELECT ${stage}, 1, ${new Date().toISOString()} WHERE NOT EXISTS (SELECT 1 FROM stageRun WHERE stage = ${stage})`;
    const [run] = yield* decodedRows(NumberRow)(
        sql`SELECT max(stageRun) AS number FROM stageRun WHERE stage = ${stage}`,
    );
    return run === undefined ? yield* Effect.die(new Error(`${stage} has no run`)) : run.number;
});

/**
 * Open a new generation of a stage: every read of the stage from then on sees none of what the last one held, which
 * stays in the run history.
 * @param sql the client
 * @param stage the stage
 * @returns nothing once opened
 */
export const openGeneration = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, stage: Stage) {
    yield* sql`INSERT INTO stageRun (stage, generation, openedAt)
        SELECT ${stage}, coalesce(max(generation), 0) + 1, ${new Date().toISOString()} FROM stageRun WHERE stage = ${stage}`;
});
