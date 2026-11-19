import { Schema } from "effect";
import { about, ActionId, Count, LayerId, RuleId, StoryKey, Text } from "./fields";
import { Decision, Story, TargetLayer } from "./records";

export const Tag = Schema.Literals(["epic", "story", "functional", "technical", "modernize"]);

export const StoryView = Schema.Struct({
    ...Story.fields,
    key: StoryKey.annotate(about("The story's stable key: a signature of what it builds.")),
    sequence: Count.annotate(about("The story's place in the one strict order, from 1; unique.")),
    phase: Count.annotate(
        about("The phase it belongs to: 0 scaffold, 1 foundation, 2 shared rules, 3 and later capabilities."),
    ),
    epic: Text.annotate(about("The key of its epic.")),
    kind: Schema.Literals(["functional", "technical"]).annotate(about("Functional when it ports legacy actions.")),
    builder: Schema.Literals(["shape-and-deliver", "scaffold-codebase"]).annotate(about("The skill that delivers it.")),
    tags: Schema.Array(Tag).annotate(about("The tags the work item carries.")),
    blockedBy: Schema.Array(StoryKey).annotate(about("The stories that must be merged first.")),
    builds: Schema.Array(RuleId).annotate(about("The legacy rules it builds, each exactly once across the plan.")),
    reliesOn: Schema.Array(Schema.Struct({ rule: RuleId, builtBy: StoryKey })).annotate(
        about("The legacy rules it needs that another story builds."),
    ),
    capability: Schema.optionalKey(Text),
    surface: Schema.optionalKey(Text),
    layers: Schema.optionalKey(
        Schema.Array(LayerId).annotate(
            about(
                "The layers of the target codebase the story is built in, derived: the scaffold in every layer, an acceptance story in the test layer, a foundation story in the layers it and its decisions name, a component in the layer whose role its kind needs; empty when nothing says.",
            ),
        ),
    ),
    part: Schema.optionalKey(
        Text.annotate(about("For a piece of a story split by component: the component the piece builds.")),
    ),
    splitFrom: Schema.optionalKey(
        Text.annotate(about("For a piece of a story split by component: the title of the story it was split from.")),
    ),
}).annotate(about("A story as the plan carries it, with everything derived from the records."));

export const Epic = Schema.Struct({
    key: Text,
    kind: Schema.Literals(["functional", "technical"]),
    title: Text,
    outcome: Text,
    area: Schema.optionalKey(Text),
    capability: Schema.optionalKey(Text),
    task: Schema.optionalKey(Text.annotate(about("The id of the target task whose journey this epic delivers."))),
    comesAfter: Schema.Array(Text).annotate(about("The epics that must be done first.")),
    stories: Schema.Array(StoryKey),
    sequence: Count,
}).annotate(about("A capability, or an area of technical work, with its stories."));

export const Phase = Schema.Struct({
    number: Count,
    name: Text,
    why: Text,
    stories: Schema.Array(StoryKey).annotate(about("In sequence order; unordered among themselves by dependency.")),
}).annotate(about("A band of stories that need only earlier phases."));

export const Coverage = Schema.Struct({
    capabilities: Schema.Array(
        Schema.Struct({
            name: Text,
            scope: Schema.Literals(["carry", "replace", "drop"]),
            surfaces: Schema.Array(
                Schema.Struct({
                    name: Text,
                    actions: Schema.Array(Schema.Struct({ id: ActionId, name: Text, story: Schema.NullOr(StoryKey) })),
                }),
            ),
        }),
    ),
    rulesBuilt: Count,
    rulesTotal: Count,
    unplanned: Schema.Array(Schema.Struct({ what: Text, file: Text, firstLine: Count, lastLine: Count })).annotate(
        about("Code nothing the analysis could follow reaches, listed so its omission is visible."),
    ),
}).annotate(about("What the plan covers of the analysis, so nothing is missed in silence."));

const Sha = Text.annotate(about("A hex sha256."));

export const BuiltFrom = Schema.Struct({
    analysis: Sha.annotate(about("The fingerprint of the analysis's payloads, the same as `analysis.fingerprint`.")),
    decisions: Schema.optionalKey(
        Schema.Struct({ "as-is": Sha, journeys: Sha, architecture: Sha, components: Sha }).annotate(
            about(
                "For a plan made from a confirmed target: the hash of what each decision was made about, the `subject` its record kept, or the file's own hash for a record made before subjects were kept.",
            ),
        ),
    ),
}).annotate(
    about(
        "What the plan was built from. The plan is out of date when any of these differs from what holds now; `plan.ts status` compares them.",
    ),
);

export const Conflict = Schema.Struct({
    stage: Text.annotate(
        about(
            "Where the challenge was raised: a shape-target decision (`as-is`, `journeys`, `architecture`, `components`) or a stage of this plan (`foundation`, `stories`).",
        ),
    ),
    job: Text.annotate(about("The job whose review raised it.")),
    record: Schema.Int.annotate(
        about("The position of the challenged record in the job's output, from 0; -1 when unknown."),
    ),
    variant: Schema.String.annotate(
        about(
            "What was challenged: a journey's id, an architecture's or a component's name, or the key of the story, the id of the layer or the decision the record became; empty when it no longer exists.",
        ),
    ),
    says: Text.annotate(about("What the reviewer says is wrong, in one sentence.")),
    resolved: Schema.Boolean.annotate(
        about(
            "True when the person settled it: they accepted it when confirming, or chose another variant than the one it is about. A challenge of this plan's own reviews is never settled by the plan.",
        ),
    ),
}).annotate(about("A reviewer's challenge that survived the one fix its job gets."));

export const Plan = Schema.Struct({
    analysis: Schema.Struct({ root: Text, fingerprint: Text }).annotate(about("The analysis the plan was made from.")),
    builtFrom: Schema.optionalKey(BuiltFrom),
    layers: Schema.Array(TargetLayer),
    decisions: Schema.Array(Decision),
    epics: Schema.Array(Epic),
    phases: Schema.Array(Phase),
    stories: Schema.Array(StoryView),
    coverage: Coverage,
    conflicts: Schema.optionalKey(
        Schema.Array(Conflict).annotate(
            about(
                "The challenges that survived review, from the target's decisions and this plan's own stages, for the person to see.",
            ),
        ),
    ),
}).annotate(about("The strictly ordered, phase-wise modernization backlog."));

export type StoryView = typeof StoryView.Type;
export type Epic = typeof Epic.Type;
export type Phase = typeof Phase.Type;
export type Coverage = typeof Coverage.Type;
export type Plan = typeof Plan.Type;
export type BuiltFrom = typeof BuiltFrom.Type;
export type Conflict = typeof Conflict.Type;
