import { Schema } from "effect";
import { keysOf } from "../run/collections";
import type { JsonRecord } from "./json-record";
import { RecordIdPrefix } from "./shared-fields";
import type { NoteSpan, Position, RecordKind, RecordType } from "./shape-registry";
import { ResourceAssignment, ShapeAssignment, EntryPointAssignment } from "./schemas/assignment";
import { CapabilityGroup, CrossCuttingConcern } from "./schemas/briefing";
import { SystemPart } from "./schemas/system-part";
import { Capability } from "./schemas/capability";
import { Entity } from "./schemas/entity";
import { ExternalSystem } from "./schemas/external-system";
import { Layer } from "./schemas/layer";
import { CodeKind } from "./schemas/code-kind";
import { Block, DataDefinition, Link, Span } from "./schemas/map";
import { Unread } from "./schemas/unread";
import { Missed } from "./schemas/missed";
import { Receipt } from "./schemas/receipt";
import { Lifecycle, Transition } from "./schemas/lifecycle";
import { BusinessRule } from "./schemas/business-rule";
import { Review, reviewIdentity } from "./schemas/review";
import { Technology } from "./schemas/technology";
import { Fact } from "./schemas/fact";

type Decoded<S extends Schema.ConstraintDecoder<unknown>> = S["Type"];

type RefSpec<R> = {
    readonly role: string;
    readonly to: readonly string[];
    readonly inStore: boolean;
    readonly ids: (record: R) => readonly string[];
};

type Declaration<S extends Schema.ConstraintDecoder<unknown>> = {
    readonly schema: S;
    readonly kind: RecordKind;
    readonly keyOf: (record: JsonRecord) => string | undefined;
    readonly refs: readonly RefSpec<Decoded<S>>[];
    readonly positionOf: (record: Decoded<S>) => Position | undefined;
    readonly spansOf: (record: Decoded<S>) => readonly NoteSpan[];
};

type Declared<S extends Schema.ConstraintDecoder<unknown>> = Omit<RecordType, "schema" | "idPrefix"> & {
    readonly schema: S;
};

/**
 * The identity of a record whose type has a script-issued id: the id itself.
 * @param record a record of that type
 * @returns its id, or undefined when it has none yet
 */
const byId = (record: JsonRecord) => (typeof record.id === "string" ? record.id : undefined);

/**
 * The position of a type whose records sit on no lines of their own.
 * @returns none
 */
const nowhere = (): Position | undefined => undefined;

/**
 * The ranges a type's notes cite besides its own position, for a type that cites none.
 * @returns none
 */
const noSpans = (): readonly NoteSpan[] => [];

const strict = { onExcessProperty: "error" } as const;

const tolerant = { onExcessProperty: "ignore" } as const;

/**
 * Decode one record strictly by its declared schema: unknown properties are rejected, so an agent cannot invent one.
 * @param schema the record's schema
 * @param value the record as written
 * @returns the decoded record; throws describing what does not match
 */
const decodeStrictly = <S extends Schema.ConstraintDecoder<unknown>>(schema: S, value: unknown): Decoded<S> =>
    Schema.decodeUnknownSync(schema, strict)(value);

/**
 * Decode one stored record by its declared schema, a property the schema no longer has left out: a run made before a
 * property was removed is read, never rewritten.
 * @param schema the record's schema
 * @param value the record as stored
 * @returns the decoded record; throws describing what does not match
 */
const decodeStored = <S extends Schema.ConstraintDecoder<unknown>>(schema: S, value: unknown): Decoded<S> =>
    Schema.decodeUnknownSync(schema, tolerant)(value);

/**
 * One reference a type keeps: its role (the field it is kept in), the record types it may name (none given: any
 * finding), whether the store must resolve it (every reference but those that name what is never accepted by design,
 * such as a review's findings, which live only in `work/`), and how to read its record ids from a decoded record.
 * @param role the field the reference is kept in
 * @param to the record types it names
 * @param ids the record ids a record keeps in it
 * @param inStore false for a reference the store does not resolve
 * @returns the reference
 */
const refTo = <R>(
    role: string,
    to: readonly string[],
    ids: (record: R) => readonly string[],
    inStore = true,
): RefSpec<R> => ({ role, to, inStore, ids });

/**
 * One record type, declared once: its schema; its kind (a finding, an account written from findings, an ask of the
 * person, a review, coverage accounting, or a working note for a later agent, D149); its identity (how a later copy is
 * recognised as a correction of an earlier one); its references (`refs`, each with the field it is kept in and the types it
 * names), from which `citesOf` (each, resolved among the job's own records, those written beside them and the accepted
 * ones) and `citesInStoreOf` (those the store must resolve) follow; where it sits in the code (`positionOf`); and the other
 * ranges its notes cite (`spansOf`). Its functions are written over the decoded record, each given a stored record
 * decoded strictly by the schema first.
 * @param declaration the type's schema, identity, references, position and spans
 * @returns the type, its functions taking stored records
 */
const declared = <S extends Schema.ConstraintDecoder<unknown>>(declaration: Declaration<S>): Declared<S> => ({
    schema: declaration.schema,
    kind: declaration.kind,
    keyOf: declaration.keyOf,
    citesOf: (record) => {
        const decoded = decodeStrictly(declaration.schema, record);
        return declaration.refs.flatMap((ref) => ref.ids(decoded));
    },
    citesInStoreOf: (record) => {
        const decoded = decodeStrictly(declaration.schema, record);
        return declaration.refs.filter((ref) => ref.inStore).flatMap((ref) => ref.ids(decoded));
    },
    refsOf: (record) => {
        const decoded = decodeStored(declaration.schema, record);
        return declaration.refs.map((ref) => ({
            role: ref.role,
            to: ref.to,
            inStore: ref.inStore,
            ids: ref.ids(decoded),
        }));
    },
    positionOf: (record) => declaration.positionOf(decodeStrictly(declaration.schema, record)),
    spansOf: (record) => declaration.spansOf(decodeStored(declaration.schema, record)),
});

/**
 * The record types of a set of declarations, as shared code takes them (`RecordType`), each with its record id prefix
 * from `RecordIdPrefix`, none for a type identified another way.
 * @param declarations each type, by name
 * @returns each record type, by name
 */
function recordTypesOf(
    declarations: Readonly<Record<string, Declared<Schema.ConstraintDecoder<unknown>>>>,
): Record<string, RecordType> {
    const prefixes: Readonly<Record<string, string>> = RecordIdPrefix;
    return Object.fromEntries(
        Object.entries(declarations).map(([name, declaration]) => [
            name,
            { ...declaration, idPrefix: Object.hasOwn(prefixes, name) ? prefixes[name] : undefined },
        ]),
    );
}

/**
 * A finding-like type that sits nowhere in the code and cites no ranges: its schema, kind, identity and references.
 * @param schema the type's schema
 * @param kind what kind of record it is (D149)
 * @param keyOf its identity
 * @param refs the references it keeps
 * @returns the type
 */
const unplaced = <S extends Schema.ConstraintDecoder<unknown>>(
    schema: S,
    kind: RecordKind,
    keyOf: (record: JsonRecord) => string | undefined,
    refs: readonly RefSpec<Decoded<S>>[],
) => declared({ schema, kind, keyOf, refs, positionOf: nowhere, spansOf: noSpans });

/**
 * A type that sits on lines of its own and cites no other ranges.
 * @param schema the type's schema
 * @param kind what kind of record it is (D149)
 * @param refs the references it keeps
 * @param positionOf where it sits
 * @returns the type
 */
const placed = <S extends Schema.ConstraintDecoder<unknown>>(
    schema: S,
    kind: RecordKind,
    refs: readonly RefSpec<Decoded<S>>[],
    positionOf: (record: Decoded<S>) => Position | undefined,
) => declared({ schema, kind, keyOf: byId, refs, positionOf, spansOf: noSpans });

/**
 * An optional record id as the ids a reference keeps: none, or the one.
 * @param id the id, when the record has one
 * @returns the ids
 */
const optionally = (id: string | undefined) => (id === undefined ? [] : [id]);

const subjectTypes = ["SystemPart", "Technology", "Capability", "Entity"];

const keptDeclarations = {
    ExternalSystem: unplaced(ExternalSystem, "finding", byId, []),
    Block: declared({
        schema: Block,
        kind: "finding",
        keyOf: byId,
        refs: [refTo("codeKind", ["CodeKind"], (record: typeof Block.Type) => [record.codeKind])],
        positionOf: (record) => record.lines,
        spansOf: (record) =>
            record.entryPoint === undefined
                ? []
                : record.entryPoint.evidence.map((lines) => ({ role: "evidence", lines })),
    }),
    Link: placed(
        Link,
        "finding",
        [
            refTo("to.externalSystem", ["ExternalSystem"], (record: typeof Link.Type) =>
                record.to !== undefined && "externalSystem" in record.to ? [record.to.externalSystem] : [],
            ),
        ],
        (record) => record.lines,
    ),
    Review: unplaced(Review, "review", reviewIdentity, [
        refTo("finding", [], (record: typeof Review.Type) => [record.finding], false),
    ]),
    Unread: placed(Unread, "coverage", [], (record) => record.lines),
    Missed: unplaced(Missed, "review", byId, [
        refTo(
            "concerns",
            [],
            (record: typeof Missed.Type) => (record.concerns === undefined ? [] : record.concerns),
            false,
        ),
    ]),
    Receipt: unplaced(Receipt, "review", byId, []),
    Fact: declared({
        schema: Fact,
        kind: "finding",
        keyOf: byId,
        refs: [
            refTo("subject", subjectTypes, (record: typeof Fact.Type) =>
                record.subject === "system" ? [] : [record.subject.key],
            ),
            refTo("concluded.from", ["Fact"], (record: typeof Fact.Type) =>
                "concluded" in record.basis ? record.basis.concluded.from : [],
            ),
        ],
        positionOf: nowhere,
        spansOf: (record) =>
            "observed" in record.basis
                ? record.basis.observed.evidence.map((each) => ({ role: "evidence", lines: each.lines }))
                : "assumed" in record.basis
                  ? record.basis.assumed.evidence.map((each) => ({ role: "evidence", lines: each.lines }))
                  : [],
    }),
    Technology: unplaced(Technology, "finding", byId, [
        refTo("uses.parts", ["SystemPart"], (record: typeof Technology.Type) =>
            record.uses.flatMap((use) => use.parts),
        ),
    ]),
    SystemPart: unplaced(SystemPart, "finding", byId, []),
    Layer: unplaced(Layer, "finding", byId, []),
    CodeKind: unplaced(CodeKind, "finding", byId, [
        refTo("layer", ["Layer"], (record: typeof CodeKind.Type) => [record.layer]),
    ]),
    DataDefinition: placed(
        DataDefinition,
        "finding",
        [
            refTo("codeKind", ["CodeKind"], (record: typeof DataDefinition.Type) => [record.codeKind]),
            refTo("declares.externalSystem", ["ExternalSystem"], (record: typeof DataDefinition.Type) =>
                record.declares === undefined ? [] : [record.declares.externalSystem],
            ),
            refTo("fields.refersTo", ["DataDefinition"], (record: typeof DataDefinition.Type) =>
                record.fields.flatMap((field) => (field.refersTo === undefined ? [] : [field.refersTo])),
            ),
        ],
        (record) => record.lines,
    ),
    Span: placed(Span, "coverage", [], (record) => record.lines),
    Entity: unplaced(Entity, "finding", byId, []),
    Capability: unplaced(Capability, "finding", byId, []),
    EntryPointAssignment: unplaced(
        EntryPointAssignment,
        "finding",
        (record) => (typeof record.entryPoint === "string" ? `entryPoint:${record.entryPoint}` : undefined),
        [
            refTo("entryPoint", ["Block"], (record: typeof EntryPointAssignment.Type) => [record.entryPoint]),
            refTo("capability", ["Capability"], (record: typeof EntryPointAssignment.Type) =>
                optionally(record.capability),
            ),
        ],
    ),
    ResourceAssignment: unplaced(
        ResourceAssignment,
        "finding",
        (record) => (typeof record.resource === "string" ? `resource:${record.resource}` : undefined),
        [refTo("entity", ["Entity"], (record: typeof ResourceAssignment.Type) => optionally(record.entity))],
    ),
    ShapeAssignment: unplaced(
        ShapeAssignment,
        "finding",
        (record) => (typeof record.definition === "string" ? `shape:${record.definition}` : undefined),
        [
            refTo("definition", ["DataDefinition"], (record: typeof ShapeAssignment.Type) => [record.definition]),
            refTo("entity", ["Entity"], (record: typeof ShapeAssignment.Type) => optionally(record.entity)),
        ],
    ),
    CapabilityGroup: unplaced(CapabilityGroup, "account", byId, [
        refTo("capabilities", ["Capability"], (record: typeof CapabilityGroup.Type) => record.capabilities),
    ]),
    CrossCuttingConcern: unplaced(CrossCuttingConcern, "account", byId, [
        refTo("blocks", ["Block"], (record: typeof CrossCuttingConcern.Type) => record.blocks),
    ]),
    Lifecycle: unplaced(
        Lifecycle,
        "finding",
        (record) => (typeof record.entity === "string" ? `lifecycle:${record.entity}` : undefined),
        [refTo("entity", ["Entity"], (record: typeof Lifecycle.Type) => [record.entity])],
    ),
    Transition: placed(
        Transition,
        "finding",
        [refTo("lifecycle", ["Lifecycle"], (record: typeof Transition.Type) => [record.lifecycle])],
        (record) => record.writtenAt,
    ),
    BusinessRule: declared({
        schema: BusinessRule,
        kind: "finding",
        keyOf: byId,
        refs: [refTo("gates", ["Transition"], (record: typeof BusinessRule.Type) => optionally(record.gates))],
        positionOf: (record) => record.decidedAt,
        spansOf: (record) => record.evidence.map((lines) => ({ role: "evidence", lines })),
    }),
};

export const recordTypeNames = keysOf(keptDeclarations);

/**
 * Every record type the stages write, as shared code takes them through the ShapeRegistry service.
 * @returns each record type, by name
 */
export function recordTypes(): Record<string, RecordType> {
    const all: Readonly<Record<string, Declared<Schema.ConstraintDecoder<unknown>>>> = keptDeclarations;
    return recordTypesOf(all);
}
