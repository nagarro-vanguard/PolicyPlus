import { Effect } from "effect";
import { AcceptedRecords } from "../read/accepted-records";
import type { Stage } from "../run/analysis-layout";
import { FileAccess } from "../source/file-access";
import { gap } from "./gap-remedies";
import { owesFix } from "./job-transitions";
import type { JsonRecord } from "../model/json-record";
import { JobStates } from "./job-state";
import type { FixesTaken } from "./job-state-types";
import { citedRanges } from "../read/record-writing";
import { prefixOf } from "../model/record-ids";
import { receiptGaps } from "../model/receipt";
import { secondRoundOf } from "./second-round";
import { findingsIn, receiptsIn, reviewIn, type Shapes } from "./review-files";
import type { ReviewReport } from "./review-report";
import { countsOf, noCounts, reviewItems, verdictGaps, type VerdictCounts } from "./review-verdicts";
import { FeedbackItem } from "../model/schemas/feedback";
import type { Missed } from "../model/schemas/missed";
import type { Receipt } from "../model/schemas/receipt";
import type { Lines } from "../model/shared-fields";
import { ArtifactMissing, GapsRemain } from "../run/script-errors";
import { ShapeRegistry } from "../model/shape-registry";

type Finding = JsonRecord & { readonly id: string };

export type ReviewedJob = {
    readonly stage: Stage;
    readonly key: string;
    readonly label: string;
    readonly outputPath: string;
    readonly reviewPath: string;
    readonly roundsFolder: string;
};

type StageChecks = {
    readonly records: (records: readonly Finding[]) => readonly string[];
    readonly placement: (missed: ReadonlyArray<typeof Missed.Type>) => readonly string[];
    readonly writtenBeside: ReadonlySet<string>;
    readonly scope?: readonly Lines[];
    readonly writerReceipt?: (receipts: readonly (typeof Receipt.Type)[]) => readonly string[];
};

export type ReviewedStage<T, E, R> = {
    readonly stage: Stage;
    readonly shapes: T;
    readonly checksFor: (cited: readonly Finding[]) => Effect.Effect<StageChecks, E, R>;
};

export type ReviewOutcome<J extends ReviewedJob> = {
    readonly job: J;
    readonly outcome: (typeof ReviewReport.Type)["outcome"];
    readonly round: number;
    readonly accepted: readonly Finding[];
    readonly counts: VerdictCounts;
    readonly checks: readonly FeedbackItem[];
    readonly fixes: FixesTaken;
};

/**
 * The stage's checks and the rule every reviewed stage shares: each reference a record keeps (`citesOf`) names one of
 * the job's own records, one the stage writes beside its jobs' (`writtenBeside`), or an accepted record.
 * @param stage the stage
 * @param cited every record the checks will look at: the agent's, and what its reviewer found missing
 * @returns the records' gaps, the missed records' gaps and the lines the receipt must cover
 */
const checksOf = Effect.fnUntraced(function* <T extends Shapes<T>, E, R>(
    stage: ReviewedStage<T, E, R>,
    cited: readonly Finding[],
) {
    const checks = yield* stage.checksFor(cited);
    const registered = Object.values((yield* ShapeRegistry).records);
    const own = new Set([...cited.map((record) => record.id), ...checks.writtenBeside]);
    const citedBeyond = (record: Finding) =>
        registered
            .filter((type) => type.idPrefix === prefixOf(record.id))
            .flatMap((type) => type.citesOf(record))
            .filter((id) => !own.has(id));
    const accepted = new Set(yield* (yield* AcceptedRecords).findAcceptedIds(cited.flatMap(citedBeyond)));
    const unresolved = (records: readonly Finding[]) =>
        records.flatMap((record) =>
            citedBeyond(record)
                .filter((id) => !accepted.has(id))
                .map((id) =>
                    gap(
                        "unresolved-citation",
                        `${record.id} cites ${id}, which is no record of this job and no record an earlier stage accepted`,
                    ),
                ),
        );
    return {
        records: (records: readonly Finding[]) => [...checks.records(records), ...unresolved(records)],
        missed: (missed: ReadonlyArray<typeof Missed.Type>) => checks.placement(missed),
        writerReceipt: (receipts: readonly (typeof Receipt.Type)[]) =>
            checks.writerReceipt === undefined ? [] : checks.writerReceipt(receipts),
        scope: (records: readonly Finding[]) =>
            checks.scope === undefined ? records.flatMap((record) => citedRanges(record)) : checks.scope,
    };
});

/**
 * The lines a job's receipt must cover: its windows, or the lines its records cite; for a second review, the lines of
 * the records the fix changed and of those dropped.
 * @param stage the stage
 * @param job the job
 * @returns the ranges
 */
export const scopeOf = Effect.fnUntraced(function* <T extends Shapes<T>, E, R>(
    stage: ReviewedStage<T, E, R>,
    job: ReviewedJob,
) {
    const findings = yield* findingsIn(stage.shapes, job.outputPath);
    const second = yield* secondRoundOf(job);
    return second === undefined ? (yield* checksOf(stage, findings)).scope(findings) : second.scope;
});

/**
 * One round of a job once its review is written: the findings, the review, and every gap the review leaves (a record
 * of the owner's kind, a challenge or missed record placed wrongly, a receipt missing or short).
 * @param stage the stage
 * @param job the job
 * @returns the round
 */
const readRound = Effect.fnUntraced(function* <T extends Shapes<T>, E, R>(
    stage: ReviewedStage<T, E, R>,
    job: ReviewedJob,
) {
    const findings = yield* findingsIn(stage.shapes, job.outputPath);
    const review = yield* reviewIn(stage.shapes, job.reviewPath);
    const checks = yield* checksOf(stage, [...findings, ...review.missed]);
    const second = yield* secondRoundOf(job);
    const restorable = new Set(second === undefined ? [] : second.dropped.map((drop) => drop.id));
    const reviewGaps = [
        ...review.written.map(
            (record) =>
                `the review writes ${record.id}, a record of the agent's kind: rule on it, or write what is missing as a Missed`,
        ),
        ...verdictGaps(findings, { written: review.verdicts, missed: review.missed }, restorable),
        ...checks.missed(review.missed),
        ...(yield* receiptGaps(review.receipts, second === undefined ? checks.scope(findings) : second.scope)),
    ];
    const gateGaps = [
        ...checks.records(findings),
        ...checks.writerReceipt(yield* receiptsIn(stage.shapes, job.outputPath)),
    ];
    return { findings, review, checks, reviewGaps, gateGaps };
});

/**
 * `check`: the stage's gate on one job's records, and, once the reviewer has written, every gap its review leaves. The
 * agent and the reviewer both run it as their done-check.
 * @param stage the stage
 * @param job the job
 * @returns one line per gap; none when the job passes
 */
export const checkReviewedJob = Effect.fnUntraced(function* <T extends Shapes<T>, E, R>(
    stage: ReviewedStage<T, E, R>,
    job: ReviewedJob,
) {
    const fs = yield* FileAccess;
    if (!(yield* fs.exists(job.outputPath))) {
        return [`the agent wrote nothing to ${job.outputPath}`];
    }
    if (!(yield* fs.exists(job.reviewPath))) {
        const findings = yield* findingsIn(stage.shapes, job.outputPath);
        const checks = yield* checksOf(stage, findings);
        return [...checks.records(findings), ...checks.writerReceipt(yield* receiptsIn(stage.shapes, job.outputPath))];
    }
    const round = yield* readRound(stage, job);
    return [...round.gateGaps, ...round.reviewGaps];
});

/**
 * A decided job's outcome, from its files as its review leaves it, or from its gate alone once its review's fix
 * answered. A review with a gap is GapsRemain (it runs again; the agent's work is never set aside for it, D29).
 * Accepted when nothing is challenged or missed and the gate passes; else the fix not yet taken runs, once; once taken,
 * a gate gap refuses it and a challenge leaves its record written, labelled disputed.
 * @param stage the stage
 * @param job the job
 * @param taken its round and the fixes it took
 * @param taken.round its round
 * @param taken.fixes the fixes it took
 * @param reviewed whether its review stands
 * @returns the outcome
 */
const decidedOutcome = Effect.fnUntraced(function* <J extends ReviewedJob, T extends Shapes<T>, E, R>(
    stage: ReviewedStage<T, E, R>,
    job: J,
    taken: { readonly round: number; readonly fixes: FixesTaken },
    reviewed: boolean,
) {
    const read = reviewed ? yield* readRound(stage, job) : undefined;
    if (read !== undefined && read.reviewGaps.length) {
        return yield* new GapsRemain({ gaps: read.reviewGaps.map((line) => `${job.label}: ${line}`) });
    }
    const findings = read === undefined ? yield* findingsIn(stage.shapes, job.outputPath) : read.findings;
    const gate = yield* checksOf(stage, findings);
    const after = [...gate.records(findings), ...gate.writerReceipt(yield* receiptsIn(stage.shapes, job.outputPath))];
    const { verdicts, missed } = read === undefined ? { verdicts: [], missed: [] } : read.review;
    const checks = [...FeedbackItem.fromGaps("gate", after), ...reviewItems(verdicts, missed)];
    const outcome = checks.length > 0 && owesFix(taken.fixes, checks) ? "redo" : after.length ? "refused" : "accepted";
    const counts = countsOf(findings, verdicts, missed.length);
    const result: ReviewOutcome<J> = {
        job,
        outcome,
        round: taken.round,
        fixes: taken.fixes,
        accepted: outcome === "accepted" ? findings : [],
        counts,
        checks,
    };
    return result;
});

/**
 * One job's outcome (P1.33, P1.36, P1.37), from its stored state and files: refused when its state says so or its
 * output is missing after its gate fix; ArtifactMissing when its output or review was never written; else
 * `decidedOutcome`. Nothing reaches the person as a question.
 * @param stage the stage
 * @param job the job
 * @returns the outcome
 */
export const reviewOutcome = Effect.fnUntraced(function* <J extends ReviewedJob, T extends Shapes<T>, E, R>(
    stage: ReviewedStage<T, E, R>,
    job: J,
) {
    const fs = yield* FileAccess;
    const { round, fixes, state } = yield* (yield* JobStates).ensure(job.stage, job.key);
    const reviewed = yield* fs.exists(job.reviewPath);
    const refused: ReviewOutcome<J> = {
        job,
        outcome: "refused",
        round,
        fixes,
        accepted: [],
        counts: noCounts,
        checks: [],
    };
    if (state === "refused" && !reviewed) {
        return refused;
    }
    if (!(yield* fs.exists(job.outputPath))) {
        return fixes.gate ? refused : yield* new ArtifactMissing({ stage: stage.stage, path: job.outputPath });
    }
    if (!reviewed && !fixes.review) {
        return yield* new ArtifactMissing({ stage: stage.stage, path: job.reviewPath });
    }
    return yield* decidedOutcome(stage, job, { round, fixes }, reviewed);
});
