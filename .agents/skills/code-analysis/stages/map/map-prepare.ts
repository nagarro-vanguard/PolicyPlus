import { Effect, Stream } from "effect";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { AnalysisConfig } from "../../shared/run/analysis-limits";
import { FileAccess } from "../../shared/source/file-access";
import { assignJobIds, refuseDroppedWork } from "../../shared/jobs/job-ids";
import { readMapJobLines, readMapJobList } from "../../shared/jobs/map-job-list";
import { countProgress } from "../../shared/jobs/progress";
import { JobIdPrefix } from "../../shared/model/record-ids";
import { JobStates } from "../../shared/jobs/job-state";
import { ScopeFiles } from "../../shared/read/scope-files";
import { requireAcceptedRecords, startStageRun } from "../../shared/store/stage-guards";
import { StageRecords } from "../../shared/store/stage-records";
import { readUnread, whollyUnread } from "./unread";
import { GapsRemain } from "../../shared/run/script-errors";
import type { Lines } from "../../shared/model/shared-fields";
import { coverageGaps, cutMapJobs } from "./cut-map-jobs";
import { mapBriefText, rulesNotGot } from "./map-brief";
import { mapJobFiles, writeMapJob } from "./map-jobs";
import { readMapRegistries, writeMapRegistries, type MapRegistriesState } from "./map-registries";

/**
 * The lines in some windows.
 * @param windows the windows
 * @returns their lines
 */
const linesOf = (windows: readonly Lines[]) =>
    windows.reduce((total, window) => total + window.lastLine - window.firstLine + 1, 0);

const laterStages = ["capabilities-and-entities"] as const;

/**
 * Today's cut of the manifest: every file in scope with lines (an exact copy is read once, as its original, and a file
 * whose every line is unread is read by no one), by folder and the read budget; refused while any line is not in
 * exactly one job.
 * @param root the analysis root
 * @returns the jobs' windows
 */
const cutToday = Effect.fnUntraced(function* (root: string) {
    const manifest = yield* Stream.runCollect((yield* ScopeFiles).manifestRows);
    const unread = whollyUnread(manifest, yield* readUnread(root));
    const readable = manifest.filter((entry) => !entry.copyOf && !unread.has(entry.path));
    const jobs = cutMapJobs(readable, (yield* AnalysisConfig).readBudget);
    const gaps = coverageGaps(readable, jobs);
    if (gaps.length) {
        return yield* new GapsRemain({ gaps });
    }
    return { jobs: jobs.map((job) => job.files) };
});

/**
 * Each listed job with its windows, read once from its own file.
 * @param root the analysis root
 * @param ids the job ids
 * @returns each job id with its windows' text, the job's identity for a recut
 */
const definitionsOf = Effect.fnUntraced(function* (root: string, ids: readonly string[]) {
    const defined = [];
    for (const jobId of ids) {
        defined.push({ id: jobId, definition: JSON.stringify(yield* readMapJobLines(root, jobId)) });
    }
    return defined;
});

/**
 * How many kinds of file and parts of the code a Map job's windows hold: the distinct file endings and the distinct
 * top folders. Read from the coordinates alone, never from what the files say.
 * @param windows a job's windows
 * @returns the count
 */
const varietyOf = (windows: readonly Lines[]) => {
    const endings = new Set(windows.map((window) => window.file.slice(window.file.lastIndexOf("."))));
    const folders = new Set(windows.map((window) => window.file.split("/")[0]));
    return endings.size + folders.size;
};

/**
 * The Map job that runs first, alone: the one whose windows hold the most kinds of file and parts, the first of them in
 * cut order on a tie, so the registries start from a spread of the code and no job is left out of reading.
 * @param jobs today's jobs, each with its windows, in cut order
 * @returns the lead job's id
 */
const leadOf = (jobs: ReadonlyArray<{ readonly id: string; readonly lines: readonly Lines[] }>) =>
    jobs.reduce((lead, job) => (varietyOf(job.lines) > varietyOf(lead.lines) ? job : lead)).id;

/**
 * The registries' state for today's cut: the merging jobs and the merge stand while the cut does; the lead job is the
 * one holding the most variety, kept while it is still cut. The caller holds the record store.
 * @param root the analysis root
 * @param order every job's id in cut order
 * @param lead the lead job of today's cut
 * @returns the state
 */
const registriesFor = Effect.fnUntraced(function* (root: string, order: readonly string[], lead: string) {
    const earlier = yield* readMapRegistries();
    const kept = earlier !== undefined && order.includes(earlier.lead);
    const state: MapRegistriesState = {
        lead: kept ? earlier.lead : lead,
        order,
        proposing: earlier === undefined ? [] : earlier.proposing,
        merging: earlier !== undefined && earlier.merging,
    };
    return state;
});

/**
 * Write today's cut: a job whose windows are unchanged keeps its job id, its file and its work; a new one gets a
 * fresh job id and its `job.json`; one no longer cut leaves with its folder, and is refused while it holds work. The
 * caller holds the record store.
 * @param root the analysis root
 * @param jobs today's jobs' windows
 * @returns the jobs, each with its job id
 */
const writeCut = Effect.fnUntraced(function* (root: string, jobs: ReadonlyArray<readonly Lines[]>) {
    const fs = yield* FileAccess;
    const paths = analysisPaths(root);
    const earlier = yield* readMapJobList(root);
    const cut = yield* assignJobIds(
        JobIdPrefix.map,
        jobs.map((lines) => ({ lines })),
        (job) => JSON.stringify(job.lines),
        yield* definitionsOf(root, earlier),
    );
    yield* refuseDroppedWork(
        "the Map",
        cut.dropped.map((job) => {
            const { outputPath, reviewPath, roundsFolder } = mapJobFiles(root, job);
            return { job, files: [outputPath, reviewPath, roundsFolder] };
        }),
    );
    const states = yield* JobStates;
    for (const dropped of cut.dropped) {
        yield* fs.remove(paths.mapJob(dropped));
        yield* states.remove("map", dropped);
    }
    const kept = new Set(earlier);
    const toWrite = cut.jobs.filter((each) => !kept.has(each.id));
    const written = yield* countProgress("map prepare", toWrite.length, "job files written");
    for (const job of toWrite) {
        yield* writeMapJob(root, { jobId: job.id, lines: job.lines });
        yield* written;
    }
    yield* fs.writeText(
        paths.mapJobs,
        JSON.stringify(
            cut.jobs.map((job) => job.id),
            null,
            1,
        ),
    );
    return cut;
});

/**
 * `prepare` with no target: cut today's manifest into jobs and resume, all while holding the record store. A job whose
 * windows are unchanged keeps its job id, its file and its work; a new one gets a fresh job id and its `job.json`;
 * one no longer cut leaves with its folder, and is refused while it holds work. No job's work is cleared. Then the
 * lead job (P1.38), the job list, the brief, and the removal of the Map's
 * accepted records. Refused until How it runs has accepted records, and while Capabilities and entities has accepted
 * records.
 * @param root the analysis root
 * @returns the job count, the lead job, and the lines of the jobs
 */
export const prepareMap = Effect.fnUntraced(function* (root: string) {
    const fs = yield* FileAccess;
    const paths = analysisPaths(root);
    yield* requireAcceptedRecords("how-it-runs");
    const { jobs } = yield* cutToday(root);
    const stages = yield* StageRecords;
    const state = yield* startStageRun(
        "map",
        laterStages,
        Effect.gen(function* () {
            const cut = yield* writeCut(root, jobs);
            const registries = yield* registriesFor(
                root,
                cut.jobs.map((job) => job.id),
                leadOf(cut.jobs),
            );
            yield* writeMapRegistries(registries);
            yield* fs.writeText(paths.mapBrief, yield* mapBriefText());
            yield* stages.removeStageRecords("map");
            return registries;
        }),
    );
    return {
        jobs: state.order.length,
        lead: state.lead,
        lines: linesOf(jobs.flat()),
        rulesNotGot: yield* rulesNotGot(),
    };
});
