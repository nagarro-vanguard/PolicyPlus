import { Effect } from "effect";
import { FileAccess } from "../source/file-access";
import { RandomIds } from "../run/hashing-and-random";
import { GapsRemain } from "../run/script-errors";
import { jobIdDigits } from "../model/record-ids";

/**
 * Issue the job ids of a new cut, job by job, as the cut makes them. A job whose definition is exactly that of a job of
 * the earlier cut keeps that job's id, so cutting the same input again resumes where the stage stopped; every other job
 * gets a fresh random job id that neither cut holds, so a job id never names two different pieces of work. Once the cut
 * is made, the earlier jobs no new job kept are its dropped ones, whose files the caller removes.
 * @param prefix the job kind's prefix, such as `job`
 * @param earlier the earlier cut's jobs, each with its job id and definition
 * @returns the issuer: `idOf` a definition (with whether the id is fresh), and `dropped`, once every job has its id
 */
export const jobIdIssuer = Effect.fnUntraced(function* (
    prefix: string,
    earlier: ReadonlyArray<{ readonly id: string; readonly definition: string }>,
) {
    const random = yield* RandomIds;
    const byDefinition = new Map(earlier.map((job) => [job.definition, job.id]));
    const taken = new Set(earlier.map((job) => job.id));
    const kept = new Set<string>();
    const idOf = Effect.fnUntraced(function* (definition: string) {
        const same = byDefinition.get(definition);
        if (same !== undefined && !kept.has(same)) {
            kept.add(same);
            return { id: same, fresh: false };
        }
        let [fresh] = yield* random.next(prefix, 1, jobIdDigits);
        while (fresh === undefined || taken.has(fresh)) {
            [fresh] = yield* random.next(prefix, 1, jobIdDigits);
        }
        taken.add(fresh);
        return { id: fresh, fresh: true };
    });
    return { idOf, dropped: () => earlier.map((job) => job.id).filter((id) => !kept.has(id)) };
});

/**
 * Give each job of a new cut its job id, by the issuer's rule (`jobIdIssuer`), when the whole cut is at hand.
 * @param prefix the job kind's prefix, such as `job`
 * @param jobs the new cut's jobs, without ids
 * @param definitionOf a job's definition, as text: everything that makes it the job it is
 * @param earlier the earlier cut's jobs, each with its job id and definition
 * @returns the new jobs, each with its job id, and the ids of the earlier jobs dropped
 */
export const assignJobIds = Effect.fnUntraced(function* <J extends object>(
    prefix: string,
    jobs: readonly J[],
    definitionOf: (job: J) => string,
    earlier: ReadonlyArray<{ readonly id: string; readonly definition: string }>,
) {
    const issuer = yield* jobIdIssuer(prefix, earlier);
    const withIds: Array<J & { readonly id: string }> = [];
    for (const job of jobs) {
        withIds.push({ id: (yield* issuer.idOf(definitionOf(job))).id, ...job });
    }
    return { jobs: withIds, dropped: issuer.dropped() };
});

/**
 * Refuse a new cut of a stage's jobs that would drop a job that has already left work behind: its records would stay
 * in the record store or its outputs in work/ under an id no job holds any more. Cutting the same input again keeps every job
 * id, so this only stops a cut that changed after work began; the stage is then started over by hand.
 * @param stage the stage, as the message names it
 * @param dropped each dropped job's id and the files its work would be in
 * @returns nothing when no dropped job left a file; GapsRemain naming each one that did
 */
export const refuseDroppedWork = Effect.fnUntraced(function* (
    stage: string,
    dropped: ReadonlyArray<{ readonly job: string; readonly files: readonly string[] }>,
) {
    const fs = yield* FileAccess;
    const gaps: string[] = [];
    for (const { job, files } of dropped) {
        for (const file of files) {
            if (yield* fs.exists(file)) {
                gaps.push(
                    `${job} is no longer one of ${stage}'s jobs, but ${file} holds its work: start ${stage} over (run its prepare, which removes its accepted records, and remove its work folder) before cutting it again`,
                );
                break;
            }
        }
    }
    if (gaps.length) {
        return yield* new GapsRemain({ gaps });
    }
});
