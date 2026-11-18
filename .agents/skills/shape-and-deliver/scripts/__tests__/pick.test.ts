import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { pickVariant } from "../core/pick";
import { servicesLayer } from "../core/services";
import { git, makeCodebase, writeFiles } from "./support/codebase-fixture";

const design = "apps/web/src/routes/design/24";

const seeded = () => {
    const codebase = makeCodebase();
    writeFiles(codebase, {
        [`${design}/index.tsx`]: "compare",
        [`${design}/a/page.tsx`]: "variant a",
        [`${design}/a/-components/menu.tsx`]: "menu a",
        [`${design}/b/page.tsx`]: "variant b",
        "apps/web/src/routes/__root.tsx": "root",
    });
    git(codebase, "add", ".");
    git(codebase, "commit", "-q", "-m", "design");
    return codebase;
};

const pick = (codebase: string, to: string, variant = "a", commands: string[] = []) =>
    pickVariant({ codebase, story: "24", variant, to, commands }).pipe(Effect.provide(servicesLayer));

describe("picking a variant", () => {
    it.effect(
        "moves the winner to its place, deletes every other variant and the comparison page, and commits once",
        () =>
            Effect.gen(function* () {
                const codebase = seeded();
                yield* pick(codebase, "apps/web/src/routes/orders/refund");
                expect(readFileSync(join(codebase, "apps/web/src/routes/orders/refund/page.tsx"), "utf8")).toBe(
                    "variant a",
                );
                expect(existsSync(join(codebase, "apps/web/src/routes/orders/refund/-components/menu.tsx"))).toBe(true);
                expect(existsSync(join(codebase, "apps/web/src/routes/design"))).toBe(false);
                expect(existsSync(join(codebase, "apps/web/src/routes/__root.tsx"))).toBe(true);
                expect(git(codebase, "log", "-1", "--format=%s").trim()).toBe(
                    "refactor: promote the picked design of story 24",
                );
                expect(git(codebase, "status", "--porcelain").trim()).toBe("");
            }),
    );

    it.effect("a failed after-pick command commits nothing and restores the tree, so the pick can be run again", () =>
        Effect.gen(function* () {
            const codebase = seeded();
            const before = git(codebase, "rev-parse", "HEAD");
            const place = "apps/web/src/routes/orders";
            const failure = yield* Effect.flip(pick(codebase, place, "a", ["sh -c exit-1"]));
            expect(failure.message).toContain("nothing is committed");
            expect(git(codebase, "rev-parse", "HEAD")).toBe(before);
            expect(git(codebase, "status", "--porcelain").trim()).toBe("");
            expect(existsSync(join(codebase, design, "a/page.tsx"))).toBe(true);
            expect(existsSync(join(codebase, design, "b/page.tsx"))).toBe(true);
            expect(existsSync(join(codebase, place))).toBe(false);
            const commit = yield* pick(codebase, place, "a", [`sh -c 'echo "a b" > picked.txt'`]);
            expect(commit).toBe(git(codebase, "rev-parse", "HEAD").trim());
            expect(readFileSync(join(codebase, "picked.txt"), "utf8").trim()).toBe("a b");
            expect(readFileSync(join(codebase, place, "page.tsx"), "utf8")).toBe("variant a");
        }),
    );
});
