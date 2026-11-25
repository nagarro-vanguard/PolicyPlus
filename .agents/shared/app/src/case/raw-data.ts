import type { Case } from "./read";
import { sourcesOf } from "./sources";
import type { CaseData, NodeRecord } from "./view";
import type { Noun, NumberRecord } from "./format";
import { ruleStatusesOf } from "./rule-status";
import { contextFileOf } from "./routes";

// The case's records by key, read straight from an opened case folder: what the tests and the build's last step (the
// context texts) use. Pages read the same records through the content collections (data.ts).

/** The kinds of context text the Explorer offers, by the level of the node. */
export const contextKinds = ["system", "capability", "surface", "action", "rule"] as const;

const byKey = <T>(records: readonly T[], keyOf: (record: T) => string) => {
    const map = new Map<string, T>();
    for (const record of records) map.set(keyOf(record), record);
    return map;
};

/**
 * The size of each node context text, from `context/index.json`.
 * @param kase the case
 * @returns a lookup by node key
 */
export const contextSizes = (kase: Case) => {
    const sizes = new Map<string, number>();
    if (kase.has("context/index.json")) {
        const index = kase.json("context/index.json") as Record<string, Record<string, number>>;
        for (const kind of contextKinds) for (const [key, bytes] of Object.entries(index[kind] ?? {})) sizes.set(key, bytes);
    }
    return (key: string) => sizes.get(key);
};

/**
 * The records of an opened case, by key.
 * @param kase the case
 * @param bundleCommand the command the build was given for a fuller text, if any
 * @returns the lookups the views read
 */
export const caseDataOf = (kase: Case, bundleCommand?: string): CaseData => {
    const read = <T>(path: string): T[] => (kase.has(path) ? (kase.json(path) as T[]) : []);
    const sources = sourcesOf();
    const nodes = byKey(
        (sources.find((each) => each.name === "nodes")?.files ?? []).flatMap((file) => read<NodeRecord>(file)),
        (node) => node.key,
    );
    const numbers = byKey(read<NumberRecord>("numbers.json"), (entry) => entry.key);
    const facts = new Map<string, Map<string, Record<string, unknown>>>();
    for (const source of sources.filter((each) => each.files.every((file) => file.startsWith("facts/")) && each.id !== null)) {
        facts.set(
            source.name,
            byKey(
                source.files.flatMap((file) => read<Record<string, unknown>>(file)),
                (record) => String(record[source.id as string]),
            ),
        );
    }
    const kinds = byKey(read<{ id: string; noun: Noun }>("facts/kinds.json"), (kind) => kind.id);
    const statuses = ruleStatusesOf(kase);
    return {
        node: (key) => nodes.get(key),
        number: (key) => numbers.get(key),
        fact: (collection, id) => facts.get(collection)?.get(id),
        kindNoun: (kind) => kinds.get(kind)?.noun,
        contextBytes: contextSizes(kase),
        bundleCommand,
        ruleStatus: statuses.of,
        rulesInNoStory: statuses.inNoStory,
    };
};

/** Every node of an opened case. */
export const nodesOf = (kase: Case): NodeRecord[] =>
    (sourcesOf().find((each) => each.name === "nodes")?.files ?? [])
        .filter((file) => kase.has(file))
        .flatMap((file) => kase.json(file) as NodeRecord[]);

/**
 * The texts a reader copies as context, one file per node, from the case's `context/<kind>.json`.
 * @param kase the case
 * @returns each file below the site's root and its text
 */
export const contextTexts = (kase: Case): Map<string, string> => {
    const files = new Map<string, string>();
    for (const kind of contextKinds) {
        const path = `context/${kind}.json`;
        if (!kase.has(path)) continue;
        for (const [key, text] of Object.entries(kase.json(path) as Record<string, string>)) files.set(contextFileOf(key), text);
    }
    // A journey's text, by its slug, in a folder of its own so a slug can never take a node's file.
    if (kase.has("context/journey.json"))
        for (const [slug, text] of Object.entries(kase.json("context/journey.json") as Record<string, string>))
            files.set(`context/journey/${slug}.txt`, text);
    return files;
};
