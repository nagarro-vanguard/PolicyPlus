import { Context, Data, Effect, Layer } from "effect";
import type { Stage } from "../run/analysis-layout";
import { GapsRemain, StoreInvariantBroken } from "../run/script-errors";
import { deriveModel } from "../graph/derive";
import { RecordStore, type StoreOpenFailure } from "./database";
import {
    digestStageWrite,
    removeStage,
    startStageWrite,
    writerFor,
    type StageWriteFailure,
    type StageWriter,
} from "./stage-writer";
import { DecisionRow, StageRow, StageWriteRow, TopDecisionRow } from "./rows";
import { decodedRows, valuesOf } from "./stored-bodies";

export type { StageWriter } from "./stage-writer";

export type StageWriteDecision<A> = { readonly commit: boolean; readonly result: A };

export interface StageRecordsOps {
    readonly writeStageRecords: <A, E, R>(
        stage: Stage,
        write: (writer: StageWriter) => Effect.Effect<StageWriteDecision<A>, E, R>,
    ) => Effect.Effect<A, E | StageWriteFailure | GapsRemain, R>;
    readonly removeStageRecords: (stage: Stage) => Effect.Effect<void, StoreOpenFailure>;
    readonly stageHasAcceptedRecords: (stage: Stage) => Effect.Effect<boolean, StoreOpenFailure>;
    readonly digestsOf: (
        stages: readonly Stage[],
    ) => Effect.Effect<ReadonlyArray<typeof StageWriteRow.Type>, StoreOpenFailure>;
}

class LeaveUnchanged<A> extends Data.TaggedError("LeaveUnchanged")<{
    readonly result: A;
    readonly kept: ReadonlyArray<typeof DecisionRow.Type>;
}> {}

/**
 * Replace a stage's accepted records in one transaction: its earlier records are removed, `write` inserts the new ones
 * and decides, and the store commits all of it or none of it. A commit with a reference that names no accepted record
 * is a defect: the stage's checks route those first. The planner's statistics are refreshed and the write-ahead log
 * emptied afterwards.
 * @param store the record store
 * @returns the write, given the stage and what it writes, returning what `write` decided
 */
const writeStageRecordsIn = (store: RecordStore["Service"]): StageRecordsOps["writeStageRecords"] =>
    Effect.fn("StageRecords.writeStageRecords")(function* <A, E, R>(
        stage: Stage,
        write: (writer: StageWriter) => Effect.Effect<StageWriteDecision<A>, E, R>,
    ) {
        const isLeftUnchanged = (error: unknown): error is LeaveUnchanged<A> => error instanceof LeaveUnchanged;
        const writer = writerFor(store, stage);
        const result = yield* store
            .holdStore(
                Effect.gen(function* () {
                    yield* store.query((sql) => startStageWrite(sql, stage));
                    const [before] = yield* store.query((sql) =>
                        decodedRows(TopDecisionRow)(sql`SELECT max(decision) AS top FROM decision`),
                    );
                    const decision = yield* write(writer);
                    if (!decision.commit) {
                        // the job states decided in this write (a job set aside for its fix) outlive the rollback
                        // no decision yet is the same as decisions after number 0
                        const top = before === undefined || before.top === null ? 0 : before.top;
                        const kept = yield* store.query((sql) =>
                            decodedRows(DecisionRow)(
                                sql`SELECT decision, job, kind, outcome, round, note, at FROM decision
                                    WHERE decision > ${top} ORDER BY decision`,
                            ),
                        );
                        return yield* new LeaveUnchanged({ result: decision.result, kept });
                    }
                    const unresolved = yield* writer.resolveReferences;
                    if (unresolved.length) {
                        return yield* Effect.die(new StoreInvariantBroken({ path: store.path, cause: unresolved }));
                    }
                    const broken = yield* store.query(deriveModel);
                    if (broken.length) {
                        return yield* Effect.die(new StoreInvariantBroken({ path: store.path, cause: broken }));
                    }
                    yield* store.query((sql) => digestStageWrite(sql, stage));
                    return decision.result;
                }),
            )
            .pipe(
                Effect.catchIf(isLeftUnchanged, (left) =>
                    Effect.as(
                        Effect.forEach(left.kept, (row) =>
                            store.query(
                                (sql) =>
                                    sql`INSERT INTO decision (decision, job, kind, outcome, round, note, at) VALUES (${row.decision}, ${row.job}, ${row.kind}, ${row.outcome}, ${row.round}, ${row.note}, ${row.at})`,
                            ),
                        ),
                        left.result,
                    ),
                ),
            );
        yield* store.query((sql) =>
            Effect.andThen(sql`PRAGMA optimize = 0x10002`, sql`PRAGMA wal_checkpoint(TRUNCATE)`),
        );
        return result;
    });

export class StageRecords extends Context.Service<StageRecords, StageRecordsOps>()("code-analysis/core/StageRecords") {
    static readonly layer: Layer.Layer<StageRecords, never, RecordStore> = Layer.effect(
        StageRecords,
        Effect.gen(function* () {
            const store = yield* RecordStore;
            return StageRecords.of({
                writeStageRecords: writeStageRecordsIn(store),
                /**
                 * Remove a stage's accepted records, as its `prepare` does; the caller holds the store.
                 * @param stage the stage
                 * @returns nothing once removed
                 */
                removeStageRecords: Effect.fn("StageRecords.removeStageRecords")(function* (stage: Stage) {
                    return yield* store.query((sql) => removeStage(sql, stage));
                }),
                /**
                 * Whether a stage's finish has committed, even when it accepted no record.
                 * @param stage the stage
                 * @returns true when it has
                 */
                stageHasAcceptedRecords: Effect.fn("StageRecords.stageHasAcceptedRecords")(function* (stage: Stage) {
                    return yield* store
                        .query((sql) => decodedRows(StageRow)(sql`SELECT stage FROM stageWrite WHERE stage = ${stage}`))
                        .pipe(Effect.map((rows) => rows.length > 0));
                }),
                /**
                 * What each of these stages' accepted records are, as one digest per stage (D230): the same records
                 * give the same digest in any store, so a store rebuilt from the same work keeps a later stage's brief
                 * current, and any change to them changes it. A stage with no records has none.
                 * @param stages the stages
                 * @returns each stage's digest, in rank order
                 */
                digestsOf: Effect.fn("StageRecords.digestsOf")(function* (stages: readonly Stage[]) {
                    return yield* store.query((sql) =>
                        decodedRows(StageWriteRow)(
                            sql`SELECT stage, digest FROM stageWrite WHERE stage IN (${valuesOf(sql, stages)}) ORDER BY rank`,
                        ),
                    );
                }),
            });
        }),
    );
}
