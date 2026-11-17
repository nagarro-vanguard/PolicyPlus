import { Context, type Schema } from "effect";
import { keysOf } from "../run/collections";
import type { JsonRecord } from "./json-record";
import { prefixOf } from "./record-ids";

export type Position = { readonly file: string; readonly firstLine: number; readonly lastLine: number };

type Reference = {
    readonly role: string;
    readonly to: readonly string[];
    readonly inStore: boolean;
    readonly ids: readonly string[];
};

export type NoteSpan = { readonly role: string; readonly lines: Position };

export type RecordKind = "finding" | "account" | "review" | "coverage" | "workingNote";

export interface RecordType {
    readonly schema: Schema.ConstraintDecoder<unknown>;
    readonly kind: RecordKind;
    readonly idPrefix: string | undefined;
    readonly keyOf: (record: JsonRecord) => string | undefined;
    readonly citesOf: (record: JsonRecord) => readonly string[];
    readonly citesInStoreOf: (record: JsonRecord) => readonly string[];
    readonly positionOf: (record: JsonRecord) => Position | undefined;
    readonly refsOf: (record: JsonRecord) => readonly Reference[];
    readonly spansOf: (record: JsonRecord) => readonly NoteSpan[];
}

/**
 * The registered type a record id names, by the prefix it carries: the one lookup from a record id to its type.
 * @param records the registered record types, by name
 * @returns the reader of a record id's type name, undefined for a prefix no registered type carries
 */
export function typeNameOfId<N extends string>(
    records: Readonly<Record<N, { readonly idPrefix: string | undefined }>>,
): (id: string) => N | undefined {
    const byPrefix = new Map<string, N>();
    for (const name of keysOf(records)) {
        const { idPrefix } = records[name];
        if (idPrefix !== undefined) {
            byPrefix.set(idPrefix, name);
        }
    }
    return (id) => byPrefix.get(prefixOf(id));
}

export class ShapeRegistry extends Context.Service<
    ShapeRegistry,
    {
        readonly records: Readonly<Record<string, RecordType>>;
        readonly documents: Readonly<Record<string, Schema.ConstraintDecoder<unknown>>>;
    }
>()("code-analysis/core/ShapeRegistry") {}
