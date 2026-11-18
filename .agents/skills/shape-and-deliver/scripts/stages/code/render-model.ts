import { Schema } from "effect";
import { LayerChecks } from "../../core/documents";
import { about, recordTypes, storedOf, Text } from "../../core/records";

export const CodeFound = Schema.Struct({
    commit: Text.annotate(about("The commit holding the plan's code.")),
    checks: Schema.optionalKey(LayerChecks).annotate(
        about("The run of every layer's checks after the code commit, once it ran."),
    ),
    deviations: Schema.Array(storedOf(recordTypes.Deviation)),
}).annotate(about("The code as built: its commit, its checks, and where the repairs departed from the plan."));
