import { Schema } from "effect";
import { compareText } from "../run/collections";
import { sha1Hex } from "../run/hashing-and-random";
import { recordTypes } from "./record-types";

export type RecordShapes = {
    readonly digest: string;
    readonly schemas: ReadonlyMap<string, Schema.ConstraintDecoder<unknown>>;
};

/**
 * The shapes the stages write records in, and their fingerprint: a digest of the JSON Schema of every record type, by
 * name. A store keeps the fingerprint its records were checked against, so a change to any record's shape is seen when
 * the store is opened, not when some later script fails to decode one record.
 * @returns the fingerprint and each type's schema, by name
 */
export const recordShapes = (): RecordShapes => {
    const types = recordTypes();
    const names = Object.keys(types).toSorted(compareText);
    const schemas = new Map(
        names.flatMap((name) => {
            const type = types[name];
            return type === undefined ? [] : [[name, type.schema] as const];
        }),
    );
    return {
        digest: sha1Hex(
            [...schemas]
                .map(([name, schema]) => `${name} ${JSON.stringify(Schema.toJsonSchemaDocument(schema))}`)
                .join("\n"),
        ),
        schemas,
    };
};
