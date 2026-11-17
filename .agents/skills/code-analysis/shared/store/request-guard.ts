import { Effect, Schema } from "effect";
import * as Reactivity from "effect/reactivity/Reactivity";
import { analysisPaths } from "../run/analysis-layout";
import { AnalysisRoot } from "../run/analysis-root";
import { sha1Hex } from "../run/hashing-and-random";
import { UsageInvalid } from "../run/script-errors";
import { FileAccess } from "../source/file-access";
import { RecordStore } from "./database";
import { decodedRows } from "./stored-bodies";

const RequestRow = Schema.Struct({
    requestPath: Schema.NullOr(Schema.String),
    requestDigest: Schema.NullOr(Schema.String),
});

/**
 * Remember which request file a run was made from and what it said, when the request is read: the run works from a
 * snapshot of it, and a request edited later is told apart by this digest.
 * @param outputRoot the analysis root the request names
 * @param request the request file's path and text
 * @param request.path the request file
 * @param request.text what it says now
 * @returns nothing once kept
 */
export const rememberRequest = (outputRoot: string, request: { readonly path: string; readonly text: string }) =>
    Effect.gen(function* () {
        const store = yield* RecordStore;
        yield* store.holdStore(
            Effect.flatMap(
                store.client,
                (sql) =>
                    sql`UPDATE analysis SET requestPath = ${request.path}, requestDigest = ${sha1Hex(request.text)}`,
            ),
        );
    }).pipe(
        Effect.provide(RecordStore.layerAt(analysisPaths(outputRoot).recordStore)),
        Effect.scoped,
        Effect.provide(Reactivity.layer),
    );

/**
 * Refuse to prepare a stage on a request that was edited after the run read it: the run works from its snapshot, so an
 * edit to the request file (a leave-out changed, a source root added) would never reach the stage, and the
 * stage would run on words the file no longer says.
 * @returns nothing when the request file still says what the snapshot was made from; UsageInvalid when it does not
 */
export const requestIsCurrent = Effect.fnUntraced(function* () {
    yield* AnalysisRoot;
    const store = yield* RecordStore;
    const [row] = yield* store.query((sql) =>
        decodedRows(RequestRow)(sql`SELECT requestPath, requestDigest FROM analysis`),
    );
    const fs = yield* FileAccess;
    if (row === undefined || row.requestPath === null || row.requestDigest === null) {
        return;
    }
    if (!(yield* fs.exists(row.requestPath))) {
        return;
    }
    if (sha1Hex(yield* fs.readText(row.requestPath)) !== row.requestDigest) {
        return yield* new UsageInvalid({
            issue: `${row.requestPath} was edited after the run read it: run read-analysis-request.ts on it again, then prepare`,
        });
    }
});
