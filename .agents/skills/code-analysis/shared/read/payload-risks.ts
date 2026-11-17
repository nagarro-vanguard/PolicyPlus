import { Effect, Schema } from "effect";
import type { KnowledgePayload } from "../model/schemas/knowledge-payload";
import type { Catalogue } from "../run/catalogue";
import { compareText, getOrCreate, unique } from "../run/collections";
import type { RecordStore } from "../store/database";
import { ListOfText, read } from "./payload-queries";
import { subjectOf, type Evidence, type FactRow } from "./payload-knowledge-facts";

const Text = Schema.String;

const RiskRow = Schema.Struct({
    fact: Text,
    category: Text,
    severity: Schema.Literals(["high", "medium", "low"]),
    capabilities: ListOfText,
});
const FromRow = Schema.Struct({ risk: Text, finding: Text });
const FilePartRow = Schema.Struct({ file: Text, id: Text, name: Text });
const NameRow = Schema.Struct({ id: Text, name: Text });

const severityRank = { high: 0, medium: 1, low: 2 } as const;

/**
 * Everything a risk is assembled from, read once.
 * @param store the record store, read only
 * @returns the risk facts, what each rests on, which part each file lies in, and the capabilities' names
 */
const readRiskInputs = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    return {
        rows: yield* read(
            store,
            RiskRow,
            (sql) => sql`SELECT fact, category, severity, coalesce(capabilities, '[]') AS capabilities FROM v_risk`,
        ),
        froms: yield* read(
            store,
            FromRow,
            (sql) => sql`SELECT r.id AS risk, je.value AS finding
                FROM record r, json_each(r.body, '$.basis.concluded.from') je
                WHERE r.type = 'Fact' AND r.id IN (SELECT fact FROM v_risk)`,
        ),
        fileParts: yield* read(
            store,
            FilePartRow,
            (sql) => sql`SELECT f.path AS file, p.id AS id, json_extract(p.body, '$.name') AS name
                FROM file f JOIN filePart fp ON fp.fileNumber = f.fileNumber JOIN record p ON p.recordNumber = fp.part`,
        ),
        names: yield* read(store, NameRow, (sql) => sql`SELECT capability AS id, name FROM v_capability`),
    };
});

type Named = { readonly id: string; readonly name: string };

/**
 * The parts some files lie in, each once.
 * @param files the files
 * @param partOf the part each file lies in
 * @returns the parts
 */
const partsOfFiles = (files: readonly string[], partOf: ReadonlyMap<string, Named>) => {
    const parts = new Map<string, Named>();
    for (const file of files) {
        const part = partOf.get(file);
        if (part !== undefined) {
            parts.set(part.id, part);
        }
    }
    return [...parts.values()];
};

type Lookups = {
    readonly factById: ReadonlyMap<string, typeof FactRow.Type>;
    readonly evidence: ReadonlyMap<string, Evidence[]>;
    readonly findingsOf: ReadonlyMap<string, string[]>;
    readonly partOf: ReadonlyMap<string, Named>;
    readonly capabilityName: ReadonlyMap<string, string>;
    readonly words: ReadonlyMap<string, string>;
};

type Risk = KnowledgePayload["risks"][number];

/**
 * One observation a risk rests on, with what it is about and the lines that show it.
 * @param lookups what the risks are assembled from
 * @param id the observation's record id
 * @returns it as a list of one; none when no such fact exists
 */
const findingOf = (lookups: Lookups, id: string): Risk["findings"] => {
    const fact = lookups.factById.get(id);
    const places = lookups.evidence.get(id);
    return fact === undefined
        ? []
        : [{ id, statement: fact.statement, subject: subjectOf(fact), evidence: places === undefined ? [] : places }];
};

/**
 * One risk with its observations and the places they reach.
 * @param lookups what the risks are assembled from
 * @param row the risk's row
 * @returns it as a list of one; none when no such fact exists
 */
const riskOf = (lookups: Lookups, row: typeof RiskRow.Type): readonly Risk[] => {
    const fact = lookups.factById.get(row.fact);
    if (fact === undefined) {
        return [];
    }
    const own = lookups.findingsOf.get(row.fact);
    const findings = (own === undefined ? [row.fact] : own).flatMap((id) => findingOf(lookups, id));
    const files = unique(findings.flatMap((finding) => finding.evidence.map((place) => place.file))).toSorted(
        compareText,
    );
    const capabilities = row.capabilities.flatMap((id) => {
        const name = lookups.capabilityName.get(id);
        return name === undefined ? [] : [{ id, name }];
    });
    const category = lookups.words.get(row.category);
    return [
        {
            id: row.fact,
            statement: fact.statement,
            category: row.category,
            categoryWords: category === undefined ? row.category : category,
            severity: row.severity,
            subject: subjectOf(fact),
            findings,
            places: { capabilities, parts: partsOfFiles(files, lookups.partOf), files },
        },
    ];
};

/**
 * The risks, each with the findings it rests on and the places its findings' lines reach, found by script.
 * @param store the record store, read only
 * @param catalogue the catalogue, for the words of each kind of risk
 * @param facts every fact
 * @param evidence the places each fact rests on
 * @returns the risks, most serious first
 */
export const risksOf = Effect.fnUntraced(function* (
    store: RecordStore["Service"],
    catalogue: Catalogue,
    facts: ReadonlyArray<typeof FactRow.Type>,
    evidence: ReadonlyMap<string, Evidence[]>,
) {
    const { rows, froms, fileParts, names } = yield* readRiskInputs(store);
    const findingsOf = new Map<string, string[]>();
    for (const { risk, finding } of froms) {
        getOrCreate(findingsOf, risk).push(finding);
    }
    const lookups: Lookups = {
        factById: new Map(facts.map((fact) => [fact.id, fact])),
        evidence,
        findingsOf,
        partOf: new Map(fileParts.map((row) => [row.file, { id: row.id, name: row.name }])),
        capabilityName: new Map(names.map((row) => [row.id, row.name])),
        words: new Map(catalogue.riskCategories.map((category) => [category.id, category.words])),
    };
    return rows
        .flatMap((row) => riskOf(lookups, row))
        .toSorted(
            (left, right) =>
                severityRank[left.severity] - severityRank[right.severity] ||
                compareText(left.statement, right.statement),
        );
});
