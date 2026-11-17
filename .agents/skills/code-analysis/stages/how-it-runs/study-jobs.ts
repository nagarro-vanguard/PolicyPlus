import { Effect } from "effect";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { FileAccess } from "../../shared/source/file-access";
import { assignJobIds } from "../../shared/jobs/job-ids";
import { jsonlText, readDocumentStrictly } from "../../shared/run/json-files";
import { JobStates } from "../../shared/jobs/job-state";
import { startStageRun } from "../../shared/store/stage-guards";
import { StageRecords } from "../../shared/store/stage-records";
import {
    feedbackArgument,
    personsWords,
    prepareJobRun,
    requireArtifacts,
    type PersonsWords,
} from "../../shared/jobs/job-feedback";
import { rejectedPathOf } from "../../shared/jobs/job-transitions";
import { JobIdPrefix } from "../../shared/model/record-ids";
import { UsageInvalid } from "../../shared/run/script-errors";
import type { Technology } from "../../shared/model/schemas/technology";
import type { SystemPart } from "../../shared/model/schemas/system-part";
import { JobList, ListedJob } from "../../shared/model/schemas/how-it-runs-jobs";
import { readCatalogue } from "../../shared/run/catalogue";
import { requestContext, reviewArguments, studyArguments, studyJobFiles } from "./study-arguments";
import { definitionOf, readStack, type Job } from "./study-cut";

export type ListedJob = typeof ListedJob.Type;

/**
 * The job list `prepare` keeps. Before the first `prepare` there is none, which is that state.
 * @param root the analysis root
 * @returns the listed jobs
 */
export const readJobList = Effect.fnUntraced(function* (root: string) {
    const path = analysisPaths(root).howItRunsJobs;
    return (yield* (yield* FileAccess).exists(path)) ? yield* readDocumentStrictly(path, JobList) : [];
});

/**
 * The job a command line names, by its job id, as the job list holds it.
 * @param root the analysis root
 * @param jobId the job id given
 * @returns the listed job; UsageInvalid when no job has that id
 */
export const listedJobNamed = Effect.fnUntraced(function* (root: string, jobId: string) {
    const list = yield* readJobList(root);
    const listed = list.find((job) => job.jobId === jobId);
    if (listed === undefined) {
        return yield* new UsageInvalid({
            issue: `no study has the job id ${jobId}; the studies are ${list.map((job) => `${job.jobId} (${job.name})`).join(", ")}: run prepare to list them`,
        });
    }
    return listed;
});

/**
 * The job list for today's technologies and parts: a job whose definition is unchanged keeps its job id and its state,
 * a new one gets a fresh job id (`assignJobIds`), and one no longer cut leaves with its folder (2A). The caller holds
 * the record store.
 * @param root the analysis root
 * @param jobs the jobs today's technologies and parts give
 * @returns the job list
 */
const listToday = Effect.fnUntraced(function* (root: string, jobs: readonly Job[]) {
    const earlier = yield* readJobList(root);
    const cut = yield* assignJobIds(
        JobIdPrefix.howItRuns,
        jobs,
        definitionOf,
        earlier.map((listed) => ({ id: listed.jobId, definition: listed.preparedAgainst })),
    );
    const states = yield* JobStates;
    for (const dropped of cut.dropped) {
        yield* (yield* FileAccess).remove(analysisPaths(root).howItRunsJob(dropped));
        for (const gone of earlier.filter((listed) => listed.jobId === dropped)) {
            yield* states.remove("how-it-runs", gone.jobId);
        }
    }
    return cut.jobs.map((job): ListedJob => {
        const held = earlier.find((listed) => listed.jobId === job.id);
        return held === undefined
            ? {
                  name: job.name,
                  kind: job.kind,
                  ...(job.technology === undefined ? {} : { technology: job.technology }),
                  parts: job.parts,
                  jobId: job.id,
                  preparedAgainst: definitionOf(job),
              }
            : held;
    });
});

/**
 * Write the job list. The caller holds the record store.
 * @param root the analysis root
 * @param list the job list
 * @returns nothing once written
 */
const writeJobList = Effect.fnUntraced(function* (root: string, list: readonly ListedJob[]) {
    yield* (yield* FileAccess).writeText(analysisPaths(root).howItRunsJobs, JSON.stringify(list, null, 1));
});

/**
 * Write what one study is given (P1.28, H1): its registry, the parts, its technology, and the other technologies those
 * parts use, as Inventory accepted them; and its job file, each topic it answers by its subject's name and its
 * question's words, the technology, the registry's and the request's paths, and an area job's area.
 * @param root the analysis root
 * @param job the job, as cut, with its job id
 * @param stack the technologies and the parts
 * @param stack.entries the technologies
 * @param stack.parts the parts
 * @param withSupportingMaterial whether the request lists Supporting Material
 * @returns nothing once written
 */
const writeStudyInputs = Effect.fnUntraced(function* (
    root: string,
    job: Job & { readonly jobId: string },
    stack: {
        readonly entries: ReadonlyArray<typeof Technology.Type>;
        readonly parts: ReadonlyArray<typeof SystemPart.Type>;
    },
    withSupportingMaterial: boolean,
) {
    const fs = yield* FileAccess;
    const catalogue = yield* readCatalogue();
    const held = new Set<string>(job.parts);
    const parts = stack.parts.filter((part) => held.has(part.id));
    const technologies = stack.entries.filter(
        (entry) => entry.id === job.technology || entry.uses.some((use) => use.parts.some((part) => held.has(part))),
    );
    yield* fs.writeText(analysisPaths(root).studyRegistry(job.jobId), jsonlText([...parts, ...technologies]));
    const named = new Map<string, string>([...parts, ...technologies].map((record) => [record.id, record.name]));
    const topics = job.topics.map((topic) => {
        const aspect = catalogue.aspects.find((each) => each.id === topic.aspect);
        const subjectName = topic.subject === "system" ? undefined : named.get(topic.subject.key);
        return {
            subject: topic.subject,
            subjectName: subjectName === undefined ? "the system" : subjectName,
            aspect: topic.aspect,
            question: aspect === undefined ? topic.aspect : aspect.words,
        };
    });
    const area = job.area === undefined ? {} : { area: { folders: job.area.folders, files: job.area.files } };
    const paths = analysisPaths(root);
    const given = {
        ...(job.technology === undefined ? {} : { technology: job.name }),
        registryPath: paths.studyRegistry(job.jobId),
        ...(withSupportingMaterial ? { analysisRequestPath: paths.analysisRequest } : {}),
        topics,
        ...area,
    };
    yield* fs.writeText(paths.studyTopics(job.jobId), JSON.stringify(given, null, 1));
});

/**
 * `prepare` with no job: list How it runs' jobs as cut (H1): one per framework and platform, the parts packed, and the
 * areas of each part too large for one job; and remove How it runs' accepted records, all while holding the record store. No study's work is cleared. Refused while the Map has
 * accepted records made from How it runs'.
 * @param root the analysis root
 * @returns the job list
 */
export const prepareStage = Effect.fnUntraced(function* (root: string) {
    const { jobs } = yield* readStack();
    const stages = yield* StageRecords;
    return yield* startStageRun(
        "how-it-runs",
        ["map"],
        Effect.gen(function* () {
            const list = yield* listToday(root, jobs);
            yield* writeJobList(root, list);
            yield* (yield* FileAccess).remove(analysisPaths(root).conclusions("how-it-runs").step);
            yield* stages.removeStageRecords("how-it-runs");
            return list;
        }),
    );
});

/**
 * `prepare <job id>`: make one study ready for its next run, while holding the record store. Its output and review are
 * cleared; while its feedback is on a study set aside (a redo), the run improves that study and its round
 * count is kept; the person's words, when given, are feedback on its last study (refused before it produced one) and
 * start a new cycle of rounds (D29). How it runs' accepted records are removed, and the study's registry and topics
 * are written for its agent. Refused for a job id no job has, and while the Map has accepted records.
 * @param root the analysis root
 * @param jobId the job, by its job id
 * @param words the person's feedback on the job's last study, when they give it
 * @returns the job's study and review arguments
 */
export const prepareJob = Effect.fnUntraced(function* (root: string, jobId: string, words: PersonsWords | undefined) {
    const stack = yield* readStack();
    const context = yield* requestContext(root);
    const stages = yield* StageRecords;
    const prepared = yield* startStageRun(
        "how-it-runs",
        ["map"],
        Effect.gen(function* () {
            const list = yield* listToday(root, stack.jobs);
            const listed = list.find((job) => job.jobId === jobId);
            const cut =
                listed === undefined
                    ? undefined
                    : stack.jobs.find((job) => definitionOf(job) === listed.preparedAgainst);
            if (listed === undefined || cut === undefined) {
                return yield* new UsageInvalid({
                    issue: `no study of today's technologies and parts has the job id ${jobId}; the studies are ${list.map((job) => `${job.jobId} (${job.name})`).join(", ")}`,
                });
            }
            const files = studyJobFiles(root, listed);
            if (words !== undefined) {
                yield* requireArtifacts([{ jobId, files }]);
            }
            yield* prepareJobRun(files, personsWords(words), [files.reviewPath, rejectedPathOf(files.reviewPath)]);
            yield* stages.removeStageRecords("how-it-runs");
            return { cut, listed: { ...listed, ...(yield* feedbackArgument(files)) } };
        }),
    );
    yield* writeStudyInputs(root, { ...prepared.cut, jobId }, stack, context.withSupportingMaterial);
    return {
        key: jobId,
        study: studyArguments(root, prepared.listed, context),
        review: reviewArguments(root, prepared.listed, context),
    };
});
