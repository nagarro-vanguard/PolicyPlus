import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { readCodebase } from "../core/codebase";
import { baseCheckGaps, stepCitationGaps } from "../core/plan-gates";
import type { RecordOf } from "../core/record-files";
import { codebaseWithChecks, writeFiles } from "./support/codebase-fixture";
import { run as provided } from "./support/fixtures";

const run = <A, E>(effect: Parameters<typeof provided<A, E>>[0]) => Effect.runPromise(provided(effect));

const change = (action: "add" | "modify", path: string): RecordOf<"ChangedFile"> => ({
    id: "change-1",
    path,
    action,
    steps: ["step-1"],
    reason: "r",
});

const step = (status: "new" | "exists", lines?: { first: number; last: number }): RecordOf<"PathStep"> => ({
    id: "step-1",
    ac: "AC-1",
    order: 1,
    name: "the Runs page",
    file: "apps/api/runs.ts",
    status,
    ...(lines === undefined ? {} : { lines }),
});

describe("the plan's gates judge the codebase as it is", () => {
    it("names a file a plan adds that exists, and one it changes that does not", async () => {
        const root = codebaseWithChecks();
        const filesFolder = mkdtempSync(join(tmpdir(), "files-"));
        writeFiles(filesFolder, { "apps/api/runs.ts": "x\n", "apps/api/missing.ts": "x\n" });
        const gaps = await run(
            baseCheckGaps(
                await run(readCodebase(root)),
                [change("add", "apps/api/runs.ts"), { ...change("modify", "apps/api/missing.ts"), id: "change-2" }],
                {
                    filesFolder,
                    stepIds: new Set(["step-1"]),
                    proposedFiles: ["apps/api/runs.ts", "apps/api/missing.ts"],
                },
            ),
        );
        expect(gaps).toEqual([
            "change-1 adds apps/api/runs.ts, which already exists: make it a modify",
            "change-2 modifys apps/api/missing.ts, which does not exist on the branch",
        ]);
    });

    it("names a cited file that is new but exists, and a cited line range past the file's end", async () => {
        const root = codebaseWithChecks();
        expect(await run(stepCitationGaps(root, [step("new")]))).toEqual([
            "step-1 is new, but apps/api/runs.ts already exists: mark it changes or exists",
        ]);
        expect(await run(stepCitationGaps(root, [step("exists", { first: 1, last: 9 })]))).toEqual([
            "step-1 cites apps/api/runs.ts lines 1 to 9, but the file has 1",
        ]);
    });
});
