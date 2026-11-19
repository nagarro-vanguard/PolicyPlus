import { compareText } from "../io";
import type { Node } from "./hierarchy";
import { firstSentence, wordsOf } from "./text";

/*
 * Search records, one per node a reader can open: the name, the word for its level, the name of its parent and a short
 * text. No record id goes in; the node's address is made of names.
 */

export type SearchRecord = { node: string; name: string; level: string; parent: string; text: string };

const short = (text: string) => {
    const sentence = firstSentence(text);
    return wordsOf(sentence) <= 25 ? sentence : `${sentence.split(/\s+/).slice(0, 25).join(" ")}`;
};

/**
 * The search records of the nodes.
 * @param nodes the hierarchy's nodes
 * @returns the records, sorted by name
 */
export const searchOf = (nodes: ReadonlyMap<string, Node>): SearchRecord[] =>
    [...nodes.values()]
        .filter((node) => node.level !== "overview" && node.level !== "unplaced")
        .map((node) => {
            const parent = node.up === null ? undefined : nodes.get(node.up);
            return {
                node: node.key,
                name: node.level === "rule" ? short(node.name) : node.name,
                level: node.noun.one,
                parent: parent === undefined ? "" : parent.level === "overview" ? "" : parent.name,
                text: node.level === "rule" ? "" : short(node.summary),
            };
        })
        .sort(
            (one, other) =>
                compareText(one.name.toLowerCase(), other.name.toLowerCase()) || compareText(one.node, other.node),
        );
