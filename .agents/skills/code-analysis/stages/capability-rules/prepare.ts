import { Effect } from "effect";
import { analysisPaths, scriptsCommand, sourceBase, type Stage } from "../../shared/run/analysis-layout";
import { compareText, unique } from "../../shared/run/collections";
import { AnalysisRequest } from "../../shared/run/analysis-request";
import { FileAccess } from "../../shared/source/file-access";
import { rejectedPathOf } from "../../shared/jobs/job-transitions";
import {
    feedbackArgument,
    instructionsOf,
    personsWords,
    prepareJobRun,
    requireArtifacts,
    type PersonsWords,
} from "../../shared/jobs/job-feedback";
import { writeJobBrief } from "../../shared/jobs/job-brief";
import { jsonlText, readDocumentStrictly } from "../../shared/run/json-files";
import { reviewArguments as reviewArgumentsOf } from "../../shared/jobs/review-sheet";
import { requireAcceptedRecords, startStageRun } from "../../shared/store/stage-guards";
import { StageRecords } from "../../shared/store/stage-records";
import { readHoldings } from "../../shared/graph/entry-points";
import { JobStates } from "../../shared/jobs/job-state";
import { GapsRemain, UsageInvalid } from "../../shared/run/script-errors";
import { briefText, staleBrief } from "./brief";
import { acceptedLives, livesDecided } from "./lives";
import { blocksWritingTransitions, cutRulesJobs, readEveryBlock, readStudiedCode } from "./cut";
import { totalityGaps } from "../../shared/read/totality";
import type { Block } from "../../shared/model/schemas/map";
import { clearRulesJobsGating, cutJobs, linesOfJob, transitionsOf } from "./cut-jobs";
import { cutLifecycleJobs } from "./lives-cut";
import { jobFiles, jobNamed, readScope, type Kind } from "./jobs";
import { resolveCapabilities, canonicalChoices } from "./scope";

type WithFeedback = { readonly jobId: string; readonly kind: Kind; readonly customInstructions?: string };

const laterStages: readonly Stage[] = ["publish"];

const agentOf: Readonly<Record<Kind, string>> = {
    lifecycle: "capability-rules/write-entity-lifecycle",
    rules: "capability-rules/write-business-rules",
};

/**
 * How many of the Map's jobs were refused: their lines' links are left out of the graph, so a chosen capability's
 * chains may stop short there and their rules go unread (R5). A job's state says it.
 * @returns the count
 */
const countRefusedMapJobs = Effect.fnUntraced(function* () {
    return (yield* (yield* JobStates).list("map")).filter((row) => row.state === "refused").length;
});

/**
 * The blocks the rules jobs read: for `--all` every mapped block, otherwise the blocks the chosen capabilities reach; and,
 * once lives are accepted, the blocks holding each transition's `writtenAt` lines, since a rule gating it may lie in code
 * no chosen capability reaches.
 * @param root the analysis root
 * @param reached the blocks the chosen capabilities reach
 * @param every whether every mapped block is read
 * @returns the blocks
 */
const scopeBlocks = Effect.fnUntraced(function* (
    root: string,
    reached: ReadonlyArray<typeof Block.Type>,
    every: boolean,
) {
    const all = yield* readEveryBlock();
    if (every) {
        return all;
    }
    const { transitions } = yield* acceptedLives(root);
    return [
        ...reached,
        ...blocksWritingTransitions(
            reached,
            all,
            transitions.map((each) => each.writtenAt),
        ),
    ];
});

/**
 * Cut the rules jobs over the blocks in scope and check the cut is total: every block in scope is in one job, none in
 * two jobs, none from nowhere.
 * @param blocks the blocks in scope
 * @param studied the capabilities chosen
 * @returns the rules jobs; GapsRemain naming each block the cut lost
 */
const cutChecked = Effect.fnUntraced(function* (
    blocks: ReadonlyArray<typeof Block.Type>,
    studied: Parameters<typeof cutRulesJobs>[1],
) {
    const rules = yield* cutRulesJobs(blocks, studied);
    const gaps = totalityGaps(
        "blocks",
        new Set(blocks.map((block) => block.id)),
        rules.jobs.flatMap((job) => (job.kind === "rules" ? job.blocks.map((each) => each.block) : [])),
    );
    if (gaps.length) {
        return yield* new GapsRemain({ gaps });
    }
    return rules;
});

/**
 * Write the capabilities the run studies, and whether it reads every block.
 * @param path where the scope is kept
 * @param studied the capabilities chosen
 * @param every whether every block is read
 * @returns nothing once written
 */
const writeScope = (
    path: string,
    studied: ReadonlyArray<readonly [{ id: string; name: string }, ...unknown[]]>,
    every: boolean,
) =>
    Effect.flatMap(FileAccess, (fs) =>
        fs.writeText(
            path,
            JSON.stringify(
                {
                    capabilities: studied.map(([capability]) => ({ id: capability.id, name: capability.name })),
                    ...(every ? { everyBlock: true } : {}),
                },
                null,
                1,
            ),
        ),
    );

/**
 * `prepare` with no job: choose the capabilities to study, or keep the last choice, and cut the jobs from them, all
 * while holding the record store (D122, D124). The names are each capability's name as the overview shows it, or its
 * record id where two share one. Cuts one lifecycle job per entity the chosen capabilities save and the rules jobs over
 * the blocks they reach, keeps each unchanged job's id and work, writes the brief, and removes the stage's accepted
 * records until the next finish. Refused until Capabilities and entities has accepted records, and while Publish has.
 * @param root the analysis root
 * @param chosen the capabilities to study, or "all"; none keeps the last choice
 * @returns the jobs' counts, the lines the rules jobs read, and what the person should know
 */
export const prepareStage = Effect.fnUntraced(function* (root: string, chosen: readonly string[] | "all") {
    yield* requireAcceptedRecords("capabilities-and-entities");
    const stages = yield* StageRecords;
    return yield* startStageRun(
        "capability-rules",
        laterStages,
        Effect.gen(function* () {
            const fs = yield* FileAccess;
            const paths = analysisPaths(root).capabilityRules;
            const earlier = yield* readScope(root);
            const holdings = yield* readHoldings();
            const every =
                chosen === "all" || (chosen.length === 0 && earlier !== undefined && earlier.everyBlock === true);
            const named = chosen === "all" ? holdings.held.map(([capability]) => capability.id) : chosen;
            if (!named.length && earlier === undefined) {
                return yield* new UsageInvalid({
                    issue: 'name the capabilities to study: explain-capability-rules.ts prepare --capability "<name>", or --all',
                });
            }
            const studied = yield* resolveCapabilities(
                holdings,
                named.length || earlier === undefined ? named : yield* canonicalChoices(holdings, earlier.capabilities),
            );
            yield* writeScope(paths.scope, studied, every);
            const code = yield* readStudiedCode(studied);
            const blocks = yield* scopeBlocks(root, code.blocks, every);
            const lives = yield* cutLifecycleJobs(code.saved);
            const rules = yield* cutChecked(blocks, studied);
            const { listed, transitionsGone } = yield* cutJobs(root, [
                ...lives.jobs,
                ...rules.jobs.map((job) => ({ job })),
            ]);
            yield* clearRulesJobsGating(root, transitionsGone);
            yield* fs.writeText(paths.brief, yield* briefText());
            yield* stages.removeStageRecords("capability-rules");
            const lifeLines = lives.jobs.reduce((sum, { job }) => sum + linesOfJob(job), 0);
            return {
                capabilities: studied.map(([capability]) => capability.name),
                lifecycleJobs: listed.filter((each) => each.kind === "lifecycle").length,
                rulesJobs: listed.filter((each) => each.kind === "rules").length,
                lines: rules.lines + lifeLines,
                overBudget: rules.overBudget + lives.overBudget,
                unkept: unique(lives.unkept.map((each) => each.resource)).sort(compareText),
                refusedMapJobs: yield* countRefusedMapJobs(),
            };
        }),
    );
});

/**
 * The named arguments of a job's agent, in the order its contract lists them: `write-entity-lifecycle` for a lifecycle
 * job, `write-business-rules` for a rules job; the accepted lives, the uses and the request are read from its brief.
 * @param root the analysis root
 * @param job the job and its feedback's text
 * @param sourceFolder the folder record paths are relative to
 * @returns the arguments
 */
const agentArguments = (root: string, job: WithFeedback, sourceFolder: string) => {
    const paths = analysisPaths(root).capabilityRules;
    return {
        scriptsCommand: scriptsCommand(root),
        sourceFolder,
        jobId: job.jobId,
        jobPath: paths.jobFile(job.jobId),
        briefPath: paths.jobBrief(job.jobId),
        outputPath: jobFiles(root, job.jobId, job.kind).outputPath,
        ...instructionsOf(job),
    };
};

/**
 * Write one job's brief: the commands that check and carry its output, the rules of its kind, and what to read besides
 * (the accepted lives for a rules job, every use of the entity for a lifecycle job, what earlier stages established, the
 * Supporting Material the request lists).
 * @param root the analysis root
 * @param job the job
 * @param analysisRequestPath the request, when it lists Supporting Material
 * @returns nothing once written
 */
const writeBrief = (root: string, job: WithFeedback, analysisRequestPath: string | undefined) => {
    const paths = analysisPaths(root).capabilityRules;
    const command = `${scriptsCommand(root)}/explain-capability-rules.ts`;
    const own =
        job.kind === "rules"
            ? (["the accepted lives, one JSON record per line", paths.lifecycles] as const)
            : (["every save and read of the entity, one per line", paths.uses(job.jobId)] as const);
    return writeJobBrief(paths.jobBrief(job.jobId), {
        rules: job.kind === "rules" ? paths.businessRules : paths.lifecycleRules,
        commands: { check: `${command} check ${job.jobId}`, carry: `${command} carry ${job.jobId}` },
        reads: [own, ["what earlier stages established", paths.brief]],
        ...(analysisRequestPath === undefined ? {} : { supporting: analysisRequestPath }),
    });
};

/**
 * The named arguments of the review of one job's output, in the order the reviewer's contract lists them: its
 * checklist by the job's kind, and for a rules job the accepted lives it chose from.
 * @param root the analysis root
 * @param job the job and its feedback's text
 * @param sourceFolder the folder record paths are relative to
 * @returns the arguments; `registryPath` and `customInstructions` only where they apply
 */
const reviewArguments = (root: string, job: WithFeedback, sourceFolder: string) =>
    reviewArgumentsOf(jobFiles(root, job.jobId, job.kind), rulesReviewCall(root, job, sourceFolder));

/**
 * What the reviewer of one job is given besides its files: the source folder, the command that checks its review and the
 * job's feedback.
 * @param root the analysis root
 * @param job the job and its feedback's text
 * @param sourceFolder the folder record paths are relative to
 * @returns the call
 */
export const rulesReviewCall = (root: string, job: WithFeedback, sourceFolder: string) => ({
    root,
    sourceFolder,
    checkCommand: `${scriptsCommand(root)}/explain-capability-rules.ts check ${job.jobId}`,
    feedback: job,
});

/**
 * `prepare <job id>`: make one job ready for its next run, while holding the record store. A rules job waits until
 * every life is decided, and is given the accepted lives as a document; a lifecycle job run again clears the rules
 * jobs whose outputs gate one of its transitions (D223), every other keeping its work. Its output, review and report are cleared; while its feedback is on an artifact set
 * aside, the run improves that artifact and its round is kept; the person's words, when given, are feedback on its
 * last artifact (refused on a job that produced none, D29). The stage's accepted records are removed. Refused while
 * the brief is stale.
 * @param root the analysis root
 * @param jobId the job id
 * @param words the person's feedback on the job's last artifact, when they give it
 * @returns the job's agent, by its contract's path, and the arguments of the agent and its review
 */
export const prepareJob = Effect.fnUntraced(function* (root: string, jobId: string, words: PersonsWords | undefined) {
    const stale = yield* staleBrief(root);
    if (stale.length) {
        return yield* new GapsRemain({ gaps: stale });
    }
    const paths = analysisPaths(root);
    const request = yield* readDocumentStrictly(paths.analysisRequest, AnalysisRequest);
    const sourceFolder = sourceBase(request.sourceRoots);
    const stages = yield* StageRecords;
    const made = yield* startStageRun(
        "capability-rules",
        laterStages,
        Effect.gen(function* () {
            const fs = yield* FileAccess;
            const job = yield* jobNamed(root, jobId);
            if (job.kind === "rules" && !(yield* livesDecided(root))) {
                return yield* new UsageInvalid({
                    issue: `${jobId} gates the lives' transitions, and not every life is decided yet: run next, which decides them first`,
                });
            }
            const files = jobFiles(root, jobId, job.kind);
            if (words !== undefined) {
                yield* requireArtifacts([{ jobId, files }]);
            }
            const replaced = job.kind === "lifecycle" ? yield* transitionsOf(root, [jobId]) : new Set<string>();
            yield* prepareJobRun(files, personsWords(words), [
                files.reviewPath,
                rejectedPathOf(files.reviewPath),
                paths.capabilityRules.drops(jobId),
            ]);
            if (job.kind === "lifecycle") {
                yield* clearRulesJobsGating(root, replaced);
            } else {
                const { lives, transitions } = yield* acceptedLives(root);
                yield* fs.writeText(paths.capabilityRules.lifecycles, jsonlText([...lives, ...transitions]));
            }
            yield* stages.removeStageRecords("capability-rules");
            return { jobId, kind: job.kind, ...(yield* feedbackArgument(files)) };
        }),
    );
    yield* writeBrief(root, made, request.supportingMaterial.length ? paths.analysisRequest : undefined);
    return {
        jobId,
        agent: agentOf[made.kind],
        run: agentArguments(root, made, sourceFolder),
        review: reviewArguments(root, made, sourceFolder),
    };
});
