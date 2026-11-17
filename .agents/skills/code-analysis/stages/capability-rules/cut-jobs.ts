import { Effect } from "effect";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { FileAccess } from "../../shared/source/file-access";
import { jobIdIssuer, refuseDroppedWork } from "../../shared/jobs/job-ids";
import { AnyRecord, jsonlText, readOptionalRecords } from "../../shared/run/json-files";
import { JobIdPrefix, prefixOf } from "../../shared/model/record-ids";
import { ofType } from "../../shared/read/record-reading";
import { BusinessRule } from "../../shared/model/schemas/business-rule";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import { JobStates } from "../../shared/jobs/job-state";
import { definitionOf, jobFiles, readJobList, workFilesOf, writeJob, type Job, type ListEntry } from "./jobs";

/**
 * Cut today's jobs into the job list (D217, D224), keeping each job's id, file and work while its units are the same:
 * a job whose definition an earlier job had keeps its id, a new one gets a fresh id and its first state; each lifecycle
 * job's file of uses is written beside it. Every life runs before the rules jobs. A job no longer cut leaves with its folder, refused
 * while it holds work (P1.24); the transitions of a life that leaves are returned, so the rules gating them are read
 * again.
 * @param root the analysis root
 * @param jobs today's jobs, every lifecycle job first, in their first state, each lifecycle job with its uses
 * @returns the listed jobs and the transitions of the lives that left
 */
export const cutJobs = Effect.fnUntraced(function* (
    root: string,
    jobs: ReadonlyArray<{ readonly job: Job; readonly uses?: readonly object[] }>,
) {
    const fs = yield* FileAccess;
    const paths = analysisPaths(root).capabilityRules;
    const earlier = yield* readJobList(root);
    const issuer = yield* jobIdIssuer(
        JobIdPrefix.capabilityRules,
        earlier.map((entry) => ({ id: entry.jobId, definition: entry.definition })),
    );
    const fresh: string[] = [];
    const cut: ListEntry[] = [];
    for (const { job, uses } of jobs) {
        const definition = definitionOf(job);
        const issued = yield* issuer.idOf(definition);
        if (issued.fresh) {
            yield* writeJob(root, { jobId: issued.id, ...job });
            fresh.push(issued.id);
        }
        if (uses !== undefined) {
            yield* fs.writeText(paths.uses(issued.id), jsonlText(uses));
        }
        cut.push({ jobId: issued.id, kind: job.kind, definition });
    }
    const listed = [...cut].sort(
        (left, right) => Number(right.kind === "lifecycle") - Number(left.kind === "lifecycle"),
    );
    const dropped = issuer.dropped();
    yield* refuseDroppedWork(
        "Capability rules",
        dropped.map((job) => ({ job, files: workFilesOf(root, job) })),
    ).pipe(Effect.tapError(() => Effect.forEach(fresh, (jobId) => fs.remove(paths.job(jobId)))));
    const droppedLives = dropped.filter((jobId) =>
        earlier.some((each) => each.jobId === jobId && each.kind === "lifecycle"),
    );
    const gone = yield* transitionsOf(root, droppedLives);
    const states = yield* JobStates;
    for (const jobId of dropped) {
        yield* fs.remove(paths.job(jobId));
        yield* states.remove("capability-rules", jobId);
    }
    yield* fs.writeText(paths.jobs, JSON.stringify(listed, null, 1));
    return { listed, transitionsGone: gone };
});

/**
 * The lines one job reads: a rules job's blocks' own lines, a life's save sites and shapes.
 * @param job the job
 * @returns the line count
 */
export const linesOfJob = (job: Job) =>
    (job.kind === "lifecycle"
        ? [...job.saves.map((save) => save.lines), ...job.shapes.map((shape) => shape.lines)]
        : job.blocks.map((block) => block.lines)
    ).reduce((sum, lines) => sum + lines.lastLine - lines.firstLine + 1, 0);

/**
 * The transitions some lifecycle jobs wrote, by record id, from their outputs as they stand: what a rules job's
 * `gates` names (D223). Read before those outputs are cleared or their folders removed.
 * @param root the analysis root
 * @param jobIds the lifecycle jobs
 * @returns the transitions' record ids
 */
export const transitionsOf = Effect.fnUntraced(function* (root: string, jobIds: readonly string[]) {
    const ids = new Set<string>();
    for (const jobId of jobIds) {
        const records = yield* readOptionalRecords(jobFiles(root, jobId, "lifecycle").outputPath, AnyRecord);
        records.forEach((record) => {
            if (typeof record.id === "string" && prefixOf(record.id) === RecordIdPrefix.Transition) {
                ids.add(record.id);
            }
        });
    }
    return ids;
});

/**
 * Clear the rules jobs whose outputs gate one of some transitions (D223, P1.33): a life run again takes new
 * transitions, so a rule gating one of the old ones must be read again on the new life; every other rules job keeps
 * its work. The accepted lives the rules jobs choose from are written again at their next `prepare`. The caller holds
 * the record store.
 * @param root the analysis root
 * @param transitions the transitions of the lives run again, by record id
 * @returns how many rules jobs were cleared
 */
export const clearRulesJobsGating = Effect.fnUntraced(function* (root: string, transitions: ReadonlySet<string>) {
    const fs = yield* FileAccess;
    yield* fs.remove(analysisPaths(root).capabilityRules.lifecycles);
    let cleared = 0;
    if (!transitions.size) {
        return cleared;
    }
    for (const entry of (yield* readJobList(root)).filter((each) => each.kind === "rules")) {
        const rules = ofType(
            (yield* readOptionalRecords(jobFiles(root, entry.jobId, "rules").outputPath, AnyRecord)).flatMap(
                (record) => (typeof record.id === "string" ? [{ ...record, id: record.id }] : []),
            ),
            RecordIdPrefix.BusinessRule,
            BusinessRule,
        );
        if (rules.some((rule) => rule.gates !== undefined && transitions.has(rule.gates))) {
            for (const path of workFilesOf(root, entry.jobId)) {
                yield* fs.remove(path);
            }
            yield* (yield* JobStates).remove("capability-rules", entry.jobId);
            cleared += 1;
        }
    }
    return cleared;
});
