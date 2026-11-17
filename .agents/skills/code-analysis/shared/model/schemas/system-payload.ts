import { Schema } from "effect";
import { Text, about } from "../shared-fields";
import { ExternalSystem } from "./external-system";
import { Count, ContextShape, LayerTouched } from "./payloads";

export const SystemPayload = Schema.Struct({
    purpose: Schema.String.annotate(about("What the system is for and who uses it; empty when no fact states it.")),
    capabilities: Schema.Array(
        Schema.Struct({
            id: Schema.String.annotate(about("The capability's record id, which names its payload file.")),
            name: Text.annotate(about("The capability's name.")),
            purpose: Text.annotate(about("What the capability offers, in one or two sentences.")),
            screens: Count.annotate(about("How many screens its entry points are grouped into.")),
            actions: Count.annotate(about("How many entry points it has.")),
            rules: Count.annotate(about("How many rules are decided in code it reaches.")),
        }).annotate(about("One capability and the file that holds its payload.")),
    ).annotate(about("Every capability of the system, each with the record id that names its payload file.")),
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
        }).annotate(about("One layer of the system.")),
    ).annotate(about("The layers of the system.")),
    screens: Schema.Array(
        Schema.Struct({
            key: Schema.String.annotate(
                about(
                    "The screen's address: the path of its page file without the extension, with the folders every page shares left off.",
                ),
            ),
            name: Schema.String.annotate(about("The screen's name: its page file's name without the extension.")),
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
    }).annotate(about("How many entry points each kind of starter has, across the system.")),
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
