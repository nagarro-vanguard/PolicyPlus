import { Schema } from "effect";
import { Text, about } from "../shared-fields";
import { ExternalSystem } from "./external-system";
import { Count, ContextShape, LayerTouched } from "./payloads";
import { SurfaceKind, SurfaceNoun } from "./surface-kind";

export const SystemPayload = Schema.Struct({
    name: Schema.optionalKey(
        Schema.String.annotate(
            about(
                "The system's name: the one the briefing gave in `SystemWords`, checked to appear in what the analysis read; else derived from the code, the source folder's name or the source folders' names joined. Payloads written before it was derived have none.",
            ),
        ),
    ),
    repository: Schema.optionalKey(
        Schema.NullOr(Schema.String).annotate(
            about(
                "The repository the code is in: its remote's address with no credentials, or its working tree's folder name when it has no remote; null when the source folder is not a git repository or the run recorded none.",
            ),
        ),
    ),
    commit: Schema.optionalKey(
        Schema.NullOr(Schema.String).annotate(
            about(
                "The commit the analysis read, as it was when the files were listed (not today's); null when the source folder is not a git repository or the run recorded none.",
            ),
        ),
    ),
    purpose: Schema.String.annotate(about("What the system is for and who uses it; empty when no fact states it.")),
    capabilities: Schema.Array(
        Schema.Struct({
            id: Schema.String.annotate(
                about(
                    "The capability's record id; it named the payload file of payloads written before `file` existed.",
                ),
            ),
            file: Schema.optionalKey(
                Schema.String.annotate(
                    about(
                        "The file holding the capability's payload, `capability-<slug>.json` from its name, which stays the same when a stage is run again from nothing.",
                    ),
                ),
            ),
            name: Text.annotate(about("The capability's name.")),
            purpose: Text.annotate(about("What the capability offers, in one or two sentences.")),
            screens: Count.annotate(about("How many screens its entry points are grouped into.")),
            actions: Count.annotate(about("How many entry points it has.")),
            rules: Count.annotate(about("How many rules are decided in code it reaches.")),
        }).annotate(about("One capability and the file that holds its payload.")),
    ).annotate(about("Every capability of the system, each with the file that holds its payload.")),
    areas: Schema.Array(
        Schema.Struct({
            id: Schema.String.annotate(about("The area's record id.")),
            name: Text.annotate(about("The area's name.")),
            purpose: Text.annotate(about("What its capabilities do together.")),
            capabilities: Schema.Array(Schema.String).annotate(about("Its capabilities' record ids.")),
            context: ContextShape,
        }).annotate(about("One area, the group of capabilities a person names first.")),
    ).annotate(about("The areas of the system; none when the briefing found none.")),
    layers: Schema.Array(
        Schema.Struct({
            id: Schema.String.annotate(about("The layer's record id.")),
            name: Schema.String.annotate(about("The layer's name.")),
            role: Schema.String.annotate(about("What the layer does at the system's boundary.")),
            purpose: Text.annotate(about("What the layer does for the system, as the layer record states it.")),
            group: Schema.String.annotate(about("The group it is read under: ui, api, data, batch, mixed or logic.")),
            blocks: Count.annotate(about("How many blocks it holds.")),
            product: Schema.Boolean.annotate(
                about(
                    "Whether the layer is the product: false when half or more of its blocks lie in tooling or tests parts, or when it is build or install scripts.",
                ),
            ),
            entryPoints: Schema.optionalKey(
                Count.annotate(about("How many entry points the layer holds, whoever starts them.")),
            ),
        }).annotate(about("One layer of the system.")),
    ).annotate(about("The layers of the system.")),
    screens: Schema.Array(
        Schema.Struct({
            key: Schema.String.annotate(
                about(
                    "The screen's address: the path of its page file without the extension, with the folders every page shares left off.",
                ),
            ),
            name: Schema.String.annotate(
                about("The screen's name as the people using it say it; its page file's name when no one named it."),
            ),
            purpose: Schema.String.annotate(
                about("What a person does there, in one sentence; empty when no one named it."),
            ),
            files: Schema.Array(Schema.String).annotate(
                about("The files its actions start in: its markup, its code-behind class and its browser scripts."),
            ),
            capabilities: Schema.Array(Schema.String).annotate(
                about("The record ids of the capabilities that hold actions of this screen."),
            ),
            actionIds: Schema.Array(Schema.String).annotate(
                about("The record ids of its actions, which a person starts, across capabilities."),
            ),
            actions: Count.annotate(about("How many actions the screen holds, across capabilities.")),
            rules: Count.annotate(about("How many distinct rules its actions reach, across capabilities.")),
            layersTouched: Schema.Array(LayerTouched).annotate(
                about(
                    "The layers the screen touches merged across its capabilities, each action and rule counted once.",
                ),
            ),
            context: ContextShape,
        }).annotate(about("One screen a person uses, merged across the capabilities that hold its actions.")),
    ).annotate(
        about(
            "Every screen a person uses, merged by page across capabilities, so a page is one screen however many capabilities its actions serve. Actions that other systems or a schedule start belong to no screen.",
        ),
    ),
    surfaces: Schema.optionalKey(
        Schema.Array(
            Schema.Struct({
                key: Schema.String.annotate(
                    about(
                        "The place's key, which stays the same when a stage is run again from nothing: the path of its first candidate (a page's path without its extension, or the file its entry points start in).",
                    ),
                ),
                name: Schema.String.annotate(
                    about(
                        "The place's name as its people say it; when no one named it (`unnamed`), the one class its entry points sit in, or its file's name.",
                    ),
                ),
                purpose: Schema.String.annotate(about("What is done there, in one sentence; empty when unnamed.")),
                kind: SurfaceKind,
                noun: SurfaceNoun,
                unnamed: Schema.Boolean.annotate(
                    about(
                        "Whether the name and kind are the code's because no one named the place: test suites always, and every place of an analysis made before the briefing named places of every starter. A presentation says so rather than show a class name as a name.",
                    ),
                ),
                product: Schema.Boolean.annotate(
                    about("Whether the place is part of the product: false for test suites and build steps."),
                ),
                places: Schema.Array(Schema.String).annotate(
                    about("The candidate places, found by code, that make it up, by key."),
                ),
                files: Schema.Array(Schema.String).annotate(about("The files its entry points start in.")),
                capabilities: Schema.Array(Schema.String).annotate(
                    about("The record ids of the capabilities its entry points belong to."),
                ),
                actionIds: Schema.Array(Schema.String).annotate(
                    about("The record ids of its entry points, whoever starts them."),
                ),
                actions: Count.annotate(about("How many entry points it holds.")),
                startedBy: Schema.Struct({
                    person: Count.annotate(about("How many a person starts.")),
                    schedule: Count.annotate(about("How many a schedule starts.")),
                    otherSystem: Count.annotate(about("How many another system or a test runner starts.")),
                }).annotate(about("How many of its entry points a person, a schedule and another system start.")),
                rules: Count.annotate(about("How many distinct rules its entry points reach.")),
                reachedByTests: Schema.Array(Schema.String).annotate(
                    about(
                        "The keys of the test suites whose tests reach a rule its entry points reach; reaching is not checking.",
                    ),
                ),
                layersTouched: Schema.Array(LayerTouched).annotate(
                    about("The layers it touches, each entry point and rule counted once."),
                ),
                context: ContextShape,
            }).annotate(
                about(
                    "One place the system is worked with through: a screen, page, service, scheduled task, command, build step or test suite.",
                ),
            ),
        ).annotate(
            about(
                "Every place (surface) of the system, whoever starts its entry points, by key: each entry point is in exactly one, or listed in `unplaced`. Membership is found by code; names, purposes and kinds come from the briefing, or from the code when no one named the place. `screens` is the older view of the places a person works in, kept for one contract version.",
            ),
        ),
    ),
    unplaced: Schema.optionalKey(
        Schema.Struct({
            entryPoints: Schema.Array(Schema.String).annotate(
                about("The record ids of the entry points no place holds."),
            ),
            why: Schema.String.annotate(about("Why they are held by no place.")),
        }).annotate(
            about("The entry points the briefing judged to be in no place a reader visits: said, never dropped."),
        ),
    ),
    rulesInNoCapability: Schema.optionalKey(
        Schema.Struct({
            count: Count.annotate(about("How many rules no capability's flows reach.")),
            rules: Schema.Array(
                Schema.Struct({
                    id: Schema.String.annotate(about("The rule's record id.")),
                    key: Schema.String.annotate(about("The rule's key, as the capability payloads write it.")),
                    says: Text.annotate(about("The rule.")),
                    file: Schema.String.annotate(about("The file it is decided in.")),
                    firstLine: Count.annotate(about("The first line that decides it.")),
                }),
            ).annotate(about("Each of them, by file and line.")),
        }).annotate(
            about(
                "The rules decided in code no capability's entry points reach: in no capability payload, so listed here, never dropped.",
            ),
        ),
    ),
    edges: Schema.Array(
        Schema.Struct({
            from: Schema.String.annotate(about("The layer a link leaves, by record id.")),
            to: Schema.String.annotate(about("The layer a link reaches, by record id.")),
            kind: Schema.String.annotate(
                about("How the link reaches: call, renders, reads, saves, request or dispatches."),
            ),
            links: Count.annotate(about("How many links of that kind between the two layers.")),
        }).annotate(about("The links of one kind from one layer to another.")),
    ).annotate(about("The links between layers; links into shapes of data reach no block and are not counted.")),
    entries: Schema.Struct({
        person: Count.annotate(about("Entry points a person starts.")),
        otherSystem: Count.annotate(about("Entry points another system or the runtime starts.")),
        schedule: Count.annotate(about("Entry points a schedule starts.")),
    }).annotate(
        about(
            "How many entry points each kind of starter has in the layers of the product, derived from the entry points: tests and build or install scripts are not counted here (`surfaces` holds them all).",
        ),
    ),
    externals: Schema.Array(
        Schema.Struct({
            id: Schema.String.annotate(about("The external system's record id.")),
            name: Text.annotate(about("What it is, in plain words.")),
            kind: ExternalSystem.fields.kind,
            links: Count.annotate(about("How many links of the product's code reach it.")),
            reach: Schema.Array(
                Schema.Struct({
                    layer: Schema.String.annotate(about("The layer's record id; empty when no layer holds the block.")),
                    access: Schema.String.annotate(
                        about("How the layer reaches it: call, reads, saves, renders or request."),
                    ),
                    links: Count.annotate(about("How many links of that kind.")),
                }),
            ).annotate(about("The layers that reach it, and how.")),
        }),
    ).annotate(about("What the code reaches outside itself, most reached first; libraries are not listed.")),
    gaps: Schema.Struct({
        unresolvedLinks: Count.annotate(about("Links in the whole system that reach nothing the code shows.")),
        unattributedBlocks: Count.annotate(about("Blocks no entry point reaches, so no capability has them.")),
    }).annotate(about("What the analysis could not follow in the whole system.")),
    context: ContextShape,
}).annotate(about("The system's areas, layers and the links between layers, with what could not be followed."));

export type SystemPayload = typeof SystemPayload.Type;
