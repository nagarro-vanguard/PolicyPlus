import { Schema } from "effect";
import { about, ActionId, Actions, EntityId, ExternalId, RuleId, StepId, TaskId, Text } from "./fields";

const Confidence = Schema.Literals(["sure", "inferred"]).annotate(
    about("sure when the code states it, inferred when it was concluded from the code."),
);

export const CurrentStep = Schema.Struct({
    intent: Text.annotate(about("What the person is trying to get done in this step, in the words of the business.")),
    system: Text.annotate(about("What the system does in response.")),
    from: Actions.annotate(about("The legacy entry points that make up this step.")),
    confidence: Confidence,
}).annotate(about("One step of how a task is done today."));

export const Task = Schema.Struct({
    id: Text.annotate(about("A short kebab-case name for the task, unique within the job's tasks.")),
    outcome: Text.annotate(
        about("What the person gets done, one sentence in the business's words, naming no control, page or medium."),
    ),
    actor: Text.annotate(about("Who does it: a role of the business, or 'person' when nothing says more.")),
    actions: Actions.annotate(about("Every legacy entry point the task is made of; each belongs to exactly one task.")),
    rules: Schema.Array(RuleId).annotate(about("The ids of the business rules decided by those entry points.")),
    facts: Schema.Array(EntityId).annotate(about("The ids of the kinds of data the task reads or changes.")),
    needs: Schema.Array(ExternalId).annotate(about("The ids of the outside systems the task reaches.")),
    current: Schema.Array(CurrentStep)
        .check(Schema.isMinLength(1))
        .annotate(about("How the task is done today, in order, each step citing its entry points.")),
}).annotate(about("A task people do with the system: an outcome, not a screen."));

export const Merge = Schema.Struct({
    keep: Text.annotate(about("The id of the task that stays.")),
    absorb: Schema.Array(Text)
        .check(Schema.isMinLength(1))
        .annotate(about("The ids of tasks that are the same task and join it.")),
}).annotate(about("Tasks written in different jobs that are one task."));

export const Change = Schema.Literals(["kept", "merged", "defaulted", "inferred", "deferred", "reordered", "split"]);

export const Link = Schema.TaggedUnion({
    legacy: {
        from: Actions.annotate(about("The legacy entry points this step replaces.")),
        change: Change.annotate(
            about(
                "How the step differs from today: kept as it is, merged, defaulted (the system fills it in), inferred (the system works it out), deferred (asked later), reordered or split.",
            ),
        ),
        reason: Text.annotate(about("Why the step is better this way, in one sentence.")),
        keeps: Schema.Array(RuleId).annotate(about("The ids of the rules this step must not break.")),
    },
    new: { reason: Text.annotate(about("Why a step with no legacy counterpart is needed.")) },
}).annotate(about("How a step relates to the legacy: made from entry points, or new."));

export const Step = Schema.Struct({
    intent: Text.annotate(
        about("What the person is trying to get done, in the words of the business; no controls, pages or commands."),
    ),
    system: Text.annotate(about("What the system does in response, with no mechanism and no medium.")),
    confidence: Confidence,
    touches: Schema.Array(EntityId).annotate(about("The ids of the kinds of data the step reads or changes.")),
    honours: Schema.Array(RuleId).annotate(about("The ids of the rules the system applies in this step.")),
    link: Link,
}).annotate(about("One step of a target journey."));

export const Drop = Schema.Struct({
    actions: Schema.Array(ActionId).annotate(about("The legacy entry points left out.")),
    rules: Schema.Array(RuleId).annotate(about("The rules left out with them.")),
    reason: Text.annotate(about("Why they are not carried.")),
}).annotate(about("What a variant leaves out, and why."));

export const Journey = Schema.Struct({
    task: Text.annotate(about("The id of the task this journey is a way of doing.")),
    actor: Text,
    name: Text.annotate(about("A short name for the variant, unique within the task.")),
    strategy: Text.annotate(
        about("The approach, such as 'task first', 'automate first' or 'guided', never a closeness to the legacy."),
    ),
    idea: Text.annotate(about("The idea of the variant in one sentence.")),
    tradeoff: Text.annotate(about("What the variant costs, in one sentence.")),
    recommended: Schema.optionalKey(
        Text.annotate(about("Why this is the recommended variant; leave out on the others.")),
    ),
    steps: Schema.Array(Step).check(Schema.isMinLength(1)),
    drops: Schema.Array(Drop),
}).annotate(about("One way of doing a task in the target, as steps."));

export const StoredStep = Schema.Struct({ ...Step.fields, id: StepId });
export const StoredJourney = Schema.Struct({
    ...Journey.fields,
    id: Text,
    task: TaskId,
    steps: Schema.Array(StoredStep),
    baseline: Schema.Boolean.annotate(about("True when the variant mirrors today's journey; derived, never written.")),
});

const Relation = Schema.Struct({ to: Text.annotate(about("The name of the fact it points to.")), how: Text });
export const Fact = Schema.Struct({
    name: Text.annotate(about("The fact's name in the words of the business.")),
    from: Schema.Array(EntityId)
        .check(Schema.isMinLength(1))
        .annotate(about("The ids of the legacy kinds of data it carries.")),
    keys: Schema.Array(Text).annotate(about("What identifies one of it.")),
    relates: Schema.Array(Relation),
}).annotate(about("A kind of data the target keeps."));

export const Domain = Schema.Struct({
    name: Text,
    concept: Text.annotate(about("The business concept the domain is named for.")),
    facts: Schema.Array(Fact),
    rules: Schema.Array(RuleId).annotate(about("The ids of the rules the domain decides.")),
    dependsOn: Schema.Array(Text).annotate(about("The names of the domains it relies on.")),
    why: Text,
}).annotate(about("A part of the business with its own data and rules."));

export const ContainerKind = Schema.Literals(["interface", "service", "job", "store", "library"]).annotate(
    about(
        "interface: what people or other systems use, in any medium; service: runs logic; job: runs on a schedule or in the background; store: holds data; library: shared code.",
    ),
);

export const Container = Schema.Struct({
    name: Text,
    kind: ContainerKind,
    tech: Text.annotate(about("A phrase quoted from the Target Stack naming what it is built with.")),
    holds: Schema.Array(Text).annotate(
        about(
            "The names of the domains it holds; for a `store`, the domains whose data it keeps, which are also held by the part that runs them. Every part but a store holds at least one domain.",
        ),
    ),
}).annotate(about("A part of the system that is built and run as one."));

export const Integration = Schema.Struct({
    need: ExternalId.annotate(about("The id of the outside system.")),
    domain: Text.annotate(about("The name of the domain that owns the adapter.")),
    how: Text.annotate(about("How the target reaches it, in one sentence.")),
}).annotate(about("How one outside system is reached in the target."));

export const Component = Schema.Struct({
    name: Text.annotate(about("The component's name, unique in the architecture.")),
    domain: Text,
    responsibility: Text,
    module: Text.annotate(about("A kebab-case module name; the plan decides the folder.")),
    uses: Schema.Array(Text).annotate(about("The names of the components it calls.")),
    serves: Schema.Array(StepId).annotate(about("The ids of the journey steps it carries out.")),
    enforces: Schema.Array(RuleId).annotate(about("The ids of the rules it enforces.")),
    adapts: Schema.optionalKey(ExternalId.annotate(about("The id of the outside system it adapts."))),
    platform: Schema.optionalKey(Text.annotate(about("Why it exists although it serves no step, such as sign-in."))),
}).annotate(about("A part of a container that does one job for a domain."));

export const Architecture = Schema.Struct({
    name: Text,
    idea: Text,
    risks: Schema.Array(Text).check(Schema.isMinLength(1)),
    tradeoff: Text,
    recommended: Schema.optionalKey(
        Text.annotate(about("Why this is the recommended variant; leave out on the others.")),
    ),
    integrations: Schema.Array(Integration),
    domains: Schema.Array(Domain).check(Schema.isMinLength(1)),
    containers: Schema.Array(Container).check(Schema.isMinLength(1)),
    components: Schema.optionalKey(Schema.Array(Component)),
}).annotate(about("One way of building the target: domains, containers, and once chosen, components."));

export const Score = Schema.Struct({
    steps: Schema.Int,
    stepsServed: Schema.Int,
    rules: Schema.Int,
    rulesAssigned: Schema.Int,
    idleDomains: Schema.Array(Text),
}).annotate(about("What a variant scores at domain level against the chosen journeys; derived, never written."));

export const StoredArchitecture = Schema.Struct({ ...Architecture.fields, score: Score });

export const Mark = Schema.Struct({
    of: Text.annotate(about("A step of a task's current journey, as `<task id>#<number>`.")),
    verdict: Schema.Literals(["hurts", "unused", "correct", "wrong"]),
    note: Schema.optionalKey(Text),
});

export const Choice = Schema.Struct({
    decision: Schema.Literals(["as-is", "journeys", "architecture", "components"]),
    picks: Schema.Array(Schema.Struct({ of: Text, variant: Text })),
    reason: Text,
    confirmedAt: Text,
    marks: Schema.optionalKey(Schema.Array(Mark)),
}).annotate(
    about(
        "What the person decided, with the reason; the decision is confirmed while the file is newer than what it decides on and not older than the decision before it.",
    ),
);

export type CurrentStep = typeof CurrentStep.Type;
export type Task = typeof Task.Type;
export type Merge = typeof Merge.Type;
export type Step = typeof Step.Type;
export type Journey = typeof Journey.Type;
export type StoredJourney = typeof StoredJourney.Type;
export type Domain = typeof Domain.Type;
export type Container = typeof Container.Type;
export type Component = typeof Component.Type;
export type Architecture = typeof Architecture.Type;
export type StoredArchitecture = typeof StoredArchitecture.Type;
export type Choice = typeof Choice.Type;
export type Mark = typeof Mark.Type;
