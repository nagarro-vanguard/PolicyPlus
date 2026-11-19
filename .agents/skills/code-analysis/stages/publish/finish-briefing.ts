import { Effect, Stream } from "effect";
import { stageNames } from "../../shared/run/analysis-layout";
import { listConclusions, type ConclusionJob } from "../../shared/jobs/conclusion-jobs";
import { decideConclusions } from "../../shared/jobs/conclusion-steps";
import { prefixOf } from "../../shared/model/record-ids";
import { ofType } from "../../shared/read/record-reading";
import { RecordReads } from "../../shared/read/record-reads";
import { settleOutcomes } from "../../shared/read/reviewed-jobs";
import { StageRecords, type StageWriteDecision, type StageWriter } from "../../shared/store/stage-records";
import { setRoundAside } from "../../shared/jobs/job-transitions";
import { reviewOutcome, type ReviewOutcome, type ReviewedJob } from "../../shared/jobs/review-rounds";
import { Fact } from "../../shared/model/schemas/fact";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import { reviewedBriefingJob } from "./briefing-job";
import { briefingReview } from "./check-briefing";
import { decideJourneys } from "./journey-steps";

type Outcome = ReviewOutcome<ReviewedJob>;

export type PublishDecision = {
    readonly written: boolean;
    readonly briefing: Outcome;
    readonly concluding: boolean;
    readonly journeysPending: boolean;
};

type Settled = ReadonlyArray<Outcome>;

/**
 * What `finish` decided, and the reports to settle once the store write is over (D74).
 * @param commit whether the store keeps the write
 * @param decision the briefing's outcome, and whether concluding jobs remain
 * @param settled each outcome to settle after the write
 * @returns the decision
 */
const decided = (
    commit: boolean,
    decision: Omit<PublishDecision, "written">,
    settled: Settled,
): StageWriteDecision<PublishDecision & { readonly settled: Settled }> => ({
    commit,
    result: { written: commit, ...decision, settled },
});

const journeyTypes = [
    ["Journey", RecordIdPrefix.Journey],
    ["JourneyMerge", RecordIdPrefix.JourneyMerge],
] as const;

const briefedTypes = [
    ["CapabilityGroup", RecordIdPrefix.CapabilityGroup],
    ["CrossCuttingConcern", RecordIdPrefix.CrossCuttingConcern],
    ["Screen", RecordIdPrefix.Screen],
    ["Figure", RecordIdPrefix.Figure],
    ["SystemWords", RecordIdPrefix.SystemWords],
] as const;

/**
 * Insert the briefing's accepted records, one batch per type, and its facts.
 * @param writer the stage's write
 * @param accepted the briefing's accepted records
 * @returns nothing once inserted
 */
const insertBriefed = Effect.fnUntraced(function* (
    writer: StageWriter,
    accepted: ReviewOutcome<ReviewedJob>["accepted"],
) {
    for (const [type, prefix] of briefedTypes) {
        yield* writer.insertRecords(
            type,
            accepted.filter((record) => prefixOf(record.id) === prefix),
        );
    }
    yield* writer.insertRecords("Fact", ofType(accepted, RecordIdPrefix.Fact, Fact));
});

/**
 * Insert one job of the journeys' accepted records, the tasks and the merges, under the job.
 * @param writer the stage's write
 * @param accepted the job's accepted records
 * @param jobId the job's id
 * @returns nothing once inserted
 */
const insertJourneys = Effect.fnUntraced(function* (
    writer: StageWriter,
    accepted: ReviewOutcome<ReviewedJob>["accepted"],
    jobId: string,
) {
    for (const [type, prefix] of journeyTypes) {
        yield* writer.insertRecords(
            type,
            accepted.filter((record) => prefixOf(record.id) === prefix),
            jobId,
        );
    }
});

/**
 * `finish`: Publish as the last pass (4.10, D177, D225), in one transaction of the record store. The briefing is decided
 * by its review: one to redo is set aside with its round counted, and nothing more is done. The jobs of the journeys of
 * today are decided the same way, each by its own review; while any is to run or to fix, nothing is written. Then the
 * concluding step
 * runs over every stage's accepted facts with the briefing's: the topics their facts leave open are listed in tiers,
 * the parts' and other entries' first, then the system's; while any runs, nothing is written. Then the areas, the
 * briefing's facts and every accepted conclusion are written in one commit. A refused briefing writes no area, and
 * the system's questions are still concluded.
 * @param root the analysis root
 * @returns the briefing's outcome, whether concluding jobs remain, and whether Publish's records were written
 */
export const finishBriefing = Effect.fnUntraced(function* (root: string) {
    const job = reviewedBriefingJob(root);
    const others = stageNames.filter((stage) => stage !== "publish");
    const earlier = yield* Stream.runCollect((yield* RecordReads).recordsOfType("Fact", Fact, others));
    const decision = yield* (yield* StageRecords).writeStageRecords("publish", (writer) =>
        Effect.gen(function* () {
            const briefing = yield* reviewOutcome(briefingReview(root), job);
            if (briefing.outcome === "redo") {
                yield* setRoundAside(briefing);
                return decided(false, { briefing, concluding: false, journeysPending: false }, []);
            }
            const journeys = yield* decideJourneys(root);
            const concluded = yield* decideConclusions(root, "publish");
            const listed: readonly ConclusionJob[] = yield* listConclusions(
                root,
                "publish",
                [...earlier, ...ofType(briefing.accepted, RecordIdPrefix.Fact, Fact)],
                new Map(
                    concluded.outcomes.map((each) => [
                        each.job.jobId,
                        ofType(each.accepted, RecordIdPrefix.Fact, Fact),
                    ]),
                ),
            );
            const decidedIds = new Set(concluded.outcomes.map((each) => each.job.jobId));
            const settled = [briefing, ...journeys.outcomes, ...concluded.outcomes];
            const concludingPending = concluded.pending || listed.some((each) => !decidedIds.has(each.jobId));
            if (concludingPending || journeys.pending) {
                return decided(
                    false,
                    { briefing, concluding: concludingPending, journeysPending: journeys.pending },
                    settled,
                );
            }
            const kept = concluded.outcomes.filter((each) =>
                listed.some((listedJob) => listedJob.jobId === each.job.jobId),
            );
            if (briefing.outcome === "accepted") {
                yield* insertBriefed(writer, briefing.accepted);
            }
            for (const each of journeys.outcomes) {
                yield* insertJourneys(writer, each.accepted, each.job.key);
            }
            for (const each of kept) {
                yield* writer.insertRecords("Fact", ofType(each.accepted, RecordIdPrefix.Fact, Fact), each.job.jobId);
            }
            return decided(true, { briefing, concluding: false, journeysPending: false }, settled);
        }),
    );
    yield* settleOutcomes(decision.settled);
    const result: PublishDecision = {
        written: decision.written,
        briefing: decision.briefing,
        concluding: decision.concluding,
        journeysPending: decision.journeysPending,
    };
    return result;
});
