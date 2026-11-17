import { Effect } from "effect";
import { agentRecords, carryForward } from "../../shared/jobs/job-feedback";
import { checkReviewedJob } from "../../shared/jobs/review-rounds";
import { readRegistryRead, shapesOf, stageReview } from "./check";
import { jobFiles, jobNamed, type Listed } from "./jobs";

/**
 * A job as a reader knows it: what it proposes, or how many units it assigns and the first of them, never its id.
 * @param job the job
 * @returns the label
 */
export function jobLabel(job: Listed): string {
    switch (job.kind) {
        case "assignEntryPoints":
            return `${job.entryPoints.length} entry points, from ${job.entryPoints[0].reachedBy}`;
        case "assignResources":
            return `${job.resources.length} resources, from ${job.resources[0].resource}`;
        case "assignShapes":
            return `${job.shapes.length} data shapes, from ${job.shapes[0].writtenAs}`;
        case "mergeCapabilities":
            return `merging ${job.entries.length} written capabilities, from ${job.entries[0].name}`;
        case "mergeEntities":
            return `merging ${job.entries.length} written entities, from ${job.entries[0].name}`;
    }
}

/**
 * One job as the review rounds take it, with its state: the job's own file, read alone.
 * @param root the analysis root
 * @param jobId the job id
 * @returns the job's state and the job as the review rounds take it; UsageInvalid for an id no job holds
 */
export const reviewedJob = Effect.fnUntraced(function* (root: string, jobId: string) {
    const state = yield* jobNamed(root, jobId);
    return {
        state,
        job: {
            ...jobFiles(root, jobId, state.kind),
            jobId,
            label: jobLabel(state),
        },
    };
});

/**
 * `check`: the gate on one job's output, and, once the reviewer has written, the review's verdicts and the gate again
 * on what the review would leave. The job's agent and its reviewer both run it as their done-check.
 * @param root the analysis root
 * @param jobId the job id
 * @returns one line per gap; none when the job passes
 */
export const checkJob = Effect.fnUntraced(function* (root: string, jobId: string) {
    const { state, job } = yield* reviewedJob(root, jobId);
    return yield* checkReviewedJob(
        stageReview(state, (kind) => readRegistryRead(root, kind)),
        job,
    );
});

/**
 * One job as the loop hands its review out: the stage under review, and the job as the review rounds take it and as
 * listed.
 * @param root the analysis root
 * @param jobId the job id
 * @returns the stage, the job and the job as listed
 */
export const reviewedStageOf = Effect.fnUntraced(function* (root: string, jobId: string) {
    const { state, job } = yield* reviewedJob(root, jobId);
    return { stage: stageReview(state, (kind) => readRegistryRead(root, kind)), job, listed: state };
});

/**
 * `carry`: start one job's run from the artifact its feedback is about, copying every record of it that stands with
 * its record id, so the agent writes only what the feedback changes.
 * @param root the analysis root
 * @param jobId the job id
 * @param leftOut the record ids that do not stand
 * @returns how many records were carried and left out
 */
export const carryJob = Effect.fnUntraced(function* (root: string, jobId: string, leftOut: readonly string[]) {
    const job = yield* jobNamed(root, jobId);
    return yield* carryForward(jobFiles(root, jobId, job.kind), agentRecords(shapesOf[job.kind]), leftOut);
});
