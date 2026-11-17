import { Schema } from "effect";
import { about } from "../shared-fields";

export const MapRegistryKind = Schema.Literals(["codeKinds", "externalSystems"]).annotate(
    about("Which of the Map's two registries: code kinds with their layers, or external systems."),
);

export type MapRegistryKind = typeof MapRegistryKind.Type;

export const mapRegistryNames: Readonly<Record<MapRegistryKind, string>> = {
    codeKinds: "the code kinds",
    externalSystems: "the external systems",
};

export const MapRegistries = Schema.Struct({
    lead: Schema.String.annotate(
        about(
            "The Map job that runs first, alone, by its id: the one holding the most kinds of file and the most parts, chosen by script, so the registries hold entries before the rest run in parallel.",
        ),
    ),
    order: Schema.Array(Schema.String).annotate(about("Every Map job in cut order, the order it runs.")),
    proposing: Schema.Array(
        Schema.Struct({
            registry: MapRegistryKind,
            jobId: Schema.String.annotate(about("The proposing job's id: the name of its folder.")),
        }),
    ).annotate(about("The jobs merging a registry's duplicates, made once every Map job is decided.")),
    merging: Schema.Boolean.annotate(
        about(
            "Whether the merging jobs were made from the entries the Map jobs wrote, to merge duplicates (P1.38): set once every Map job is decided.",
        ),
    ),
}).annotate(about("Where the Map's registries stand: the lead job, the order, the merging jobs and the merge."));
