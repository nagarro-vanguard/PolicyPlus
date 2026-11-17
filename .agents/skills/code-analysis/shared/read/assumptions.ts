import type { AssumptionNotice } from "../model/schemas/stage-actions";
import { Effect, Result, Schema, Stream } from "effect";
import { analysisPaths } from "../run/analysis-layout";
import { FileAccess } from "../source/file-access";
import { AnyRecord, readRecords } from "../run/json-files";
import { refuseWhileBatchOpen, type StageLoop } from "../jobs/loop-jobs";
import { RecordReads } from "./record-reads";
import { Fact, evidenceOf } from "../model/schemas/fact";
import { FeedbackItem } from "../model/schemas/feedback";
import { RecordInvalid, UsageInvalid } from "../run/script-errors";
import { prefixOf } from "../model/record-ids";
import { RecordIdPrefix } from "../model/shared-fields";
import { AssumptionsAccepted } from "../run/subject-views";

const strict = { onExcessProperty: "error" } as const;

/**
 * The assumptions in a job's file, each as last written (D165): its facts whose basis is assumed.
 * @param path the job's output or its review
 * @returns the assumptions
 */
const readAssumptions = Effect.fnUntraced(function* (path: string) {
    if (!(yield* (yield* FileAccess).exists(path))) {
        return [];
    }
    const last = new Map<string, { readonly line: number; readonly record: unknown }>();
    for (const [i, record] of (yield* readRecords(path, AnyRecord)).entries()) {
        if (typeof record.id === "string" && prefixOf(record.id) === RecordIdPrefix.Fact) {
            last.delete(record.id);
            last.set(record.id, { line: i + 1, record });
        }
    }
    const facts: Array<typeof Fact.Type> = [];
    for (const { line, record } of last.values()) {
        const decoded = Schema.decodeUnknownResult(Fact, strict)(record);
        if (Result.isFailure(decoded)) {
            return yield* new RecordInvalid({ path, line, issue: `Fact: ${decoded.failure.message}` });
        }
        facts.push(decoded.success);
    }
    return facts.filter((fact) => "assumed" in fact.basis);
});

/**
 * The assumptions one job's output holds, as the person is told them when its batch closes (D66, D165).
 * @param label the job, as its stage names it
 * @param outputPath the job's output
 * @returns the notices
 */
export const assumptionNotices = Effect.fnUntraced(function* (label: string, outputPath: string) {
    return (yield* readAssumptions(outputPath)).flatMap((fact): AssumptionNotice[] =>
        "assumed" in fact.basis
            ? [
                  {
                      job: label,
                      fact: fact.id,
                      statement: fact.statement,
                      why: fact.basis.assumed.why,
                      ifWrong: fact.basis.assumed.ifWrong,
                  },
              ]
            : [],
    );
});

/**
 * Give the person's word on one assumption to the jobs it rests on (P1.32, P4e.11): a challenge or material that
 * settles it becomes feedback naming the assumption, and each job is prepared again, so its next run keeps, corrects
 * or drops what it rests on. An assumption a job wrote goes to that job; one the stage's script wrote (the Map's, for
 * what it cannot see) goes to the jobs the stage names as resting on it (`ownersOf`). Refused while a batch is open,
 * and for an assumption no job of the stage rests on.
 * @param loop the stage
 * @param factId the assumption, by its record id
 * @param said what the person says of it, given the assumption's statement
 * @returns the jobs' names, once prepared
 */
export const giveWordOnAssumption = Effect.fnUntraced(function* (
    loop: StageLoop,
    factId: string,
    said: (statement: string) => string,
) {
    yield* refuseWhileBatchOpen(loop.stage);
    for (const key of yield* loop.keys) {
        const job = yield* loop.job(key);
        for (const path of [job.outputPath, job.reviewed.reviewPath]) {
            const fact = (yield* readAssumptions(path)).find((each) => each.id === factId);
            if (fact !== undefined) {
                const lines = evidenceOf(fact).map((each) => each.lines);
                yield* loop.answer(key, FeedbackItem.on("person", said(fact.statement), [fact.id], lines));
                return job.label;
            }
        }
    }
    const [stored] = yield* (yield* RecordReads).findRecordsByIds("Fact", [factId], Fact);
    const owners = stored === undefined || !("assumed" in stored.basis) ? [] : yield* loop.ownersOf(stored);
    if (stored === undefined || owners.length === 0) {
        return yield* new UsageInvalid({ issue: `no job of ${loop.stage} rests on the assumption ${factId}` });
    }
    const labels: string[] = [];
    for (const key of owners) {
        const lines = evidenceOf(stored).map((each) => each.lines);
        yield* loop.answer(key, FeedbackItem.on("person", said(stored.statement), [stored.id], lines));
        labels.push((yield* loop.job(key)).label);
    }
    return labels.join(", ");
});

/**
 * Accept the assumptions register as a whole (P1.32, P4e.11): every accepted assumption now stored, with when; one
 * written later waits for the person's review again.
 * @param root the analysis root
 * @returns how many assumptions were accepted
 */
export const acceptRegister = Effect.fnUntraced(function* (root: string) {
    const facts = yield* Stream.runCollect((yield* RecordReads).recordsOfType("Fact", Fact));
    const accepted: typeof AssumptionsAccepted.Type = {
        acceptedAt: new Date().toISOString(),
        facts: facts.filter((fact) => "assumed" in fact.basis).map((fact) => fact.id),
    };
    yield* (yield* FileAccess).writeText(analysisPaths(root).assumptionsAccepted, JSON.stringify(accepted, null, 1));
    return accepted.facts.length;
});
