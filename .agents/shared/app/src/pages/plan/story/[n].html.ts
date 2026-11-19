import type { APIRoute } from "astro";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { caseData } from "../../../case/data";
import { theCase } from "../../../case/loader";
import { planViewOf, type StoryView } from "../../../case/plan-view";
import { siteOf } from "../../../case/site";
import { StoryBody } from "../../../components/plan/Plan";

// The body of one story's sheet, at `plan/story/<n>.html` where n is the story's place in the plan's order: the Plan
// page's script reads it into the sheet when the story is opened, so the page carries no story's rules until asked.
// Its links are written relative to the Plan page, which shows it.

export const getStaticPaths = async () => {
    const site = await siteOf();
    if (!site.nav.some((section) => section.id === "plan")) return [];
    const view = planViewOf(theCase(), await caseData(), site.sections);
    return (view?.stories ?? []).map((story) => ({ params: { n: String(story.n) }, props: { story } }));
};

export const GET: APIRoute = ({ props }) =>
    new Response(renderToStaticMarkup(createElement(StoryBody, { story: (props as { story: StoryView }).story, root: "./" })), {
        headers: { "content-type": "text/html; charset=utf-8" },
    });
