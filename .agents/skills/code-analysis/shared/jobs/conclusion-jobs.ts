import { getOrCreate, known } from "../run/collections";
import { Effect, Schema } from "effect";
import { AnalysisConfig } from "../run/analysis-limits";
import { analysisPaths, type Stage } from "../run/analysis-layout";
import { readCatalogue, type Catalogue } from "../run/catalogue";
import { conclusionGaps, topicsToConclude, type Tier, type TopicToConclude } from "./conclusions";
import { factGaps } from "./fact-gaps";
import { citedFiles } from "../read/record-writing";
import { JobStates } from "./job-state";
import { ScopeFiles } from "../read/scope-files";
import { FileAccess } from "../source/file-access";
import { assignJobIds } from "./job-ids";
import { readDocumentStrictly } from "../run/json-files";
import type { JsonRecord } from "../model/json-record";
import { ofType } from "../read/record-reading";
import { JobIdPrefix } from "../model/record-ids";
import { checkReviewedJob } from "./review-rounds";
import { Fact } from "../model/schemas/fact";
import { sha1Hex } from "../run/hashing-and-random";
import { DocumentInvalid } from "../run/script-errors";
import { RecordIdPrefix, Text, about } from "../model/shared-fields";

const conclusionShapes = { Fact };

const ConclusionJob = Schema.Struct({
    name: Text.annotate(about("The job's name, as a person reads it; nothing looks a job up by it: its job id does.")),
    jobId: Text.annotate(about("The job id: the name of its folder.")),
    tier: Schema.Literals(["entries", "system", "harms"]).annotate(
        about("Whether it concludes the entries' topics, the system's, or the kinds of harm."),
    ),
    topics: Schema.Array(Text).annotate(about("The keys of the topics it concludes.")),
}).annotate(about("One concluding job of a stage (D177, 4.10)."));

const ConclusionList = Schema.Array(ConclusionJob);

export type ConclusionJob = typeof ConclusionJob.Type;

const TopicsFile = Schema.Struct({
    tier: Schema.Literals(["entries", "system", "harms"]),
    topics: Schema.Array(
        Schema.Struct({
            key: Text,
            subject: Fact.fields.subject,
            aspect: Text,
            question: Text,
            facts: Schema.Array(Fact),
            nearby: Schema.optionalKey(
                Schema.Array(Text).annotate(
                    about(
                        "Up to eight statements on the same subject's other questions, one line each: context for the answer, never to be concluded here (D241).",
                    ),
                ),
            ),
        }),
    ),
}).annotate(about("What a concluding job concludes: each topic with its question and the facts beneath it."));

/**
 * A stage's concluding jobs, as listed; none before its studies are decided.
 * @param root the analysis root
 * @param stage the stage
 * @returns the jobs
 */
export const readConclusionList = Effect.fnUntraced(function* (root: string, stage: Stage) {
    const path = analysisPaths(root).conclusions(stage).list;
    return (yield* (yield* FileAccess).exists(path)) ? yield* readDocumentStrictly(path, ConclusionList) : [];
});

/**
 * The topics one concluding job was given, with the facts beneath each.
 * @param root the analysis root
 * @param stage the stage
 * @param job the job
 * @returns the topics
 */
const readTopics = Effect.fnUntraced(function* (root: string, stage: Stage, job: ConclusionJob) {
    const file = yield* readDocumentStrictly(analysisPaths(root).conclusions(stage).topics(job.jobId), TopicsFile);
    return file.topics.map((topic): TopicToConclude => ({ ...topic, facts: topic.facts }));
});

/**
 * A tier's topics cut into jobs (D177; plan 0003, H3 and H6): each tier in runs of at most T topics and F facts
 * beneath, so a job's fan-in is bounded whatever the estate's size; the parts' tier reduces the notes of a part's areas
 * and any topic two stages wrote, the system's reads every part's answer to its questions, the harms' every finding of
 * a kind (plan 0005). A topic with more than F facts beneath is refused, never cut short: past F the
 * tree by source root is designed (the architecture's section 2A) and not built.
 * @param tier the tier
 * @param topics the tier's topics
 * @param budgets T and F
 * @param words a question's words, by its aspect
 * @returns the jobs, each with its name and topics; DocumentInvalid naming a topic over F
 */
function cutTier(
    tier: Tier,
    topics: readonly TopicToConclude[],
    budgets: { readonly topics: number; readonly answers: number },
    words: (aspect: string) => string,
) {
    const over = topics.filter((topic) => topic.facts.length > budgets.answers);
    if (over.length) {
        return Effect.fail(
            new DocumentInvalid({
                path: "the facts beneath the concluding step",
                issue: over
                    .map(
                        (topic) =>
                            `"${words(topic.aspect)}" has ${topic.facts.length} facts beneath, over ${budgets.answers}`,
                    )
                    .join("; "),
            }),
        );
    }
    const chunks: TopicToConclude[][] = [];
    let facts = 0;
    for (const topic of topics) {
        const last = chunks.at(-1);
        if (last === undefined || last.length >= budgets.topics || facts + topic.facts.length > budgets.answers) {
            chunks.push([topic]);
            facts = topic.facts.length;
        } else {
            last.push(topic);
            facts += topic.facts.length;
        }
    }
    const name =
        tier === "entries"
            ? "the conclusions of the parts"
            : tier === "system"
              ? "the conclusions of the system"
              : "the harms of the system";
    return Effect.succeed(
        chunks.map((chunk, i) => ({
            name: chunks.length > 1 ? `${name} (${i + 1} of ${chunks.length})` : name,
            topics: chunk,
        })),
    );
}

/**
 * What a concluding job concludes from, as one value: every topic's facts beneath, as written. A fact corrected under
 * its own record id changes it, so the job is concluded again (plan 0004).
 * @param topics the job's topics
 * @returns the facts' hash
 */
const beneathOf = (topics: readonly TopicToConclude[]) =>
    sha1Hex(JSON.stringify(topics.map((topic) => [topic.key, topic.facts])));

/**
 * The definitions of a tier's listed jobs, each from the topics file it was given, so a job whose facts beneath
 * changed since is cut afresh.
 * @param root the analysis root
 * @param stage the stage
 * @param listed the tier's listed jobs
 * @returns each job's id and definition
 */
const earlierDefinitions = Effect.fnUntraced(function* (root: string, stage: Stage, listed: readonly ConclusionJob[]) {
    const definitions: Array<{ readonly id: string; readonly definition: string }> = [];
    for (const job of listed) {
        const topics = yield* readTopics(root, stage, job);
        definitions.push({ id: job.jobId, definition: JSON.stringify([job.topics, beneathOf(topics)]) });
    }
    return definitions;
});

const nearbyKept = 8;

/**
 * The statements on each subject's other questions, for a topic's context (D241, P12.6): a conclusion on one question
 * reads what its subject's other questions found, so two answers on one part do not contradict each other.
 * @param topics every topic of the tier
 * @returns a topic's nearby statements, by the topic
 */
const nearbyOf = (topics: readonly TopicToConclude[]) => {
    const bySubject = new Map<string, TopicToConclude[]>();
    topics.forEach((topic) => getOrCreate(bySubject, JSON.stringify(topic.subject)).push(topic));
    return (topic: TopicToConclude) =>
        known(bySubject, JSON.stringify(topic.subject), "every topic is listed under its subject")
            .filter((other) => other.aspect !== topic.aspect)
            .flatMap((other) => other.facts.map((fact) => fact.statement))
            .slice(0, nearbyKept);
};

/**
 * Write one concluding job's topics file, for its agent: each topic with its question's words, the facts beneath,
 * and the statements on its subject's other questions.
 * @param path the topics file
 * @param tier the tier
 * @param topics the job's topics
 * @param context the catalogue, and a topic's nearby statements (`nearbyOf`)
 * @returns nothing once written
 */
const writeTopics = Effect.fnUntraced(function* (
    path: string,
    tier: Tier,
    topics: readonly TopicToConclude[],
    context: { readonly catalogue: Catalogue; readonly nearby: (topic: TopicToConclude) => readonly string[] },
) {
    const { catalogue, nearby } = context;
    const question = (aspect: string) => {
        const found = catalogue.aspects.find((each) => each.id === aspect);
        return found === undefined ? aspect : found.words;
    };
    const file = {
        tier,
        topics: topics.map((topic) => ({
            key: topic.key,
            subject: topic.subject,
            aspect: topic.aspect,
            question: question(topic.aspect),
            facts: topic.facts,
            nearby: nearby(topic),
        })),
    };
    yield* (yield* FileAccess).writeText(path, JSON.stringify(file, null, 1));
});

/**
 * List a tier's concluding jobs (D177): the topics cut by `cutTier`, each job keeping its id and rounds while its
 * topics are unchanged, its topics file written for its agent; the other tier's jobs are kept as they are, and a job
 * no longer cut leaves with its folder. The caller holds the record store.
 * @param root the analysis root
 * @param stage the stage
 * @param tier the tier
 * @param topics the tier's topics
 * @returns the list
 */
const listTier = Effect.fnUntraced(function* (
    root: string,
    stage: Stage,
    tier: Tier,
    topics: readonly TopicToConclude[],
) {
    const fs = yield* FileAccess;
    const paths = analysisPaths(root).conclusions(stage);
    const catalogue = yield* readCatalogue();
    const earlier = yield* readConclusionList(root, stage);
    const definition = (job: { readonly topics: readonly TopicToConclude[] }) =>
        JSON.stringify([job.topics.map((topic) => topic.key), beneathOf(job.topics)]);
    const { topicsPerJob, answersPerReduction } = yield* AnalysisConfig;
    const words = (aspect: string) => {
        const found = catalogue.aspects.find((each) => each.id === aspect);
        return found === undefined ? aspect : found.words;
    };
    const cut = yield* assignJobIds(
        JobIdPrefix.conclusions,
        yield* cutTier(tier, topics, { topics: topicsPerJob, answers: answersPerReduction }, words),
        definition,
        yield* earlierDefinitions(
            root,
            stage,
            earlier.filter((job) => job.tier === tier),
        ),
    );
    const states = yield* JobStates;
    for (const dropped of cut.dropped) {
        yield* fs.remove(paths.folder(dropped));
        for (const gone of earlier.filter((job) => job.jobId === dropped)) {
            yield* states.remove(stage, gone.jobId);
        }
    }
    const nearby = nearbyOf(topics);
    for (const job of cut.jobs) {
        yield* writeTopics(paths.topics(job.id), tier, job.topics, { catalogue, nearby });
    }
    const jobs = cut.jobs.map((job): ConclusionJob => {
        return {
            name: job.name,
            jobId: job.id,
            tier,
            topics: job.topics.map((topic) => topic.key),
        };
    });
    const list = [...earlier.filter((job) => job.tier !== tier), ...jobs];
    yield* fs.writeText(paths.list, JSON.stringify(list, null, 1));
    return list;
});

/**
 * List the concluding jobs a stage's facts call for, in tiers (D177): the entries' tier from the facts beneath, never
 * from the stage's own conclusions, so a job keeps its topics once it is accepted; the harms' tier beside it, from the
 * findings and the earlier stages' harms beneath, never from its own (plan 0005); the system's tier once every job of the entries' tier,
 * as listed now, is decided, from the facts beneath and the entries' conclusions.
 * @param root the analysis root
 * @param stage the stage
 * @param beneath the facts the stage concludes from: earlier stages' accepted ones and its studies' decided ones
 * @param decided the concluding jobs decided so far, none to redo, each with its accepted facts
 * @returns the list
 */
export const listConclusions = Effect.fnUntraced(function* (
    root: string,
    stage: Stage,
    beneath: ReadonlyArray<typeof Fact.Type>,
    decided: ReadonlyMap<string, ReadonlyArray<typeof Fact.Type>>,
) {
    const catalogue = yield* readCatalogue();
    const tierDone = (list: readonly ConclusionJob[], tier: Tier) =>
        list.filter((job) => job.tier === tier).every((job) => decided.has(job.jobId));
    const factsOf = (list: readonly ConclusionJob[], tier: Tier) =>
        list
            .filter((job) => job.tier === tier)
            .flatMap((job) => {
                const facts = decided.get(job.jobId);
                return facts === undefined ? [] : facts;
            });
    yield* listTier(root, stage, "entries", topicsToConclude(beneath, catalogue).entries);
    const withEntries = yield* listTier(root, stage, "harms", topicsToConclude(beneath, catalogue).harms);
    if (!tierDone(withEntries, "entries")) {
        return withEntries.filter((job) => job.tier !== "system");
    }
    const upToSystem = [...beneath, ...factsOf(withEntries, "entries")];
    return yield* listTier(root, stage, "system", topicsToConclude(upToSystem, catalogue).system);
});

/**
 * One concluding job as the review rounds take it.
 * @param root the analysis root
 * @param stage the stage
 * @param job the job
 * @returns the job, with where its agents write
 */
export const reviewedConclusionJob = (root: string, stage: Stage, job: ConclusionJob) => ({
    ...job,
    stage,
    key: job.jobId,
    label: job.name,
    ...analysisPaths(root).conclusions(stage).files(job.jobId),
});

/**
 * A concluding job under review: the facts it writes, held to the shared fact rules and to the concluding rules
 * (`conclusionGaps`) against the topics it was given. The facts beneath its topics are written beside it, in the
 * stage's one commit, so a conclusion may cite them before they are accepted.
 * @param root the analysis root
 * @param stage the stage
 * @param job the job
 * @returns the stage as the review rounds take it
 */
export const conclusionReview = (root: string, stage: Stage, job: ConclusionJob) => ({
    stage,
    shapes: conclusionShapes,
    checksFor: (cited: readonly JsonRecord[]) =>
        Effect.gen(function* () {
            const topics = yield* readTopics(root, stage, job);
            const context = {
                catalogue: yield* readCatalogue(),
                lineCounts: yield* (yield* ScopeFiles).lineCountsFor(citedFiles(cited)),
            };
            const beneath = new Set<string>(topics.flatMap((topic) => topic.facts.map((fact) => fact.id)));
            return {
                records: (records: ReadonlyArray<JsonRecord & { readonly id: string }>) => {
                    const written = ofType(records, RecordIdPrefix.Fact, Fact);
                    return [...factGaps(written, context), ...conclusionGaps(written, topics)];
                },
                placement: () => [],
                writtenBeside: beneath,
            };
        }),
});

/**
 * `check` on a concluding job: the gate on its output, and once reviewed, the review's verdicts.
 * @param root the analysis root
 * @param stage the stage
 * @param job the job
 * @returns one line per gap
 */
export const checkConclusionJob = (root: string, stage: Stage, job: ConclusionJob) =>
    checkReviewedJob(conclusionReview(root, stage, job), reviewedConclusionJob(root, stage, job));
