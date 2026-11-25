import type { APIRoute } from "astro";
import { caseData } from "../../../case/data";
import { theCase } from "../../../case/loader";
import { siteOf } from "../../../case/site";

// The text a reader copies as context about one story, as compose wrote it in `context/story.json`, at
// `plan/brief/<n>.md`, the real file the story's path and download name (its script, which Copy reads, is written from the
// `.txt` endpoint beside it), where n is the story's place in the plan's order, so no address carries the plan's own keys.
// Both are only read when the reader asks for the text.

type Story = { key: string; sequence: number };

export const getStaticPaths = async () => {
    await caseData();
    const kase = theCase();
    if (!(await siteOf()).nav.some((section) => section.id === "plan") || !kase.has("context/story.json")) return [];
    const texts = kase.json("context/story.json") as Record<string, string>;
    return (kase.json("plan/stories.json") as Story[]).flatMap((story) => {
        const text = texts[story.key];
        return text === undefined ? [] : [{ params: { n: String(story.sequence) }, props: { text } }];
    });
};

export const GET: APIRoute = ({ props }) =>
    new Response((props as { text: string }).text, { headers: { "content-type": "text/markdown; charset=utf-8" } });
