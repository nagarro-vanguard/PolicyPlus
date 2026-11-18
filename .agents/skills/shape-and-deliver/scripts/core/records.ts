import { Schema } from "effect";
import { EntityTouched, InvariantAtRisk, JourneyAffected, SeamCrossed } from "./records-orientation";
import { AcceptanceTest } from "./records-tests";
import { AcId, Position, Lines, RepoPath, Text, about, field, idOf, idPrefix, isRecordIdOf } from "./record-fields";

export { AcId, Text, about, idPrefix, isRecordIdOf };

const PathStep = Schema.Struct({
    id: idOf(idPrefix.PathStep),
    ac: AcId,
    order: Position.annotate(
        field("This step's place in the criterion's path, from 1 where the work starts.", "agent"),
    ),
    name: Text.annotate(
        field(
            "What the product's users call this step, in their words and as it reads mid-sentence, such as 'the Runs page' or 'the runs table'. The approver reads it in the path's diagram to judge whether the path is right.",
            "approver",
        ),
    ),
    file: RepoPath,
    cites: Schema.optionalKey(
        Schema.Array(Schema.String).annotate(
            field(
                "The ids of the orientation records (entities, invariants, journeys, seams) this step touches.",
                "agent",
            ),
        ),
    ),
    lines: Schema.optionalKey(Lines),
    status: Schema.Literals(["exists", "changes", "new"]).annotate(
        field(
            "Whether the code for this step exists as it is, must change, or must be written; the approver sees it as 'as today', 'changes' or 'new'.",
            "approver",
        ),
    ),
    start: Schema.optionalKey(
        Text.annotate(
            field(
                "Only the first step: who or what starts the work, and where, as one sentence in the product's words, such as 'A reviewer opens the Runs page' or 'The nightly import starts'. The approver reads it at the top of the path.",
                "approver",
            ),
        ),
    ),
    reachedBy: Schema.optionalKey(
        Text.annotate(
            field(
                "Every step after the first: how the step before reaches this one, in a few words of the product's own, such as 'requests', 'posts the form to' or 'saves to'. The approver reads it on the arrow into this step, so it ends where the name begins and says nothing about the outcome.",
                "approver",
            ),
        ),
    ),
})
    .check(
        Schema.makeFilter(
            (step) =>
                (step.order === 1) === (step.start !== undefined) ||
                "only the first step, and every first step, says how the work starts",
        ),
        Schema.makeFilter(
            (step) =>
                (step.order === 1) === (step.reachedBy === undefined) ||
                "every step after the first, and only such a step, says how it is reached",
        ),
        Schema.makeFilter(
            (step) => step.status === "new" || step.lines !== undefined || "a step whose code exists cites its lines",
        ),
    )
    .annotate(about("One step of an acceptance criterion's path, from where the work starts to the data it keeps."));

const Question = Schema.Struct({
    id: idOf(idPrefix.Question),
    question: Text.annotate(
        field(
            "The question, as the approver reads it in the plan's Decide section: about the product, in its words, answerable without the code.",
            "approver",
        ),
    ),
    whyItMatters: Text.annotate(
        field(
            "What changes for the product with each answer, as the approver reads it under the question.",
            "approver",
        ),
    ),
    recommended: Text.annotate(
        field(
            "The answer you recommend, which the plan follows until the approver says otherwise; the approver reads it under the question.",
            "approver",
        ),
    ),
    blocker: Schema.optionalKey(
        Schema.Boolean.annotate(
            field(
                "True only for a choice the shared rules name a blocker: the repair stops until it is answered; in any other stage it is taken at its recommendation.",
                "operator",
            ),
        ),
    ),
}).annotate(about("Something only the approver can decide about the product, with a recommended answer."));

const ChangedFile = Schema.Struct({
    id: idOf(idPrefix.ChangedFile),
    path: RepoPath,
    action: Schema.Literals(["add", "modify", "delete", "generate"]).annotate(
        field(
            "add and modify give the whole new file under the stage's files/ folder; delete gives none; generate gives none either: the file is one the codebase's tools write (a lockfile, a migration, a route tree), and the build writes it by running the command.",
            "engineer",
        ),
    ),
    command: Schema.optionalKey(
        Schema.String.annotate(
            field(
                "Only for generate, and required there: the shell command that writes the file, as the layer's AGENTS.md says to run it. The build runs it from the folder of the file's layer, after the plan's files are applied.",
                "engineer",
            ),
        ),
    ),
    steps: Schema.NonEmptyArray(Schema.String).annotate(field("The ids of the path steps this file serves.", "agent")),
    keeps: Schema.optionalKey(
        Schema.Array(Schema.String).annotate(
            field("The ids of the invariants at risk this change keeps from breaking.", "agent"),
        ),
    ),
    reason: Text.annotate(
        field(
            "Why this file changes, in one sentence an engineer can check against the file: the code's own words are fine, record ids are not. The engineer reads it above the file's diff.",
            "engineer",
        ),
    ),
}).annotate(about("One file the plan adds, modifies or deletes."));

const DesignDecision = Schema.Struct({
    id: idOf(idPrefix.DesignDecision),
    about: Schema.NonEmptyArray(Schema.String).annotate(
        field("The ids of the path steps or criteria this decision shapes.", "agent"),
    ),
    decision: Text.annotate(
        field(
            "What the plan chose, as the approver reads it above the files it shapes: about the product or the design system, in its words, never an id.",
            "approver",
        ),
    ),
    instead: Text.annotate(
        field(
            "The alternative a reasonable engineer or designer would otherwise have taken, in the same words; a decision with no such alternative is not a decision.",
            "approver",
        ),
    ),
    because: Text.annotate(
        field(
            "The reason this choice beats the alternative here, from the criteria, the layers' rules or the load.",
            "approver",
        ),
    ),
    costs: Text.annotate(
        field(
            "What the plan accepts by choosing it: what gets harder, bigger or slower, so the approver can weigh it.",
            "approver",
        ),
    ),
}).annotate(
    about(
        "One design choice that shapes the files, with the alternative rejected and its cost: for a build a choice of layer, seam, contract, failure handling or load; for a design a choice of reuse, token, accessible pattern or variants.",
    ),
);

const PlanView = Schema.Struct({
    id: idOf(idPrefix.PlanView),
    about: Schema.NonEmptyArray(Schema.String).annotate(
        field("The ids of the criteria, path steps or design decisions this diagram explains.", "agent"),
    ),
    title: Text.annotate(
        field(
            "What the diagram settles, as the heading a reader sees above it: a question or a name in the reader's own words.",
            "approver",
        ),
    ),
    reader: Schema.Literals(["approver", "engineer"]).annotate(
        field(
            "Who reads the diagram: the approver, in the product's words and with no code name, or the engineer, in the code's own.",
            "agent",
        ),
    ),
    source: Text.annotate(
        field(
            "The diagram as plain text in Mermaid's syntax, with every fact of the story it must account for on it.",
            "approver",
        ),
    ),
}).annotate(
    about(
        "One diagram of the design the story implies, drawn where a decision needs the whole to be seen: how the parts relate, what happens in what order, what is kept, how a person moves through it, or where a boundary lies.",
    ),
);

const TestSupportFile = Schema.Struct({
    id: idOf(idPrefix.TestSupportFile),
    path: RepoPath,
    reason: Text.annotate(
        field(
            "What the tests need this file for, in one sentence an engineer can check; the engineer reads it above the file.",
            "engineer",
        ),
    ),
}).annotate(
    about(
        "A file in a layer that proves that no test record names, such as the layer's configuration or a helper, with why the tests need it.",
    ),
);

const LoadThreshold = Schema.Struct({
    id: idOf(idPrefix.LoadThreshold),
    ac: AcId,
    file: RepoPath.annotate(
        field("The scenario that holds this limit, in the load layer, under the stage's files/ folder.", "engineer"),
    ),
    metric: Text.annotate(field("The metric's name, as the load layer reports it.", "engineer")),
    limit: Schema.Number.annotate(field("The limit the metric must stay within.", "engineer")),
    source: Schema.Literals(["story", "layerDefault"]).annotate(
        field("Where the limit comes from: the work item, or the load layer's default.", "engineer"),
    ),
    quote: Schema.optionalKey(Text.annotate(field("The work item's words that set the limit.", "quote"))),
    outcome: Text.annotate(
        field(
            "What holding the limit means, as the approver reads it beside the criterion: in the product's words and the work item's units, such as '95 of every 100 answers arrive within 300 ms'.",
            "approver",
        ),
    ),
})
    .check(
        Schema.makeFilter(
            (threshold) =>
                threshold.source !== "story" ||
                threshold.quote !== undefined ||
                "a limit from the story quotes the story",
        ),
    )
    .annotate(about("A load limit an acceptance criterion must hold."));

const Finding = Schema.Struct({
    id: idOf(idPrefix.Finding),
    about: Schema.NonEmptyArray(Text).annotate(
        field(
            "What it is about: record ids from the plan, or file paths on the branch for a change review; a defect goes back to the agent that owns them.",
            "agent",
        ),
    ),
    weight: Schema.Literals(["note", "defect", "security"]).annotate(
        field(
            "note: for the engineers and the change reviewer, worth checking when the change is built, never shown to the approver. defect: its owner fixes it before the review passes. security: stops the run, and an engineer must look at it.",
            "agent",
        ),
    ),
    says: Text.annotate(
        field(
            "What is wrong, in one sentence an engineer can check; the engineer reads it in the review's findings.",
            "engineer",
        ),
    ),
    evidence: Schema.NonEmptyArray(Text).annotate(
        field("Where it shows: file:line, or the criterion it breaks.", "engineer"),
    ),
    fix: Text.annotate(field("The exact change that closes it.", "engineer")),
}).annotate(about("One finding of a review."));

const Deviation = Schema.Struct({
    id: idOf(idPrefix.Deviation),
    file: RepoPath,
    planSaid: Text.annotate(field("What the approved plan said for this file.", "engineer")),
    codeRevealed: Text.annotate(
        field("What the code or the failing check showed that the plan did not expect.", "engineer"),
    ),
    choice: Text.annotate(field("What was done instead, and why it keeps the plan's intent.", "engineer")),
}).annotate(about("One place where the branch differs from the approved plan; the engineer reads it on the evidence."));

const SkillProblem = Schema.Struct({
    id: idOf(idPrefix.SkillProblem),
    says: Text.annotate(
        field(
            "What is wrong with shape-and-deliver itself, its scripts, checks or rules, and what it stopped you doing, in one sentence the operator can act on.",
            "operator",
        ),
    ),
}).annotate(
    about(
        "A problem with shape-and-deliver itself, for the operator; never a question for the approver or a finding about the plan. It does not stop the stage.",
    ),
);

/** Every record type an agent may write, by name. */
export const recordTypes = {
    EntityTouched,
    InvariantAtRisk,
    JourneyAffected,
    SeamCrossed,
    PathStep,
    Question,
    ChangedFile,
    DesignDecision,
    PlanView,
    AcceptanceTest,
    LoadThreshold,
    Finding,
    Deviation,
    TestSupportFile,
    SkillProblem,
} as const;

export type RecordName = keyof typeof recordTypes;

/** Every record type's name, in the order `recordTypes` lists them. */
export const recordNames = Object.keys(recordTypes) as RecordName[];

/**
 * Builds the schema of a record as stored: the type's properties with a required id.
 * @param schema the record type's schema
 * @param schema.fields its properties
 * @returns the stored record's schema
 */
export const storedOf = <F extends Schema.Struct.Fields>(schema: { readonly fields: F }) => {
    const { id: _optional, ...properties } = schema.fields;
    return Schema.Struct({ ...properties, id: Text });
};
