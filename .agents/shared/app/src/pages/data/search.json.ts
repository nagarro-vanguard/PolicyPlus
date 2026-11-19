import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { caseData } from "../../case/data";
import { addressOf } from "../../case/routes";
import { journeyPageOf } from "../../case/journeys";
import { riskAnchorOf } from "../../case/risks-view";
import { siteOf } from "../../case/site";

// What the search reads: every node of the case with the word for its level and its parent's name, as compose wrote
// them in search.json, with the address of each, and the sections a reader can open.
export const GET: APIRoute = async () => {
    const data = await caseData();
    const levelOf = (key: string) => data.node(key)?.level;
    const site = await siteOf();
    // A record outside the hierarchy belongs to a section's page; its key says where on it. A section a reader cannot
    // open gives no address, and the record is left out.
    const hrefOf = (section: string, key: string): string => {
        const page = site.nav.find((each) => each.id === section)?.href;
        if (page === undefined) return "";
        const rest = key.slice(key.indexOf("/") + 1);
        if (section === "journeys") return journeyPageOf(rest);
        if (section === "plan") return `${page}#story=${rest}`;
        if (section === "risks") return `${page}#${riskAnchorOf(Number(rest))}`;
        if (section === "architecture") return `${page}#proposed`;
        return "";
    };
    const records = (await getCollection("search")).flatMap(({ data: record }) => {
        if (record.section !== undefined) {
            const href = hrefOf(record.section, record.node);
            return href === "" ? [] : [{ name: record.name, level: record.level, parent: record.parent, text: record.text, href }];
        }
        const node = data.node(record.node);
        return [{
            name: record.name,
            level: record.level,
            parent: record.parent,
            text: record.text,
            href: node === undefined ? "" : addressOf(node, levelOf),
        }];
    });
    const sections = site.nav.map((section) => ({ name: section.label, level: "", parent: "", text: section.question, href: section.href }));
    return new Response(JSON.stringify([...sections, ...records]), { headers: { "content-type": "application/json" } });
};
