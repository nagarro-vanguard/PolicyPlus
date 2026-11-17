import { Schema } from "effect";
import { LinkKind } from "./map";
import {
    BlockId,
    CapabilityId,
    DataDefinitionId,
    EntityId,
    ExternalSystemId,
    Lines,
    LinkId,
    Text,
    about,
    eachOnce,
} from "../shared-fields";

export const CapabilityRulesScope = Schema.Struct({
    capabilities: Schema.NonEmptyArray(
        Schema.Struct({
            id: CapabilityId.annotate(about("The capability, by its record id when it was chosen.")),
            name: Text.annotate(about("Its name when it was chosen, so a choice no longer standing is named.")),
        }).annotate(about("One capability chosen.")),
    )
        .check(eachOnce((chosen: { readonly id: string }) => chosen.id, "capabilities"))
        .annotate(about("The capabilities the person chose to study, each once, in the order they named them.")),
    everyBlock: Schema.optionalKey(
        Schema.Boolean.annotate(
            about(
                "True when every capability was chosen (`--all`): the rules jobs then read every mapped block, not only the blocks an entry point reaches.",
            ),
        ),
    ),
}).annotate(about("What Capability rules studies: the person's choice, made after reading the overview."));

export const CapabilityRulesJobList = Schema.Array(
    Schema.Struct({
        jobId: Text.annotate(about("The job's id, the name of its folder.")),
        kind: Schema.Literals(["lifecycle", "rules"]).annotate(
            about("What the job does, which never changes: so `next` runs every lifecycle job before the rules jobs."),
        ),
        definition: Text.annotate(
            about(
                "A digest of the job's kind and its units' record ids: what keeps its id while its units are the same, and what `finish` compares with today's cut.",
            ),
        ),
    }),
).annotate(about("The stage's jobs, in the order they run, each with its kind and its digest."));

export const UseOfEntity = Schema.Struct({
    link: LinkId.annotate(about("The link, by its record id.")),
    kind: Schema.Literals(["saves", "reads"]).annotate(about("Whether it saves or reads.")),
    lines: Lines.annotate(about("Its lines: where a transition is written, when a save changes the state.")),
    externalSystem: ExternalSystemId.annotate(about("The external system, named in the brief.")),
    resource: Text.annotate(about("The resource, as the code writes it.")),
    fieldsUsed: Schema.optionalKey(
        Schema.Array(Text)
            .check(eachOnce((field: string) => field, "fields"))
            .annotate(
                about(
                    "The fields its lines name, as the Map wrote them; absent where the Map recorded none, so whether a save changes the state is for the agent to read.",
                ),
            ),
    ),
    reached: Schema.Boolean.annotate(
        about(
            "Whether an entry point runs the code making it. Code no entry point reaches may still run (a trigger, a listener, a job the platform starts): read whether anything starts it.",
        ),
    ),
}).annotate(
    about(
        "One save or read of an entity's resources anywhere in the system: a lifecycle job's saves, and each line of its file of uses.",
    ),
);

export const LifecycleJob = Schema.Struct({
    kind: Schema.Literal("lifecycle").annotate(about("A job writing one entity's life.")),
    entity: Schema.Struct({
        id: EntityId.annotate(about("The entity, by its record id: what its `Lifecycle` names.")),
        name: Text.annotate(about("Its name, as Capabilities and entities accepted it.")),
        purpose: Text.annotate(about("What one of its records means.")),
    }).annotate(about("The entity whose life the job writes.")),
    resources: Schema.Array(
        Schema.Struct({
            externalSystem: ExternalSystemId.annotate(about("The external system, named in the brief.")),
            resource: Text.annotate(about("The resource, as the external system holds it.")),
            fieldsUsed: Schema.Array(Text).annotate(
                about("Every field any link names on it, each once: the candidates for the fields holding its state."),
            ),
        }).annotate(about("One resource that keeps the entity.")),
    ).annotate(about("The resources that keep the entity, by the accepted resource assignments.")),
    shapes: Schema.Array(
        Schema.Struct({
            definition: DataDefinitionId.annotate(about("The data definition, by its record id.")),
            writtenAs: Text.annotate(about("Its declared name, as written.")),
            lines: Lines.annotate(about("The data definition's lines in its file, first line to last.")),
            fields: Schema.Array(
                Schema.Struct({
                    name: Text.annotate(about("The field, as written.")),
                    declaredAs: Text.annotate(about("What the code declares of it: its type, size and constraints.")),
                }),
            ).annotate(about("The fields it declares, each with what the code declares of it.")),
        }).annotate(about("One data shape of the entity: one declaring its resources, or one assigned to it.")),
    ).annotate(about("The data shapes of the entity, each with its fields.")),
    saves: Schema.Array(UseOfEntity).annotate(
        about(
            "Every place in the whole system that saves one of its resources, in the order the store gives them: what its transitions are written from, whichever capability holds them. `usesPath` lists every save and read.",
        ),
    ),
}).annotate(about("One job writing one entity's life, in its own file, with its state."));

export const RulesJob = Schema.Struct({
    kind: Schema.Literal("rules").annotate(about("A job writing the rules of its blocks.")),
    blocks: Schema.NonEmptyArray(
        Schema.Struct({
            block: BlockId.annotate(about("The block, by its record id.")),
            writtenAs: Schema.optionalKey(Text).annotate(
                about("Its name, as written; absent when the code gives none."),
            ),
            lines: Lines.annotate(
                about(
                    "Its lines, first to last: every one read, but those of the blocks it holds that `readInOtherJobs` lists.",
                ),
            ),
            codeKindName: Text.annotate(about("The code kind it is, by name: what kind of code it is.")),
            layerName: Schema.optionalKey(Text).annotate(about("The layer its code kind sits in, by name.")),
            serves: Schema.Struct({
                capabilities: Schema.Array(Text).annotate(
                    about("The chosen capabilities whose entry points run it, by name."),
                ),
                entryPoints: Schema.Array(Text).annotate(about("The first five entry points that run it, by title.")),
                moreEntryPoints: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).annotate(
                    about("How many more entry points run it."),
                ),
            }).annotate(about("What runs it: the capabilities and entry points it serves.")),
            outgoingLinks: Schema.Array(
                Schema.Struct({
                    kind: LinkKind,
                    to: Text.annotate(
                        about("What it reaches: a piece of code by name, or a resource at an external system."),
                    ),
                    fieldsUsed: Schema.optionalKey(Schema.Array(Text)).annotate(
                        about("The fields it names, as written, where the Map recorded them."),
                    ),
                }).annotate(about("One place its work leaves it, as the Map recorded it.")),
            ).annotate(about("Where its work leaves it: what it calls, saves, reads, requests and leads to.")),
            readInOtherJobs: Schema.optionalKey(Schema.NonEmptyArray(BlockId)).annotate(
                about(
                    "The blocks it holds that other jobs read, by record id: their lines are theirs, so this job reads only the rest.",
                ),
            ),
        }).annotate(about("One block a chosen capability's entry points reach.")),
    )
        .check(eachOnce((each: { readonly block: string }) => each.block, "blocks"))
        .annotate(about("The job's blocks, in location order: the writer reads every line of each.")),
}).annotate(about("One job writing the rules of the blocks the chosen capabilities' entry points reach."));

export const CapabilityRulesJob = Schema.Union([LifecycleJob, RulesJob]).annotate(
    about("One job of Capability rules, told apart by its kind."),
);
