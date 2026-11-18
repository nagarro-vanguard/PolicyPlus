import { resolve } from "node:path";
import { layoutOf } from "../shared/model/layout";
import { loadRevisions } from "../shared/derive/run";
import { revert, revise, undo, type Outcome } from "../shared/derive/revise";

/**
 * A small local server so the app can edit the plan: it answers only on the loopback address, takes one change at a
 * time, and gives back the outcome (accepted, or refused with the gaps). Everything it accepts goes through the same
 * gates as the command line.
 * @param root the Output Root
 * @param port the port; 0 picks a free one
 * @returns the running server
 */
export const serveEdits = (root: string, port = 4322) => {
    const layout = layoutOf(resolve(root));
    const headers = {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type",
    };
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
    return Bun.serve({
        hostname: "127.0.0.1",
        port,
        async fetch(request) {
            const url = new URL(request.url);
            if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
            if (request.method === "GET" && url.pathname === "/api/revisions") return json(loadRevisions(layout));
            if (request.method !== "POST") return json({ message: "not found" }, 404);
            const outcome = ((): Outcome => {
                return { ok: false, message: "not found" };
            })();
            if (url.pathname === "/api/undo") return json(undo(layout));
            if (url.pathname === "/api/revert") return json(revert(layout));
            if (url.pathname === "/api/revise") {
                const body = (await request.json().catch(() => undefined)) as
                    { revision?: unknown; note?: string } | undefined;
                if (body?.revision === undefined) return json({ ok: false, message: "send { revision, note }" }, 400);
                const result = revise(layout, body.revision, body.note ?? "");
                return json(result, result.ok ? 200 : 422);
            }
            return json(outcome, 404);
        },
    });
};

if (import.meta.main) {
    const [root, port] = process.argv.slice(2);
    if (root === undefined || root === "--help") {
        console.log(
            "Usage: serve-edits.ts <Output Root> [port]: serves GET /api/revisions and POST /api/revise {revision, note}, /api/undo and /api/revert on 127.0.0.1 (default port 4322) for the app's edit forms.",
        );
        process.exit(root === undefined ? 2 : 0);
    }
    const server = serveEdits(root, port === undefined ? 4322 : Number(port));
    console.log(`editing the plan at http://127.0.0.1:${server.port}`);
}
