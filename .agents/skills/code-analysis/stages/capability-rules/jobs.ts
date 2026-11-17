import { Effect } from "effect";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { FileAccess } from "../../shared/source/file-access";
import { rejectedPathOf } from "../../shared/jobs/job-transitions";
import { sha1Hex } from "../../shared/run/hashing-and-random";
import { readDocumentStrictly } from "../../shared/run/json-files";
import { lineSpan } from "../../shared/model/line-ranges";
import { UsageInvalid } from "../../shared/run/script-errors";
import { BusinessRule } from "../../shared/model/schemas/business-rule";
import {
    CapabilityRulesJob,
    CapabilityRulesJobList,
    CapabilityRulesScope,
} from "../../shared/model/schemas/capability-rules-jobs";
import { Fact } from "../../shared/model/schemas/fact";
import { Receipt } from "../../shared/model/schemas/receipt";
import { Lifecycle, Transition } from "../../shared/model/schemas/lifecycle";
import { resourceIdOf } from "../../shared/model/resource-ids";

export type Job = typeof CapabilityRulesJob.Type;

export type Kind = Job["kind"];

export type Listed = Job & { readonly jobId: string };

export type Units = Job;

export type ListEntry = (typeof CapabilityRulesJobList.Type)[number];

export const shapesOf = {
    lifecycle: { Lifecycle, Transition, Fact, Receipt },
    rules: { BusinessRule, Fact, Receipt },
} as const satisfies Record<Kind, object>;

/**
 * A job's identity (D217): a digest of its kind and its units' record ids, never their words: a life by its entity and
 * the resources keeping it, a rules job by its blocks; so a merge that sharpens words, or a cut that keeps a job's
 * units, keeps its id and its work. A job whose units' facts changed keeps it too: the brief, which carries the
 * digests of the stages it is built from, is what goes stale then.
 * @param job the job
 * @returns the digest
 */
export const definitionOf = (job: Units) =>
    sha1Hex(
        JSON.stringify(
            job.kind === "lifecycle"
                ? [
                      job.kind,
                      job.entity.id,
                      job.resources.map((each) => resourceIdOf(each.externalSystem, each.resource)).sort(),
                  ]
                : [job.kind, job.blocks.map((each) => each.block).sort()],
        ),
    );

/**
 * A job as a reader knows it, never by its id: the entity whose life it writes, or how many pieces of code it reads
 * and where it starts.
 * @param job the job
 * @returns the label
 */
export function jobLabel(job: Job): string {
    switch (job.kind) {
        case "lifecycle":
            return `the life of ${job.entity.name}`;
        case "rules": {
            const first = job.blocks[0];
            const named =
                first.writtenAs === undefined ? lineSpan(first.lines) : `${first.writtenAs} (${lineSpan(first.lines)})`;
            return job.blocks.length === 1
                ? `the rules of ${named}`
                : `the rules of ${job.blocks.length} pieces of code, from ${named}`;
        }
    }
}

/**
 * The capabilities the person chose to study; none before the first `prepare` that names them, which is that state.
 * @param root the analysis root
 * @returns the scope, or none
 */
export const readScope = Effect.fnUntraced(function* (root: string) {
    const path = analysisPaths(root).capabilityRules.scope;
    return (yield* (yield* FileAccess).exists(path))
        ? yield* readDocumentStrictly(path, CapabilityRulesScope)
        : undefined;
});

/**
 * The stage's jobs as listed, each with its kind. Before its first cut there is none, which is that state.
 * @param root the analysis root
 * @returns the listed jobs, in cut order: every lifecycle job, then every rules job
 */
export const readJobList = Effect.fnUntraced(function* (root: string) {
    const path = analysisPaths(root).capabilityRules.jobs;
    return (yield* (yield* FileAccess).exists(path)) ? yield* readDocumentStrictly(path, CapabilityRulesJobList) : [];
});

/**
 * One job by its id, from its own file; refused for an id no job holds.
 * @param root the analysis root
 * @param jobId the job id
 * @returns the job; UsageInvalid when there is no such job
 */
export const jobNamed = Effect.fnUntraced(function* (root: string, jobId: string) {
    const path = analysisPaths(root).capabilityRules.jobFile(jobId);
    if (!(yield* (yield* FileAccess).exists(path))) {
        return yield* new UsageInvalid({
            issue: `${jobId} is not one of Capability rules' jobs: explain-capability-rules.ts status counts them`,
        });
    }
    const job: Listed = { jobId, ...(yield* readDocumentStrictly(path, CapabilityRulesJob)) };
    return job;
});

/**
 * Write one job's own file: its units.
 * @param root the analysis root
 * @param job the job, with its job id
 * @returns nothing once written
 */
export const writeJob = Effect.fnUntraced(function* (root: string, job: Listed) {
    const { jobId, ...state } = job;
    yield* (yield* FileAccess).writeText(analysisPaths(root).capabilityRules.jobFile(jobId), JSON.stringify(state));
});

/**
 * Where one job's agents and rounds write, and the stage and key its state is held under, as the review rounds take
 * them.
 * @param root the analysis root
 * @param jobId the job id
 * @param kind the job's kind, which decides what its agent writes
 * @returns the job's files
 */
export const jobFiles = (root: string, jobId: string, kind: Kind) => {
    const paths = analysisPaths(root).capabilityRules;
    return {
        stage: "capability-rules" as const,
        key: jobId,
        outputPath: kind === "lifecycle" ? paths.lifecycle(jobId) : paths.rules(jobId),
        reviewPath: paths.review(jobId),
        roundsFolder: paths.rounds(jobId),
    };
};

/**
 * Every file a job may hold work in: what a cut dropping it must not lose silently, and what clearing it removes.
 * @param root the analysis root
 * @param jobId the job id
 * @returns the files
 */
export const workFilesOf = (root: string, jobId: string) => {
    const paths = analysisPaths(root).capabilityRules;
    return [
        paths.lifecycle(jobId),
        paths.rules(jobId),
        paths.review(jobId),
        rejectedPathOf(paths.review(jobId)),
        paths.drops(jobId),
        paths.rounds(jobId),
    ];
};

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
