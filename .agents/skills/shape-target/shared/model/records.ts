import { Schema } from "effect";
import { about, ActionId, Actions, EntityId, ExternalId, RuleId, StepId, TaskId, Text } from "./fields";
import { runsOnIds, runsOnMeanings } from "./runs-on";

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
    title: Schema.optionalKey(
        Schema.String.annotate(about("The task's name as the analysis wrote it, kept as it is.")),
    ),
    capability: Schema.optionalKey(
        Schema.String.annotate(about("The capability the task belongs to, as the analysis wrote it, kept as it is.")),
    ),
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
        keeps: Schema.Array(RuleId).annotate(
            about(
                "The ids of the rules this step applies as they are today; with the rules in `changes`, exactly the rules it honours.",
            ),
        ),
    },
    new: { reason: Text.annotate(about("Why a step with no legacy counterpart is needed.")) },
}).annotate(about("How a step relates to the legacy: made from entry points, or new."));

export const RuleChange = Schema.Struct({
    rule: RuleId.annotate(about("The id of a rule the step honours.")),
    to: Text.annotate(about("What the rule does now, in one plain sentence.")),
}).annotate(about("A rule a step keeps applying but with a new behaviour."));

export const Step = Schema.Struct({
    intent: Text.annotate(
        about("What the person is trying to get done, in the words of the business; no controls, pages or commands."),
    ),
    system: Text.annotate(about("What the system does in response, with no mechanism and no medium.")),
    confidence: Confidence,
    touches: Schema.Array(EntityId).annotate(about("The ids of the kinds of data the step reads or changes.")),
    honours: Schema.Array(RuleId).annotate(about("The ids of the rules the system applies in this step.")),
    changes: Schema.optionalKey(
        Schema.Array(RuleChange).annotate(
            about(
                "The rules this step applies differently from today, each with what it does now; none when it changes none.",
            ),
        ),
    ),
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

const containerFields = {
    name: Text,
    kind: ContainerKind,
    tech: Text.annotate(about("A phrase quoted from the Target Stack naming what it is built with.")),
    holds: Schema.Array(Text).annotate(
        about(
            "The names of the domains it holds; for a `store`, the domains whose data it keeps, which are also held by the part that runs them. Every part but a store holds at least one domain.",
        ),
    ),
};
const does = Text.annotate(about("What the part does for the people who use the system, in one plain sentence."));
const runsOnAbout = about(`Where the part runs, one of: ${runsOnMeanings}.`);

/** A part as a variant proposes it: what it does and where it runs are required. */
export const Container = Schema.Struct({
    ...containerFields,
    does,
    runsOn: Schema.Literals(runsOnIds).annotate(runsOnAbout),
}).annotate(about("A part of the system that is built and run as one."));

/** A part as it is read back: proposals made before `does` and `runsOn` existed have neither. */
export const ContainerRecord = Schema.Struct({
    ...containerFields,
    does: Schema.optionalKey(does),
    runsOn: Schema.optionalKey(Schema.String.annotate(runsOnAbout)),
}).annotate(about("A part of the system that is built and run as one."));

export const Integration = Schema.Struct({
    need: ExternalId.annotate(about("The id of the outside system.")),
    domain: Text.annotate(about("The name of the domain that owns the adapter.")),
    how: Text.annotate(about("How the target reaches it, in one sentence.")),
}).annotate(about("How one outside system is reached in the target."));

export const componentKinds = ["rules", "adapter", "data", "flow", "interface"] as const;

export const ComponentKind = Schema.Literals(componentKinds).annotate(
    about(
        "What kind of job it does, which tells the plan where it is built: `rules` (decides the domain's rules), `adapter` (reaches one outside system; it has `adapts`), `data` (keeps and reads the domain's data), `flow` (carries a step from start to end, calling the others) or `interface` (where a person or another system takes part in a step; it serves at least one).",
    ),
);

const componentFields = {
    name: Text.annotate(about("The component's name, unique in the architecture.")),
    domain: Text,
    responsibility: Text,
    module: Text.annotate(about("A kebab-case module name; the plan decides the folder.")),
    uses: Schema.Array(Text).annotate(about("The names of the components it calls.")),
    serves: Schema.Array(StepId).annotate(about("The ids of the journey steps it carries out.")),
    enforces: Schema.Array(RuleId).annotate(about("The ids of the rules it enforces.")),
    adapts: Schema.optionalKey(ExternalId.annotate(about("The id of the outside system it adapts."))),
    platform: Schema.optionalKey(Text.annotate(about("Why it exists although it serves no step, such as sign-in."))),
};

/** A component as a job proposes it: its kind is required. */
export const Component = Schema.Struct({ ...componentFields, kind: ComponentKind }).annotate(
    about("A part of a container that does one job for a domain."),
);

/** A component as it is read back: components written before kinds existed have none. */
export const ComponentRecord = Schema.Struct({ ...componentFields, kind: Schema.optionalKey(ComponentKind) }).annotate(
    about("A part of a container that does one job for a domain."),
);

export const RiskKind = Schema.Literals(["accepted", "question"]).annotate(
    about("accepted: the variant takes the risk on; question: something the person must settle before it is built."),
);

export const Risk = Schema.Struct({
    statement: Text.annotate(about("What can go wrong, in one plain sentence.")),
    kind: RiskKind,
    cites: Schema.Array(Text)
        .check(Schema.isMinLength(1))
        .annotate(about("The names of the domains, containers or components the risk is about; at least one.")),
    containedBy: Schema.optionalKey(
        Text.annotate(about("The name of the container or component that limits the damage, when one does.")),
    ),
}).annotate(about("One risk a variant carries, tied to the parts it is about."));

const architectureFields = {
    name: Text,
    idea: Text,
    tradeoff: Text.annotate(about("What the variant costs that the others do not, in one sentence.")),
    recommended: Schema.optionalKey(
        Text.annotate(about("Why this is the recommended variant; leave out on the others.")),
    ),
    integrations: Schema.Array(Integration),
    domains: Schema.Array(Domain).check(Schema.isMinLength(1)),
};

/** A variant as the writer proposes it. */
export const Architecture = Schema.Struct({
    ...architectureFields,
    components: Schema.optionalKey(Schema.Array(Component)),
    risks: Schema.Array(Risk).check(Schema.isMinLength(1)),
    containers: Schema.Array(Container).check(Schema.isMinLength(1)),
}).annotate(about("One way of building the target: domains, containers, and once chosen, components."));

/**
 * A variant as it is read back. Proposals made before risks were structured hold each risk as a plain sentence, and
 * their parts have no `does` or `runsOn`; `risksOf` reads both kinds of risk alike.
 */
export const ArchitectureRecord = Schema.Struct({
    ...architectureFields,
    components: Schema.optionalKey(Schema.Array(ComponentRecord)),
    risks: Schema.Array(Schema.Union([Text, Risk])),
    containers: Schema.Array(ContainerRecord).check(Schema.isMinLength(1)),
}).annotate(about("One way of building the target: domains, containers, and once chosen, components."));

export const Score = Schema.Struct({
    steps: Schema.Int,
    stepsServed: Schema.Int,
    rules: Schema.Int,
    rulesAssigned: Schema.Int,
    idleDomains: Schema.Array(Text),
}).annotate(about("What a variant scores at domain level against the chosen journeys; derived, never written."));

export const StoredArchitecture = Schema.Struct({ ...ArchitectureRecord.fields, score: Score });

export const Mark = Schema.Struct({
    of: Text.annotate(about("A step of a task's current journey, as `<task id>#<number>`.")),
    verdict: Schema.Literals(["hurts", "unused", "correct", "wrong"]),
    note: Schema.optionalKey(Text),
});

export const Dispute = Schema.Struct({
    job: Text.annotate(about("The job whose review raised it.")),
    record: Schema.Int.annotate(about("The position of the challenged record in the job's output, from 0.")),
    variant: Schema.String.annotate(
        about(
            "What was challenged: a journey's id (`<task>:<name slug>`), an architecture's name, or a component's name; empty when the record no longer exists.",
        ),
    ),
    says: Text.annotate(about("What the reviewer says is wrong, in one sentence.")),
}).annotate(about("A challenge that survived the one fix a job gets, kept for the person to see before choosing."));

export const Choice = Schema.Struct({
    decision: Schema.Literals(["as-is", "journeys", "architecture", "components"]),
    picks: Schema.Array(
        Schema.Struct({
            of: Text,
            variant: Text,
            id: Schema.optionalKey(Text.annotate(about("The chosen journey's id, for a journeys decision."))),
        }),
    ),
    reason: Text,
    confirmedAt: Text,
    marks: Schema.optionalKey(Schema.Array(Mark)),
    subject: Schema.optionalKey(
        Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/)).annotate(
            about(
                "The sha256 of the file the decision was made about, as confirmed; a copy of that file is kept in `target/confirmed/<decision>.json`.",
            ),
        ),
    ),
    acceptedDisputes: Schema.optionalKey(
        Schema.Array(Dispute).annotate(
            about("The challenges still open on the chosen variants that the person saw and accepted when confirming."),
        ),
    ),
}).annotate(
    about(
        "What the person decided, with the reason; the decision is confirmed while the file it decides on still has the hash it recorded (one recorded without a hash: while it is not older than that file), and the decision before it is confirmed and was confirmed no later than this one.",
    ),
);

export type CurrentStep = typeof CurrentStep.Type;
export type Task = typeof Task.Type;
export type Step = typeof Step.Type;
export type Drop = typeof Drop.Type;
export type Journey = typeof Journey.Type;
export type StoredJourney = typeof StoredJourney.Type;
export type Domain = typeof Domain.Type;
export type Container = typeof Container.Type;
export type Component = typeof Component.Type;
export type Architecture = typeof Architecture.Type;
export type ArchitectureRecord = typeof ArchitectureRecord.Type;
export type Risk = typeof Risk.Type;
export type Dispute = typeof Dispute.Type;
export type StoredArchitecture = typeof StoredArchitecture.Type;
export type Choice = typeof Choice.Type;
export type Mark = typeof Mark.Type;
