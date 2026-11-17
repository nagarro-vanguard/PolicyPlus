import { Schema } from "effect";
import {
    BlockId,
    CodeKindId,
    DataDefinitionId,
    ExternalSystemId,
    FilePath,
    LineNumber,
    Lines,
    LinkId,
    SpanId,
    Text,
    about,
    copiedFromCode,
    eachOnce,
    exactlyOneOf,
    forAgent,
    forPerson,
    forScripts,
    ownRecordId,
} from "../shared-fields";

export const Block = Schema.Struct({
    id: BlockId.annotate(ownRecordId),
    lines: Lines.annotate(about("Its first line to its last; the basis of every position lookup.")),
    writtenAs: Schema.optionalKey(Text).annotate(
        copiedFromCode("As the code writes it; absent when the code gives it none. Shown in titles and evidence."),
    ),
    container: Schema.optionalKey(Text).annotate(
        copiedFromCode("The class, module or program it sits in, as written in its file; shown in titles."),
    ),
    codeKind: CodeKindId.annotate(
        about(
            "The code kind it is (its layer follows from it): an entry of the registry, or one this job writes when none fits (P1.38).",
        ),
    ),
    entryPoint: Schema.optionalKey(
        Schema.Struct({
            reachedBy: Text.annotate(forPerson("How work reaches it, with its address; its page shows it.")),
            startedBy: Schema.Literals(["person", "schedule", "otherSystem"]).annotate(
                about(
                    "Who starts the work here: a person, through what they see and do; a schedule, such as a timer or a job scheduler; or another system, through a call or a message from outside. Its part's page counts the entry points by who starts them, and each capability's page says it.",
                ),
            ),
            purpose: Text.annotate(
                forPerson(
                    "What it does, in one line, from its own lines, title and address: the only place the Map says what code does, shown on its page and its capability's.",
                ),
            ),
            evidence: Schema.NonEmptyArray(Lines).annotate(
                about(
                    "The lines that show something outside the code starts it (a route, a registration, a schedule entry, the wiring of a handler), anywhere in scope.",
                ),
            ),
        }),
    ).annotate(
        about(
            "Present when something outside the code starts the block: an entry point is where work enters the system from outside it, and every flow is traced from one, its page listing all the flow reaches. The code kind says what a block is, never whether it starts work.",
        ),
    ),
}).annotate(
    about(
        "A piece of code that runs, or a member declared without a body that other code calls and others implement (an interface or abstract member), the unit every flow passes through: an entry point's page lists each block its flow reaches, and blocks no entry point reaches are reported, so a block missed drops its lines out of every flow.",
    ),
);

export const LinkKind = Schema.Literals([
    "call",
    "request",
    "renders",
    "leadsTo",
    "saves",
    "reads",
    "dispatches",
]).annotate(
    about(
        'How it reaches: a flow traced from an entry point follows `call` and `renders`, and a `saves` or `reads` that lands on a block (a database view, a stored query); `request` joins one entry point to another; `leadsTo` is what navigation offers; `saves` and `reads` name the data a flow keeps or uses; `dispatches` is written in the block that can run in place of another, at the lines that show it (an override, an interface or protocol implementation, a handler registered for a member), and points at that other block, so a flow that reaches it goes on into every block that can run in its place: it means "may run", never "does run". A wrong kind sends a flow where the code does not go.',
    ),
);

const ExternalResource = Schema.Struct({
    externalSystem: ExternalSystemId.annotate(about("The external system used.")),
    resource: Text.annotate(
        forScripts(
            "What is used there, as the code writes it in the file of the record's lines: a table, queue, template or operation. Its exact spelling is its identity: two spellings are two resources.",
        ),
    ),
}).annotate(about("An external system and the resource used there."));

const LinkTarget = Schema.Union([
    Schema.Struct({
        file: FilePath.annotate(
            forScripts("The file holding the block reached, spelt as the manifest or its folder spells it."),
        ),
        line: LineNumber.annotate(
            about(
                "A line of the block reached: any line inside it. The script joins the link to the innermost block holding the line.",
            ),
        ),
    }).annotate(about("A block, by a line inside it.")),
    ExternalResource,
]).annotate(about("What a link reaches."));

const fieldsUsedOnlyWhereDataMoves = Schema.makeFilter(
    (link: { readonly kind: string; readonly to?: object; readonly fieldsUsed?: readonly string[] }) =>
        link.fieldsUsed === undefined ||
        link.kind === "saves" ||
        link.kind === "reads" ||
        (link.to !== undefined && "externalSystem" in link.to) ||
        "fieldsUsed is written only on a save, a read or a link to an external system",
);

export const Link = Schema.Struct({
    id: LinkId.annotate(ownRecordId),
    kind: LinkKind,
    lines: Lines.annotate(
        about(
            "The lines that do the reaching; written by the map job its first line falls in. The script finds the block holding them.",
        ),
    ),
    to: Schema.optionalKey(LinkTarget).annotate(
        about(
            "What it reaches: a block, or an external system (an entry of the registry, or one this job writes when none fits, P1.38); absent only when the code does not show where it goes (`unresolvedTarget`).",
        ),
    ),
    unresolvedTarget: Schema.optionalKey(
        Text.annotate(
            forPerson(
                "Only on a link whose target the code does not show (chosen while the system runs, from settings or data no file in scope holds): what the code does show of where it goes, and what would show the rest. Its part's assumptions list it at its place.",
            ),
        ),
    ),
    fieldsUsed: Schema.optionalKey(
        Schema.Array(Text.annotate(about("A data field, as the code names it.")))
            .check(eachOnce((field: string) => field, "data fields"))
            .annotate(
                copiedFromCode(
                    "Only on a save, a read or a link to an external system (code without source among them): the data fields its own lines name (a query's columns, the properties set on what it passes), each once. Never a service's members, variables or parameters.",
                ),
            ),
    ),
})
    .check(fieldsUsedOnlyWhereDataMoves)
    .check(exactlyOneOf(["to", "unresolvedTarget"]))
    .annotate(
        about(
            "One place where work leaves its lines for other code or an external system: every flow is traced along links, so a link missed ends a flow silently and a wrong one sends it elsewhere.",
        ),
    );

const DeclaredField = Schema.Struct({
    writtenAs: Text.annotate(
        copiedFromCode("As the code writes it in the definition's lines; the name a rebuild must keep."),
    ),
    declaredAs: Text.annotate(
        copiedFromCode("Exactly what the code declares, including size, scale, keys and constraints."),
    ),
    refersTo: Schema.optionalKey(DataDefinitionId).annotate(
        about(
            "Only where the code declares the reference or plainly uses it (a key constraint, an ORM relation, a document reference, a join on it): the data definition whose records this field holds the key of, by record id. Read by Capabilities and entities, which keeps a family of shapes together (P12.6).",
        ),
    ),
}).annotate(about("One field a data shape declares."));

export const DataDefinition = Schema.Struct({
    id: DataDefinitionId.annotate(ownRecordId),
    lines: Lines.annotate(
        about(
            "The definition, first line to last: one shape of data, in any layer (the shape of what a person sees and enters, a request or response object, a message, a domain class, a mapping, a schema, a record layout). Written by the map job its first line falls in.",
        ),
    ),
    writtenAs: Text.annotate(
        copiedFromCode(
            "Its declared name, as written in its lines, or its file's name: a class, a table, a record layout.",
        ),
    ),
    codeKind: CodeKindId.annotate(
        about(
            "The code kind that shapes data it is (its layer follows from it): an entry of the registry, or one this job writes when none fits (P1.38).",
        ),
    ),
    fields: Schema.Array(DeclaredField)
        .check(eachOnce((field: { readonly writtenAs: string }) => field.writtenAs, "fields"))
        .annotate(about("The fields it declares, each once, in the order the code declares them.")),
    declares: Schema.optionalKey(ExternalResource).annotate(
        about("The resource it declares in a data store, when its own lines name it (a table, a collection, a file)."),
    ),
}).annotate(
    about(
        "One shape of data the code declares, in any layer: Capabilities and entities give each one the entity it shapes, so a shape missed is data no entity accounts for.",
    ),
);

export const Span = Schema.Struct({
    id: SpanId.annotate(ownRecordId),
    lines: Lines.annotate(
        about(
            "Lines of the job that are no block or data definition, first to last, overlapping none of them. Written by the map job its first line falls in.",
        ),
    ),
    says: Text.annotate(
        forAgent("What these lines are, in plain words: comments, imports, configuration, wiring, generated text."),
    ),
}).annotate(
    about(
        "Lines the job accounts for that hold no block or declaration, so every non-blank line of the code is accounted for. Evidence for the gate and the review; never stored.",
    ),
);
