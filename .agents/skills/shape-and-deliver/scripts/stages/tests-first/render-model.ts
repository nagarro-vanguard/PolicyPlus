import { Schema } from "effect";
import { Ran } from "../../core/criteria";
import { Kind, LayerChecks } from "../../core/documents";
import { about, Text } from "../../core/records";

export const TestsFirstFound = Schema.Struct({
    kind: Kind,
    commit: Text.annotate(about("The commit holding the plan's tests alone.")),
    checks: Schema.optionalKey(LayerChecks).annotate(
        about("The run of every layer's checks on today's code, once it ran."),
    ),
    criteria: Schema.Array(Schema.Struct({ name: Text, text: Text, before: Ran })),
}).annotate(about("The tests committed alone, and how each criterion's tests behaved on today's code."));
