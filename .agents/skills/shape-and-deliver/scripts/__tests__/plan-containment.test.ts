import { describe, expect, it } from "vitest";
import { pathsOutsidePlan } from "../core/plan-containment";

const codebase = {
    layers: [
        { name: "workspace", path: "." },
        { name: "http-server", path: "apps/http-server" },
    ],
};

describe("the paths outside the layers a plan changes", () => {
    it("are the ones in another layer, and the workspace's docs count as another layer", () => {
        const planned = new Set(["http-server"]);

        expect(
            pathsOutsidePlan(codebase, planned, [
                "apps/http-server/src/retry-policy.ts",
                "docs/guide.md",
                "apps/http-server/vitest.config.ts",
            ]),
        ).toEqual(["docs/guide.md"]);
    });
});
