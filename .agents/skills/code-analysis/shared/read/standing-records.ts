import { Effect, Schema } from "effect";
import { keysOf } from "../run/collections";
import { FileAccess } from "../source/file-access";
import type { JsonRecord } from "../model/json-record";
import { readAgentOutput } from "./record-reading";
import type { ReviewedJob } from "../jobs/review-rounds";
import { findingsIn, reviewIn } from "../jobs/review-files";
import { verdictGaps } from "../jobs/review-verdicts";

type Finding = JsonRecord & { readonly id: string };

type Shapes<T> = { readonly [K in keyof T & string]: Schema.ConstraintDecoder<Finding> };

/**
 * What a job's review leaves standing: the findings, which are the set the record store holds once the job is
 * accepted; the findings are never changed by the review, only by the agent that wrote them (D112); none while the
 * review is not written or leaves a gap. Capability rules reads the lives its
 * rules jobs stand on this way.
 * @param shapes the record types the job's agent writes
 * @param job the job
 * @returns the records that stand
 */
const keptByReview = Effect.fnUntraced(function* <T extends Shapes<T>>(shapes: T, job: ReviewedJob) {
    if (!(yield* (yield* FileAccess).exists(job.reviewPath))) {
        return [];
    }
    const findings = yield* findingsIn(shapes, job.outputPath);
    const review = yield* reviewIn(shapes, job.reviewPath);
    if (review.written.length || verdictGaps(findings, { written: review.verdicts, missed: review.missed }).length) {
        return [];
    }
    return findings;
});

/**
 * A job's records as they stand (D101, D143): as its review leaves them once the review is written, else as its agent
 * wrote them, each the newest copy; none while its output is set aside or not yet written.
 * @param shapes the record types the job's agent writes
 * @param job the job
 * @returns the records
 */
export const standingRecords = Effect.fnUntraced(function* <T extends Shapes<T>>(shapes: T, job: ReviewedJob) {
    const fs = yield* FileAccess;
    if (yield* fs.exists(job.reviewPath)) {
        return yield* keptByReview(shapes, job);
    }
    if (!(yield* fs.exists(job.outputPath))) {
        return [];
    }
    const read = yield* readAgentOutput(job.outputPath, shapes);
    const records: Finding[] = keysOf<keyof T & string>(shapes).flatMap((name) => read.of(name));
    return records;
});
