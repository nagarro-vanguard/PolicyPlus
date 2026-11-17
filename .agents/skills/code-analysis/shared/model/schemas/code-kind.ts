import { Schema } from "effect";
import {
    CodeKindId,
    LayerId,
    Lines,
    Text,
    about,
    forAgent,
    forPerson,
    mergedFromOf,
    ownRecordId,
} from "../shared-fields";

const codeKindFields = {
    id: CodeKindId.annotate(ownRecordId),
    name: Text.annotate(
        forPerson(
            "What it is, in plain words for what it does (a web page, a web API endpoint, a stored procedure, a batch program, a data class), never the code's own marker.",
        ),
    ),
    layer: LayerId.annotate(about("The layer it belongs to.")),
    kind: Schema.Literals(["runs", "shapesData"]).annotate(
        about("Whether its pieces are code that runs, or declarations of the shape of data."),
    ),
    membershipRule: Text.annotate(
        forAgent(
            "How one of its pieces is told in any part of the code (the marker: a base type, an attribute, a file suffix), and what belongs to a neighbouring code kind instead.",
        ),
    ),
    evidence: Schema.NonEmptyArray(Lines).annotate(
        about("Lines of the analysed code that show its pieces, never framework documents; at least one."),
    ),
    mergedFrom: mergedFromOf(CodeKindId),
};

export const CodeKind = Schema.Struct(codeKindFields).annotate(
    about(
        "One recurring kind of code the system is built from, an entry of the Map's code-kinds registry: each block or data definition takes exactly one, so two whose pieces overlap, or one split by where it lives, make that choice arbitrary. Proposed from How it runs' facts, or written by a Map job whose piece none fits, and merged with its duplicates once every Map job is decided (P1.38).",
    ),
);
