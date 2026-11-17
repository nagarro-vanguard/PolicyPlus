import { basename, dirname, join } from "node:path";
import { Effect, Result, Schema } from "effect";
import { Dropped } from "./drop-record";
import { FileAccess } from "../source/file-access";
import { AnyRecord, readOptionalRecords, readRecords } from "../run/json-files";
import type { JsonRecord } from "../model/json-record";
import { JobStates } from "./job-state";
import { citedRanges } from "../read/record-writing";
import { canonical } from "./review-labels";
import type { ReviewedJob } from "./review-rounds";
import type { Lines } from "../model/shared-fields";

type Finding = JsonRecord & { readonly id: string };

/**
 * Each record of an output as it stands, the newest copy of each record id, since a record is corrected by appending
 * it again under its id.
 * @param path the output
 * @returns the records with an id, each as last written
 */
export const latestRecords = Effect.fnUntraced(function* (path: string) {
    const byId = new Map<string, Finding>();
    for (const record of yield* readRecords(path, AnyRecord)) {
        if (typeof record.id === "string") {
            byId.set(record.id, { ...record, id: record.id });
        }
    }
    return [...byId.values()];
});

const decodeText = Schema.decodeUnknownResult(Schema.fromJsonString(AnyRecord));

/**
 * Where the records dropped from a job's output are kept: beside it.
 * @param job the job
 * @param job.outputPath its output
 * @returns the path
 */
const dropsPathOf = (job: { readonly outputPath: string }) => join(dirname(job.outputPath), "drops.jsonl");

/**
 * What a job's second review judges, once its fix is taken: the records the fix changed or wrote, and the records
 * dropped since. Nothing else is judged again, and the second review is the last agent pass: a challenge there is
 * left standing, disputed, for the person. None before the review's fix, and none when the fix changed and dropped
 * nothing, which leaves nothing to judge.
 * @param job the job
 * @returns the records to judge, the lines they cite, and the dropped records, or none
 */
export const secondRoundOf = Effect.fnUntraced(function* (job: ReviewedJob) {
    const fs = yield* FileAccess;
    const { fixes, round } = yield* (yield* JobStates).ensure(job.stage, job.key);
    const artifact = join(job.roundsFolder, String(round), basename(job.outputPath));
    if (!fixes.review || round === 0 || !(yield* fs.exists(artifact)) || !(yield* fs.exists(job.outputPath))) {
        return undefined;
    }
    const before = new Map((yield* latestRecords(artifact)).map((record) => [record.id, canonical(record)]));
    const corrected = (yield* latestRecords(job.outputPath)).filter(
        (record) => before.get(record.id) !== canonical(record),
    );
    const dropped = yield* readOptionalRecords(dropsPathOf(job), Dropped);
    if (!corrected.length && !dropped.length) {
        return undefined;
    }
    const scope: Lines[] = [
        ...corrected.flatMap((record) => citedRanges(record)),
        ...dropped.flatMap((drop) => {
            const record = decodeText(drop.record);
            return Result.isSuccess(record) ? citedRanges(record.success) : [];
        }),
    ];
    return { corrected, dropped, scope };
});
