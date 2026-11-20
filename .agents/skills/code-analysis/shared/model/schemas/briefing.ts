import { Schema } from "effect";
import {
    BlockId,
    CapabilityGroupId,
    CapabilityId,
    CrossCuttingConcernId,
    EntityId,
    ExternalSystemId,
    LayerId,
    LifecycleId,
    Lines,
    ScreenId,
    SystemPartId,
    SystemWordsId,
    ViewId,
    Text,
    about,
    eachOnce,
    forPerson,
    ownRecordId,
} from "../shared-fields";
import { viewFields } from "../../views/view";
import { SurfaceKind } from "./surface-kind";

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

export const Screen = Schema.Struct({
    id: ScreenId.annotate(ownRecordId),
    name: Text.annotate(
        forPerson(
            "The place's name in the words of the people who use it (Book a flight, Manage aircraft, Nightly ping of weblog sites), never a file, class or method name.",
        ),
    ),
    purpose: Text.annotate(
        forPerson("What is done there, in one sentence, so the place can be told from its neighbours."),
    ),
    kind: SurfaceKind,
    places: Schema.NonEmptyArray(Schema.String)
        .check(eachOnce((key: string) => key, "places"))
        .annotate(
            about(
                "The brief's candidate places, by key, that make up this one: a page's markup, its code behind and its browser script are one page; one class's operations are one service. Every candidate is in exactly one record.",
            ),
        ),
}).annotate(
    about(
        "A place (surface) the system is worked with through, as its people would name it: a screen, a page, a service, a scheduled task, a command or a build step, judged from what the candidates show. The candidates are found by script from where every entry point lies, whoever starts it; tests are grouped by script and never named here. This record names the place, says what it is for and chooses its kind from the closed list; a candidate judged `other` is kept out of the places shown, its entry points listed as unplaced.",
    ),
);

export const View = Schema.Struct({
    id: ViewId.annotate(ownRecordId),
    ...viewFields,
}).annotate(
    about(
        "A picture of the system as it is that a reader needs to understand it: the question it answers, what to take from it, its boxes and the arrows between them, written as the reader should see it. A box may cite the records it rests on (parts, layers, outside systems, kinds of data, capabilities, screens, lifecycles).",
    ),
);

const Term = Schema.Struct({
    term: Text.annotate(forPerson("The word or phrase as the analysis writes it.")),
    means: Text.annotate(
        forPerson("What it means, in plain words, in at most twenty-five words, without the term itself."),
    ),
}).annotate(about("One term a reader of the analysis may not know."));

export const SystemWords = Schema.Struct({
    id: SystemWordsId.annotate(ownRecordId),
    name: Schema.optionalKey(
        Text.annotate(
            forPerson(
                "The system's name as its people say it, in at most five words, written as the brief, the code's own titles or the request's documents write it; left out when nothing names it, and the system is then named after its folder.",
            ),
        ),
    ),
    terms: Schema.optionalKey(
        Schema.Array(Term)
            .check(eachOnce((term: { readonly term: string }) => term.term.toLowerCase(), "terms"))
            .annotate(
                about(
                    "The product's own words a newcomer would stop at (a kind of file, a setting, a trade term), each once and each used in the brief; kinds of data are defined by script and need no term here.",
                ),
            ),
    ),
}).annotate(
    about(
        "The words the system is read in: its name, and the terms a reader must be told on first use. At most one per briefing. The name becomes the system's name in the payloads; the terms join the glossary the script derives from the kinds of data.",
    ),
);
