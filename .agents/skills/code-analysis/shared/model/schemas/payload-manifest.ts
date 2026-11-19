import { Schema } from "effect";
import { about } from "../shared-fields";

/**
 * The version of the payloads' contract with the code that reads them (the app, the bundles, `compose`, the plan and
 * target skills). It changes by hand, and only when a payload changes in a way a reader of the old version would
 * misread: a field removed, renamed or given another meaning. A field added as optional keeps the version.
 */
export const payloadContractVersion = 1;

export const PayloadKind = Schema.Literals(["system", "capability", "knowledge", "bundle", "journeys"]).annotate(
    about("A kind of payload file, each with its own JSON Schema."),
);

export const PayloadManifest = Schema.Struct({
    contractVersion: Schema.Literal(payloadContractVersion).annotate(
        about(
            "The version of the payloads' contract with their readers; a reader that knows another version refuses the payloads rather than misread them.",
        ),
    ),
    writer: Schema.Struct({
        skill: Schema.Literal("code-analysis").annotate(about("The skill that wrote the payloads.")),
        version: Schema.String.annotate(
            about(
                "Which writer wrote them: a digest of the JSON Schema of every kind of payload, so it changes exactly when a payload's shape does.",
            ),
        ),
    }).annotate(about("What wrote the payloads.")),
    files: Schema.Array(
        Schema.Struct({
            path: Schema.String.annotate(about("The payload's file, relative to the payloads' folder.")),
            kind: PayloadKind.annotate(about("Which kind of payload it is, and so which schema it follows.")),
            schema: Schema.String.annotate(about("Its JSON Schema's file, relative to the payloads' folder.")),
            digest: Schema.String.annotate(
                about("The SHA-1 of the file's text, so a reader can tell the payloads it was built from."),
            ),
        }).annotate(about("One payload file the writer wrote.")),
    ).annotate(
        about("Every payload file written, in a fixed order: the system, each capability by file name, then the rest."),
    ),
}).annotate(
    about(
        "What `payloads/` holds and which contract it follows: written last by write-payloads, so a folder with no manifest, or one naming other files, was not written whole.",
    ),
);

export type PayloadManifest = typeof PayloadManifest.Type;

export const ManifestVersion = Schema.Struct({
    contractVersion: Schema.Number.annotate(about("The contract version the payloads were written for.")),
}).annotate(
    about("Only the contract version of a manifest, read first so a reader can refuse a version it does not know."),
);
