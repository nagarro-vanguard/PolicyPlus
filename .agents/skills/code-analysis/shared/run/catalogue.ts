import { join } from "node:path";
import { Effect, Schema } from "effect";
import { skillRoot, stageNames } from "./analysis-layout";
import { readDocumentStrictly } from "./json-files";
import { DocumentInvalid } from "./script-errors";
import { Text, about } from "../model/shared-fields";

export const catalogueFolder = join(skillRoot, "shared", "catalogue");

const registryKinds = ["parts", "technologies", "capabilities", "entities"] as const;

const SubjectKind = Schema.Literals([...registryKinds, "system"]).annotate(
    about("What a fact may be about: an entry of a registry, or the whole system (D180)."),
);

const Entry = { id: Text, words: Text, means: Text };

const Aspect = Schema.Struct({
    id: Text.annotate(about("The aspect's id, stable and never reused (D155).")),
    words: Text.annotate(about("The reader's question, in their words.")),
    group: Text.annotate(about("The reader's question it sits under on a page.")),
    readers: Schema.NonEmptyArray(Text).annotate(
        about("Who is given its answer: `person`, and the stages whose agents are given it (D163, D174)."),
    ),
    subjects: Schema.NonEmptyArray(SubjectKind).annotate(about("What it may be asked of.")),
    partKinds: Schema.Array(Text).annotate(about("The part kinds it applies to; none for every kind.")),
    codeHolds: Schema.Boolean.annotate(about("Whether the code usually holds the answer.")),
    answeredBy: Schema.Literals(["facts", "subjects", "concluded", "findings"]).annotate(
        about(
            "How it is answered: by facts, by the subjects themselves, concluded (4.5), or by findings only, any number and none allowed (plan 0004).",
        ),
    ),
    guidance: Schema.optionalKey(
        Text.annotate(about("How to answer it, for the agents: examples, and the exceptions that decide it.")),
    ),
});

export const Catalogue = Schema.Struct({
    aspects: Schema.NonEmptyArray(Aspect),
    riskCategories: Schema.NonEmptyArray(
        Schema.Struct({
            id: Text,
            words: Text,
            seenAt: Schema.NonEmptyArray(Text).annotate(
                about("The stages whose agents look for this kind of risk, because what they read shows it."),
            ),
        }),
    ),
    severities: Schema.NonEmptyArray(Schema.Struct(Entry)),
    partKinds: Schema.NonEmptyArray(
        Schema.Struct({
            ...Entry,
            merged: Schema.Boolean.annotate(
                about("Whether the parts page merges parts of this kind (tests, stand-ins)."),
            ),
        }),
    ),
    confirmWith: Schema.NonEmptyArray(Schema.Struct(Entry)),
}).annotate(about("The catalogue: the reader's questions and the closed lists every fact is keyed by (D155)."));

export type Catalogue = typeof Catalogue.Type;

type Aspect = Catalogue["aspects"][number];

/**
 * Whether the catalogue asks a question of a subject (D163, D181): of the system, or of a registry's entries; of a part,
 * only when the question names its kind, a question naming no kind being asked of parts of every kind. The one place
 * the rule lives: the concluding step's topics, the gates and the pages all ask it here.
 * @param aspect the question
 * @param subject what it would be asked of: the system, or a registry
 * @param partKind a part's kind, when the question is asked of one part; left out to ask of parts at all
 * @returns true when the catalogue asks it
 */
export const askedOf = (aspect: Aspect, subject: typeof SubjectKind.Type, partKind?: string) =>
    aspect.subjects.includes(subject) &&
    (subject !== "parts" ||
        partKind === undefined ||
        aspect.partKinds.length === 0 ||
        aspect.partKinds.includes(partKind));

/**
 * A catalogue file's schema: its version and its one list.
 * @param fields the list, by its name in the file
 * @returns the file's schema
 */
const fileOf = <F extends Schema.Struct.Fields>(fields: F) => Schema.Struct({ version: Schema.Literal(1), ...fields });

const files = {
    aspects: fileOf({ aspects: Catalogue.fields.aspects }),
    riskCategories: fileOf({ riskCategories: Catalogue.fields.riskCategories }),
    severities: fileOf({ severities: Catalogue.fields.severities }),
    partKinds: fileOf({ partKinds: Catalogue.fields.partKinds }),
    confirmWith: fileOf({ confirmWith: Catalogue.fields.confirmWith }),
};

/**
 * The gaps of a catalogue as data: an id used twice in one list, and a reader that is neither the person nor a stage.
 * @param catalogue the catalogue
 * @returns one line per gap
 */
function catalogueGaps(catalogue: Catalogue): string[] {
    const readers = new Set<string>(["person", ...stageNames]);
    const lists: ReadonlyArray<readonly [string, ReadonlyArray<{ readonly id: string }>]> = [
        ["aspects", catalogue.aspects],
        ["risk categories", catalogue.riskCategories],
        ["severities", catalogue.severities],
        ["part kinds", catalogue.partKinds],
        ["ways to confirm", catalogue.confirmWith],
    ];
    const stages = new Set<string>(stageNames);
    return [
        ...catalogue.riskCategories.flatMap((category) =>
            category.seenAt
                .filter((stage) => !stages.has(stage))
                .map((stage) => `the risk kind ${category.id} is seen at ${stage}, which is not a stage`),
        ),
        ...lists.flatMap(([name, entries]) =>
            entries
                .map((entry) => entry.id)
                .filter((id, i, ids) => ids.indexOf(id) !== i)
                .map((id) => `${name}: ${id} is listed twice`),
        ),
        ...catalogue.aspects.flatMap((aspect) =>
            aspect.readers
                .filter((reader) => !readers.has(reader))
                .map((reader) => `the aspect ${aspect.id} names ${reader}, which is neither the person nor a stage`),
        ),
    ];
}

/**
 * The catalogue, read from its files and refused when it is not sound data.
 * @returns the catalogue; DocumentInvalid naming every gap
 */
export const readCatalogue = Effect.fnUntraced(function* () {
    const read = <S extends Schema.ConstraintDecoder<unknown>>(name: string, schema: S) =>
        readDocumentStrictly(join(catalogueFolder, name), schema);
    const catalogue: Catalogue = {
        aspects: (yield* read("aspects.json", files.aspects)).aspects,
        riskCategories: (yield* read("risk-categories.json", files.riskCategories)).riskCategories,
        severities: (yield* read("severity.json", files.severities)).severities,
        partKinds: (yield* read("part-kinds.json", files.partKinds)).partKinds,
        confirmWith: (yield* read("confirm-with.json", files.confirmWith)).confirmWith,
    };
    const gaps = catalogueGaps(catalogue);
    if (gaps.length) {
        return yield* new DocumentInvalid({ path: catalogueFolder, issue: gaps.join("; ") });
    }
    return catalogue;
});
