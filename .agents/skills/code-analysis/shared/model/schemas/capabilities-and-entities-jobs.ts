import { Schema } from "effect";
import {
    BlockId,
    DataDefinitionId,
    ExternalSystemId,
    Lines,
    ResourceId,
    Text,
    about,
    eachOnce,
} from "../shared-fields";
import { Capability } from "./capability";
import { Entity } from "./entity";
import { LinkKind } from "./map";

export const StageJobList = Schema.Array(
    Schema.Struct({
        jobId: Text.annotate(about("The job's id, the name of its folder.")),
        kind: Schema.Literals([
            "assignEntryPoints",
            "assignResources",
            "assignShapes",
            "mergeCapabilities",
            "mergeEntities",
        ]).annotate(
            about(
                "What the job does, which never changes: so `next` and `prepare <job>` tell a registry's jobs apart from the list alone.",
            ),
        ),
        definition: Text.annotate(
            about(
                "A digest of the job's kind and its units' record ids, never their words: what keeps its id while its units are the same, and what `finish` compares with today's cut.",
            ),
        ),
    }),
).annotate(
    about(
        "The stage's jobs, in the order they run: the proposing jobs, the assigning jobs, then the merge's jobs once every assigning job is decided. The cut writes the first two; the merge adds its own.",
    ),
);

/**
 * Another entry point one entry point requests or is requested by, with what it does, so the agent reads both purposes together.
 * @param what the relation, as its description says it
 * @returns the schema
 */
const requested = (what: string) =>
    Schema.Struct({
        entryPoint: BlockId.annotate(about("The other entry point, by its block's record id.")),
        purpose: Text.annotate(about("What it does, in one line, as the Map wrote it.")),
    }).annotate(about(what));

export const EntryPointUnit = Schema.Struct({
    id: BlockId.annotate(about("The entry point, by its block's record id: what a `EntryPointAssignment` assigns.")),
    writtenAs: Schema.optionalKey(Text).annotate(
        about("Its block's name, as written; absent when the code gives none."),
    ),
    container: Schema.optionalKey(Text).annotate(about("The class, module or program it sits in, as written.")),
    purpose: Text.annotate(about("What it does, in one line, as the Map wrote it.")),
    reachedBy: Text.annotate(about("How work reaches it, with its address.")),
    startedBy: Schema.Literals(["person", "schedule", "otherSystem"]).annotate(
        about("Who starts the work here: a person, a schedule, or another system."),
    ),
    part: Schema.optionalKey(Text).annotate(
        about("The part of the system its code is in, by name; absent for code no part holds."),
    ),
    lines: Lines.annotate(about("Its block's lines: evidence a finding may cite.")),
    requests: Schema.Array(requested("An entry point its chain requests."))
        .check(eachOnce((each: { readonly entryPoint: string }) => each.entryPoint, "entry points"))
        .annotate(
            about("The entry points its chain requests, each once: a sign they serve one purpose, never a rule."),
        ),
    requestedBy: Schema.Array(requested("An entry point whose chain requests it."))
        .check(eachOnce((each: { readonly entryPoint: string }) => each.entryPoint, "entry points"))
        .annotate(about("The entry points whose chains request it, each once.")),
    resources: Schema.Array(
        Schema.Struct({
            id: ResourceId.annotate(about("The resource's id.")),
            externalSystem: ExternalSystemId.annotate(about("The external system, named in the brief.")),
            resource: Text.annotate(about("What is used there, as the code writes it.")),
            kinds: Schema.Array(LinkKind)
                .check(eachOnce((kind: string) => kind, "kinds"))
                .annotate(about("How its chain uses it, each kind once.")),
        }).annotate(about("One resource its chain uses.")),
    )
        .check(eachOnce((unit: { readonly id: string }) => unit.id, "resources"))
        .annotate(about("The resources its chain uses, each once, in the order met.")),
}).annotate(about("One entry point of a entry-point job, with the facts the Map holds about it."));

export const ResourceUnit = Schema.Struct({
    id: ResourceId.annotate(about("The resource's id: what a `ResourceAssignment` names it by.")),
    externalSystem: ExternalSystemId.annotate(about("The external system, named in the brief.")),
    resource: Text.annotate(about("The resource, spelt exactly as the code spells it.")),
    definitions: Schema.Array(
        Schema.Struct({
            writtenAs: Text.annotate(about("Its declared name, as written.")),
            layerName: Schema.optionalKey(Text).annotate(
                about("The layer its code kind belongs to; absent when no code kind fits it."),
            ),
            lines: Lines.annotate(about("Its lines: evidence a finding may cite.")),
            fields: Schema.Array(
                Schema.Struct({
                    writtenAs: Text.annotate(about("As the code writes it.")),
                    declaredAs: Text.annotate(about("Exactly what the code declares.")),
                }).annotate(about("One field the definition declares.")),
            ).annotate(about("Its fields, in the order declared.")),
        }).annotate(about("One data definition declaring the resource.")),
    )
        .check(eachOnce((definition: { readonly lines: Lines }) => JSON.stringify(definition.lines), "definitions"))
        .annotate(
            about(
                "The data definitions declaring the resource: its shapes, which belong to the entity its assignment gives, through their `declares`.",
            ),
        ),
    fieldsUsed: Schema.Array(Text.annotate(about("A data field a save or read names, as written.")))
        .check(eachOnce((field: string) => field, "fields"))
        .annotate(about("The fields its saves and reads name, each once: its shape where no definition declares it.")),
    parts: Schema.Array(Text)
        .check(eachOnce((part: string) => part, "parts"))
        .annotate(about("The parts of the system whose entry points save or read it, by name: where it is used.")),
    neighbours: Schema.Array(Text)
        .check(eachOnce((neighbour: string) => neighbour, "neighbours"))
        .annotate(
            about(
                "Up to eight other resources: those its data definitions refer to or that refer to it (`refersTo`), then those most often saved in the same flows: its likely parent, children and siblings, for judging which entity it belongs with (P12.6).",
            ),
        ),
    uses: Schema.Array(
        Schema.Struct({
            kind: LinkKind,
            layerName: Schema.optionalKey(Text).annotate(
                about("The layer of the code using it; absent for code in no code kind or in no block."),
            ),
            count: Schema.Int.check(Schema.isGreaterThan(0)).annotate(about("How many uses of that kind there.")),
        }).annotate(about("Its uses of one kind from one layer, counted.")),
    )
        .check(
            eachOnce(
                (use: { readonly kind: string; readonly layerName?: string }) =>
                    JSON.stringify([use.kind, use.layerName === undefined ? null : use.layerName]),
                "kinds of use",
            ),
        )
        .annotate(
            about(
                "Every use of the resource, counted by link kind and layer, never cut short; the stage's `uses` command prints each with its lines.",
            ),
        ),
}).annotate(about("One resource of a resource job: a resource at an external system, with its declarations and uses."));

export const ShapeUnit = Schema.Struct({
    definition: DataDefinitionId.annotate(about("The data definition, by its record id: what its assignment names.")),
    writtenAs: Text.annotate(about("Its declared name, as written.")),
    layer: Schema.optionalKey(
        Text.annotate(about("The layer its code kind belongs to; absent when no code kind fits it.")),
    ),
    lines: Lines.annotate(about("Its lines: evidence an assignment may cite.")),
    fields: Schema.Array(
        Schema.Struct({
            writtenAs: Text.annotate(about("As the code writes it.")),
            declaredAs: Text.annotate(about("Exactly what the code declares.")),
        }).annotate(about("One field the definition declares.")),
    ).annotate(about("Its fields, in the order declared.")),
}).annotate(
    about(
        "One data shape of a shape job: a data definition declaring no resource (the shape of what a person sees and enters, a request object, a domain class).",
    ),
);

const entryPoints = Schema.NonEmptyArray(EntryPointUnit).check(
    eachOnce((unit: { readonly id: string }) => unit.id, "entry points"),
);

const resources = Schema.NonEmptyArray(ResourceUnit).check(
    eachOnce((unit: { readonly id: string }) => unit.id, "resources"),
);

export const AssignEntryPointsJob = Schema.Struct({
    kind: Schema.Literal("assignEntryPoints").annotate(about("A job assigning entry points to capabilities.")),
    entryPoints: entryPoints.annotate(about("The job's entry points, in location order: each assigned once.")),
}).annotate(about("One job assigning its entry points to the registry's capabilities, in its own file."));

export const AssignResourcesJob = Schema.Struct({
    kind: Schema.Literal("assignResources").annotate(about("A job assigning resources to entities.")),
    resources: resources.annotate(about("The job's resources, in location order: each assigned once.")),
}).annotate(about("One job assigning its resources to the registry's entities, in its own file."));

export const AssignShapesJob = Schema.Struct({
    kind: Schema.Literal("assignShapes").annotate(about("A job assigning data shapes to entities.")),
    shapes: Schema.NonEmptyArray(ShapeUnit)
        .check(eachOnce((unit: { readonly definition: string }) => unit.definition, "shapes"))
        .annotate(about("The job's data shapes, in location order: each assigned once.")),
}).annotate(about("One job assigning its data shapes to the registry's entities, in its own file."));

export const MergeCapabilitiesJob = Schema.Struct({
    kind: Schema.Literal("mergeCapabilities").annotate(about("A job merging duplicates among the capabilities.")),
    entries: Schema.NonEmptyArray(Capability)
        .check(eachOnce((entry: { readonly id: string }) => entry.id, "entries"))
        .annotate(
            about(
                "The slice of written capabilities this job merges, each whole: the only entries whose words it may change.",
            ),
        ),
}).annotate(about("One job of the merge, merging a slice of the written capabilities against the whole registry."));

export const MergeEntitiesJob = Schema.Struct({
    kind: Schema.Literal("mergeEntities").annotate(about("A job merging duplicates among the entities.")),
    entries: Schema.NonEmptyArray(Entity)
        .check(eachOnce((entry: { readonly id: string }) => entry.id, "entries"))
        .annotate(
            about(
                "The slice of written entities this job merges, each whole: the only entries whose words it may change.",
            ),
        ),
}).annotate(about("One job of the merge, merging a slice of the written entities against the whole registry."));

export const StageJob = Schema.Union([
    AssignEntryPointsJob,
    AssignResourcesJob,
    AssignShapesJob,
    MergeCapabilitiesJob,
    MergeEntitiesJob,
]).annotate(about("One job of Capabilities and entities, told apart by its kind."));

export const MergeCandidate = Schema.Struct({
    id: Text.annotate(about("The entry's record id.")),
    name: Text.annotate(about("The capability's or entity's name, as the registry holds it.")),
    purpose: Text.annotate(about("What it offers or means, in one line.")),
    parts: Schema.Array(Text).annotate(about("The parts its evidence lies in, by name.")),
    members: Schema.Array(Text).annotate(
        about(
            "Its first twelve members: the purposes of the entry points assigned to a capability, or the resources and data shapes assigned to an entity.",
        ),
    ),
    moreMembers: Schema.Number.annotate(about("How many members it has beyond those shown.")),
    written: Schema.Boolean.annotate(
        about("Whether an assigning job wrote it, so the merge may merge it; a seeded entry is never merged."),
    ),
}).annotate(about("One entry of the registry as the merge's jobs search it: one line each, the whole registry."));
