import { existsSync, readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { proposalOf, snapshotOf, type Gate } from "./gates";
import type { Layout } from "./model/layout";

/*
 * What changed in a decision's file since the person confirmed it, found by comparing the file with the copy kept when
 * they confirmed (`target/confirmed/<decision>.json`). Counts at confirmation are the same counts taken of that copy.
 */
type Keyed = { key: string; value: unknown };

const field = (value: unknown, name: string) =>
    typeof value === "object" && value !== null ? (value as Record<string, unknown>)[name] : undefined;
const list = (value: unknown) => (Array.isArray(value) ? (value as unknown[]) : []);

/**
 * The items a decision is made about, each with its key: today's tasks by id, journeys by id, architectures by name,
 * and the components of the chosen one by name.
 * @param gate the decision
 * @param value what its file holds
 * @returns the items
 */
export const itemsOf = (gate: Gate, value: unknown): Keyed[] => {
    const items =
        gate === "as-is"
            ? list(field(value, "tasks"))
            : gate === "components"
              ? list(field(value, "components"))
              : list(value);
    return items.map((item) => ({
        key: String(field(item, gate === "as-is" || gate === "journeys" ? "id" : "name")),
        value: item,
    }));
};

export type Since = { added: string[]; removed: string[]; changed: string[] };

/**
 * What was added, removed and changed in a decision's file since it was confirmed.
 * @param layout the run's folders
 * @param gate the decision
 * @returns the keys of each, or nothing when there is no confirmed copy or no file to compare
 */
export const changedSince = (layout: Layout, gate: Gate): Since | undefined => {
    const before = snapshotOf(layout, gate);
    const now = proposalOf(layout, gate);
    if (!existsSync(before) || !existsSync(now)) return undefined;
    const read = (path: string) => itemsOf(gate, JSON.parse(readFileSync(path, "utf8")) as unknown);
    const old = new Map(read(before).map((item) => [item.key, item.value]));
    const fresh = new Map(read(now).map((item) => [item.key, item.value]));
    return {
        added: [...fresh.keys()].filter((key) => !old.has(key)),
        removed: [...old.keys()].filter((key) => !fresh.has(key)),
        changed: [...fresh.keys()].filter((key) => old.has(key) && !isDeepStrictEqual(old.get(key), fresh.get(key))),
    };
};
