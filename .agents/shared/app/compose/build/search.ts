import { compareText } from "../io";
import type { Node } from "./hierarchy";
import { firstSentence, wordsOf } from "./text";

/*
 * Search records, one per node a reader can open: the name, the word for its level, the name of its parent and a short
 * text. No record id goes in; the node's address is made of names.
 */

export type SearchRecord = {
    node: string;
    name: string;
    level: string;
    parent: string;
    text: string;
    /** For a record outside the hierarchy, the section that holds it; its key says where in it. */
    section?: "journeys" | "plan" | "risks" | "architecture";
};

/** What the other sections hold for search: journeys by slug, stories by place in order, risks by rank, domains. */
export type SectionRecords = {
    journeys: readonly { slug: string; title: string; outcome: string; capability: string }[];
    stories: readonly { sequence: number; title: string; what: string; epic: string }[];
    risks: readonly { rank: number; summary: string; categoryWords: string }[];
    domains: readonly { slug: string; name: string; concept: string }[];
};

const short = (text: string) => {
    const sentence = firstSentence(text);
    return wordsOf(sentence) <= 25 ? sentence : `${sentence.split(/\s+/).slice(0, 25).join(" ")}`;
};

/**
 * The search records of the nodes.
 * @param nodes the hierarchy's nodes
 * @returns the records, sorted by name
 */
export const searchOf = (nodes: ReadonlyMap<string, Node>, more?: SectionRecords): SearchRecord[] =>
    [
        ...[...nodes.values()]
        .filter((node) => node.level !== "overview" && node.level !== "unplaced")
        .map((node) => {
            const parent = node.up === null ? undefined : nodes.get(node.up);
            return {
                node: node.key,
                name: node.level === "rule" ? short(node.name) : node.name,
                level: node.noun.one,
                parent: parent === undefined ? "" : parent.level === "overview" ? "" : parent.name,
                text: node.level === "rule" ? "" : short(node.summary),
            } as SearchRecord;
        }),
        ...(more?.journeys ?? []).map((each) => ({
            node: `journey/${each.slug}`,
            name: each.title,
            level: "journey",
            parent: each.capability,
            text: short(each.outcome),
            section: "journeys" as const,
        })),
        ...(more?.stories ?? []).map((each) => ({
            node: `story/${each.sequence}`,
            name: each.title,
            level: "story",
            parent: each.epic,
            text: short(each.what),
            section: "plan" as const,
        })),
        ...(more?.risks ?? []).map((each) => ({
            node: `risk/${each.rank}`,
            name: each.summary,
            level: "risk",
            parent: each.categoryWords,
            text: "",
            section: "risks" as const,
        })),
        ...(more?.domains ?? []).map((each) => ({
            node: `domain/${each.slug}`,
            name: each.name,
            level: "domain",
            parent: "",
            text: short(each.concept),
            section: "architecture" as const,
        })),
    ].sort(
            (one, other) =>
                compareText(one.name.toLowerCase(), other.name.toLowerCase()) || compareText(one.node, other.node),
        );
