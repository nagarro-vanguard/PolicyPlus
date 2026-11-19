import type { APIRoute } from "astro";
import { caseData } from "../../../case/data";
import { theCase } from "../../../case/loader";
import { siteOf } from "../../../case/site";

// The text a reader copies for an assistant about one story, as compose wrote it in `assistant/story.json`, at
// `plan/brief/<n>.txt` where n is the story's place in the plan's order, so no address carries the plan's own keys.
// Read by the story's copy button only when the reader asks for it.

type Story = { key: string; sequence: number };

export const getStaticPaths = async () => {
    await caseData();
    const kase = theCase();
    if (!(await siteOf()).nav.some((section) => section.id === "plan") || !kase.has("assistant/story.json")) return [];
    const texts = kase.json("assistant/story.json") as Record<string, string>;
    return (kase.json("plan/stories.json") as Story[]).flatMap((story) => {
        const text = texts[story.key];
        return text === undefined ? [] : [{ params: { n: String(story.sequence) }, props: { text } }];
    });
};

export const GET: APIRoute = ({ props }) =>
    new Response((props as { text: string }).text, { headers: { "content-type": "text/plain; charset=utf-8" } });
