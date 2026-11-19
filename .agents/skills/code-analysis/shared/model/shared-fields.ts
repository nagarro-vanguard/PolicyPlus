import { Schema } from "effect";
import { isRecordId } from "./record-ids";
import { isResourceId } from "./resource-ids";

/**
 * The annotation that describes a schema or property in one sentence.
 * @param description the sentence
 * @returns the annotation to pass to `annotate`
 */
export const about = (description: string) => ({ description });

/**
 * A text the person deciding about the system reads, in the writing standard's plain words. Each text field declares
 * its reader (D149, P4b.1): the person, a later agent or the record's owner, or only the scripts. `describe-shape` tells
 * the writing agent who reads each field.
 * @param description what the field holds, for the agent that writes it
 * @returns its annotations
 */
export const forPerson = (description: string) => ({ description, readBy: "person" as const });

/**
 * A text the code writes and the person reads as written: a declared name, a stored value, a label shown in the
 * system, a version, a pattern. It is drawn in code type and never reworded, and the writing standard does not apply.
 * @param description what the field holds, for the agent that writes it
 * @returns its annotations
 */
export const copiedFromCode = (description: string) => ({
    description,
    readBy: "person" as const,
    copiedFromCode: true as const,
});

/**
 * A text only a later agent or the record's owner reads: never drawn on the deciding person's page.
 * @param description what the field holds, for the agent that writes it
 * @returns its annotations
 */
export const forAgent = (description: string) => ({ description, readBy: "agent" as const });

/**
 * A text only the scripts read: a key, never words for anyone.
 * @param description what the field holds, for the agent that writes it
 * @returns its annotations
 */
export const forScripts = (description: string) => ({ description, readBy: "script" as const });

export const RecordIdPrefix = {
    Block: "block",
    Link: "link",
    ExternalSystem: "external",
    Layer: "layer",
    CodeKind: "codekind",
    Entity: "entity",
    Capability: "capability",
    EntryPointAssignment: "entrypointassignment",
    ResourceAssignment: "resourceassignment",
    ShapeAssignment: "shapeassignment",
    DataDefinition: "definition",
    Span: "span",
    Unread: "unread",
    Technology: "technology",
    Fact: "fact",
    SystemPart: "part",
    CapabilityGroup: "capabilitygroup",
    CrossCuttingConcern: "crosscutting",
    Screen: "screen",
    Figure: "figure",
    SystemWords: "systemwords",
    Missed: "missed",
    Receipt: "receipt",
    Lifecycle: "lifecycle",
    Transition: "transition",
    BusinessRule: "businessrule",
    Journey: "journey",
    JourneyMerge: "journeymerge",
} as const;

/**
 * The schema of a record id, `<prefix>-` and six digits or more, before each record id schema brands it with its own type. A
 * record type with no prefix in `RecordIdPrefix` has no id.
 * @param prefix the record type's prefix, from `RecordIdPrefix`
 * @returns a text schema that takes the prefix, a dash and six digits or more
 */
const recordIdOf = (prefix: (typeof RecordIdPrefix)[keyof typeof RecordIdPrefix]) =>
    Schema.String.check(
        Schema.makeFilter(
            (text: string) => isRecordId(prefix, text) || `a record id: ${prefix}- and six digits or more`,
        ),
    ).annotate({ references: typeOfPrefix(prefix) });

/**
 * The record type whose ids carry a prefix: what an id field references, declared on the id's schema (D149).
 * @param prefix the prefix
 * @returns the record type's name
 */
function typeOfPrefix(prefix: string): string {
    const found = Object.entries(RecordIdPrefix).find(([, each]) => each === prefix);
    if (found === undefined) {
        throw new Error(`${prefix} is the prefix of no record type`);
    }
    return found[0];
}

export const ownRecordId = about(
    "Its record id, issued by the scripts when the record is first written; leave it out on a new record. A correction appends the record again under this id; other records refer to it by this id.",
);

export const Text = Schema.String.check(Schema.isMinLength(1)).annotate(about("A non-empty piece of text."));

/**
 * Whether a text is one pattern of .gitignore syntax and nothing else: one line, neither blank, a comment (`#`), nor
 * a negation (`!`), since what a pattern is for is said by the record holding it.
 * @param text the pattern
 * @returns true for one pattern
 */
const isOnePattern = (text: string) =>
    !text.includes("\n") &&
    !text.includes("\r") &&
    text.trim() !== "" &&
    !text.startsWith("#") &&
    !text.startsWith("!");

export const Pattern = Text.check(
    Schema.makeFilter(
        (text: string) => isOnePattern(text) || "one .gitignore pattern on one line, not a comment or a negation",
    ),
).annotate(about("One .gitignore pattern, matched against paths relative to the roots' base, case ignored."));

/**
 * The rule that a record gives exactly one of its answers.
 * @param answers the properties that each answer
 * @returns the filter
 */
export const exactlyOneOf = (answers: readonly string[]) =>
    Schema.makeFilter(
        (record: object) =>
            answers.filter((answer) => answer in record).length === 1 || `gives exactly one of ${answers.join(", ")}`,
    );

/**
 * The rule that a list names each of its items once, by a key the caller gives.
 * @param keyOf the key two items share only when they are the same item
 * @param what what the list holds, for the message
 * @returns the filter
 */
export const eachOnce = <A>(keyOf: (item: A) => string, what: string) =>
    Schema.makeFilter(
        (items: ReadonlyArray<A>) =>
            new Set(items.map(keyOf)).size === items.length || `names one of its ${what} more than once`,
    );

/**
 * The entries a registry's entry stands for once its registry's duplicates are merged: the record ids of entries other
 * jobs wrote that mean the same thing, each once, every reference to one of them then written as one to this entry.
 * One field for every registry whose entries are merged (the code kinds, layers, external systems, capabilities and
 * entities), so the rule and its words are kept once (D216).
 * @param id the schema of the registry's record ids
 * @returns the optional field
 */
export const mergedFromOf = <S extends Schema.Codec<string, string>>(id: S) =>
    Schema.optionalKey(
        Schema.NonEmptyArray(id)
            .check(eachOnce((entry: string) => entry, "entries"))
            .annotate(
                about(
                    "Only on an entry written while merging duplicates, once every job that writes entries is decided: the record ids of the entries other jobs wrote that this one stands for, each once; every reference to one of them is written as one to this entry.",
                ),
            ),
    );

export const LineNumber = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)).annotate(
    about("A line number, counting from 1."),
);

export const FilePath = Schema.String.check(Schema.isMinLength(1)).pipe(Schema.brand("FilePath"));

export const BlockId = recordIdOf(RecordIdPrefix.Block).pipe(Schema.brand("BlockId"));

export const LinkId = recordIdOf(RecordIdPrefix.Link).pipe(Schema.brand("LinkId"));

/**
 * A data resource, by the id a script issued for it when the Map was written: its external system and its spelling,
 * which the scripts take as one identity (the one text a script joins on, declared here). A model names a resource by
 * this id from the list a job prints, never by retyping its spelling.
 */
export const ResourceId = Schema.String.check(
    Schema.makeFilter((text: string) => isResourceId(text) || "a resource id: resource- and twelve hexadecimal digits"),
).pipe(Schema.brand("ResourceId"));

export const ExternalSystemId = recordIdOf(RecordIdPrefix.ExternalSystem).pipe(Schema.brand("ExternalSystemId"));

export const LayerId = recordIdOf(RecordIdPrefix.Layer).pipe(Schema.brand("LayerId"));

export const CodeKindId = recordIdOf(RecordIdPrefix.CodeKind).pipe(Schema.brand("CodeKindId"));

export const EntityId = recordIdOf(RecordIdPrefix.Entity).pipe(Schema.brand("EntityId"));

export const CapabilityId = recordIdOf(RecordIdPrefix.Capability).pipe(Schema.brand("CapabilityId"));

export const EntryPointAssignmentId = recordIdOf(RecordIdPrefix.EntryPointAssignment).pipe(
    Schema.brand("EntryPointAssignmentId"),
);

export const ResourceAssignmentId = recordIdOf(RecordIdPrefix.ResourceAssignment).pipe(
    Schema.brand("ResourceAssignmentId"),
);

export const ShapeAssignmentId = recordIdOf(RecordIdPrefix.ShapeAssignment).pipe(Schema.brand("ShapeAssignmentId"));

export const DataDefinitionId = recordIdOf(RecordIdPrefix.DataDefinition).pipe(Schema.brand("DataDefinitionId"));

export const SpanId = recordIdOf(RecordIdPrefix.Span).pipe(Schema.brand("SpanId"));

export const UnreadId = recordIdOf(RecordIdPrefix.Unread).pipe(Schema.brand("UnreadId"));

export const TechnologyId = recordIdOf(RecordIdPrefix.Technology).pipe(Schema.brand("TechnologyId"));

export const FactId = recordIdOf(RecordIdPrefix.Fact).pipe(Schema.brand("FactId"));

export const SystemPartId = recordIdOf(RecordIdPrefix.SystemPart).pipe(Schema.brand("SystemPartId"));

export const CapabilityGroupId = recordIdOf(RecordIdPrefix.CapabilityGroup).pipe(Schema.brand("CapabilityGroupId"));

export const CrossCuttingConcernId = recordIdOf(RecordIdPrefix.CrossCuttingConcern).pipe(
    Schema.brand("CrossCuttingConcernId"),
);

export const ScreenId = recordIdOf(RecordIdPrefix.Screen).pipe(Schema.brand("ScreenId"));

export const FigureId = recordIdOf(RecordIdPrefix.Figure).pipe(Schema.brand("FigureId"));

export const SystemWordsId = recordIdOf(RecordIdPrefix.SystemWords).pipe(Schema.brand("SystemWordsId"));

export const MissedId = recordIdOf(RecordIdPrefix.Missed).pipe(Schema.brand("MissedId"));

export const ReceiptId = recordIdOf(RecordIdPrefix.Receipt).pipe(Schema.brand("ReceiptId"));

export const LifecycleId = recordIdOf(RecordIdPrefix.Lifecycle).pipe(Schema.brand("LifecycleId"));

export const TransitionId = recordIdOf(RecordIdPrefix.Transition).pipe(Schema.brand("TransitionId"));

export const BusinessRuleId = recordIdOf(RecordIdPrefix.BusinessRule).pipe(Schema.brand("BusinessRuleId"));

export const JourneyId = recordIdOf(RecordIdPrefix.Journey).pipe(Schema.brand("JourneyId"));

export const JourneyMergeId = recordIdOf(RecordIdPrefix.JourneyMerge).pipe(Schema.brand("JourneyMergeId"));

export const FindingId = Schema.Union([
    BlockId,
    LinkId,
    ExternalSystemId,
    LayerId,
    CodeKindId,
    EntityId,
    CapabilityId,
    EntryPointAssignmentId,
    ResourceAssignmentId,
    ShapeAssignmentId,
    DataDefinitionId,
    SpanId,
    TechnologyId,
    FactId,
    SystemPartId,
    CapabilityGroupId,
    CrossCuttingConcernId,
    ScreenId,
    FigureId,
    SystemWordsId,
    LifecycleId,
    TransitionId,
    BusinessRuleId,
    JourneyId,
    JourneyMergeId,
]).annotate(about("Any finding a review can rule on, by its record id."));

export const Lines = Schema.Struct({
    file: FilePath.annotate(
        forScripts("The file, relative to its source root, or to the roots' common parent when there are several."),
    ),
    firstLine: LineNumber.annotate(about("The first line it covers.")),
    lastLine: LineNumber.annotate(about("The last line it covers; never before the first.")),
})
    .check(Schema.makeFilter((lines) => lines.lastLine >= lines.firstLine || "lastLine is before firstLine"))
    .annotate(about("Where something is in the code, so any reader can check it."));

export type Lines = typeof Lines.Encoded;
