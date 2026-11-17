import { Effect } from "effect";
import type { Stage } from "../run/analysis-layout";
import { UsageInvalid } from "../run/script-errors";
import { RecordStore } from "./database";
import { JobStates } from "../jobs/job-state";
import { StageRecords } from "./stage-records";

/**
 * Refuse while an earlier stage has not written its accepted records: a stage reads only what the stage before it
 * accepted. Its `prepare` removes them, so their absence also covers a stage being run again.
 * @param earlier the earlier stage
 * @returns nothing when they exist; UsageInvalid naming what to run
 */
export const requireAcceptedRecords = Effect.fnUntraced(function* (earlier: Stage) {
    if (!(yield* (yield* StageRecords).stageHasAcceptedRecords(earlier))) {
        return yield* new UsageInvalid({ issue: `${earlier} has no accepted records: run its finish first` });
    }
});

/**
 * Refuse while any later stage has written accepted records made from this stage's: changing this stage would leave
 * them stale with no error. Each later stage's `prepare` removes its own.
 * @param later the later stages
 * @returns nothing when none has; UsageInvalid naming each that has
 */
export const refuseWhileLaterStagesHaveRecords = Effect.fnUntraced(function* (later: readonly Stage[]) {
    const records = yield* StageRecords;
    const holding: Stage[] = [];
    for (const stage of later) {
        if (yield* records.stageHasAcceptedRecords(stage)) {
            holding.push(stage);
        }
    }
    if (holding.length) {
        return yield* new UsageInvalid({
            issue: `${holding.join(", ")} has accepted records made from these: run its prepare first, which removes them`,
        });
    }
});

/**
 * Remove what a stage run leaves stale: the facts of the stage's last run (the batches it closed, why it stopped), which
 * describe a run that is over.
 * @param stage the stage whose run starts
 * @returns nothing once they are gone
 */
const removeStaleOutputs = Effect.fnUntraced(function* (stage: Stage) {
    const states = yield* JobStates;
    yield* states.forgetClosedBatches(stage);
    yield* states.stop(stage, undefined);
});

/**
 * The start of every stage run that changes the stage's accepted records: hold the record store, refuse while a later
 * stage has accepted records made from this one's, remove what the run leaves stale, then make the change, all in one
 * hold. One step, so no stage can start a run without the refusal or leave pages showing records it is about to change.
 * @param stage the stage whose run starts
 * @param later the stages that read this one's records
 * @param change the run's change, made inside the hold
 * @returns the change's result
 */
export const startStageRun = <A, E, R>(stage: Stage, later: readonly Stage[], change: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
        const store = yield* RecordStore;
        return yield* store.holdStore(
            Effect.gen(function* () {
                yield* refuseWhileLaterStagesHaveRecords(later);
                yield* removeStaleOutputs(stage);
                return yield* change;
            }),
        );
    });
