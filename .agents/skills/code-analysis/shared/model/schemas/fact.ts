import { Schema } from "effect";
import {
    CapabilityId,
    EntityId,
    FactId,
    Lines,
    SystemPartId,
    TechnologyId,
    Text,
    about,
    forPerson,
    forScripts,
    ownRecordId,
} from "../shared-fields";

/**
 * One registry a fact may be about, by its name and the record id of its entry.
 * @param registry the registry's name
 * @param key the schema of its entries' record ids
 * @param entry what one entry is, in words
 * @returns the subject's form for that registry
 */
const entryOf = <R extends string, K extends Schema.Top>(registry: R, key: K, entry: string) =>
    Schema.Struct({
        registry: Schema.Literal(registry).annotate(
            about(`The registry the subject is an entry of: always \`${registry}\` for a ${entry}.`),
        ),
        key: key.annotate(about(`The ${entry}'s record id.`)),
    }).annotate(about(`A ${entry}, by its record id.`));

const Subject = Schema.Union([
    entryOf("parts", SystemPartId, "part of the system"),
    entryOf("technologies", TechnologyId, "technology"),
    entryOf("capabilities", CapabilityId, "capability"),
    entryOf("entities", EntityId, "kind of data"),
    Schema.Literal("system").annotate(about("The whole system.")),
]).annotate(
    about(
        "What the fact is about: an entry of a registry, by its registry and its record id, or `system` for the whole system (D180).",
    ),
);

const Evidence = Schema.Struct({
    lines: Lines,
    shows: Text.annotate(forPerson("What these lines show for the fact, in at most 20 plain words.")),
}).annotate(about("One place the fact rests on, with what it sits in and what it shows (D166)."));

const evidence = Schema.NonEmptyArray(Evidence).annotate(about("The places it rests on; at least one."));

const Observed = Schema.Struct({
    observed: Schema.Struct({ evidence }).annotate(about("What the code shows, at the places it rests on.")),
}).annotate(about("Observed: the lines show it."));

const Assumed = Schema.Struct({
    assumed: Schema.Struct({
        why: Text.annotate(forPerson("Why no file settles it.")),
        confirmWith: Text.annotate(
            forScripts("What would confirm it, by its id in the catalogue's ways to confirm: material, …"),
        ),
        ifWrong: Text.annotate(forPerson("What changes if it is wrong.")),
        decides: Schema.optionalKey(
            Text.annotate(forPerson("What is to be decided, where the assumption is a decision (A14).")),
        ),
        evidence: evidence.annotate(about("The nearest lines: what the code does show around it; at least one.")),
    }).annotate(about("Why no file settles it, how to confirm it, and what changes if it is wrong.")),
}).annotate(about("Assumed: no file settles it, so the analysis goes with it until confirmed."));

const Concluded = Schema.Struct({
    concluded: Schema.Struct({
        from: Schema.NonEmptyArray(FactId).annotate(about("The facts it is concluded from, each by its record id.")),
    }).annotate(about("The facts it is concluded from.")),
}).annotate(about("Concluded: drawn from other facts, by the concluding step only."));

const Basis = Schema.Union([Observed, Assumed, Concluded]).annotate(
    about("What the fact rests on: lines it observes, an assumption with its lines, or other facts it concludes from."),
);

export const Fact = Schema.Struct({
    id: FactId.annotate(ownRecordId),
    subject: Subject,
    aspect: Text.annotate(forScripts("The question it answers, by its id in the catalogue's aspects.")),
    statement: Text.annotate(
        forPerson(
            "What is true, in at most 60 plain words, with no class, method, file, table, parameter or setting name; product and technology names the team knows are fine.",
        ),
    ),
    basis: Basis,
    risk: Schema.optionalKey(
        Schema.Struct({
            category: Text.annotate(forScripts("Its risk category, by its id in the catalogue.")),
            severity: Text.annotate(forScripts("Its severity, by its id in the catalogue.")),
        }),
    ).annotate(
        about(
            "Present only when what it states can harm the business or block a change, so a person deciding must act on it: data that can be read or lost, a technology out of support, behaviour a rebuild would drop. Never for what merely could be wrong: that is an assumption, or nothing.",
        ),
    ),
    externalSource: Schema.optionalKey(
        Schema.Struct({
            source: Text.annotate(forPerson("The source of knowledge the code does not hold.")),
            asOf: Text.annotate(forPerson("When that source said so.")),
        }),
    ).annotate(about("Present only when it rests on knowledge from outside the code, labelled.")),
}).annotate(
    about(
        "One statement about one subject, answering one catalogue question, with its basis (D153): an observation, an assumption, or a conclusion from other facts. A risk is a fact with a risk; an assumption is a fact with an assumed basis.",
    ),
);

/**
 * How a fact rests on the code, in one word.
 * @param fact the fact
 * @returns its basis
 */
export const basisOf = (fact: typeof Fact.Type) =>
    "observed" in fact.basis ? "observed" : "assumed" in fact.basis ? "assumed" : "concluded";

/**
 * A fact's evidence: an observed or assumed fact's places; none for a concluded one.
 * @param fact the fact
 * @returns its evidence
 */
export const evidenceOf = (fact: typeof Fact.Type): ReadonlyArray<typeof Evidence.Type> =>
    "observed" in fact.basis
        ? fact.basis.observed.evidence
        : "assumed" in fact.basis
          ? fact.basis.assumed.evidence
          : [];
