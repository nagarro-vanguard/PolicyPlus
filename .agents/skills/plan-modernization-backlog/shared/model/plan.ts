import { Schema } from "effect";
import { about, ActionId, Count, RuleId, StoryKey, Text } from "./fields";
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
}).annotate(about("A story as the plan carries it, with everything derived from the records."));

export const Epic = Schema.Struct({
    key: Text,
    kind: Schema.Literals(["functional", "technical"]),
    title: Text,
    outcome: Text,
    area: Schema.optionalKey(Text),
    capability: Schema.optionalKey(Text),
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

export const Plan = Schema.Struct({
    analysis: Schema.Struct({ root: Text, fingerprint: Text }).annotate(about("The analysis the plan was made from.")),
    layers: Schema.Array(TargetLayer),
    decisions: Schema.Array(Decision),
    epics: Schema.Array(Epic),
    phases: Schema.Array(Phase),
    stories: Schema.Array(StoryView),
    coverage: Coverage,
}).annotate(about("The strictly ordered, phase-wise modernization backlog."));

export type StoryView = typeof StoryView.Type;
export type Epic = typeof Epic.Type;
export type Phase = typeof Phase.Type;
export type Coverage = typeof Coverage.Type;
export type Plan = typeof Plan.Type;
