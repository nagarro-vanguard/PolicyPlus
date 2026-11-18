import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { serveEdits } from "../cli/serve-edits";
import { deriveFacts } from "../shared/derive/facts";
import { storyKeyOf } from "../shared/derive/plan";
import { loadRecords, recordFiles, runBuild, writeJson } from "../shared/derive/run";
import { standin } from "../shared/derive/standin";
import { layoutOf } from "../shared/model/layout";
import { parseRequest } from "../shared/model/request";
import { readAnalysis } from "../shared/read/analysis";

const seed = join(import.meta.dir, "../../../../.modernization/.code-analysis");
describe.skipIf(!existsSync(join(seed, "payloads/system.json")))("the editing server", () => {
    test("accepts a change, refuses one that breaks a gate with the gaps, and undoes", async () => {
        const root = mkdtempSync(`${tmpdir()}/serve-`);
        cpSync(join(seed, "payloads"), join(root, ".code-analysis/payloads"), { recursive: true });
        const request = parseRequest(
            `## Output Root\n${root}\n## Source Roots\n- ${root}\n## Leave Out\nNone\n## Target Codebase\n- ${root}/Web\n## Target Stack\n- TypeScript\n## Documents\nNone\n## Additional Notes\nNone\n`,
            root,
        );
        const layout = layoutOf(root);
        writeJson(layout.requestJson, request);
        const analysis = readAnalysis(layout.analysis);
        const records = standin(analysis, deriveFacts(analysis), request);
        for (const [file, value] of [
            [recordFiles(layout).layers, records.layers],
            [recordFiles(layout).decisions, records.decisions],
            [recordFiles(layout).stories, records.stories],
        ] as const)
            writeJson(file, value);
        runBuild(layout);
        const key = storyKeyOf(loadRecords(layout).stories.find((s) => s.actions.length > 0)!);
        const server = serveEdits(root, 0);
        const base = `http://127.0.0.1:${server.port}`;
        const post = (path: string, body?: unknown) =>
            fetch(base + path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }).then(
                async (r) => ({ status: r.status, body: (await r.json()) as { ok: boolean; gaps?: string[] } }),
            );
        const ok = await post("/api/revise", {
            revision: { _tag: "rename", story: key, title: "Open the list" },
            note: "clearer",
        });
        expect(ok.status).toBe(200);
        const bad = await post("/api/revise", {
            revision: { _tag: "rename", story: key, title: "Carry over FindByText" },
        });
        expect(bad.status).toBe(422);
        expect(bad.body.gaps?.length).toBeGreaterThan(0);
        expect(((await (await fetch(`${base}/api/revisions`)).json()) as unknown[]).length).toBe(1);
        expect((await post("/api/undo")).body.ok).toBe(true);
        expect((await post("/api/revise", {})).status).toBe(400);
        server.stop();
    });
});
