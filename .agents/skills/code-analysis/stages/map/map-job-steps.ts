import { Effect } from "effect";
import { agentRecords, carryForward } from "../../shared/jobs/job-feedback";
import { checkMapJob, mapShapes } from "./check-map";
import { mapJobFiles, mapJobNamed } from "./map-jobs";
import { carryProposing, checkProposing } from "./map-proposing";
import { proposingNamed, requireMapRegistries } from "./map-registries";

/**
 * `check` on any of the Map's jobs: a proposing job's gate and review, or a Map job's.
 * @param root the analysis root
 * @param jobId the job id
 * @returns one line per gap
 */
export const checkAnyMapJob = Effect.fnUntraced(function* (root: string, jobId: string) {
    const proposing = proposingNamed(yield* requireMapRegistries(), jobId);
    return proposing === undefined ? yield* checkMapJob(root, jobId) : yield* checkProposing(root, proposing);
});

/**
 * `carry` on any of the Map's jobs: start its run from the artifact its feedback is about, every record of it that
 * stands copied with its record id, so the agent writes only what the feedback changes.
 * @param root the analysis root
 * @param jobId the job id
 * @param leftOut the record ids that do not stand
 * @returns how many records were carried and left out
 */
export const carryAnyMapJob = Effect.fnUntraced(function* (root: string, jobId: string, leftOut: readonly string[]) {
    const proposing = proposingNamed(yield* requireMapRegistries(), jobId);
    if (proposing !== undefined) {
        return yield* carryProposing(root, proposing, leftOut);
    }
    yield* mapJobNamed(root, jobId);
    return yield* carryForward(mapJobFiles(root, jobId), agentRecords(mapShapes), leftOut);
});
