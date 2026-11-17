import { Schema } from "effect";
import { Lines, Text, about } from "../shared-fields";

const Window = Schema.Struct({
    ...Lines.fields,
    readFrom: Schema.optionalKey(Text).annotate(
        about(
            "Only for a file the agent's Read tool would show wrongly: the copy to read instead, decoded to UTF-8 with every line break one line feed, relative to the analysis root. Records cite the file named above and its logical lines.",
        ),
    ),
}).annotate(about("A window of one file: its lines, and where to read them when the file needs a decoded copy."));

export const MapJobList = Schema.Array(Schema.String).annotate(
    about(
        "The Map's job ids, in the order they were cut; written only by the cut, so a job's own changes never rewrite it.",
    ),
);

export const MapJob = Schema.Struct({
    lines: Schema.NonEmptyArray(Window).annotate(
        about("The job's windows: whole files, or one window of a file larger than the read budget."),
    ),
}).annotate(
    about(
        "One Map job, in its own file: the lines it reads, each line in exactly one job, and its state, so a step on one job reads and writes only this file.",
    ),
);
