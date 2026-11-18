import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { readCodebase } from "../core/codebase";
import { decisionGaps } from "../core/decision-gates";
import type { WorkItem } from "../core/documents";
import { servicesLayer } from "../core/services";
import { makeCodebase } from "./support/codebase-fixture";

const story: WorkItem = {
    id: "24",
    kind: "design",
    title: "Refund an order",
    criteria: [{ ac: "AC-1", text: "A refund is made." }],
};

const gapsFor = (paths: readonly string[]) =>
    Effect.gen(function* () {
        const codebase = yield* readCodebase(makeCodebase());
        return decisionGaps(codebase, story, {
            changes: paths.map((path) => ({ path })),
            decisions: [],
            stepIds: new Set<string>(),
        }).filter((gap) => gap.includes("design file"));
    }).pipe(Effect.provide(servicesLayer));

describe("where a design plan puts its variants", () => {
    it.effect("refuses a variant folder named by anything but the story's number", () =>
        Effect.gen(function* () {
            const gaps = yield* gapsFor(["apps/web/src/routes/design/refund-an-order/a/page.tsx"]);
            expect(gaps).toHaveLength(1);
            expect(gaps[0]).toContain("apps/web/src/routes/design/24");
        }),
    );

    it.effect("accepts variants under the story's number and files elsewhere", () =>
        Effect.gen(function* () {
            const gaps = yield* gapsFor([
                "apps/web/src/routes/design/24/a/page.tsx",
                "apps/web/src/routes/design/24/index.tsx",
                "apps/web/src/routeTree.gen.ts",
            ]);
            expect(gaps).toEqual([]);
        }),
    );
});
