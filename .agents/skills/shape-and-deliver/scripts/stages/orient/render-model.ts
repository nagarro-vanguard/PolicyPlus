import { Schema } from "effect";
import { about, recordTypes, storedOf, Text } from "../../core/records";

export const OrientFound = Schema.Struct({
    knowledge: Schema.Boolean.annotate(about("Whether the codebase declares a knowledge base the orientation reads.")),
    entities: Schema.Array(storedOf(recordTypes.EntityTouched)),
    invariants: Schema.Array(
        Schema.Struct({
            invariant: storedOf(recordTypes.InvariantAtRisk),
            keptBy: Schema.Array(Text).annotate(about("The reasons of the changes that keep it from breaking.")),
            provenBy: Schema.Array(Text).annotate(about("What the tests that prove it still holds show.")),
            files: Schema.Array(Text).annotate(about("The files of the changes that keep it.")),
            titles: Schema.Array(Text).annotate(about("The titles of the tests that prove it.")),
        }),
    ),
    journeys: Schema.Array(storedOf(recordTypes.JourneyAffected)),
    seams: Schema.Array(storedOf(recordTypes.SeamCrossed)),
}).annotate(
    about(
        "What the story touches in the product: its entities, the facts at risk and what protects each, and its seams.",
    ),
);
