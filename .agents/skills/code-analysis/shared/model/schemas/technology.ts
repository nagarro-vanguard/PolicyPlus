import { Schema } from "effect";
import {
    Lines,
    Pattern,
    SystemPartId,
    TechnologyId,
    Text,
    about,
    copiedFromCode,
    eachOnce,
    forPerson,
    forScripts,
    ownRecordId,
} from "../shared-fields";

const purposeWhereItDoesSomething = Schema.makeFilter(
    (entry: { readonly kind: string; readonly purpose?: string }) =>
        entry.purpose !== undefined ||
        entry.kind === "language" ||
        entry.kind === "notCode" ||
        "a framework, platform or library says what it does for this system: write its purpose",
);

const partsWhereItIsUsed = Schema.makeFilter(
    (entry: { readonly kind: string; readonly uses: ReadonlyArray<{ readonly parts: readonly string[] }> }) =>
        entry.kind === "notCode" ||
        entry.uses.every((use) => use.parts.length > 0) ||
        "each use names the parts that use it; only a kind of file that is not code may name none",
);

export const Technology = Schema.Struct({
    id: TechnologyId.annotate(ownRecordId),
    kind: Schema.Literals(["language", "framework", "platform", "library", "notCode"]).annotate(
        about(
            "What kind of thing it is; A `framework` is one whose rules code in scope is written to, deciding how work starts and moves through it; a `platform` is what code in scope runs on. How it runs studies each framework and platform on its own, one after another, so a service the code only calls (the Map records it as an external system) and a tool used only to build are neither. A `library` is code the code in scope imports or loads and calls.",
        ),
    ),
    name: Text.annotate(
        forPerson("Its name, at most 8 words: a name, never a description; what it is for goes in `purpose`."),
    ),
    purpose: Schema.optionalKey(
        Text.annotate(
            forPerson(
                "What it does for this system, in one line; written for every framework, platform and library, left out for a language or a kind of file.",
            ),
        ),
    ),
    covers: Schema.optionalKey(Schema.NonEmptyArray(Pattern)).annotate(
        forScripts(
            "The files it covers, for a language or a kind of file that is not code, as .gitignore patterns over the manifest's paths: `*.<extension>` for every file with that extension, and a folder or a path for files with no extension, as exported members often are. Every file in scope that is not binary is covered by one technology.",
        ),
    ),
    uses: Schema.NonEmptyArray(
        Schema.Struct({
            version: Schema.optionalKey(
                Text.annotate(
                    copiedFromCode(
                        "The version these parts use, word for word as one of its cited lines shows it; left out when no cited line shows one.",
                    ),
                ),
            ),
            versionForReader: Schema.optionalKey(
                Text.annotate(
                    forPerson(
                        "The version as the person knows it, where the code writes it otherwise (an internal number for a released product's name), always beside `version`, which the cited lines show; left out when the version as written reads plainly.",
                    ),
                ),
            ),
            parts: Schema.Array(SystemPartId)
                .check(eachOnce((id: string) => id, "parts"))
                .annotate(
                    about(
                        "The parts of the system that use it at this version, each once; a kind of file that is not code, such as a repository's own settings, may name none.",
                    ),
                ),
            evidence: Schema.NonEmptyArray(Lines).annotate(about("The lines that show these parts use it.")),
        }),
    ).annotate(
        about(
            "Where it is used: one use per version, each with the parts that use it and the lines that show it. A part's stack is read from these, never written on the part.",
        ),
    ),
})
    .check(purposeWhereItDoesSomething, partsWhereItIsUsed)
    .annotate(about("Something the code is built with."));
