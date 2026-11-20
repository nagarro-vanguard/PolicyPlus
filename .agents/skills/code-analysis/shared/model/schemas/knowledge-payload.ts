import { Schema } from "effect";
import { Text, about } from "../shared-fields";
import { Count } from "./payloads";

const Evidence = Schema.Struct({
    file: Schema.String.annotate(about("The file, relative to the source folder.")),
    firstLine: Count.annotate(about("The first line of the place the statement rests on.")),
    lastLine: Count.annotate(about("The last line of that place.")),
}).annotate(about("One place in the code a statement rests on."));

const Subject = Schema.Struct({
    kind: Schema.Literals(["system", "part", "technology", "capability", "entity"]).annotate(
        about("What the statement is about: the whole system, a part, a technology, a capability or a kind of data."),
    ),
    id: Schema.String.annotate(about("The subject's record id; empty for the whole system.")),
    name: Schema.String.annotate(about("The subject's name; `The whole system` for the system.")),
}).annotate(about("What a statement is about."));

const Version = Schema.Struct({
    label: Schema.String.annotate(
        about("The version as a reader says it, for example `.NET Framework 4.5.2`; empty when none is stated."),
    ),
    parts: Schema.Array(Schema.String).annotate(about("The record ids of the parts that use it at that version.")),
}).annotate(about("One version of a technology and the parts that use it."));

const Place = Schema.Struct({
    id: Schema.String.annotate(about("The record id.")),
    name: Schema.String.annotate(about("The name.")),
}).annotate(about("A named place a statement reaches."));

const Finding = Schema.Struct({
    id: Schema.String.annotate(about("The finding's record id.")),
    statement: Text.annotate(about("What the code shows, in plain words.")),
    subject: Subject,
    evidence: Schema.Array(Evidence).annotate(about("The places in the code that show it.")),
}).annotate(about("One observation a risk rests on."));

const Named = Schema.Struct({
    id: Schema.String.annotate(about("The record id.")),
    name: Schema.String.annotate(about("The name.")),
}).annotate(about("A record and its name."));

const Link = Schema.Struct({
    from: Schema.String.annotate(about("The record id the links leave.")),
    to: Schema.String.annotate(about("The record id the links reach.")),
    kind: Schema.String.annotate(about("How they reach: call, reads, saves, renders, request or dispatches.")),
    links: Count.annotate(about("How many links of that kind.")),
}).annotate(about("The links of one kind from one part to another part or to an outside system."));

export const KnowledgePayload = Schema.Struct({
    parts: Schema.Array(
        Schema.Struct({
            id: Schema.String.annotate(about("The part's record id.")),
            name: Text.annotate(about("The part's name.")),
            kind: Schema.String.annotate(
                about("What kind of part it is: program, site, service, database, library, tool or tests."),
            ),
            purpose: Text.annotate(about("What the part is for, in plain words.")),
            folders: Schema.Array(Schema.String).annotate(about("The folders of the source it lives in.")),
            technologies: Schema.Array(Schema.String).annotate(about("The names of the technologies it uses.")),
            files: Count.annotate(about("How many files of the source it holds.")),
            product: Schema.optionalKey(
                Schema.Boolean.annotate(
                    about("Whether the part is the product: false for a part of kind tests or tool."),
                ),
            ),
        }).annotate(about("One part of the system: something that is built, run or shipped.")),
    ).annotate(about("The parts of the system.")),
    technologies: Schema.Array(
        Schema.Struct({
            id: Schema.String.annotate(about("The technology's record id.")),
            name: Text.annotate(about("The technology's name.")),
            kind: Schema.String.annotate(about("What kind of technology it is, for example language or framework.")),
            versions: Schema.Array(Version).annotate(about("The versions in use and the parts that use each.")),
        }).annotate(about("One technology the system is built with.")),
    ).annotate(about("The technologies the system is built with.")),
    answers: Schema.Array(
        Schema.Struct({
            id: Schema.String.annotate(about("The fact's record id.")),
            aspect: Schema.String.annotate(about("The question it answers, by its id in the catalogue.")),
            question: Text.annotate(about("The question, in a reader's words.")),
            group: Text.annotate(about("The heading the question sits under.")),
            subject: Subject,
            statement: Text.annotate(about("The answer, in plain words.")),
            basis: Schema.Literals(["observed", "concluded"]).annotate(
                about("Whether the lines show it (`observed`) or it is concluded from other facts (`concluded`)."),
            ),
            evidence: Schema.Array(Evidence).annotate(about("The places it rests on; none for a concluded answer.")),
        }).annotate(about("One answer to one of a reader's questions about one subject.")),
    ).annotate(about("What the analysis found about how the system runs, is built and behaves, by question.")),
    assumptions: Schema.Array(
        Schema.Struct({
            id: Schema.String.annotate(about("The fact's record id.")),
            aspect: Schema.String.annotate(about("The question it answers, by its id in the catalogue.")),
            question: Text.annotate(about("The question, in a reader's words.")),
            subject: Subject,
            statement: Text.annotate(about("What is assumed, in plain words.")),
            why: Text.annotate(about("Why no file settles it.")),
            confirmWith: Text.annotate(about("What would confirm it, in words.")),
            ifWrong: Text.annotate(about("What changes if it is wrong.")),
            evidence: Schema.Array(Evidence).annotate(about("The nearest lines.")),
        }).annotate(about("One thing the analysis goes with until it is confirmed.")),
    ).annotate(about("What the analysis assumes, with how to confirm each.")),
    lifecycles: Schema.Array(
        Schema.Struct({
            id: Schema.String.annotate(about("The life's record id.")),
            entity: Named.annotate(about("The kind of data whose life this is.")),
            states: Schema.Array(Text).annotate(
                about(
                    "Its states in the order a record passes them; a transition names one by its number, the first being 1.",
                ),
            ),
            transitions: Schema.Array(
                Schema.Struct({
                    from: Schema.Array(Count).annotate(
                        about("The states it leaves, by number; empty when the record is created."),
                    ),
                    to: Count.annotate(about("The state it reaches, by number.")),
                    file: Schema.String.annotate(about("The file that makes the change.")),
                    line: Count.annotate(about("The first line that makes it.")),
                }),
            ).annotate(about("Where the code moves a record from one state to another, or creates it in one.")),
        }).annotate(about("How one kind of data changes over time.")),
    ).annotate(about("The lives of the kinds of data that have states.")),
    partLinks: Schema.Array(Link).annotate(
        about("The links between parts, and from parts to outside systems, by kind."),
    ),
    dataUse: Schema.Array(
        Schema.Struct({
            capability: Named.annotate(about("The capability.")),
            entity: Named.annotate(about("The kind of data.")),
            saves: Schema.Boolean.annotate(about("Whether the capability's code saves it.")),
            reads: Schema.Boolean.annotate(about("Whether the capability's code reads it.")),
        }),
    ).annotate(about("Which capability's code saves or reads which kind of data.")),
    figures: Schema.Array(
        Schema.Struct({
            id: Schema.String.annotate(about("The figure's record id.")),
            kind: Schema.Literals(["parts", "integration", "states", "data", "layers"]).annotate(
                about("The family of facts the picture draws."),
            ),
            question: Text.annotate(about("The question the picture answers.")),
            caption: Text.annotate(about("What to take from it.")),
            records: Schema.Array(Schema.String).annotate(
                about("The record ids to draw; empty draws everything of that shape."),
            ),
        }).annotate(about("One picture the analysis judged a reader needs.")),
    ).annotate(about("The pictures a reader needs, in the order the briefing chose them.")),
    entities: Schema.optionalKey(
        Schema.Array(
            Schema.Struct({
                id: Schema.String.annotate(about("The kind of data's record id.")),
                name: Text.annotate(about("Its business name.")),
                purpose: Text.annotate(about("What it is, in one line.")),
                stores: Schema.Array(Schema.String).annotate(
                    about("The names of the stores it is kept in; none when the code shows none."),
                ),
                capabilities: Schema.Array(Schema.String).annotate(
                    about("The record ids of the capabilities whose code saves or reads it."),
                ),
            }).annotate(about("One kind of data the business knows.")),
        ).annotate(about("Every kind of data the analysis found, by name.")),
    ),
    terms: Schema.optionalKey(
        Schema.Array(
            Schema.Struct({
                term: Text.annotate(about("The word or phrase, as the analysis writes it.")),
                means: Text.annotate(about("What it means, in plain words, without the term itself.")),
                from: Schema.Literals(["entity", "briefing"]).annotate(
                    about(
                        "Where it comes from: `entity`, a kind of data and its purpose, derived by code; `briefing`, a word the briefing defined.",
                    ),
                ),
            }).annotate(about("One term a reader may not know.")),
        ).annotate(
            about(
                "The glossary: terms a reader meets in the analysis's own text, each defined once; a term the text never uses is left out.",
            ),
        ),
    ),
    risks: Schema.Array(
        Schema.Struct({
            id: Schema.String.annotate(about("The risk's record id.")),
            statement: Text.annotate(about("What can happen, to whom and where, in plain words.")),
            category: Schema.String.annotate(about("The kind of risk, by its id in the catalogue.")),
            categoryWords: Text.annotate(about("The kind of risk, in words.")),
            severity: Schema.Literals(["high", "medium", "low"]).annotate(about("How serious it is.")),
            subject: Subject,
            findings: Schema.Array(Finding).annotate(
                about("The observations it rests on; itself when it rests on none."),
            ),
            places: Schema.Struct({
                capabilities: Schema.Array(Place).annotate(about("The capabilities whose code the findings lie in.")),
                parts: Schema.Array(Place).annotate(about("The parts the findings lie in.")),
                files: Schema.Array(Schema.String).annotate(about("The files the findings lie in.")),
            }).annotate(
                about("Where the risk reaches, found from the findings' lines by script, never written by a person."),
            ),
        }).annotate(
            about(
                "One risk: what can harm the business or block a change, with its findings and the places it reaches.",
            ),
        ),
    ).annotate(about("The risks, most serious first.")),
}).annotate(
    about(
        "What the analysis knows about the system as a whole, beyond its capabilities: its parts and technologies, its answers, its assumptions and its risks.",
    ),
);

export type KnowledgePayload = typeof KnowledgePayload.Type;
