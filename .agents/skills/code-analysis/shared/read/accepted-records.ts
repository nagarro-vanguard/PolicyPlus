import { Context, type Effect } from "effect";
import type { RecordStoreOutdated, StoreBusy, StoreFailed } from "../run/script-errors";

export interface AcceptedRecordsOps {
    readonly findAcceptedIds: (
        ids: readonly string[],
    ) => Effect.Effect<readonly string[], StoreFailed | RecordStoreOutdated | StoreBusy>;
}

export class AcceptedRecords extends Context.Service<AcceptedRecords, AcceptedRecordsOps>()(
    "code-analysis/core/AcceptedRecords",
) {}
