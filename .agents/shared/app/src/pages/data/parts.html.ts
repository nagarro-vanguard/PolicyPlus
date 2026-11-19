import type { APIRoute } from "astro";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Parts } from "../../components/Parts";

// The pieces the shell clones to draw the detail of an action or a rule (src/components/Parts.tsx), written once for the
// whole site and read the first time a detail is opened, so no page carries them.
export const GET: APIRoute = () =>
    new Response(renderToStaticMarkup(createElement(Parts)), { headers: { "content-type": "text/html; charset=utf-8" } });
