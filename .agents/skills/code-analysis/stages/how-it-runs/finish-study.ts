import { Effect, Stream } from "effect";
import { listConclusions, type ConclusionJob } from "../../shared/jobs/conclusion-jobs";
import { decideConclusions } from "../../shared/jobs/conclusion-steps";
import { RecordReads } from "../../shared/read/record-reads";
import { StageRecords, type StageWriteDecision, type StageWriter } from "../../shared/store/stage-records";
import { setRoundAside } from "../../shared/jobs/job-transitions";
import { reviewOutcome, type ReviewOutcome, type ReviewedJob } from "../../shared/jobs/review-rounds";
import { everyOrGaps } from "../../shared/jobs/every-or-gaps";
import { countProgress } from "../../shared/jobs/progress";
import { settleOutcomes } from "../../shared/read/reviewed-jobs";
import { Fact } from "../../shared/model/schemas/fact";
import { GapsRemain } from "../../shared/run/script-errors";
import { openStageAudit } from "./audit-stage";
import { acceptedStudyOf, howItRunsReview, reviewedJobOf } from "./check-study";
import { definitionOf, readStack, type Job } from "./study-cut";
import { readJobList, type ListedJob } from "./study-jobs";

type Outcome = ReviewOutcome<ReturnType<typeof reviewedJobOf>>;

type Settled = ReviewOutcome<ReviewedJob>;

export type StudyDecision = {
    readonly written: boolean;
    readonly studies: readonly Outcome[];
    readonly concluding: boolean;
    readonly audited: boolean;
};

/**
 * What `finish` decided, and the report and feedback files it changes once the store write is over (D74).
 * @param commit whether the store keeps the write
 * @param decision the studies' outcomes, and whether concluding jobs remain to run
 * @param settled each outcome whose report and feedback are written after the write
 * @returns the decision
 */
const decided = (
    commit: boolean,
    decision: Omit<StudyDecision, "written" | "audited">,
    settled: readonly Settled[],
): StageWriteDecision<Omit<StudyDecision, "audited"> & { readonly settled: readonly Settled[] }> => ({
    commit,
    result: { written: commit, ...decision, settled },
});

/**
 * Why the job list does not match today's cut (2A): a job never prepared or one whose definition changed at Inventory,
 * and a listed job no longer cut, each told by its definition and never by its name.
 * @param jobs the jobs cut now
 * @param list the job list
 * @returns one line per job to prepare again
 */
const unpreparedJobs = (jobs: readonly Job[], list: readonly ListedJob[]): string[] => [
    ...jobs.flatMap((job) =>
        list.some((listed) => listed.preparedAgainst === definitionOf(job))
            ? []
            : [`${job.name} was never prepared, or was before a change at Inventory reached it: run prepare`],
    ),
    ...list
        .filter((listed) => !jobs.some((job) => definitionOf(job) === listed.preparedAgainst))
        .map((listed) => `${listed.name} is no longer a study of today's technologies and parts: run prepare`),
];

/**
 * Every study's outcome, each decided as it comes by its review rounds (P1.33, P1.37); refused, naming every gap of
 * every review, while any review leaves one.
 * @param root the analysis root
 * @param list the job list
 * @returns the outcomes, in list order
 */
const decideEveryStudy = Effect.fnUntraced(function* (root: string, list: readonly ListedJob[]) {
    const finished = yield* countProgress("how-it-runs finish", list.length, "jobs decided");
    return yield* everyOrGaps(
        list,
        (job) =>
            Effect.gen(function* () {
                return yield* reviewOutcome(howItRunsReview(root, job), reviewedJobOf(root, job));
            }),
        finished,
    );
});

/**
 * Write How it runs' accepted records, in one commit (D70): every accepted study's facts and every accepted concluding
 * job's facts; a refused study writes nothing, and the run page shows it.
 * @param writer the stage's write
 * @param studies every study's outcome, none to redo
 * @param conclusions every concluding job's outcome, none to redo
 * @returns each outcome to settle once the write commits
 */
const writeAcceptedRecords = Effect.fnUntraced(function* (
    writer: StageWriter,
    studies: readonly Outcome[],
    conclusions: ReadonlyArray<ReviewOutcome<ReviewedJob & ConclusionJob>>,
) {
    const settled: Settled[] = [];
    for (const each of [...studies, ...conclusions]) {
        if (each.outcome === "accepted") {
            yield* writer.insertRecords("Fact", acceptedStudyOf(each.accepted), each.job.jobId);
        }
        settled.push(each);
    }
    return settled;
});

/**
 * `finish`: decide How it runs inside one transaction of the record store (D70, D177). Refused while the job list does
 * not match today's technologies and parts, while a study lacks its study or its review, or while a review leaves a
 * gap. Any study to redo is set aside, and nothing is written. Once none is, the concluding jobs the standing facts
 * call for are listed, the parts' tier first and the system's once that tier is decided, and each is decided by its
 * review; while any runs, nothing is written. Then every accepted study's facts and every accepted conclusion are
 * written in one commit, and the stage's audit opened while its cycles remain (plan 0004). Report and feedback files
 * change only once the write is over (D74).
 * @param root the analysis root
 * @returns every study's outcome, whether concluding jobs remain, whether How it runs' records were written, and
 * whether its audit was opened
 */
export const finishStudy = Effect.fnUntraced(function* (root: string) {
    const { jobs } = yield* readStack();
    const earlier = yield* Stream.runCollect((yield* RecordReads).recordsOfType("Fact", Fact, ["inventory"]));
    const decision = yield* (yield* StageRecords).writeStageRecords("how-it-runs", (writer) =>
        Effect.gen(function* () {
            const list = yield* readJobList(root);
            const refusals = unpreparedJobs(jobs, list);
            if (refusals.length) {
                return yield* new GapsRemain({ gaps: refusals });
            }
            const studies = yield* decideEveryStudy(root, list);
            const redo = studies.filter((each) => each.outcome === "redo");
            if (redo.length) {
                yield* Effect.forEach(redo, setRoundAside);
                return decided(false, { studies, concluding: false }, []);
            }
            const accepted = (outcome: {
                readonly outcome: string;
                readonly accepted: Parameters<typeof acceptedStudyOf>[0];
            }) => (outcome.outcome === "accepted" ? acceptedStudyOf(outcome.accepted) : []);
            const before = yield* decideConclusions(root, "how-it-runs");
            const listed = yield* listConclusions(
                root,
                "how-it-runs",
                [...earlier, ...studies.flatMap(accepted)],
                new Map(before.outcomes.map((each) => [each.job.jobId, accepted(each)])),
            );
            const decidedIds = new Set(before.outcomes.map((each) => each.job.jobId));
            const settled = [...studies, ...before.outcomes];
            if (before.pending || listed.some((job) => !decidedIds.has(job.jobId))) {
                return decided(false, { studies, concluding: true }, settled);
            }
            const kept = before.outcomes.filter((each) => listed.some((job) => job.jobId === each.job.jobId));
            return decided(true, { studies, concluding: false }, yield* writeAcceptedRecords(writer, studies, kept));
        }),
    );
    yield* settleOutcomes(decision.settled);
    const result: StudyDecision = {
        written: decision.written,
        studies: decision.studies,
        concluding: decision.concluding,
        audited: decision.written ? yield* openStageAudit(root) : false,
    };
    return result;
});

/**
 * What a `finish` leaves the loop to do next, and what it says: each study's outcome; more while a study is to redo, a
 * concluding job runs, or the stage's audit was just opened.
 * @param decision what `finish` decided
 * @returns whether the loop has more to run, and the lines to say
 */
export const nextAfterFinish = (decision: StudyDecision) => ({
    more: !decision.written || decision.audited,
    said: [
        ...decision.studies.map((each) => `${each.job.label}: ${each.outcome}`),
        ...(decision.concluding ? ["every study is decided: the topics they leave open are concluded next"] : []),
        ...(decision.audited ? ["its facts are written: the stage's audit reads them as one next"] : []),
    ],
});
