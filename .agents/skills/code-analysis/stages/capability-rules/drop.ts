import { Effect, Schema } from "effect";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { Dropped, dropRecord, droppedForReview } from "../../shared/jobs/drop-record";
import { FileAccess } from "../../shared/source/file-access";
import { agentRecords, type ArtifactRecord } from "../../shared/jobs/job-feedback";
import { AnyRecord, readOptionalRecords } from "../../shared/run/json-files";
import { prefixOf } from "../../shared/model/record-ids";
import { ShapeRegistry } from "../../shared/model/shape-registry";
import { UsageInvalid } from "../../shared/run/script-errors";
import { jobFiles, jobNamed, readJobList, shapesOf } from "./jobs";

/**
 * The ids of the records of every job's output that cite a record, by the references their types declare.
 * @param root the analysis root
 * @param id the record id
 * @returns the ids of the records that cite it
 */
const citingIn = Effect.fnUntraced(function* (root: string, id: string) {
    const fs = yield* FileAccess;
    const registered = Object.values((yield* ShapeRegistry).records);
    const citing: string[] = [];
    for (const listed of yield* readJobList(root)) {
        const { outputPath } = jobFiles(root, listed.jobId, listed.kind);
        if (!(yield* fs.exists(outputPath))) {
            continue;
        }
        for (const { key, record } of yield* agentRecords(shapesOf[listed.kind])(outputPath)) {
            const type = registered.find((each) => each.idPrefix === prefixOf(key));
            if (
                type !== undefined &&
                key !== id &&
                type.citesOf(Schema.decodeUnknownSync(AnyRecord)(record)).includes(id)
            ) {
                citing.push(key);
            }
        }
    }
    return citing;
});

/**
 * `drop-record <job> <record id> --why`: remove one record from a job's output before its review, keeping its text and
 * why in the job's drops, which the next review is handed. Refused for a record the output does not hold and while a
 * record of any job's output cites it.
 * @param root the analysis root
 * @param jobId the job id
 * @param recordId the record to drop
 * @param why why it goes
 * @returns the drop
 */
export const dropFromJob = Effect.fnUntraced(function* (root: string, jobId: string, recordId: string, why: string) {
    const fs = yield* FileAccess;
    const job = yield* jobNamed(root, jobId);
    const files = jobFiles(root, jobId, job.kind);
    if (!(yield* fs.exists(files.outputPath))) {
        return yield* new UsageInvalid({ issue: `${jobId} has written nothing yet: there is no record to drop` });
    }
    if (yield* fs.exists(files.reviewPath)) {
        return yield* new UsageInvalid({ issue: `${jobId} is reviewed: a record is dropped before its review` });
    }
    const lines = (yield* fs.readText(files.outputPath)).split("\n").filter((line) => line.trim() !== "");
    const done = dropRecord({ lines, id: recordId, why, citedBy: yield* citingIn(root, recordId) });
    if (done.kind === "refused") {
        return yield* new UsageInvalid({ issue: done.reason });
    }
    yield* fs.writeText(files.outputPath, done.kept.length ? `${done.kept.join("\n")}\n` : "");
    yield* fs.appendText(analysisPaths(root).capabilityRules.drops(jobId), `${JSON.stringify(done.drop)}\n`);
    return done.drop;
});

/**
 * Keep the records a `carry` left out as drops, so a record that does not stand reaches the next review as one that
 * was dropped does.
 * @param root the analysis root
 * @param jobId the job id
 * @param records the records left out
 * @returns nothing once kept
 */
export const keepAsDrops = Effect.fnUntraced(function* (
    root: string,
    jobId: string,
    records: readonly ArtifactRecord[],
) {
    if (!records.length) {
        return;
    }
    yield* (yield* FileAccess).appendText(
        analysisPaths(root).capabilityRules.drops(jobId),
        records
            .map((each) =>
                JSON.stringify({
                    id: each.key,
                    why: "left out when the run was carried",
                    record: JSON.stringify(each.record),
                }),
            )
            .join("\n") + "\n",
    );
});

/**
 * What the reviewer of one job is handed of the records dropped from its output: their text and why they went.
 * @param root the analysis root
 * @param jobId the job id
 * @returns the text, none when nothing was dropped
 */
export const droppedSheetOf = Effect.fnUntraced(function* (root: string, jobId: string) {
    const text = droppedForReview(
        yield* readOptionalRecords(analysisPaths(root).capabilityRules.drops(jobId), Dropped),
    );
    return text === "" ? {} : { beside: text };
});
