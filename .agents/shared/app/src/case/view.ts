import type { z } from "zod";
import type { FoldKind, Level } from "../../compose/build/hierarchy";
import type { Node } from "../../compose/contract";
import { foldTitles, levelWords, relationLabels, severityWords } from "../lib/copy";
import { type CountView, countOf, heading, isCodeName, type Noun, type NumberRecord } from "./format";
import { addressOf, assistantFileOf } from "./routes";

// What one node shows, resolved from the case: names, addresses and numbers in words, everything a page or the
// detail of an action or rule prints. It only follows keys the case gives (a row's node, a number's key, a fact's id);
// it never counts, joins or infers. The same view feeds the server-rendered Explorer and the detail read on demand.

export type NodeRecord = z.output<typeof Node>;
type Relation = NodeRecord["lateral"][number]["relation"];

/** What the view reads: the case's records by key. */
export type CaseData = {
    node: (key: string) => NodeRecord | undefined;
    number: (key: string) => NumberRecord | undefined;
    fact: (collection: string, id: string) => Record<string, unknown> | undefined;
    kindNoun: (kind: string) => Noun | undefined;
    /** The size in bytes of a node's text for an assistant, when the case has one. */
    assistantBytes: (key: string) => number | undefined;
    bundleCommand: string | undefined;
};

/** A link to a node: its name, and the name from code when the name shown is the node's summary instead. */
export type Link = { href: string; name: string; code?: string; line?: string };
export type RowView = {
    href?: string;
    name: string;
    /** The name from code, shown as a small tag, when the row's title is the node's summary. */
    code?: string;
    line?: string;
    count?: CountView;
    risk?: { word: string; badge: "high" | "medium" | "low" };
    kind?: string;
};
export type NodeView = {
    key: string;
    level: Level;
    href: string;
    name: string;
    /** The name from code when `name` is the node's summary (an action named in code); null otherwise. */
    code: string | null;
    summary: string;
    noun: Noun;
    crumbs: Link[];
    facts: CountView[];
    tests: CountView | null;
    children: { heading: string; rows: RowView[] };
    folds: { kind: FoldKind; title: string; rows: RowView[] }[];
    up: Link | null;
    prev: Link | null;
    next: Link | null;
    lateral: { relation: Relation; label: string; links: (Link & { count?: CountView })[] }[];
    assistant: { file: string; kilobytes: number; fuller: string | null } | null;
};

const textOf = (record: Record<string, unknown>, fields: readonly string[]) => {
    for (const field of fields) {
        const value = record[field];
        if (typeof value === "string" && value !== "") return value;
    }
    return undefined;
};

/** The name and line of a fact a row shows, from the fields the facts carry. */
const factWords = (record: Record<string, unknown>) => ({
    name: textOf(record, ["name", "summary", "statement", "says", "term"]) ?? "",
    line: textOf(record, ["purpose", "categoryWords", "means"]),
});

/** The levels whose names may be names from code: they have no page of their own, and a row names them. */
const codeLevels: readonly Level[] = ["action", "rule"];

/**
 * What a node is called where it is shown: an action named in code shows its summary, with the name from code as a tag.
 * @param node the node
 * @returns the name to show, and the name from code when it is not that name
 */
export const labelOf = (node: Pick<NodeRecord, "level" | "name" | "summary">): { name: string; code?: string } =>
    codeLevels.includes(node.level) && node.summary !== "" && isCodeName(node.name) ? { name: node.summary, code: node.name } : { name: node.name };

/**
 * The view of one node.
 * @param key the node's key
 * @param data the case
 * @returns the view; it throws for a key the case does not hold (the loader's check makes that impossible in a build)
 */
export const viewOf = (key: string, data: CaseData): NodeView => {
    const node = data.node(key);
    if (node === undefined) throw new Error(`the case holds no node ${key}`);
    const levelOf = (other: string) => data.node(other)?.level;
    const hrefOf = (other: string) => {
        const target = data.node(other);
        if (target === undefined) throw new Error(`the case holds no node ${other}`);
        return addressOf(target, levelOf);
    };
    const link = (other: string | null): Link | null => {
        if (other === null) return null;
        const target = data.node(other);
        return { href: hrefOf(other), ...(target === undefined ? { name: "" } : labelOf(target)) };
    };
    const count = (numberKey: string | undefined) => {
        if (numberKey === undefined) return undefined;
        const entry = data.number(numberKey);
        if (entry === undefined) throw new Error(`numbers.json holds no ${numberKey}`);
        return countOf(entry);
    };
    const row = (each: NodeRecord["children"]["rows"][number]): RowView => {
        const target = each.node === undefined ? undefined : data.node(each.node);
        const fact = each.fact === undefined ? undefined : data.fact(each.fact.collection, each.fact.id);
        const words = fact === undefined ? undefined : factWords(fact);
        const label = target === undefined ? undefined : labelOf(target);
        const name = label?.name ?? each.text ?? words?.name ?? "";
        const line = label?.code !== undefined ? undefined : target !== undefined ? target.summary : each.text !== undefined ? words?.name : words?.line;
        const kind = each.kind === undefined ? undefined : data.kindNoun(each.kind)?.one;
        const risk = each.risk === undefined ? undefined : severityWords[each.risk];
        const shown = count(each.count);
        return {
            ...(each.node === undefined ? {} : { href: hrefOf(each.node) }),
            name,
            ...(label?.code === undefined ? {} : { code: label.code }),
            ...(line === undefined || line === "" || line === name ? {} : { line }),
            ...(shown === undefined || shown.value === 0 ? {} : { count: shown }),
            ...(risk === undefined ? {} : { risk }),
            ...(kind === undefined ? {} : { kind }),
        };
    };
    const childNouns = new Set(
        node.children.rows.map((each) => (each.node === undefined ? "" : (data.node(each.node)?.noun.many ?? ""))),
    );
    const sharedNoun = childNouns.size === 1 ? [...childNouns][0] : undefined;
    const childLevel = node.children.level;
    const lateral: NodeView["lateral"] = [];
    for (const each of node.lateral) {
        const label = relationLabels[each.relation];
        const target = { ...(link(each.node) as Link), ...(each.count === undefined ? {} : { count: count(each.count) as CountView }) };
        // A place used by another capability is often called as this one is: the row names the capability it belongs to
        // (its crumb), and the place's own name only when it differs from this node's.
        if (each.relation === "alsoUsedBy") {
            const owner = [...(data.node(each.node)?.crumbs ?? [])].reverse().find((crumb) => levelOf(crumb) === "capability");
            const ownerName = owner === undefined ? undefined : data.node(owner)?.name;
            if (ownerName !== undefined && ownerName !== "") {
                if (target.name !== node.name) target.line = target.name;
                target.name = ownerName;
            }
        }
        const group = lateral.find((one) => one.label === label);
        if (group === undefined) lateral.push({ relation: each.relation, label, links: [target] });
        else group.links.push(target);
    }
    const bytes = data.assistantBytes(node.key);
    // A count of nothing says nothing, and a number is said once: the tests go in their own line, a second count in the
    // same noun is left out (it reads as the same fact), and the line holds three facts at most.
    const testsEntry = data.number(`${node.key}/tests`);
    const tests = testsEntry === undefined || testsEntry.value === 0 ? null : countOf(testsEntry);
    const facts: CountView[] = [];
    const nounsSaid = new Set<string>();
    for (const key of node.facts) {
        if (key === `${node.key}/tests`) continue;
        const entry = data.number(key);
        const shown = count(key) as CountView;
        if (entry === undefined || entry.value === 0 || nounsSaid.has(entry.noun.many)) continue;
        nounsSaid.add(entry.noun.many);
        facts.push(shown);
    }
    const label = labelOf(node);
    return {
        key: node.key,
        level: node.level,
        href: hrefOf(node.key),
        name: label.name,
        code: label.code ?? null,
        summary: label.code === undefined ? node.summary : "",
        noun: node.noun,
        crumbs: node.crumbs.map((crumb) => link(crumb) as Link),
        facts: facts.slice(0, tests === null ? 3 : 2),
        tests,
        children: {
            heading:
                sharedNoun !== undefined && sharedNoun !== ""
                    ? heading(sharedNoun)
                    : childLevel === null
                      ? ""
                      : levelWords[childLevel],
            rows: node.children.rows.map(row),
        },
        folds: node.folds.map((fold) => ({ kind: fold.kind, title: foldTitles[fold.kind], rows: fold.rows.map(row) })),
        up: link(node.up),
        prev: link(node.prev),
        next: link(node.next),
        lateral,
        assistant:
            bytes === undefined
                ? null
                : {
                      file: assistantFileOf(node.key),
                      kilobytes: Math.max(1, Math.round(bytes / 1024)),
                      fuller:
                          data.bundleCommand === undefined || node.level !== "capability"
                              ? null
                              : `${data.bundleCommand} capability "${node.name}"`,
                  },
    };
};
