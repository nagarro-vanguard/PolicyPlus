import { Schema } from "effect";
import { Text, about } from "../shared-fields";

/**
 * The closed list of the kinds of place (surface) a system is worked with through, in the order a reader meets them.
 * Their reader nouns and meanings are in the catalogue (`surface-kinds.json`), which must list exactly these.
 */
export const surfaceKinds = ["screen", "page", "service", "task", "command", "buildStep", "test", "other"] as const;

export type SurfaceKind = (typeof surfaceKinds)[number];

export const SurfaceKind = Schema.Literals(surfaceKinds).annotate(
    about(
        "The kind of place, from a closed list: `screen` (a window, dialog or terminal screen a person works in), `page` (a web page), `service` (operations other programs call), `task` (work a timer or scheduler starts), `command` (run by hand from a shell or a tool), `buildStep` (builds, versions, installs or releases the system), `test` (a group of automated tests) or `other` (no place a reader visits; kept out of the places shown). Its reader noun comes from the catalogue.",
    ),
);

export const SurfaceNoun = Schema.Struct({
    one: Text.annotate(about("The reader's noun for one place of this kind, from the catalogue.")),
    many: Text.annotate(about("The noun for several.")),
}).annotate(about("The words a reader is given for a kind of place."));

export const CapabilitySurface = Schema.Struct({
    key: Schema.String.annotate(about("The place's key, as the system payload's `surfaces` lists it.")),
    name: Schema.String.annotate(about("The place's name; its file's or class's name when no one named it.")),
    kind: SurfaceKind,
    noun: SurfaceNoun,
    unnamed: Schema.Boolean.annotate(about("Whether the name is the code's, because no one named the place.")),
    actions: Schema.Array(Schema.String).annotate(
        about("The record ids of the capability's entry points in this place."),
    ),
    rules: Schema.Array(Schema.String).annotate(
        about("The record ids of the rules decided in code those entry points reach, each once."),
    ),
}).annotate(about("One place (surface) holding entry points of this capability."));
