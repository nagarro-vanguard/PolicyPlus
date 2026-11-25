import { getCollection } from "astro:content";
import { buildConfig } from "./build-config";
import type { Noun, NumberRecord } from "./format";
import { theCase } from "./loader";
import { assistantSizes } from "./raw-data";
import { ruleStatusesOf } from "./rule-status";
import { sourcesOf } from "./sources";
import type { CaseData, NodeRecord } from "./view";

// The case's records by key, read from the content collections the loader filled. Astro turns a `reference()` into
// `{ collection, id }`; the views read keys, so those fields are given back as keys here.

type Reference = { id: string } | null;
const idOf = (value: unknown): string | null => (value === null ? null : (value as Reference)?.id ?? null);

let cached: Promise<CaseData> | undefined;
let allNodes: NodeRecord[] = [];

const load = async (): Promise<CaseData> => {
    const nodes = new Map<string, NodeRecord>();
    for (const entry of await getCollection("nodes")) {
        const data = entry.data as unknown as Record<string, unknown>;
        nodes.set(entry.id, {
            ...(data as unknown as NodeRecord),
            up: idOf(data.up),
            prev: idOf(data.prev),
            next: idOf(data.next),
            crumbs: (data.crumbs as Reference[]).map((crumb) => idOf(crumb) as string),
        });
    }
    allNodes = [...nodes.values()];
    const numbers = new Map<string, NumberRecord>();
    for (const entry of await getCollection("numbers")) numbers.set(entry.id, entry.data as NumberRecord);
    const facts = new Map<string, Map<string, Record<string, unknown>>>();
    for (const source of sourcesOf().filter((each) => each.files.every((file) => file.startsWith("facts/")))) {
        const records = new Map<string, Record<string, unknown>>();
        for (const entry of await getCollection(source.name as "areas")) records.set(entry.id, entry.data as never);
        facts.set(source.name, records);
    }
    const kinds = facts.get("kinds") ?? new Map();
    const statuses = ruleStatusesOf(theCase());
    return {
        node: (key) => nodes.get(key),
        number: (key) => numbers.get(key),
        fact: (collection, id) => facts.get(collection)?.get(id),
        kindNoun: (kind) => (kinds.get(kind) as { noun: Noun } | undefined)?.noun,
        assistantBytes: assistantSizes(theCase()),
        bundleCommand: buildConfig().bundleCommand,
        ruleStatus: statuses.of,
        rulesInNoStory: statuses.inNoStory,
    };
};

/**
 * The case's records by key, read once per build.
 * @returns the lookups
 */
export const caseData = (): Promise<CaseData> => {
    cached ??= load();
    return cached;
};

/**
 * Every node of the case.
 * @returns the nodes, after the collections are read
 */
export const caseNodes = async (): Promise<NodeRecord[]> => {
    await caseData();
    return allNodes;
};
