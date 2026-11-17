import { Effect, Schema } from "effect";
import type { Catalogue } from "../run/catalogue";
import { compareText, getOrCreate, unique } from "../run/collections";
import type { RecordStore } from "../store/database";
import { answersOf, readEvidence, readFacts } from "./payload-knowledge-facts";
import { ListOfText, read } from "./payload-queries";
import { risksOf } from "./payload-risks";
import { structureOf } from "./payload-structure";

const Text = Schema.String;

const PartRow = Schema.Struct({
    id: Text,
    name: Text,
    kind: Text,
    purpose: Text,
    folders: ListOfText,
    files: Schema.Number,
});
const Uses = Schema.fromJsonString(
    Schema.Array(
        Schema.Struct({
            version: Schema.optionalKey(Text),
            versionForReader: Schema.optionalKey(Text),
            parts: Schema.Array(Text),
        }),
    ),
);
const TechnologyRow = Schema.Struct({ id: Text, name: Text, kind: Text, uses: Uses });

/**
 * The parts and technologies of the system, each part with the names of the technologies it uses.
 * @param store the record store, read only
 * @returns both lists
 */
const partsAndTechnologies = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const parts = yield* read(
        store,
        PartRow,
        (sql) => sql`SELECT p.id AS id, json_extract(p.body, '$.name') AS name, json_extract(p.body, '$.kind') AS kind,
                json_extract(p.body, '$.purpose') AS purpose, coalesce(json_extract(p.body, '$.folders'), '[]') AS folders,
                (SELECT count(*) FROM filePart fp WHERE fp.part = p.recordNumber) AS files
            FROM record p WHERE p.type = 'SystemPart'`,
    );
    const technologies = yield* read(
        store,
        TechnologyRow,
        (sql) => sql`SELECT t.id AS id, json_extract(t.body, '$.name') AS name, json_extract(t.body, '$.kind') AS kind,
                json_extract(t.body, '$.uses') AS uses
            FROM record t WHERE t.type = 'Technology'`,
    );
    const usedBy = new Map<string, string[]>();
    for (const technology of technologies) {
        for (const use of technology.uses) {
            for (const part of use.parts) {
                getOrCreate(usedBy, part).push(technology.name);
            }
        }
    }
    const byName = (left: { readonly name: string }, right: { readonly name: string }) =>
        compareText(left.name, right.name);
    return {
        parts: parts
            .map((part) => {
                const used = usedBy.get(part.id);
                return {
                    ...part,
                    folders: [...part.folders],
                    technologies: unique(used === undefined ? [] : used).toSorted(compareText),
                };
            })
            .toSorted(byName),
        technologies: technologies
            .map((technology) => ({
                id: technology.id,
                name: technology.name,
                kind: technology.kind,
                versions: technology.uses.map((use) => ({
                    label:
                        use.versionForReader !== undefined
                            ? use.versionForReader
                            : use.version !== undefined
                              ? use.version
                              : "",
                    parts: [...use.parts],
                })),
            }))
            .toSorted(byName),
    };
});

/**
 * What the analysis knows about the system as a whole beyond its capabilities, from the accepted records.
 * @param store the record store, read only
 * @param catalogue the catalogue
 * @returns the knowledge payload
 */
export const knowledgePayload = Effect.fnUntraced(function* (store: RecordStore["Service"], catalogue: Catalogue) {
    const { parts, technologies } = yield* partsAndTechnologies(store);
    const facts = yield* readFacts(store);
    const evidence = yield* readEvidence(store);
    const { answers, assumptions } = answersOf(catalogue, facts, evidence);
    return {
        parts,
        technologies,
        answers,
        assumptions,
        ...(yield* structureOf(store)),
        risks: yield* risksOf(store, catalogue, facts, evidence),
    };
});
