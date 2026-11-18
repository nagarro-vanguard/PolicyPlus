import { Schema } from "effect";
import { about, recordTypes, storedOf, Text } from "../../core/records";

export const TestsFound = Schema.Struct({
    criteria: Schema.Array(
        Schema.Struct({
            ac: Text,
            name: Text,
            tests: Schema.Array(storedOf(recordTypes.AcceptanceTest)),
            thresholds: Schema.Array(storedOf(recordTypes.LoadThreshold)),
        }),
    ),
    files: Schema.Array(
        Schema.Struct({ path: Text, layer: Text, before: Schema.String, after: Schema.String }),
    ).annotate(about("Every file the tests add, in the layer that proves it, with its text.")),
    support: Schema.Array(storedOf(recordTypes.TestSupportFile)),
}).annotate(about("How each criterion will be proved, and every file the tests add."));
