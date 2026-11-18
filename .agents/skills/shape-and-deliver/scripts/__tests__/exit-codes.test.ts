import { describe, expect, it } from "vitest";
import { writeFiles } from "./support/codebase-fixture";
import { scenarios } from "./support/delivery-scenarios";
import { deliver } from "./support/drive-delivery";
import { script } from "./support/run-scripts";

describe("what a script's exit code tells its caller", { timeout: 120_000 }, () => {
    it("run-layer-checks exits 1 when a layer fails its Verify, and prints that the work is to be fixed", async () => {
        const delivered = await deliver(scenarios.feature, true);
        writeFiles(delivered.codebase, {
            "apps/api/AGENTS.md": "# api\n\n## Owns\n\nRuns.\n\n## Verify\n\n- `sh -c 'exit 3'`\n",
        });
        const ran = script("run-layer-checks", [delivered.runFolder, "afterCode"]);
        expect(ran.code).toBe(1);
        expect(ran.out).toContain('"outcome":"fix"');
    });
});
