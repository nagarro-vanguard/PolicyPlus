import { Schema } from "effect";
import { about, Count, StoryKey, Text } from "./fields";

const Place = Schema.Struct({ file: Text, firstLine: Count, lastLine: Count });

export const AttachmentHeader = Schema.Struct({
    story: StoryKey,
    fingerprint: Text.annotate(about("The fingerprint of the analysis the header was made from.")),
    criteria: Schema.Array(
        Schema.Struct({
            ac: Text.annotate(
                about("AC-1, AC-2 and so on, numbered in the order the work item body lists the criteria."),
            ),
            rules: Schema.Array(
                Schema.Struct({
                    says: Text,
                    where: Place,
                    doubt: Schema.String.annotate(
                        about("The reviewer's words when the rule was disputed; empty otherwise."),
                    ),
                }),
            ),
        }),
    ).annotate(about("Each criterion with the legacy rules it backs.")),
    reliesOn: Schema.Array(Schema.Struct({ says: Text, builtBy: Text })).annotate(
        about("Rules another story builds, with that story's title."),
    ),
    data: Schema.Array(Schema.Struct({ kind: Text, access: Text })),
    transitions: Schema.Array(Schema.Struct({ entity: Text, from: Text, to: Text, where: Place })),
    outsideSystems: Schema.Array(Text),
    steps: Schema.optionalKey(
        Schema.Array(
            Schema.Struct({
                intent: Text,
                change: Text,
                reason: Text,
                system: Schema.optionalKey(Text.annotate(about("What the system does in the step, as confirmed."))),
                changes: Schema.optionalKey(
                    Schema.Array(Schema.Struct({ rule: Text, says: Schema.String, to: Text })).annotate(
                        about(
                            "The legacy rules the step applies differently: the rule, what it says today, and what it does now.",
                        ),
                    ),
                ),
            }),
        ).annotate(
            about(
                "The target journey's steps this story delivers, with how each differs from today and why, what the system does now, and the rules it changes.",
            ),
        ),
    ),
    components: Schema.optionalKey(
        Schema.Array(Schema.Struct({ name: Text, module: Text, layer: Schema.String })).annotate(
            about("The components this story builds, with their module and the folder of the layer that holds them."),
        ),
    ),
    cited: Schema.Array(Place).annotate(
        about("Every place the header names; each must lie in the attached bundle's read order."),
    ),
}).annotate(about("The typed front of a story's attachment, written from the analysis payloads."));

export type AttachmentHeader = typeof AttachmentHeader.Type;
