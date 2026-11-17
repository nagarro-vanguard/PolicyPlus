import { Effect } from "effect";
import { analysisPaths, studyJobLabel } from "../../shared/run/analysis-layout";
import { readCatalogue } from "../../shared/run/catalogue";
import { factGaps, type FactContext } from "../../shared/jobs/fact-gaps";
import { readDocumentStrictly } from "../../shared/run/json-files";
import { topicKey } from "../../shared/jobs/conclusions";
import { StudyTopics } from "../../shared/model/schemas/how-it-runs-jobs";
import type { JsonRecord } from "../../shared/model/json-record";
import { ofType } from "../../shared/read/record-reading";
import { citedFiles } from "../../shared/read/record-writing";
import { ScopeFiles } from "../../shared/read/scope-files";
import { agentRecords, carryForward } from "../../shared/jobs/job-feedback";
import { checkReviewedJob } from "../../shared/jobs/review-rounds";
import { missedOutside } from "../../shared/jobs/review-verdicts";
import { Fact, basisOf } from "../../shared/model/schemas/fact";
import type { Missed } from "../../shared/model/schemas/missed";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import { studyJobFiles } from "./study-arguments";
import type { ListedJob } from "./study-jobs";

const studyShapes = { Fact };

type FactRecord = typeof Fact.Type;

/**
 * A study's facts among findings, by the prefix of their record ids, each as last written.
 * @param records the findings
 * @returns the facts
 */
export const acceptedStudyOf = (records: ReadonlyArray<JsonRecord & { readonly id: string }>) =>
    ofType(records, RecordIdPrefix.Fact, Fact);

type Given = typeof StudyTopics.Type;

/**
 * The gaps of a study's facts beside the shared rules (H2, A5 of the architecture; plan 0004): a fact on a topic the
 * study was not given; a topic given with no answer, an answer being a fact with no `risk`; outside an area job, a
 * topic with more than one answer, since a packed or technology study is its topics' one owner; an answer to a
 * question answered by findings only; and a conclusion, which only the concluding step writes. A finding, a fact with
 * a `risk`, stands beside its topic's answer, as many as the code shows. An area job writes notes, as many as its area
 * shows, which the concluding step reduces.
 * @param facts the study's facts
 * @param job the job
 * @param given the topics it was given
 * @param findingsOnly the questions answered by findings only, by id
 * @returns one line per gap
 */
function ownGaps(
    facts: readonly FactRecord[],
    job: ListedJob,
    given: Given,
    findingsOnly: ReadonlySet<string>,
): string[] {
    const counts = new Map(given.topics.map((topic) => [topicKey(topic.subject, topic.aspect), 0]));
    const gaps = facts.flatMap((fact) => {
        const key = topicKey(fact.subject, fact.aspect);
        const count = counts.get(key);
        if (count !== undefined && fact.risk === undefined) {
            counts.set(key, count + 1);
        }
        return [
            ...(count === undefined
                ? [
                      `${fact.id} answers ${fact.aspect} of a subject this study was not given: write it of a topic in jobPath`,
                  ]
                : []),
            ...(fact.risk === undefined && findingsOnly.has(fact.aspect)
                ? [`${fact.id} answers a question asked for findings only: give it its risk, or drop it`]
                : []),
            ...(basisOf(fact) === "concluded"
                ? [`${fact.id} concludes: only the concluding step concludes a topic`]
                : []),
        ];
    });
    return [
        ...gaps,
        ...given.topics.flatMap((topic) => {
            const count = counts.get(topicKey(topic.subject, topic.aspect));
            const asked = `${topic.subjectName}: "${topic.question}"`;
            if (findingsOnly.has(topic.aspect)) {
                return [];
            }
            if (count === undefined || count === 0) {
                return [
                    `${asked} has no answer: answer it in a fact with no risk, say why it does not apply, or assume it`,
                ];
            }
            return count > 1 && job.kind !== "area"
                ? [
                      `${asked} is answered ${count} times: answer it once, citing every place that shows it; each risk is a finding of its own, with its risk`,
                  ]
                : [];
        }),
    ];
}

/**
 * Every gap of a study's facts: the shared fact rules (`factGaps`), and the study's own (`ownGaps`).
 * @param facts the study's facts
 * @param job the job
 * @param context what the facts are checked against, with the topics the job was given
 * @returns one line per gap
 */
const studyGaps = (facts: readonly FactRecord[], job: ListedJob, context: FactContext & { readonly given: Given }) => [
    ...factGaps(facts, context),
    ...ownGaps(
        facts,
        job,
        context.given,
        new Set(
            context.catalogue.aspects.filter((aspect) => aspect.answeredBy === "findings").map((aspect) => aspect.id),
        ),
    ),
];

/**
 * What one study is checked against now: the catalogue, the topics it was given, the manifest's line counts of the files the records cite, and the text of every range they
 * cite with a named piece.
 * @param root the analysis root
 * @param job the job
 * @param records every record the check will look at: the study's, and the review's once it exists
 * @returns the check's context
 */
const studyContext = Effect.fnUntraced(function* (root: string, job: ListedJob, records: readonly JsonRecord[]) {
    return {
        catalogue: yield* readCatalogue(),
        given: yield* readDocumentStrictly(analysisPaths(root).studyTopics(job.jobId), StudyTopics),
        lineCounts: yield* (yield* ScopeFiles).lineCountsFor(citedFiles(records)),
    };
});

/**
 * How it runs under review: the record types a study holds, and the gate: the shared fact rules, and the study's own
 * (`ownGaps`). Its verdicts need only the shared rules.
 * @param root the analysis root
 * @param job the job
 * @returns the stage as the review rounds take it
 */
export const howItRunsReview = (root: string, job: ListedJob) => ({
    stage: "how-it-runs" as const,
    shapes: studyShapes,
    checksFor: (cited: readonly JsonRecord[]) =>
        Effect.map(studyContext(root, job, cited), (context) => ({
            records: (records: ReadonlyArray<JsonRecord & { readonly id: string }>) =>
                studyGaps(acceptedStudyOf(records), job, context),
            placement: (missed: ReadonlyArray<typeof Missed.Type>) =>
                missedOutside(missed, context.lineCounts, "manifest"),
            writtenBeside: new Set<string>(),
        })),
});

/**
 * One job as the review rounds take it: its study, its review and its rounds folder.
 * @param root the analysis root
 * @param job the job
 * @returns the job, with where its agents write
 */
export const reviewedJobOf = (root: string, job: ListedJob) => ({
    ...job,
    label: studyJobLabel(job.name),
    ...studyJobFiles(root, job),
});

/**
 * `check`: the gate on one job's study, and, once the reviewer has written, the review's verdicts and the gate again
 * on what the review would leave.
 * @param root the analysis root
 * @param job the job
 * @returns one line per gap; none when the job passes
 */
export const checkJob = (root: string, job: ListedJob) =>
    checkReviewedJob(howItRunsReview(root, job), reviewedJobOf(root, job));

/**
 * `carry`: start one job's run from the study its feedback is about, copying every record of it that stands.
 * @param root the analysis root
 * @param job the job
 * @param leftOut the record ids that do not stand
 * @returns how many records were carried and left out
 */
export const carryStudy = (root: string, job: ListedJob, leftOut: readonly string[]) =>
    carryForward(studyJobFiles(root, job), agentRecords(howItRunsReview(root, job).shapes), leftOut);
