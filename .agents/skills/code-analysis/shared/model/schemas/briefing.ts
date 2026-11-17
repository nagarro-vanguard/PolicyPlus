import { Schema } from "effect";
import {
    BlockId,
    CapabilityGroupId,
    CapabilityId,
    CrossCuttingConcernId,
    EntityId,
    ExternalSystemId,
    FigureId,
    LayerId,
    LifecycleId,
    Lines,
    ScreenId,
    SystemPartId,
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

export const Screen = Schema.Struct({
    id: ScreenId.annotate(ownRecordId),
    name: Text.annotate(
        forPerson(
            "The screen's name in the words of the people who use it (Book a flight, Manage aircraft), never a file or class name.",
        ),
    ),
    purpose: Text.annotate(
        forPerson("What a person does there, in one sentence, so the screen can be told from its neighbours."),
    ),
    kind: Schema.Literals(["screen", "other"]).annotate(
        about(
            "`screen`: a page, window or dialog a person works in. `other`: something a person starts that is no screen: a command, a build or install step, a test, the start of a scheduled task. `other` is kept out of the screens a reader sees.",
        ),
    ),
    places: Schema.NonEmptyArray(Schema.String)
        .check(eachOnce((key: string) => key, "places"))
        .annotate(
            about(
                "The brief's candidate screens, by key, that make up this one: a page's markup, its code behind and its browser script are one screen. Every candidate is in exactly one record.",
            ),
        ),
}).annotate(
    about(
        "A screen as the people who use the system would name it, judged from what the candidates show: the unit the pages group a person's actions under. The candidates are found by script from where a person's actions start; this record names and judges them.",
    ),
);

const FigureSubject = Schema.Union([SystemPartId, ExternalSystemId, LifecycleId, EntityId, LayerId]);

export const Figure = Schema.Struct({
    id: FigureId.annotate(ownRecordId),
    kind: Schema.Literals(["parts", "integration", "states", "data", "layers", "other"]).annotate(
        about(
            "The shape of picture, from the brief's menu of what the records can draw: `parts` (what the system is made of), `integration` (what it reaches outside itself), `states` (how one kind of data changes over time), `data` (which capabilities keep which kinds of data), `layers` (how the code is layered), or `other` for a picture the menu lacks, which is listed as wanted and not drawn.",
        ),
    ),
    question: Text.annotate(
        forPerson("The question a reader has that this picture answers, in their words, in one sentence."),
    ),
    caption: Text.annotate(
        forPerson(
            "What to take from the picture, in one or two sentences, in plain words. It states no count: the page counts.",
        ),
    ),
    records: Schema.Array(FigureSubject).annotate(
        about(
            "What to draw, by record id, from the menu line of its kind: parts, external systems, lifecycles, kinds of data or layers. Empty draws everything the menu line offers; for `other` it is empty.",
        ),
    ),
    wanted: Schema.optionalKey(
        Text.annotate(forPerson("For `other`: the picture wanted and what it would show; no other kind has it.")),
    ),
}).annotate(
    about(
        "A picture the system needs to be understood: the question it answers, the shape it takes, what it shows and what to take from it. The script draws it from the records named; the agent never draws an edge or writes a count.",
    ),
);
