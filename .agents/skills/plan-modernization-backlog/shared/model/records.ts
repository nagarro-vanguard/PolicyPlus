import { Schema } from "effect";
import { about, ActionId, Count, DecisionId, LayerId, Text } from "./fields";
import { Ref } from "./refs";

export const LayerRole = Schema.Literals([
    "contracts",
    "rules",
    "data",
    "service",
    "ui-kit",
    "screens",
    "e2e",
    "tooling",
]);

export const TargetLayer = Schema.Struct({
    id: LayerId,
    name: Text.annotate(about("The layer's name in plain words, unique in the plan.")),
    path: Text.annotate(about("The layer's folder, relative to the target codebase's root.")),
    kind: Schema.Literals(["code", "test"]).annotate(
        about("`test` for a layer whose tests drive the running product and are committed first; `code` otherwise."),
    ),
    purpose: Text.annotate(about("What the layer holds, in one clause.")),
    carries: Schema.Array(Count).annotate(about("The numbers of the target stack lines this layer carries, from 1.")),
    check: Text.annotate(about("The command that verifies the layer, run from its folder.")),
    dependsOn: Schema.Array(LayerId).annotate(about("The layers this one may reach.")),
    role: Schema.optionalKey(
        LayerRole.annotate(
            about(
                "What the layer is for, from a closed list: contracts, rules (the business rules), data (data access), service (what runs logic and reaches outside systems), ui-kit (shared interface pieces), screens (what people use), e2e (tests of the running product), tooling. A component is built in the layer whose role its kind needs.",
            ),
        ),
    ),
    container: Schema.optionalKey(
        Text.annotate(about("The name of the part of the chosen architecture this layer builds, when it builds one.")),
    ),
}).annotate(about("One layer of the target codebase, as its root AGENTS.md lists it."));

export const Topic = Schema.TaggedUnion({
    convention: {},
    integration: { system: Text },
    scope: { capability: Text },
    note: { number: Count },
    area: { name: Text },
}).annotate(
    about(
        "What a decision is about: one line of a layer's AGENTS.md, an outside system, whether a capability is carried, replaced or dropped, one of the person's notes, or a free-named area such as libraries.",
    ),
);

export const Decision = Schema.Struct({
    id: DecisionId,
    topic: Topic,
    layer: Schema.Union([LayerId, Schema.Literal("workspace")]).annotate(
        about("The layer the decision governs, or `workspace` when it governs them all."),
    ),
    chose: Text.annotate(about("What was chosen; for a convention, the AGENTS.md line itself.")),
    reason: Text.annotate(about("Why, as the trade-off: what was chosen over what, and any assumption it rests on.")),
}).annotate(about("One decision and the trade-off behind it."));

export const Term = Schema.Struct({
    name: Text.annotate(about("The term, in the product's words.")),
    means: Text.annotate(
        about("The sentence its definition will carry: what it is and the nearest meaning it is not."),
    ),
    entity: Schema.optionalKey(Text.annotate(about("The analysis's kind of data it defines, when it defines one."))),
}).annotate(about("A business word the story introduces."));

export const Criterion = Schema.Struct({
    says: Text.annotate(about("One observable behaviour: given the state, when someone acts, then what they see.")),
    from: Schema.Array(Ref).annotate(about("What it rests on; a criterion may group related rules.")),
}).annotate(about("One acceptance criterion."));

export const Story = Schema.Struct({
    title: Text.annotate(about("A plain imperative of 72 characters or fewer, no type prefix.")),
    what: Text.annotate(
        about(
            "One complete sentence: what the story delivers, the capability wanted or the goal of a technical story.",
        ),
    ),
    why: Text.annotate(
        about(
            "One complete sentence: the outcome it serves, the reason for the capability or the problem a technical story solves.",
        ),
    ),
    actions: Schema.Array(ActionId).annotate(
        about("The legacy entry points this story ports; empty for a technical story."),
    ),
    terms: Schema.Array(Term),
    journey: Schema.optionalKey(
        Schema.Struct({
            name: Text.annotate(about("The journey's name in the product owner's words.")),
            steps: Schema.NonEmptyArray(Text).annotate(about("The steps as a person lives them, one each.")),
        }).annotate(about("The journey the story adds; only when a person starts the work.")),
    ),
    criteria: Schema.NonEmptyArray(Criterion),
    steps: Schema.optionalKey(
        Schema.Array(Text).annotate(
            about("The ids of the target journey steps this story delivers; for a story of a confirmed target only."),
        ),
    ),
    components: Schema.optionalKey(
        Schema.Array(Text).annotate(
            about("The names of the target components this story builds; for a story of a confirmed target only."),
        ),
    ),
    open: Schema.optionalKey(
        Schema.Array(Text).annotate(
            about(
                "What the decisions and the rules leave unsettled for this story, one question each, so the person can answer it; never invent the behaviour instead.",
            ),
        ),
    ),
}).annotate(about("One unit of work, written for its reader."));

export type TargetLayer = typeof TargetLayer.Type;
export type LayerRole = typeof LayerRole.Type;
export type Topic = typeof Topic.Type;
export type Decision = typeof Decision.Type;
export type Story = typeof Story.Type;
export type Criterion = typeof Criterion.Type;
