import { Effect } from "effect";
import { readCatalogue } from "../run/catalogue";
import { factGaps, type FactContext } from "../jobs/fact-gaps";
import type { JsonRecord } from "../model/json-record";
import { ofType } from "./record-reading";
import { Fact } from "../model/schemas/fact";
import { RecordIdPrefix } from "../model/shared-fields";

/**
 * What a stage's facts are checked against alike: the catalogue. Read once per `finish`, once per `check`.
 * @returns the context, but the lines each job cites
 */
export const readFactBase = Effect.fnUntraced(function* () {
    return { catalogue: yield* readCatalogue() };
});

/**
 * Every gap of one job's facts, for a stage after How it runs: the shared fact rules (`factGaps`).
 * @param records the job's records
 * @param context what the facts are checked against, with the lines they cite
 * @returns one line per gap
 */
export const stageFactGaps = (records: readonly (JsonRecord & { readonly id: string })[], context: FactContext) =>
    factGaps(ofType(records, RecordIdPrefix.Fact, Fact), context);
