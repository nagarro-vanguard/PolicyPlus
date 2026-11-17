import { Schema } from "effect";
import { FilePath, Text, about } from "../shared-fields";

export const ReadsAs = Schema.Literals(["text", "notUtf8", "longLine", "crOnly", "utf16", "binary"]).annotate(
    about(
        "How the agent's Read tool sees a file, one reason only (D184): `text`; `notUtf8`, read with some characters lost; `longLine`, a line longer than an agent reads whole (minified, generated, or a record-format export with no line breaks, EBCDIC among them); `crOnly`, carriage returns and no line feed, so Read shows one line; `utf16`; `binary`, a NUL in its first 8,000 bytes.",
    ),
);

export type ReadsAs = typeof ReadsAs.Type;

export const ManifestFile = Schema.Struct({
    path: FilePath.annotate(
        about("The file, relative to its source root, or to the roots' common parent when there are several."),
    ),
    lines: Schema.Int.annotate(
        about("How many lines it has, as the Read tool numbers them; zero when it is binary or empty."),
    ),
    bytes: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).annotate(
        about("Its size in bytes: what an agent must read, the same in every medium."),
    ),
    hash: Schema.String.annotate(about("The sha1 of its bytes: exact copies, and what a job read, by content.")),
    readsAs: ReadsAs,
    encoding: Text.annotate(
        about(
            "The encoding the reading layer found, such as `UTF-8`, `UTF-16LE` or `Shift_JIS`; `binary` for a file with no text.",
        ),
    ),
    encodingUncertain: Schema.optionalKey(Schema.Literal(true)).annotate(
        about("Present only when the detector was not sure of the encoding, so the run page lists the file."),
    ),
    readFrom: Schema.optionalKey(Text).annotate(
        about(
            "Only for a file the agent's Read tool would show wrongly: the copy decoded to UTF-8 with every line break one line feed, relative to the analysis root. Agents read it instead; records cite the source path and the logical line.",
        ),
    ),
    copyOf: Schema.optionalKey(FilePath).annotate(about("The file it is an exact copy of, read only once.")),
}).annotate(about("One listed file: a row of the inventory, or of the manifest once the scope is decided."));

const Count = Schema.Struct({
    files: Schema.Int.annotate(about("How many files.")),
    lines: Schema.Int.annotate(about("How many lines they hold.")),
}).annotate(about("Counts for one folder, as the file list names it."));

export const FileSummary = Schema.Struct({
    byFileExtension: Schema.Record(
        Schema.String,
        Schema.Struct({
            files: Schema.Int.annotate(about("How many files have this extension.")),
            lines: Schema.Int.annotate(about("How many lines they hold.")),
            bytes: Schema.Int.annotate(about("How many bytes they hold.")),
            binary: Schema.Int.annotate(about("How many of them hold a NUL byte, so the agent cannot read them.")),
            notUtf8: Schema.Int.annotate(
                about("How many are text but not valid UTF-8, so the agent reads them with some characters lost."),
            ),
        }).annotate(about("Counts for one extension, as the files' names end.")),
    ).annotate(about("Files listed, by extension, the request's Leave Out applied and before the scope rules.")),
    byFolder: Schema.Record(Schema.String, Count).annotate(
        about(
            "Files listed, by folder two levels deep, the request's Leave Out applied and before the scope rules, to find large trees worth leaving out.",
        ),
    ),
    longLineFiles: Schema.Array(Schema.String).annotate(
        about("Files with a line longer than LONG_LINE_MAX bytes: likely generated or minified."),
    ),
    uncertainEncoding: Schema.Array(Schema.String).annotate(
        about(
            "Files whose encoding the detector was not sure of: decoded as best it could, and listed on the run page.",
        ),
    ),
    roots: Schema.NonEmptyArray(
        Schema.Struct({
            name: Schema.String.annotate(about("The source root, by its folder's name.")),
            commit: Schema.NullOr(Schema.String).annotate(
                about(
                    "The commit its repository was at when the files were listed; null for a root that is no git repository, listed by walking its folders.",
                ),
            ),
            clean: Schema.NullOr(Schema.Boolean).annotate(
                about(
                    "Whether its working tree held no change outside that commit when the files were listed; null for a root that is no git repository.",
                ),
            ),
        }),
    ).annotate(
        about(
            "What was read, as of when (P4e.15, D147): each source root's commit and whether its tree was clean, recorded when the files were listed, since a commit read later states today's, not the one analysed.",
        ),
    ),
    skipped: Schema.Array(
        Schema.Struct({
            path: Schema.String.annotate(about("What was skipped.")),
            why: Schema.Literals(["submoduleNotCheckedOut", "link", "unreadable"]).annotate(
                about(
                    "Why it was not listed: a submodule the clone did not check out, a link (never followed), or a file that cannot be read.",
                ),
            ),
        }),
    ).annotate(about("Tracked entries the listing could not take in, so no scope is lost silently.")),
}).annotate(
    about(
        "What Inventory found in the files the source roots' repositories track, for the stack profile and the person's scope decision.",
    ),
);
