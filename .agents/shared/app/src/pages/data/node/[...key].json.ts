import type { APIRoute, GetStaticPaths } from "astro";
import { caseData, caseNodes } from "../../../case/data";
import { hasPage, keyOfPath, pathOf } from "../../../case/routes";
import { viewOf } from "../../../case/view";

// The detail of each action and rule, read by the page that holds it when a reader opens it: thousands on a large
// system, so they are data, not pages.
export const getStaticPaths: GetStaticPaths = async () =>
    (await caseNodes()).filter((node) => !hasPage(node.level)).map((node) => ({ params: { key: pathOf(node.key) } }));

export const GET: APIRoute = async ({ params }) =>
    new Response(JSON.stringify(viewOf(keyOfPath(params.key as string), await caseData())), {
        headers: { "content-type": "application/json" },
    });
