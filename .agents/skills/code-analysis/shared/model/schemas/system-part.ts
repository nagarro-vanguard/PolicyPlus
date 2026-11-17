import { Schema } from "effect";
import { Lines, SystemPartId, Text, about, eachOnce, forPerson, forScripts, ownRecordId } from "../shared-fields";

export const SystemPart = Schema.Struct({
    id: SystemPartId.annotate(ownRecordId),
    name: Text.annotate(forPerson("What the people who run it call it, at most 8 words.")),
    kind: Text.annotate(
        forScripts(
            "What kind of part it is, by its id in the catalogue's part kinds, chosen by what each kind means there.",
        ),
    ),
    purpose: Text.annotate(forPerson("What it is for, in one line, and who uses it.")),
    folders: Schema.NonEmptyArray(
        Text.annotate(
            about(
                "A folder, relative to the source root as every cited file is, or `.` for the whole root; a file belongs to the part with the longest folder holding it.",
            ),
        ),
    )
        .check(eachOnce((folder: string) => folder, "folders"))
        .annotate(
            forScripts(
                "The folders that hold its code, each once, as the code's tree spells them: paths a script matches.",
            ),
        ),
    evidence: Schema.NonEmptyArray(Lines).annotate(
        about(
            "Lines that show it is built, run or scheduled as one thing: a build definition, job control, a start-up file.",
        ),
    ),
}).annotate(
    about(
        "A part of the system the code builds and someone runs, deploys or schedules (D142), of a kind the catalogue lists. Inventory writes one for each; how each runs is How it runs' answer, and its size, languages and layers are derived, never written.",
    ),
);
