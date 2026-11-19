import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { caseData } from "../../case/data";
import { addressOf } from "../../case/routes";
import { siteOf } from "../../case/site";

// What the search reads: every node of the case with the word for its level and its parent's name, as compose wrote
// them in search.json, with the address of each, and the sections a reader can open.
export const GET: APIRoute = async () => {
    const data = await caseData();
    const levelOf = (key: string) => data.node(key)?.level;
    const records = (await getCollection("search")).map(({ data: record }) => {
        const node = data.node(record.node);
        return {
            name: record.name,
            level: record.level,
            parent: record.parent,
            text: record.text,
            href: node === undefined ? "" : addressOf(node, levelOf),
        };
    });
    const sections = (await siteOf()).nav.map((section) => ({ name: section.label, level: "", parent: "", text: section.question, href: section.href }));
    return new Response(JSON.stringify([...sections, ...records]), { headers: { "content-type": "application/json" } });
};
