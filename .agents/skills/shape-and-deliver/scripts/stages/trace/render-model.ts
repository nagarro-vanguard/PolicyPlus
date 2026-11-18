import { Schema } from "effect";
import { about, recordTypes, storedOf, Text } from "../../core/records";

export const TraceFound = Schema.Struct({
    criteria: Schema.Array(
        Schema.Struct({ ac: Text, name: Text, text: Text, steps: Schema.Array(storedOf(recordTypes.PathStep)) }),
    ),
}).annotate(about("Each criterion's path through the product."));
