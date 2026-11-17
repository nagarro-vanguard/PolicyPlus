import { Effect } from "effect";
import { addToCount } from "../run/collections";
import { FileAccess } from "../source/file-access";
import { AnyRecord, readRecords } from "../run/json-files";
import { standingOf, type StageLoop } from "./loop-jobs";
import { JobStates } from "./job-state";
import type { BatchRow } from "./job-state-types";
import { recordTypeNames } from "../model/record-types";
import { ShapeRegistry, typeNameOfId } from "../model/shape-registry";
import type { Counted, JobRan, StageStatus } from "../model/schemas/stage-status";

/**
 * Counts of records by type: what an agent's pass wrote. A record whose id names no registered type is not counted.
 * @param records the records
 * @returns each type's count, in the order the types first appear
 */
const countedByType = Effect.fnUntraced(function* (records: readonly { readonly id?: unknown }[]) {
    const typeNameOf = typeNameOfId((yield* ShapeRegistry).records);
    const counts = new Map<Counted["of"], number>();
    for (const id of new Set(records.flatMap((record) => (typeof record.id === "string" ? [record.id] : [])))) {
        const named = recordTypeNames.find((name) => name === typeNameOf(id));
        if (named !== undefined) {
            addToCount(counts, named, 1);
        }
    }
    const wrote: Counted[] = [...counts].map(([of, count]) => ({ of, count }));
    return wrote;
});

/**
 * What each job of a closed batch did (D101): after an agent's pass, how many records of each type it wrote; after a
 * review's pass, its verdicts. Bounded by the batch.
 * @param loop the stage
 * @param batch the batch
 * @returns each job's facts
 */
const jobsRan = Effect.fnUntraced(function* (loop: StageLoop, batch: BatchRow) {
    const fs = yield* FileAccess;
    const jobs: JobRan[] = [];
    for (const entry of batch.jobs) {
        const job = yield* loop.job(entry.key);
        const path = entry.pass === "agent" ? job.outputPath : job.reviewed.reviewPath;
        const records = (yield* fs.exists(path)) ? yield* readRecords(path, AnyRecord) : [];
        if (entry.pass === "agent") {
            jobs.push({ _tag: "agentWrote", label: job.label, wrote: yield* countedByType(records) });
            continue;
        }
        const verdicts = { partlyCorrect: 0, wrong: 0, unsettled: 0 };
        for (const record of records) {
            const verdict = record.verdict;
            if (verdict === "partlyCorrect" || verdict === "wrong" || verdict === "unsettled") {
                verdicts[verdict] += 1;
            }
        }
        jobs.push({ _tag: "reviewDecided", label: job.label, verdicts });
    }
    return jobs;
});

/**
 * A stage's state from the facts on disk (D103): stopped while its last step's stop is recorded, or when every job is
 * decided and none could be written, their checks still failing after their fixes (P1.33), which the operator acts
 * on; done once its records are written; not started before it has jobs; else running. Nothing waits for the person
 * (D201).
 * @param facts what the stage's files show
 * @param facts.stopped whether its last step's stop is recorded
 * @param facts.written whether its records are written
 * @param facts.decided whether every job is decided and no batch is open
 * @param facts.counts its jobs, by state
 * @returns the state
 */
function stateFrom(facts: {
    readonly stopped: boolean;
    readonly written: boolean;
    readonly decided: boolean;
    readonly counts: StageStatus["progress"];
}): StageStatus["_tag"] {
    const { counts } = facts;
    const jobs = Object.values(counts).reduce((sum, count) => sum + count, 0);
    if (facts.stopped || (!facts.written && facts.decided && jobs > 0 && counts.refused === jobs)) {
        return "stopped";
    }
    if (facts.written) {
        return "done";
    }
    return jobs === 0 ? "notStarted" : "running";
}

/**
 * Where a stage stands, from disk (D103): its state (`stateFrom`), its jobs by state, why it stopped, and, while it
 * runs, what the batch it closed last did.
 * @param loop the stage
 * @returns the standing
 */
export const stageStatusOf = Effect.fnUntraced(function* (loop: StageLoop) {
    const states = yield* JobStates;
    const { counts, open, written } = yield* standingOf(loop);
    const stopped = yield* states.stopped(loop.stage);
    const decided = open === undefined && counts.toRun === 0 && counts.toReview === 0;
    const state = stateFrom({ stopped: stopped !== undefined, written, decided, counts });
    const common = { stage: loop.stage, madeAt: new Date().toISOString(), progress: counts };
    switch (state) {
        case "stopped": {
            const reason =
                stopped === undefined
                    ? "every job is refused: their checks still fail after their fixes, and show names each with its feedback"
                    : stopped;
            const standing: StageStatus = { _tag: state, ...common, reason };
            return standing;
        }
        case "running": {
            const batch = yield* states.lastBatch(loop.stage);
            const standing: StageStatus = {
                _tag: state,
                ...common,
                justRan: batch === undefined ? [] : yield* jobsRan(loop, batch),
            };
            return standing;
        }
        default: {
            const standing: StageStatus = { _tag: state, ...common };
            return standing;
        }
    }
});
