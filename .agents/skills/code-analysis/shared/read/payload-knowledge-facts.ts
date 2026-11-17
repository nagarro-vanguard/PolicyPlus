import { Effect, Schema } from "effect";
import type { KnowledgePayload } from "../model/schemas/knowledge-payload";
import type { Catalogue } from "../run/catalogue";
import { getOrCreate } from "../run/collections";
import type { RecordStore } from "../store/database";
import { read } from "./payload-queries";

const Text = Schema.String;
const Count = Schema.Number;

export const FactRow = Schema.Struct({
    id: Text,
    aspect: Text,
    statement: Text,
    basis: Schema.Literals(["observed", "assumed", "concluded"]),
    registry: Text,
    key: Text,
    name: Text,
    risky: Count,
    why: Text,
    confirmWith: Text,
    ifWrong: Text,
});
const EvidenceRow = Schema.Struct({ fact: Text, file: Text, firstLine: Count, lastLine: Count });

export type Subject = KnowledgePayload["answers"][number]["subject"];
export type Evidence = KnowledgePayload["answers"][number]["evidence"][number];

const wholeSystem: Subject = { kind: "system", id: "", name: "The whole system" };

/**
 * The kind of subject a registry's entries are.
 * @param registry the registry's name
 * @returns the kind
 */
const kindOfRegistry = (registry: string): Subject["kind"] =>
    registry === "parts"
        ? "part"
        : registry === "technologies"
          ? "technology"
          : registry === "capabilities"
            ? "capability"
            : "entity";

/**
 * What a fact is about, as the payload names it.
 * @param row the fact's row
 * @returns the subject
 */
export const subjectOf = (row: typeof FactRow.Type): Subject =>
    row.registry === "system" ? wholeSystem : { kind: kindOfRegistry(row.registry), id: row.key, name: row.name };

/**
 * Every fact of the analysis with what it is about; the payload tells a person's questions from risks by script.
 * @param store the record store, read only
 * @returns the facts
 */
export const readFacts = (store: RecordStore["Service"]) =>
    read(
        store,
        FactRow,
        (
            sql,
        ) => sql`SELECT r.id AS id, json_extract(r.body, '$.aspect') AS aspect, json_extract(r.body, '$.statement') AS statement,
                CASE WHEN json_extract(r.body, '$.basis.assumed') IS NOT NULL THEN 'assumed'
                    WHEN json_extract(r.body, '$.basis.concluded') IS NOT NULL THEN 'concluded' ELSE 'observed' END AS basis,
                CASE WHEN json_type(r.body, '$.subject') = 'text' THEN 'system' ELSE json_extract(r.body, '$.subject.registry') END AS registry,
                CASE WHEN json_type(r.body, '$.subject') = 'text' THEN '' ELSE json_extract(r.body, '$.subject.key') END AS key,
                coalesce(json_extract(sj.body, '$.name'), '') AS name,
                json_extract(r.body, '$.risk') IS NOT NULL AS risky,
                coalesce(json_extract(r.body, '$.basis.assumed.why'), '') AS why,
                coalesce(json_extract(r.body, '$.basis.assumed.confirmWith'), '') AS confirmWith,
                coalesce(json_extract(r.body, '$.basis.assumed.ifWrong'), '') AS ifWrong
            FROM record r LEFT JOIN record sj ON sj.id = json_extract(r.body, '$.subject.key')
            WHERE r.type = 'Fact' ORDER BY r.id`,
    );

/**
 * The places each fact rests on, by fact.
 * @param store the record store, read only
 * @returns the evidence of every fact that has some
 */
export const readEvidence = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const rows = yield* read(
        store,
        EvidenceRow,
        (sql) => sql`SELECT fact, file, firstLine, lastLine FROM v_fact_evidence ORDER BY fact, file, firstLine`,
    );
    const byFact = new Map<string, Evidence[]>();
    for (const { fact, file, firstLine, lastLine } of rows) {
        getOrCreate(byFact, fact).push({ file, firstLine, lastLine });
    }
    return byFact;
});

/**
 * One fact's answer or assumption, in the form a reader is given.
 * @param fact the fact
 * @param question the question it answers, in words
 * @param places what it rests on
 * @returns the pieces both forms share
 */
const baseOf = (fact: typeof FactRow.Type, question: string, places: readonly Evidence[]) => ({
    id: fact.id,
    aspect: fact.aspect,
    question,
    subject: subjectOf(fact),
    evidence: places,
});

/**
 * The answers and assumptions of the analysis: every fact a person is given that carries no risk, by question.
 * @param catalogue the catalogue, for each question's words
 * @param facts the facts
 * @param evidence the places each rests on
 * @returns the answers and the assumptions
 */
export const answersOf = (
    catalogue: Catalogue,
    facts: ReadonlyArray<typeof FactRow.Type>,
    evidence: ReadonlyMap<string, Evidence[]>,
) => {
    const aspects = new Map(
        catalogue.aspects.filter((each) => each.readers.includes("person")).map((each) => [each.id, each]),
    );
    const confirm = new Map(catalogue.confirmWith.map((way) => [way.id, way.words]));
    const answers: KnowledgePayload["answers"][number][] = [];
    const assumptions: KnowledgePayload["assumptions"][number][] = [];
    for (const fact of facts) {
        const aspect = aspects.get(fact.aspect);
        const places = evidence.get(fact.id);
        if (aspect === undefined || fact.risky === 1) {
            continue;
        }
        const base = baseOf(fact, aspect.words, places === undefined ? [] : places);
        const way = confirm.get(fact.confirmWith);
        if (fact.basis === "assumed") {
            assumptions.push({
                ...base,
                statement: fact.statement,
                why: fact.why,
                confirmWith: way === undefined ? fact.confirmWith : way,
                ifWrong: fact.ifWrong,
            });
        } else {
            answers.push({ ...base, group: aspect.group, statement: fact.statement, basis: fact.basis });
        }
    }
    return { answers, assumptions };
};
