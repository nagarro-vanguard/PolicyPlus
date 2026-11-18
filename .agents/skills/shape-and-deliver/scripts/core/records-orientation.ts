import { Schema } from "effect";
import { isFilePathInside } from "./contained-path";
import { AcId, Text, about, field, idOf, idPrefix } from "./record-fields";

const KbFile = Text.check(
    Schema.makeFilter(
        (path: string) => isFilePathInside(path) || "a file inside the knowledge base folder, relative to it",
    ),
).annotate(field("A knowledge base file's path relative to the knowledge base folder.", "engineer"));

export const EntityTouched = Schema.Struct({
    id: idOf(idPrefix.EntityTouched),
    entity: Text.annotate(
        field(
            "The thing of the business the story touches, in the product's words, as the approver reads it on the plan; `-` when a criterion touches none.",
            "approver",
        ),
    ),
    how: Schema.Literals(["created", "changed", "read", "removed", "moves state", "touches none"]).annotate(
        field("What the story does to it; `touches none` for a criterion that touches no entity.", "approver"),
    ),
    states: Text.annotate(
        field(
            "Its states before and after, in the product's words, such as 'queued to cancelled'; `-` when its states do not change.",
            "approver",
        ),
    ),
    acs: Schema.NonEmptyArray(AcId).annotate(field("The criteria that touch it.", "agent")),
    domain: Schema.optionalKey(
        KbFile.annotate(field("The knowledge base folder the entity sits in, such as domains/orders.", "engineer")),
    ),
    kbFile: Schema.optionalKey(
        KbFile.annotate(field("The knowledge base file that describes the entity, when there is one.", "engineer")),
    ),
}).annotate(
    about("An entity of the product the story creates, changes, reads or removes, or a criterion that touches none."),
);

export const InvariantAtRisk = Schema.Struct({
    id: idOf(idPrefix.InvariantAtRisk),
    kbFile: KbFile,
    why: Text.annotate(
        field(
            "How the story could break the fact, in one sentence the approver reads beside the fact, in the product's words.",
            "approver",
        ),
    ),
    acs: Schema.NonEmptyArray(AcId).annotate(field("The criteria that put it at risk.", "agent")),
}).annotate(about("A fact that must always hold, which the story could break."));

export const JourneyAffected = Schema.Struct({
    id: idOf(idPrefix.JourneyAffected),
    kbFile: KbFile,
    why: Text.annotate(
        field(
            "How the story changes the journey, in one sentence the approver reads, in the product's words.",
            "approver",
        ),
    ),
    acs: Schema.NonEmptyArray(AcId).annotate(field("The criteria that affect it.", "agent")),
}).annotate(about("A journey of the knowledge base that the story changes."));

export const SeamCrossed = Schema.Struct({
    id: idOf(idPrefix.SeamCrossed),
    what: Text.annotate(
        field(
            "What crosses between the product and the outside, in the product's words, as the approver reads it.",
            "approver",
        ),
    ),
    direction: Schema.Literals(["in", "out", "both"]).annotate(field("Which way it crosses.", "approver")),
    outside: Text.annotate(
        field("The outside it meets: another part of the business, a person, time, the customer's code.", "approver"),
    ),
    acs: Schema.NonEmptyArray(AcId).annotate(field("The criteria that cross it.", "agent")),
}).annotate(about("A place where the story meets the outside."));
