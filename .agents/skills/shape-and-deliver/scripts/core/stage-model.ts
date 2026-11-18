import { Schema } from "effect";
import { about, recordNames, recordTypes, storedOf, Text } from "./records";
import { stageNames } from "./run-layout";

/** A tally: rounds given, records counted, checks passed or failed; zero is a real answer. */
const Tally = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

const Progress = Schema.Struct({
    rounds: Tally.annotate(about("How many rounds the stage's agent has been given.")),
    maxRounds: Tally.annotate(about("How many it may be given before the run stops for the operator.")),
}).annotate(about("How far a stage's agent has got through its rounds."));

export const Decision = Schema.TaggedUnion({
    question: { question: storedOf(recordTypes.Question) },
}).annotate(
    about(
        "Something waiting on the approver: a question only they can answer. A problem with shape-and-deliver itself is the operator's, printed by the step that finds it, never on a page.",
    ),
);

/**
 * Wraps each question of a stage as a decision waiting on the approver.
 * @param questions the stage's questions
 * @returns one decision per question
 */
export const decisionsOf = (questions: readonly Decision["question"][]): Decision[] =>
    questions.map((question) => ({ _tag: "question" as const, question }));

export const Counted = Schema.Struct({
    count: Tally,
    of: Schema.Literals(recordNames),
}).annotate(about("A count of records of one type: a headline figure, which the renderer words."));

export const JobRan = Schema.TaggedUnion({
    agentWrote: { label: Text, wrote: Schema.Array(Counted) },
    checksRan: { label: Text, passed: Tally, failed: Tally },
}).annotate(
    about("What the stage's last step did: what its agent wrote in its round, or how the layers' checks ended."),
);

const common = {
    stage: Schema.Literals(stageNames).annotate(about("The stage, by its key.")),
    madeAt: Text.annotate(about("When the model was made, as an ISO date and time.")),
    progress: Progress,
    decisions: Schema.Array(Decision),
};

const Common = Schema.Struct(common);

/** A stage's model with its findings left unread: what the pages need of every stage alike. */
export type StageSummary = Model<unknown, unknown>;

type Common = typeof Common.Type;

export type JobRan = typeof JobRan.Type;

export type Counted = typeof Counted.Type;

export type Decision = typeof Decision.Type;

export type Model<R, D> =
    | ({ readonly _tag: "notStarted" } & Common)
    | ({
          readonly _tag: "running";
          readonly justRan:
              | { readonly _tag: "nothingYet" }
              | { readonly _tag: "ran"; readonly jobs: readonly JobRan[]; readonly found: R };
      } & Common)
    | ({ readonly _tag: "stopped"; readonly reason: string } & Common)
    | ({
          readonly _tag: "waitingForYou" | "done";
          readonly headline: readonly Counted[];
          readonly found: D;
      } & Common);
