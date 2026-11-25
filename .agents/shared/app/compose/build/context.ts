import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PlanInput } from "../inputs/plan";
import type { Facts } from "./facts";
import type { Hierarchy } from "./hierarchy";
import type { ProposedJourney } from "./journeys";
import { CONTEXT_KINDS } from "../context-kinds";
import { slugify } from "./text";

/*
 * The texts a reader copies as context. Compose writes none of them: each skill wrote the text of the nodes it
 * produces (code-analysis its places and risks, shape-target its journeys and architecture, the plan its choices and
 * stories), as files with an index that names the record each is about. Compose finds the node each belongs to, checks
 * the texts and hands them on. No number bounds a text.
 */

export type ContextTexts = {
    /** Each text by its scope (a node key, a story key, a journey slug or a section), grouped by kind. */
    texts: Record<string, Record<string, string>>;
    /** The exact size in bytes of each text, by kind and scope. */
    sizes: Record<string, Record<string, number>>;
    /** What is wrong with the texts: a node with none, a text for no node, a text that names an id or a path. */
    problems: string[];
};

export type ContextFolders = {
    /** The analysis's texts: `<analysis>/contexts`. */
    readonly analysis?: string | undefined;
    /** The target's texts: `<root>/target/contexts`. */
    readonly target?: string | undefined;
    /** The plan's texts: `<root>/work-items/contexts`. */
    readonly plan?: string | undefined;
};

type IndexEntry = { kind: string; keys: Record<string, string>; file: string };

const encoder = new TextEncoder();

/** Every file a producer wrote, with the record it is about. */
const read = (folder: string | undefined): { entry: IndexEntry; text: string }[] => {
    if (folder === undefined || !existsSync(join(folder, "index.json"))) return [];
    const index = JSON.parse(readFileSync(join(folder, "index.json"), "utf8")) as IndexEntry[];
    return index.map((entry) => ({ entry, text: readFileSync(join(folder, entry.file), "utf8") }));
};

/** Every string held by a property named `id` anywhere in the values given: the ids a text must never name. */
export const idsOf = (...values: readonly unknown[]): Set<string> => {
    const ids = new Set<string>();
    const walk = (value: unknown) => {
        if (Array.isArray(value)) for (const each of value) walk(each);
        else if (value !== null && typeof value === "object")
            for (const [name, each] of Object.entries(value as Record<string, unknown>)) {
                if (name === "id" && typeof each === "string" && each.length > 7) ids.add(each);
                else walk(each);
            }
    };
    for (const value of values) walk(value);
    return ids;
};

/** The words of a text that are ids, by exact match of each token. */
const namedIds = (text: string, ids: ReadonlySet<string>) => {
    const found = new Set<string>();
    for (const token of text.split(/[^A-Za-z0-9_.:#|-]+/)) if (token !== "" && ids.has(token)) found.add(token);
    return [...found];
};

/**
 * Collect every text for the nodes of the case.
 * @param facts the facts
 * @param hierarchy the hierarchy, for the node of each record
 * @param plan the plan, when there is one
 * @param journeys the chosen journeys, for the slug of each task
 * @param folders where the producers wrote their texts
 * @param roots the folders whose absolute paths a text must not hold
 * @param ids every id of every record of the case
 * @returns the texts, their sizes and what is wrong
 */
export const contextOf = (
    facts: Facts,
    hierarchy: Hierarchy,
    plan: PlanInput | undefined,
    journeys: readonly ProposedJourney[],
    folders: ContextFolders,
    roots: readonly string[],
    ids: ReadonlySet<string>,
): ContextTexts => {
    const texts: Record<string, Record<string, string>> = Object.fromEntries(
        CONTEXT_KINDS.map((each) => [each.kind, {}]),
    );
    const problems: string[] = [];
    const put = (kind: string, key: string | undefined, text: string, what: string) => {
        if (key === undefined) problems.push(`a ${kind} text is about ${what}, which is no node of the case`);
        else (texts[kind] as Record<string, string>)[key] = text.endsWith("\n") ? text : `${text}\n`;
    };
    const slugOf = new Map(journeys.map((journey) => [journey.task, journey.slug]));
    for (const { entry, text } of [...read(folders.analysis), ...read(folders.target), ...read(folders.plan)]) {
        const k = entry.keys;
        if (entry.kind === "system") put("system", "overview", text, "the system");
        else if (entry.kind === "area" || entry.kind === "capability" || entry.kind === "action" || entry.kind === "rule")
            put(entry.kind, hierarchy.nodeOf.get(k.id ?? ""), text, `${entry.kind} ${k.id}`);
        else if (entry.kind === "surface")
            put("surface", hierarchy.surfaceNode.get(`${k.capability}|${k.surface}`), text, `a screen of ${k.capability}`);
        else if (entry.kind === "persona") put("persona", slugify(k.name ?? ""), text, `persona ${k.name}`);
        else if (entry.kind === "journey") put("journey", slugOf.get(k.task ?? ""), text, `journey ${k.task}`);
        else if (entry.kind === "risks" || entry.kind === "architecture" || entry.kind === "choices")
            put("section", entry.kind, text, entry.kind);
        else problems.push(`a text of the kind ${entry.kind}, which the catalogue does not hold`);
    }
    // A story's text is the plan skill's file, as it wrote it.
    for (const [key, text] of plan?.attachments ?? []) put("story", key, text, `story ${key}`);

    // Every node of a kind the catalogue holds has a text.
    const expected: [string, readonly (string | undefined)[]][] = [
        ["system", ["overview"]],
        ["area", facts.areas.map((each) => hierarchy.nodeOf.get(each.id))],
        ["capability", facts.capabilities.map((each) => hierarchy.nodeOf.get(each.id))],
        ["action", facts.actions.map((each) => hierarchy.nodeOf.get(each.id))],
        ["rule", facts.rules.map((each) => hierarchy.nodeOf.get(each.id))],
        ["journey", journeys.map((journey) => journey.slug)],
    ];
    for (const [kind, keys] of expected) {
        const have = texts[kind] as Record<string, string>;
        const missing = keys.filter((key) => key !== undefined && have[key] === undefined).length;
        if (missing > 0) problems.push(`${missing} ${kind} nodes have no text`);
    }

    // No text names an id of any record, holds a path of this machine, or draws a diagram.
    for (const [kind, byKey] of Object.entries(texts))
        for (const [key, text] of Object.entries(byKey)) {
            const named = namedIds(text, ids);
            if (named.length > 0) problems.push(`the ${kind} text ${key} names a record id: ${named[0]}`);
            if (roots.some((root) => root !== "" && root !== "/" && text.includes(root)))
                problems.push(`the ${kind} text ${key} holds a path of this machine`);
            if (text.includes("```mermaid")) problems.push(`the ${kind} text ${key} holds a diagram's source`);
        }
    const sizes = Object.fromEntries(
        Object.entries(texts).map(([kind, byKey]) => [
            kind,
            Object.fromEntries(Object.entries(byKey).map(([key, text]) => [key, encoder.encode(text).length])),
        ]),
    );
    return { texts, sizes, problems };
};

/** The folder a run's output root sits in: its paths are made relative to it. */
export const parentOf = (folder: string) => folder.replace(/\/+$/, "").split("/").slice(0, -1).join("/") || "/";
