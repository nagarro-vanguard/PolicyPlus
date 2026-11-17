import { Effect } from "effect";
import { ofType } from "../../shared/read/record-reading";
import { standingRecords } from "../../shared/read/standing-records";
import { JobStates } from "../../shared/jobs/job-state";
import { Lifecycle, Transition } from "../../shared/model/schemas/lifecycle";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import { readJobList, reviewedJob, shapesOf } from "./jobs";

/**
 * Whether every lifecycle job is decided, so the rules jobs may run (D124, D71): each has a report saying accepted
 * or refused, which `finish` writes when it decides the lives.
 * @param root the analysis root
 * @returns true once every life is decided; true when there is none
 */
export const livesDecided = Effect.fnUntraced(function* (root: string) {
    for (const entry of (yield* readJobList(root)).filter((each) => each.kind === "lifecycle")) {
        const row = yield* (yield* JobStates).get("capability-rules", entry.jobId);
        if (row === undefined || row.report === undefined || row.report.outcome === "redo") {
            return false;
        }
    }
    return true;
});

/**
 * The lives written so far, with their transitions, as they stand (accepted after their review or its fix): what the rules jobs choose from, and the one truth their gate resolves `gates` against. Read from the
 * lifecycle jobs' own files, bounded by the scope's entities.
 * @param root the analysis root
 * @returns the lives and the transitions
 */
export const acceptedLives = Effect.fnUntraced(function* (root: string) {
    const lives: Array<typeof Lifecycle.Type> = [];
    const transitions: Array<typeof Transition.Type> = [];
    for (const entry of (yield* readJobList(root)).filter((each) => each.kind === "lifecycle")) {
        const { job } = yield* reviewedJob(root, entry.jobId);
        const row = yield* (yield* JobStates).get(job.stage, job.key);
        if (row !== undefined && row.report !== undefined && row.report.outcome === "accepted") {
            const kept = yield* standingRecords(shapesOf.lifecycle, job);
            lives.push(...ofType(kept, RecordIdPrefix.Lifecycle, Lifecycle));
            transitions.push(...ofType(kept, RecordIdPrefix.Transition, Transition));
        }
    }
    return { lives, transitions };
});
