import { Schema } from "effect";
import { about, recordTypes, storedOf, Text } from "../../core/records";

export const ChangesFound = Schema.Struct({
    decisions: Schema.Array(storedOf(recordTypes.DesignDecision)),
    views: Schema.Array(storedOf(recordTypes.PlanView)),
    layers: Schema.Array(
        Schema.Struct({
            layer: Text,
            files: Schema.Array(
                Schema.Struct({
                    change: storedOf(recordTypes.ChangedFile),
                    /** True for a file of a design run that is outside its variants folder and is not generated: the product itself changes. */
                    product: Schema.Boolean,
                    before: Schema.String,
                    after: Schema.String,
                }),
            ),
        }),
    ),
}).annotate(
    about(
        "The design decisions that shape the plan, the diagrams that show the design, then every file it changes, layer by layer in the order layers depend on each other, with its text before and after.",
    ),
);
