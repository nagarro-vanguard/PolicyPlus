import { Schema } from "effect";
import { Lines, Text, UnreadId, about, forScripts, ownRecordId } from "../shared-fields";

export const Unread = Schema.Struct({
    id: UnreadId.annotate(ownRecordId),
    lines: Lines.annotate(about("Lines accounted for and deliberately not read.")),
    why: Schema.Literals(["minified", "encodedData"]).annotate(
        about(
            "Why no one reads them: `minified`, a line too long for any reader with little whitespace in it; `encodedData`, a line holding a long base64-like run.",
        ),
    ),
    evidence: Schema.optionalKey(
        Text.annotate(
            forScripts("What showed it, such as the longest line's length: written by the script that found it."),
        ),
    ),
}).annotate(
    about(
        "Lines of a file a script accounted for and deliberately did not give to any agent: opaque content no one can read. Only a script writes it, from detectors, never an agent; it counts toward the Map's tiling of every non-blank line.",
    ),
);
