import type { z } from "zod";
import type { DiagramKind } from "../../compose/build/diagrams";
import type { FoldKind, Level } from "../../compose/build/hierarchy";
import type { Node } from "../../compose/contract";
import { diagramTitles, foldTitles, levelWords, relationLabels, severityWords } from "../lib/copy";
import { type CountView, countOf, heading, type Noun, type NumberRecord } from "./format";
import { addressOf, assistantFileOf } from "./routes";

// What one node shows, resolved from the case: names, addresses and numbers in words, everything a page or the
// detail of an action or rule prints. It only follows keys the case gives (a row's node, a number's key, a fact's id);
// it never counts, joins or infers. The same view feeds the server-rendered Explorer and the detail read on demand.

export type NodeRecord = z.output<typeof Node>;

export type Diagram = {
    key: string;
    kind: DiagramKind;
    subject: string;
    caption: string | null;
    question: string | null;
    legend: { kind: string; words: string }[];
    text: string[];
    shown: boolean;
};

/** What the view reads: the case's records by key. */
export type CaseData = {
    node: (key: string) => NodeRecord | undefined;
    number: (key: string) => NumberRecord | undefined;
    fact: (collection: string, id: string) => Record<string, unknown> | undefined;
    kindNoun: (kind: string) => Noun | undefined;
    /** The size in bytes of a node's text for an assistant, when the case has one. */
    assistantBytes: (key: string) => number | undefined;
    /** The diagrams about a subject. */
    diagrams: (subject: string) => readonly Diagram[];
    bundleCommand: string | undefined;
};

export type Link = { href: string; name: string };
export type RowView = {
    href?: string;
    name: string;
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
    lateral: { label: string; links: (Link & { count?: CountView })[] }[];
    assistant: { file: string; kilobytes: number; fuller: string | null } | null;
    diagrams: { key: string; title: string; question: string | null; legend: string[]; text: string[] }[];
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
        return { href: hrefOf(other), name: data.node(other)?.name ?? "" };
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
        const name = target?.name ?? each.text ?? words?.name ?? "";
        const line = target !== undefined ? target.summary : each.text !== undefined ? words?.name : words?.line;
        const kind = each.kind === undefined ? undefined : data.kindNoun(each.kind)?.one;
        const risk = each.risk === undefined ? undefined : severityWords[each.risk];
        const shown = count(each.count);
        return {
            ...(each.node === undefined ? {} : { href: hrefOf(each.node) }),
            name,
            ...(line === undefined || line === "" || line === name ? {} : { line }),
            ...(shown === undefined ? {} : { count: shown }),
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
        const group = lateral.find((one) => one.label === label);
        if (group === undefined) lateral.push({ label, links: [target] });
        else group.links.push(target);
    }
    const bytes = data.assistantBytes(node.key);
    const tests = data.number(`${node.key}/tests`);
    return {
        key: node.key,
        level: node.level,
        href: hrefOf(node.key),
        name: node.name,
        summary: node.summary,
        noun: node.noun,
        crumbs: node.crumbs.map((crumb) => link(crumb) as Link),
        facts: node.facts.map((each) => count(each) as CountView),
        tests: tests === undefined ? null : countOf(tests),
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
        diagrams: data
            .diagrams(node.level === "overview" ? "system" : node.key)
            .filter((diagram) => diagram.shown)
            .map((diagram) => ({
                key: diagram.key,
                title: diagram.caption ?? diagramTitles[diagram.kind],
                question: diagram.question,
                legend: diagram.legend.map((each) => each.words),
                text: diagram.text,
            })),
    };
};
