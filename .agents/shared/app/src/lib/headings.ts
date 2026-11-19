import type { ContentsEntry } from "../components/shell/Contents";

// The headings of a page as the layout rendered it, for the list of them beside the page: every section heading (`h2`)
// and each smaller heading a page marks as a part of its section (`h3` with `data-contents-entry`). A heading with no id
// gets one made from its own words, unique in the page, so an address can point at it and stays the same from one build
// to the next. Headings inside a dialog, a template or a script are the page's pieces, not its sections, and are left
// alone. Nothing is computed from the case: only the page's own markup is read.

const pieces = /(<dialog\b[\s\S]*?<\/dialog>|<template\b[\s\S]*?<\/template>|<script\b[\s\S]*?<\/script>)/;
const heading = /<(h2|h3)\b([^>]*)>([\s\S]*?)<\/\1>/g;
const entities: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#x27;": "'", "&#39;": "'", "&nbsp;": " " };

const textOf = (html: string) =>
    html
        .replaceAll(/<[^>]*>/g, "")
        .replaceAll(/&(?:amp|lt|gt|quot|#x27|#39|nbsp);/g, (hit) => entities[hit] ?? hit)
        .replaceAll(/\s+/g, " ")
        .trim();

const slugOf = (text: string) =>
    text
        .normalize("NFKD")
        .replaceAll(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-+|-+$/g, "")
        .slice(0, 60)
        .replace(/-+$/, "");

/**
 * The page's headings, each with an id.
 * @param html the page's content as rendered
 * @returns the content with an id on every listed heading, and the list
 */
export const pageHeadings = (html: string): { html: string; entries: ContentsEntry[] } => {
    const taken = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((hit) => hit[1] as string));
    const entries: ContentsEntry[] = [];
    const parts = html.split(pieces).map((part, at) => {
        if (at % 2 === 1) return part;
        return part.replaceAll(heading, (whole, tag: string, attributes: string, inner: string, offset: number) => {
            if (tag === "h3" && !/\sdata-contents-entry\b/.test(attributes)) return whole;
            const text = textOf(inner);
            if (text === "") return whole;
            const own = /\sdata-written-by="(agent|app)"/.exec(attributes)?.[1];
            const before = [...part.slice(Math.max(0, offset - 600), offset).matchAll(/\sdata-written-by="(agent|app)"/g)].at(-1)?.[1];
            const writtenBy = (own ?? before ?? "app") as "agent" | "app";
            const existing = /\sid="([^"]+)"/.exec(attributes)?.[1];
            let id = existing;
            if (id === undefined) {
                const base = slugOf(text) || "section";
                id = base;
                for (let n = 2; taken.has(id); n += 1) id = `${base}-${String(n)}`;
                taken.add(id);
            }
            entries.push({ id, text, depth: tag === "h2" ? 2 : 3, writtenBy });
            return existing === undefined ? `<${tag} id="${id}"${attributes}>${inner}</${tag}>` : whole;
        });
    });
    return { html: parts.join(""), entries };
};
