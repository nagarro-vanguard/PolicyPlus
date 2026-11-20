import { AnalysisRoot } from "../../shared/run/analysis-root";
import { readFactBase, stageFactGaps } from "../../shared/read/stage-facts";
import { Effect } from "effect";
import { agentRecords, carryForward } from "../../shared/jobs/job-feedback";
import type { JsonRecord } from "../../shared/model/json-record";
import { holds, lineSpan } from "../../shared/model/line-ranges";
import { ScopeFiles } from "../../shared/read/scope-files";
import { ofType } from "../../shared/read/record-reading";
import { citedFiles, scopeGaps } from "../../shared/read/record-writing";
import { gap } from "../../shared/jobs/gap-remedies";
import { checkReviewedJob } from "../../shared/jobs/review-rounds";
import { coverageGaps, nonBlankLinesOf } from "../../shared/model/receipt";
import { missedOutside } from "../../shared/jobs/review-verdicts";
import { BusinessRule } from "../../shared/model/schemas/business-rule";
import { UseOfEntity, type LifecycleJob, type RulesJob } from "../../shared/model/schemas/capability-rules-jobs";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { FileAccess } from "../../shared/source/file-access";
import { readRecords } from "../../shared/run/json-files";
import { Lifecycle, Transition } from "../../shared/model/schemas/lifecycle";
import type { Missed } from "../../shared/model/schemas/missed";
import { RecordIdPrefix, type Lines } from "../../shared/model/shared-fields";
import { keepAsDrops } from "./drop";
import { jobFiles, jobNamed, reviewedJob, shapesOf, type Listed } from "./jobs";
import { acceptedLives } from "./lives";
import { ruleNotices, splitReasons } from "../../shared/model/rule-wording";
import { findingsIn } from "../../shared/jobs/review-files";

type Finding = JsonRecord & { readonly id: string };

/**
 * The gate on a lifecycle job's records (D124): exactly one life, of the job's entity; every transition of that life
 * names states the life holds, by number, and a life with no states has no transition; in a life with states, every
 * save that changes no state is derived, never written: the writer's receipt covers its lines. Necessary, not
 * sufficient: a state the code writes that the life misses is the reviewer's to find.
 * @param records the job's records
 * @param job the job
 * @returns one line per gap
 */
function lifecycleGaps(records: readonly Finding[], job: typeof LifecycleJob.Type): string[] {
    const lives = ofType(records, RecordIdPrefix.Lifecycle, Lifecycle);
    const transitions = ofType(records, RecordIdPrefix.Transition, Transition);
    const [life, ...more] = lives;
    if (life === undefined) {
        return [gap("no-life", `no Lifecycle is written for ${job.entity.name}`)];
    }
    const gaps: string[] = [];
    if (more.length) {
        gaps.push(gap("many-lives", `${lives.length} lives are written for ${job.entity.name}`));
    }
    if (life.entity !== job.entity.id) {
        gaps.push(gap("life-of-another-entity", `${life.id} is the life of another entity, not ${job.entity.name}'s`));
    }
    const stateCount = life.states === undefined ? 0 : life.states.length;
    for (const transition of transitions) {
        if (transition.lifecycle !== life.id) {
            gaps.push(gap("transition-of-another-life", `${transition.id} belongs to another life, not ${life.id}`));
        }
        const named = transition.fromStates === "created" ? [transition.to] : [...transition.fromStates, transition.to];
        for (const number of named.filter((each) => each > stateCount)) {
            gaps.push(
                gap("state-beyond-life", `${transition.id} names state ${number}, but ${life.id} holds ${stateCount}`),
            );
        }
    }
    return gaps;
}

/**
 * The innermost block of a job holding some lines: the block a rule decided there belongs to (D121).
 * @param blocks the job's blocks
 * @param lines the lines
 * @returns the block, or none when no block of the job holds them
 */
const innermostHolding = (blocks: ReadonlyArray<{ readonly block: string; readonly lines: Lines }>, lines: Lines) =>
    blocks
        .filter((each) => holds(each.lines, lines))
        .sort(
            (left, right) =>
                left.lines.lastLine - left.lines.firstLine - (right.lines.lastLine - right.lines.firstLine),
        )
        .at(0);

/**
 * The gate on how a rule is written: one decision per rule. A rule over forty words, or one whose words outside what it
 * quotes add a second decision (`also`, `and when`, `and if`, `and unless`, a second sentence with its own condition),
 * is refused: split it into one rule per decision, each decided at its own lines. Conservative by design: a rule whose
 * one outcome has two parts passes, and what only hints at a second decision is reported by `ruleNotices`, never
 * refused.
 * @param records the job's records
 * @returns one line per rule to split
 */
function oneDecisionGaps(records: readonly Finding[]): string[] {
    return ofType(records, RecordIdPrefix.BusinessRule, BusinessRule).flatMap((rule) => {
        const reasons = splitReasons(rule.says);
        return reasons.length === 0 ? [] : [gap("rule-of-several-decisions", `${rule.id} ${reasons.join(" and ")}`)];
    });
}

/**
 * What a rules job's check reports without refusing: each rule over twenty-five words, or with a semicolon or a second
 * sentence starting `Otherwise`, which may hide a second decision. A reader judges these; the gate does not.
 * @param root the analysis root
 * @param jobId the job id
 * @returns one line per rule to read again; none for a lifecycle job
 */
export const jobNotices = Effect.fnUntraced(function* (root: string, jobId: string) {
    const job = yield* jobNamed(root, jobId);
    if (job.kind !== "rules") {
        return [];
    }
    const path = jobFiles(root, jobId, job.kind).outputPath;
    if (!(yield* (yield* FileAccess).exists(path))) {
        return [];
    }
    const records = yield* findingsIn(shapesOf[job.kind], path);
    return ofType(records, RecordIdPrefix.BusinessRule, BusinessRule).flatMap((rule) => {
        const notes = ruleNotices(rule.says);
        return notes.length === 0
            ? []
            : [`${rule.id} ${notes.join(" and ")}: read it again as one decision a tester could check`];
    });
});

/**
 * The gate on a rules job's records (D121): every rule is decided inside a block of the job. A block with no rule is
 * derived, never written: the writer's receipt covers its lines. That a rule's `gates` names an accepted transition is
 * the shared rule over cited ids, the accepted lives written beside the job. Necessary, not sufficient: a rule missed
 * inside a block is the reviewer's.
 * @param records the job's records
 * @param job the job
 * @returns one line per gap
 */
function rulesGaps(records: readonly Finding[], job: typeof RulesJob.Type): string[] {
    const gaps: string[] = [...oneDecisionGaps(records)];
    for (const rule of ofType(records, RecordIdPrefix.BusinessRule, BusinessRule)) {
        if (innermostHolding(job.blocks, rule.decidedAt) === undefined) {
            gaps.push(
                gap(
                    "rule-outside-blocks",
                    `${rule.id} is decided at ${lineSpan(rule.decidedAt)}, which lies in no block of this job`,
                ),
            );
        }
    }
    return gaps;
}

/**
 * The stage under review for one job: the records its kind writes, and its gate. Every record cites lines in scope,
 * and its facts are held to the later stages' fact rules (`stageFactGaps`);
 * a lifecycle job is held to `lifecycleGaps`, a rules job to `rulesGaps`, with the accepted transitions written beside
 * it, so its `gates` resolve while the stage's accepted records are cleared.
 * @param job the job
 * @param transitionIds the record ids of the accepted transitions: read once per `finish`, once per `check`
 * @returns the stage as the review rounds take it
 */
export const stageReview = (job: Listed, transitionIds: ReadonlySet<string>) => ({
    stage: "capability-rules" as const,
    shapes: shapesOf[job.kind],
    checksFor: (cited: readonly JsonRecord[]) =>
        Effect.gen(function* () {
            const lineCounts = yield* (yield* ScopeFiles).lineCountsFor(citedFiles(cited));
            const usesPath = analysisPaths((yield* AnalysisRoot).root).capabilityRules.uses(job.jobId);
            const everySave =
                job.kind === "lifecycle" && (yield* (yield* FileAccess).exists(usesPath))
                    ? (yield* readRecords(usesPath, UseOfEntity)).filter((use) => use.kind === "saves")
                    : job.kind === "lifecycle"
                      ? job.saves
                      : [];
            const facts = {
                ...(yield* readFactBase()),
                lineCounts,
            };
            const jobScope: readonly Lines[] =
                job.kind === "rules" ? job.blocks.map((each) => each.lines) : everySave.map((save) => save.lines);
            const jobLines = yield* nonBlankLinesOf(jobScope);
            const scope = (records: readonly Finding[]) => [
                ...scopeGaps(records, lineCounts, "manifest", (record) => record.id),
                ...stageFactGaps(records, facts),
            ];
            return {
                records: (records: readonly Finding[]) => [
                    ...scope(records),
                    ...(job.kind === "lifecycle" ? lifecycleGaps(records, job) : rulesGaps(records, job)),
                ],
                placement: (missed: ReadonlyArray<typeof Missed.Type>) => missedOutside(missed, lineCounts, "manifest"),
                writtenBeside: job.kind === "rules" ? transitionIds : new Set<string>(),
                scope: jobScope,
                writerReceipt: (receipts: Parameters<typeof coverageGaps>[0]) =>
                    coverageGaps(receipts, jobLines, "writer"),
            };
        }),
});

/**
 * The record ids of the accepted transitions a rules job may gate.
 * @param root the analysis root
 * @returns the record ids
 */
const readTransitionIds = Effect.fnUntraced(function* (root: string) {
    return new Set<string>((yield* acceptedLives(root)).transitions.map((transition) => transition.id));
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
    return yield* checkReviewedJob(stageReview(state, yield* readTransitionIds(root)), job);
});

/**
 * One job as the loop hands its review out: the stage under review, the job's files and the job.
 * @param root the analysis root
 * @param jobId the job id
 * @returns the stage, the job as the review rounds take it and the job as listed
 */
export const reviewedStageOf = Effect.fnUntraced(function* (root: string, jobId: string) {
    const { state, job } = yield* reviewedJob(root, jobId);
    return { stage: stageReview(state, yield* readTransitionIds(root)), job, listed: state };
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
    const carried = yield* carryForward(jobFiles(root, jobId, job.kind), agentRecords(shapesOf[job.kind]), leftOut);
    yield* keepAsDrops(root, jobId, carried.leftOutRecords);
    return { carried: carried.carried, leftOut: carried.leftOut };
});
