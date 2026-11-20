import { Schema } from "effect";

/*
 * The one record a picture of a system is written as, for the system as it is and for the one to be built. The writer
 * decides what to draw, how to group it and what to call each box and arrow; nothing here names a technology, a place
 * something runs or a kind of relation. The scripts draw it as written and refuse only what is not well formed.
 */

const Text = Schema.String.check(Schema.isMinLength(1));

const person = (description: string) => ({ description, readBy: "person" as const });

/** What a view answers: what the system does, what it is made of, or where its parts run. */
const Viewpoint = Schema.Literals(["functional", "technical", "deployment"]).annotate({
    description:
        "`functional` answers what the system does for its people and how that is divided; `technical` what it is made of and how the parts work together; `deployment` where each part runs and what it needs to run, written only when that is known.",
});

const Box = Schema.Struct({
    id: Text.annotate({ description: "A short name for the box, unique within the view; arrows and groups refer to it." }),
    label: Text.annotate(person("What the box is called, as its people would say it.")),
    note: Schema.optionalKey(
        Text.annotate(person("One or two sentences on what the box is or does; shown when the box is opened.")),
    ),
    group: Schema.optionalKey(
        Text.annotate({
            description: "The id of another box of this view that holds this one, drawn as a frame around its members.",
        }),
    ),
    cites: Schema.optionalKey(
        Schema.Array(Text).annotate({
            description: "The ids of the records the box rests on, when it rests on any; opened from the box.",
        }),
    ),
}).annotate({ description: "One box of a view." });

const Arrow = Schema.Struct({
    from: Text.annotate({ description: "The id of the box the arrow starts at." }),
    to: Text.annotate({ description: "The id of the box the arrow reaches." }),
    label: Schema.optionalKey(Text.annotate(person("What the arrow means, in a word or a few; never a count."))),
}).annotate({ description: "One arrow between two boxes of a view." });

/** The fields of a view, without an id, so a record can carry its own id beside them. */
export const viewFields = {
    viewpoint: Viewpoint,
    title: Text.annotate(person("The question the view answers, in the reader's words, as a question.")),
    caption: Text.annotate(
        person("What to take from the picture, in one or two plain sentences. It states no count: the page counts."),
    ),
    boxes: Schema.Array(Box).annotate({ description: "The boxes of the view." }),
    arrows: Schema.Array(Arrow).annotate({ description: "The arrows between the boxes." }),
} as const;

export const ViewBody = Schema.Struct(viewFields).annotate({
    description:
        "A picture of the system the reader needs to understand it: the question it answers, what to take from it, its boxes (nested through `group`) and the arrows between them.",
});

export type ViewBody = typeof ViewBody.Type;
