import type { z } from "zod";
import type { Node, NumberEntry } from "../../compose/contract";
import { severityWords } from "../lib/copy";
import type { Case } from "./read";
import { sourcesOf } from "./sources";

// The loader's own check of a whole case. Astro's `reference()` logs a broken reference and the build still passes, so
// this check names every key that does not resolve and the loader fails the build on any: a node's crumbs, up, previous
// and next, its rows and lateral links; every number key a node, a row or the Brief shows; every fact a row or a node
// refers to; every kind of place a row names; every risk word; every search record's node. It also fails a key that
// cannot be an address (the app's routes are made from node keys) and a combined number whose parts do not add up.

type NodeRecord = z.output<typeof Node>;
type NumberRecord = z.output<typeof NumberEntry>;

/** A node key the app can turn into an address: the overview, the unplaced node, or `<level>/<slug>`. */
const keyPattern = /^(?:overview|unplaced|[a-z]+\/[a-z0-9]+(?:-{1,2}[a-z0-9]+)*)$/;

/**
 * Every problem of a case's references and keys.
 * @param kase the opened case
 * @returns the problems, each naming the record and the key that does not resolve; none when the case holds
 */
export const caseProblems = (kase: Case): string[] => {
    const problems: string[] = [];
    const sources = sourcesOf();
    const factIds = new Map<string, Set<string>>();
    for (const source of sources.filter((each) => each.files.every((file) => file.startsWith("facts/")))) {
        const ids = new Set<string>();
        for (const file of source.files.filter((each) => kase.has(each))) {
            const value = kase.json(file);
            if (source.id === null) ids.add(source.name);
            else for (const record of value as Record<string, unknown>[]) ids.add(String(record[source.id]));
        }
        factIds.set(source.name, ids);
    }
    const nodeFiles = sources.find((each) => each.name === "nodes")?.files ?? [];
    const nodes = new Map<string, NodeRecord>();
    for (const file of nodeFiles.filter((each) => kase.has(each))) {
        for (const node of kase.json(file) as NodeRecord[]) {
            if (nodes.has(node.key)) problems.push(`two nodes share the key ${node.key}`);
            nodes.set(node.key, node);
        }
    }
    if (!nodes.has("overview")) problems.push("the case has no overview node");
    const numbers = new Map<string, NumberRecord>();
    if (kase.has("numbers.json")) for (const entry of kase.json("numbers.json") as NumberRecord[]) numbers.set(entry.key, entry);
    const kinds = factIds.get("kinds") ?? new Set<string>();

    const node = (where: string, key: string | null) => {
        if (key !== null && !nodes.has(key)) problems.push(`${where} names the node ${key}, which the case does not hold`);
    };
    const number = (where: string, key: string | undefined) => {
        if (key !== undefined && !numbers.has(key)) problems.push(`${where} shows the number ${key}, which numbers.json does not hold`);
    };
    const fact = (where: string, ref: { collection: string; id: string } | null | undefined) => {
        if (ref === null || ref === undefined) return;
        const ids = factIds.get(ref.collection);
        if (ids === undefined) problems.push(`${where} refers to the facts ${ref.collection}, which the app does not read`);
        else if (!ids.has(ref.id)) problems.push(`${where} refers to ${ref.collection} ${ref.id}, which the case does not hold`);
    };

    for (const each of nodes.values()) {
        const where = `node ${each.key}`;
        if (!keyPattern.test(each.key)) problems.push(`${where}: the key cannot be an address`);
        else if (each.key !== each.level && !each.key.startsWith(`${each.level}/`))
            problems.push(`${where}: the key does not start with its level ${each.level}`);
        if (each.noun.one === "" || each.noun.many === "") problems.push(`${where}: no noun`);
        for (const crumb of each.crumbs) node(`${where} (trail)`, crumb);
        if (each.key !== "overview" && each.crumbs[0] !== "overview") problems.push(`${where}: the trail does not start at the overview`);
        node(`${where} (up)`, each.up);
        node(`${where} (previous)`, each.prev);
        node(`${where} (next)`, each.next);
        fact(where, each.ref);
        for (const key of each.facts) number(where, key);
        const rows = [...each.children.rows, ...each.folds.flatMap((fold) => fold.rows)];
        for (const row of rows) {
            if (row.node !== undefined) node(`${where} (row)`, row.node);
            fact(`${where} (row)`, row.fact);
            number(`${where} (row)`, row.count);
            if (row.kind !== undefined && !kinds.has(row.kind)) problems.push(`${where}: a row names the kind ${row.kind}, which facts/kinds.json does not hold`);
            if (row.risk !== undefined && !(row.risk in severityWords)) problems.push(`${where}: the risk word ${row.risk} has no plain label in the app`);
            if (row.node === undefined && row.fact === undefined && row.text === undefined) problems.push(`${where}: a row shows nothing`);
        }
        for (const link of each.lateral) {
            node(`${where} (link)`, link.node);
            number(`${where} (link)`, link.count);
        }
    }

    for (const entry of numbers.values()) {
        if (entry.noun.one === "" || entry.noun.many === "") problems.push(`number ${entry.key}: no noun`);
        if (entry.parts !== undefined) {
            let sum = 0;
            for (const part of entry.parts) sum += part.value;
            if (sum !== entry.value) problems.push(`number ${entry.key}: its parts add up to ${sum}, not ${entry.value}`);
        }
    }

    if (kase.has("brief.json")) {
        const brief = kase.json("brief.json") as { risks: { top: string[]; ranked: string[] }; numbers: string[]; plan: Record<string, unknown> | null };
        for (const id of [...brief.risks.top, ...brief.risks.ranked]) fact("the Brief", { collection: "risks", id });
        for (const key of brief.numbers) number("the Brief", key);
        if (brief.plan !== null) for (const field of ["phases", "epics", "stories", "readyFirst"]) number("the Brief's plan", brief.plan[field] as string);
    }
    if (kase.has("search.json")) for (const record of kase.json("search.json") as { node: string }[]) node("search", record.node);
    return problems;
};
