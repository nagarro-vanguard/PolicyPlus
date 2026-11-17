import { Schema } from "effect";
import {
    BlockId,
    CapabilityGroupId,
    CapabilityId,
    CrossCuttingConcernId,
    Lines,
    Text,
    about,
    eachOnce,
    forPerson,
    ownRecordId,
} from "../shared-fields";

export const CapabilityGroup = Schema.Struct({
    id: CapabilityGroupId.annotate(ownRecordId),
    name: Text.annotate(
        forPerson("The area's name in the product's own words, as the people running it would say it."),
    ),
    purpose: Text.annotate(
        forPerson(
            "What the capabilities of the area do together, in one or two sentences, under its name on Start here.",
        ),
    ),
    capabilities: Schema.NonEmptyArray(CapabilityId)
        .check(eachOnce((id: string) => id, "capabilities"))
        .annotate(
            about(
                "The capabilities that belong together here, each once. Every capability is in exactly one area, so What it offers groups every capability by area and none is left out.",
            ),
        ),
}).annotate(
    about(
        "A group of capabilities that belong together, the level between the system and one capability that a person explaining the system names first.",
    ),
);

export const CrossCuttingConcern = Schema.Struct({
    id: CrossCuttingConcernId.annotate(ownRecordId),
    name: Text.annotate(
        forPerson(
            "What the code does here, in the product's own words: for example how text is looked up for the language in use, how a person's rights are checked, how an error is reported.",
        ),
    ),
    purpose: Text.annotate(
        forPerson(
            "What it does for the system and which parts of it lean on it, in one or two sentences, so a reader who rebuilds one capability knows what else it must be given.",
        ),
    ),
    verdict: Schema.Literals(["crossCutting", "sharedDomain", "neither"]).annotate(
        about(
            "`crossCutting`: a mechanism the whole system leans on whatever the business thing is (access control, language lookup, logging and audit, error handling, configuration, validation, caching, transactions). `sharedDomain`: code of the business itself that several capabilities use, which belongs to a capability or a shared model. `neither`: a helper that serves no concern and no business rule.",
        ),
    ),
    blocks: Schema.NonEmptyArray(BlockId)
        .check(eachOnce((id: string) => id, "blocks"))
        .annotate(
            about(
                "The candidate blocks of the brief that belong to this one, each once. Every candidate is in exactly one record, so none is left unexplained, and no block that is not a candidate is named.",
            ),
        ),
    evidence: Schema.NonEmptyArray(Lines).annotate(
        about("Lines of the analysed code that show what the blocks do together; at least one."),
    ),
}).annotate(
    about(
        "A cluster of blocks that many capabilities share and that are called from more than one layer, named for what it does and judged: a mechanism that cuts across the system, shared business code, or neither. The candidates are found by script; this record is the judgement, so a concern a rebuild must carry (language lookup, access control) is named where the code shows it.",
    ),
);
