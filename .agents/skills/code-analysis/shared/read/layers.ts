import { Effect, Layer } from "effect";
import { AcceptedRecords } from "./accepted-records";
import { CodeGraph } from "../graph/code-graph";
import { RecordStore } from "../store/database";
import { RecordReads } from "./record-reads";
import { ScopeFiles } from "./scope-files";
import { StageRecords } from "../store/stage-records";

const acceptedRecordsLayer = Layer.effect(
    AcceptedRecords,
    Effect.gen(function* () {
        const reads = yield* RecordReads;
        return AcceptedRecords.of({ findAcceptedIds: reads.findRecordIds });
    }),
);

/**
 * The record store's services over one store: the one place they are composed. Entry scripts get `recordStoreLayer`, the
 * store of the run's analysis root, through `rootServices`.
 * The store also provides `AcceptedRecords`, which core declares for the shared review gate, so core never reaches
 * the store.
 * @param store the store's layer
 * @returns the services, with the store
 */
const servicesOver = <E, R>(store: Layer.Layer<RecordStore, E, R>) =>
    Layer.mergeAll(
        StageRecords.layer,
        RecordReads.layer,
        ScopeFiles.layer,
        CodeGraph.layer,
        acceptedRecordsLayer.pipe(Layer.provide(RecordReads.layer)),
    ).pipe(Layer.provideMerge(store));

export const recordStoreLayer = servicesOver(RecordStore.layer);
