import { Schema } from "effect";
import { stageNames } from "../../run/analysis-layout";
import { recordTypeNames } from "../record-types";
import { Text, about } from "../shared-fields";

const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

const Progress = Schema.Struct({
    toRun: Count.annotate(about("How many jobs have not run yet.")),
    toReview: Count.annotate(about("How many jobs have run and wait for their review.")),
    reviewed: Count.annotate(about("How many jobs were reviewed and need nothing more.")),
    fixed: Count.annotate(about("How many jobs were fixed after their review and passed their checks.")),
    refused: Count.annotate(about("How many jobs still fail their checks after their fix.")),
}).annotate(
    about(
        "A stage's jobs, by where each stands: to run, to review, reviewed, fixed after its review, or refused (its checks still failing after its fix).",
    ),
);

const Counted = Schema.Struct({
    count: Count.annotate(about("How many records of the type.")),
    of: Schema.Literals(recordTypeNames).annotate(about("The record type counted.")),
}).annotate(about("A count of records of one type, which the renderer words (P4c.3)."));

const Verdicts = Schema.Struct({
    partlyCorrect: Count.annotate(about("How many findings the review ruled partly correct.")),
    wrong: Count.annotate(about("How many findings the review ruled wrong.")),
    unsettled: Count.annotate(about("How many findings the review left unsettled.")),
}).annotate(about("What a review challenged in a job's findings, kind by kind."));

const jobLabel = Text.annotate(about("The job, named for a reader: what it covers, as its stage lists it."));

export const JobRan = Schema.Union([
    Schema.Struct({
        _tag: Schema.Literal("agentWrote").annotate(about("What happened: the job's agent wrote records.")),
        label: jobLabel,
        wrote: Schema.Array(Counted).annotate(about("What the job's agent wrote, by record type.")),
    }).annotate(about("A job whose agent wrote its records.")),
    Schema.Struct({
        _tag: Schema.Literal("reviewDecided").annotate(about("What happened: the job's review decided.")),
        label: jobLabel,
        verdicts: Verdicts,
    }).annotate(about("A job whose review decided what to keep.")),
]).annotate(about("One job of the batch just closed: what its agent wrote, or what its review decided (D101)."));

const common = {
    stage: Schema.Literals(stageNames).annotate(about("The stage, by its key.")),
    madeAt: Text.annotate(about("When it was read, as an ISO date and time.")),
    progress: Progress,
};

/**
 * The `_tag` of one state of a stage, with what the state means.
 * @param name the state's name
 * @param words what the state means, in plain words
 * @returns the schema of the tag
 */
const state = <N extends string>(name: N, words: string) =>
    Schema.Literal(name).annotate(about(`The stage's state: ${words}.`));

export const StageStatus = Schema.Union([
    Schema.Struct({ _tag: state("notStarted", "it has not started"), ...common }).annotate(
        about("A stage that has not started."),
    ),
    Schema.Struct({
        _tag: state("running", "it is running"),
        ...common,
        justRan: Schema.Array(JobRan).annotate(about("What each job of the batch the stage closed last did.")),
    }).annotate(about("A stage that is running.")),
    Schema.Struct({
        _tag: state("stopped", "a step refused and it stopped"),
        ...common,
        reason: Text.annotate(about("Why the stage's last step stopped, in plain words.")),
    }).annotate(about("A stage that stopped.")),
    Schema.Struct({ _tag: state("done", "it is done"), ...common }).annotate(about("A stage that is done.")),
]).annotate(
    about(
        "Where one stage stands (D103, D157): its state, its jobs by where each stands, what the batch it closed last did while it runs, and why its last step stopped. Its findings are drawn on the subject pages; this is what `show` prints and the run page reads.",
    ),
);

export type StageStatus = typeof StageStatus.Type;

export type JobRan = typeof JobRan.Type;

export type Counted = typeof Counted.Type;
