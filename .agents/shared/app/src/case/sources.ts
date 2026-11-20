import { z } from "zod";
import { caseFiles, Node } from "../../compose/contract";

// Which collections the app reads from `case/`, derived from compose's contract (compose/contract.ts): one per facts
// file (`facts/<name>.json` is the collection `<name>`), one `nodes` collection over every `nodes/<level>.json`, and the
// case's other files the pages read. A file that is an array gives one entry per record, keyed by its first key field;
// a file of one object gives one entry named after the collection. scripts/generate-schemas.ts writes the typed
// collections from this list; the loader's checks read the same list.

/** The case's files outside `facts/` and `nodes/` that the pages read, by collection name. */
const pageFiles = { numbers: "numbers.json", views: "views.json", search: "search.json", brief: "brief.json" };

/** The fields that key a record, in the order they are tried. */
const keyFields = ["key", "id", "node", "term", "entity"];

export type Source = { name: string; files: string[]; id: string | null; schema: z.ZodType };

const elementOf = (schema: z.ZodType): { element: z.ZodType; many: boolean } =>
    schema instanceof z.ZodArray ? { element: schema.element as z.ZodType, many: true } : { element: schema, many: false };

const idOf = (name: string, element: z.ZodType) => {
    const properties = Object.keys((z.toJSONSchema(element) as { properties?: object }).properties ?? {});
    const id = keyFields.find((field) => properties.includes(field));
    if (id === undefined) throw new Error(`the contract's ${name} records have none of ${keyFields.join(", ")} to key them`);
    return id;
};

/**
 * The collections, from the contract's list of files.
 * @returns each collection's name, files, key field (null for a single object) and record schema
 */
export const sourcesOf = (): Source[] => {
    const facts = Object.keys(caseFiles)
        .filter((path) => path.startsWith("facts/"))
        .sort()
        .map((path) => {
            const name = path.slice("facts/".length, -".json".length);
            const { element, many } = elementOf(caseFiles[path] as z.ZodType);
            return { name, files: [path], id: many ? idOf(name, element) : null, schema: element };
        });
    const nodes = {
        name: "nodes",
        files: Object.keys(caseFiles)
            .filter((path) => path.startsWith("nodes/"))
            .sort(),
        id: "key",
        schema: Node as z.ZodType,
    };
    const others = Object.entries(pageFiles).map(([name, path]) => {
        const schema = caseFiles[path];
        if (schema === undefined) throw new Error(`the contract has no ${path}`);
        const { element, many } = elementOf(schema);
        return { name, files: [path], id: many ? idOf(name, element) : null, schema: element };
    });
    return [nodes, ...others, ...facts];
};
