import { Effect, Schema } from "effect";
import type { CapabilityPayload } from "../model/schemas/payloads";
import type { KnowledgePayload } from "../model/schemas/knowledge-payload";
import type { SystemPayload } from "../model/schemas/system-payload";
import { compareText, getOrCreate } from "../run/collections";
import type { RecordStore } from "../store/database";
import { read } from "./payload-queries";

type Term = NonNullable<KnowledgePayload["terms"]>[number];
type Entities = NonNullable<KnowledgePayload["entities"]>;

/**
 * Whether a character is a letter or a digit.
 * @param char the character, or none past either end
 * @returns true when it is
 */
const wordy = (char: string | undefined) =>
    char !== undefined && (char.toLowerCase() !== char.toUpperCase() || (char >= "0" && char <= "9"));

/**
 * Whether a text uses a term as a word of its own (case aside), not inside a longer word.
 * @param text the text
 * @param term the term
 * @returns true when it does
 */
const usesTerm = (text: string, term: string) => {
    const haystack = text.toLowerCase();
    const needle = term.trim().toLowerCase();
    if (needle === "") {
        return false;
    }
    for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) {
        if (!wordy(haystack[at - 1]) && !wordy(haystack[at + needle.length])) {
            return true;
        }
    }
    return false;
};

/**
 * The glossary: each kind of data as a term, defined by its purpose (derived by code), then each term the briefing
 * defined; a term is kept only when the analysis's own text uses it, each once, the first definition standing.
 * @param entities the kinds of data, with their purposes
 * @param briefed the terms the briefing defined; none for an analysis whose briefing wrote none
 * @param texts every text of the analysis a reader meets
 * @returns the terms, by term
 */
export const termsOf = (
    entities: ReadonlyArray<{ readonly name: string; readonly purpose: string }>,
    briefed: ReadonlyArray<{ readonly term: string; readonly means: string }>,
    texts: readonly string[],
): Term[] => {
    const seen = new Set<string>();
    const all: Term[] = [
        ...entities.map((entity) => ({ term: entity.name, means: entity.purpose, from: "entity" as const })),
        ...briefed.map((term) => ({ term: term.term, means: term.means, from: "briefing" as const })),
    ];
    return all
        .filter((term) => {
            const key = term.term.trim().toLowerCase();
            if (seen.has(key) || !texts.some((text) => usesTerm(text, term.term))) {
                return false;
            }
            seen.add(key);
            return true;
        })
        .toSorted((one, other) => compareText(one.term, other.term));
};

/**
 * The gate on the glossary: every term used in the analysis's text.
 * @param terms the terms
 * @param texts every text of the analysis a reader meets
 * @returns one line per gap
 */
export const termGaps = (terms: readonly Term[], texts: readonly string[]) =>
    terms
        .filter((term) => !texts.some((text) => usesTerm(text, term.term)))
        .map((term) => `the term ${term.term} is defined but the analysis never uses it`);

/**
 * Every text of the analysis a reader meets, where a term must be used to be defined: the system's purpose, areas,
 * capabilities and places, each entry point's purpose and each rule, and the answers, assumptions and risks.
 * @param system the system payload
 * @param payloads every capability's payload
 * @param knowledge the knowledge payload
 * @returns the texts
 */
export const analysisTexts = (
    system: SystemPayload,
    payloads: readonly CapabilityPayload[],
    knowledge: Pick<KnowledgePayload, "answers" | "assumptions" | "risks">,
) => [
    system.purpose,
    ...system.areas.flatMap((area) => [area.name, area.purpose]),
    ...system.capabilities.flatMap((each) => [each.name, each.purpose]),
    ...(system.surfaces === undefined ? [] : system.surfaces).flatMap((surface) => [surface.name, surface.purpose]),
    ...payloads.flatMap((payload) =>
        payload.layers.flatMap((layer) => [
            ...layer.actions.map((action) => action.purpose),
            ...layer.rules.map((rule) => rule.says),
        ]),
    ),
    ...knowledge.answers.map((answer) => answer.statement),
    ...knowledge.assumptions.map((assumption) => assumption.statement),
    ...knowledge.risks.map((risk) => risk.statement),
];

const EntityRow = Schema.Struct({ id: Schema.String, name: Schema.String, purpose: Schema.String });
const PairRow = Schema.Struct({ entity: Schema.String, other: Schema.String });

/**
 * Every kind of data, with the stores it is kept in and the capabilities whose code saves or reads it.
 * @param store the record store, read only
 * @returns the kinds of data, by name
 */
export const entitiesOf = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const rows = yield* read(
        store,
        EntityRow,
        (sql) => sql`SELECT id, coalesce(json_extract(body, '$.name'), '') AS name,
                coalesce(json_extract(body, '$.purpose'), '') AS purpose
            FROM record WHERE type = 'Entity' ORDER BY id`,
    );
    const stores = yield* read(
        store,
        PairRow,
        (sql) => sql`SELECT DISTINCT entity, externalSystemName AS other FROM v_entity_stores`,
    );
    const users = yield* read(
        store,
        PairRow,
        (sql) => sql`SELECT DISTINCT entity, capability AS other FROM v_capability_entities`,
    );
    const listOf = (pairs: ReadonlyArray<typeof PairRow.Type>) => {
        const byEntity = new Map<string, string[]>();
        pairs.forEach((pair) => getOrCreate(byEntity, pair.entity).push(pair.other));
        return (id: string) => {
            const found = byEntity.get(id);
            return (found === undefined ? [] : [...new Set(found)]).toSorted(compareText);
        };
    };
    const storesOf = listOf(stores);
    const usersOf = listOf(users);
    const entities: Entities = rows
        .map((row) => ({ ...row, stores: storesOf(row.id), capabilities: usersOf(row.id) }))
        .toSorted((one, other) => compareText(one.name, other.name) || compareText(one.id, other.id));
    return entities;
});

const WordsRow = Schema.Struct({
    name: Schema.NullOr(Schema.String),
    terms: Schema.NullOr(
        Schema.fromJsonString(Schema.Array(Schema.Struct({ term: Schema.String, means: Schema.String }))),
    ),
});

/**
 * The system's own words, as the briefing wrote them: its name and its terms; none of either for an analysis whose
 * briefing wrote none.
 * @param store the record store, read only
 * @returns the name, when written, and the terms
 */
export const systemWordsOf = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const [row] = yield* read(
        store,
        WordsRow,
        (sql) => sql`SELECT json_extract(body, '$.name') AS name, json_extract(body, '$.terms') AS terms
            FROM record WHERE type = 'SystemWords' ORDER BY recordNumber LIMIT 1`,
    );
    return {
        name: row === undefined || row.name === null || row.name.trim() === "" ? undefined : row.name.trim(),
        terms: row === undefined || row.terms === null ? [] : row.terms,
    };
});
