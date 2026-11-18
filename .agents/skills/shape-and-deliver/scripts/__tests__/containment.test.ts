import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { appendRecords } from "../core/record-files";
import { pickVariant } from "../core/pick";
import { runLayout } from "../core/run-layout";
import { servicesLayer, type Services } from "../core/services";
import { finishFix } from "../stages/code/fix";
import { git, makeCodebase, writeFiles } from "./support/codebase-fixture";
import { scenarios, storyNumber } from "./support/delivery-scenarios";
import { deliver } from "./support/drive-delivery";
import { script } from "./support/run-scripts";

const onSystem = <A, E>(effect: Effect.Effect<A, E, Services>) => effect.pipe(Effect.provide(servicesLayer));

describe("what a run may write or remove", () => {
    it("append-records refuses an output path outside the run's work folder and writes nothing", () => {
        const outside = join(mkdtempSync(join(tmpdir(), "shape-and-deliver-outside-")), "records.jsonl");
        const record = { question: "Q?", whyItMatters: "W", recommended: "R" };
        const ran = script("append-records", ["Question", outside], `${JSON.stringify(record)}\n`);
        expect(ran.code).toBe(1);
        expect(ran.out).toContain("not inside a run's folder");
        expect(existsSync(outside)).toBe(false);
    });

    it.effect("a pick refuses a story or variant name that climbs out, before it removes anything", () =>
        Effect.gen(function* () {
            const design = "apps/web/src/routes/design/24";
            const codebase = makeCodebase();
            writeFiles(codebase, {
                [`${design}/a/page.tsx`]: "a",
                [`${design}/index.tsx`]: "compare",
                "keep/me.txt": "x",
            });
            git(codebase, "add", ".");
            git(codebase, "commit", "-q", "-m", "design");
            const pick = (story: string, variant: string) =>
                onSystem(pickVariant({ codebase, story, variant, to: "apps/web/src/routes/orders", commands: [] }));
            for (const story of ["../../../../keep", "../x", "a/b"]) {
                expect((yield* Effect.flip(pick(story, "a"))).message).toContain("is not a story name");
            }
            expect((yield* Effect.flip(pick("24", "../a"))).message).toContain("is not a variant name");
            expect(existsSync(join(codebase, "keep/me.txt"))).toBe(true);
            expect(existsSync(join(codebase, design, "a/page.tsx"))).toBe(true);
        }),
    );
});

describe("a delivered feature, repaired", { timeout: 120_000 }, () => {
    it("a Deviation does not excuse a file in a layer the plan does not change", async () => {
        const delivered = await deliver(scenarios.feature, true);
        const layout = runLayout(delivered.codebase, storyNumber);
        writeFiles(delivered.codebase, { "packages/db/extra.ts": "x\n" });
        git(delivered.codebase, "add", "-A");
        git(delivered.codebase, "commit", "-q", "-m", "repair");
        const deviation = { file: "packages/db/extra.ts", planSaid: "p", codeRevealed: "c", choice: "x" };
        await Effect.runPromise(onSystem(appendRecords("Deviation", layout.fix.records, JSON.stringify(deviation))));
        mkdirSync(layout.fix.folder, { recursive: true });
        writeFileSync(layout.fix.handBack, "# Hand back\n\nDone.\n");
        const outcome = await Effect.runPromise(onSystem(finishFix(delivered.runFolder)));
        expect((outcome.gaps ?? []).join("\n")).toContain(
            "packages/db/extra.ts is outside the layers the approved plan changes",
        );
    });

    it("takes a repair question at its recommendation, and stops only for a blocker", async () => {
        const delivered = await deliver(scenarios.feature, true);
        const layout = runLayout(delivered.codebase, storyNumber);
        mkdirSync(layout.fix.folder, { recursive: true });
        writeFileSync(layout.fix.handBack, "# Hand back\n\nDone.\n");
        const question = { question: "Which?", whyItMatters: "It decides.", recommended: "The first." };
        const ask = (record: object) =>
            Effect.runPromise(onSystem(appendRecords("Question", layout.fix.records, JSON.stringify(record))));
        await ask(question);
        expect((await Effect.runPromise(onSystem(finishFix(delivered.runFolder)))).outcome).toBe("accepted");
        await ask({ ...question, blocker: true });
        expect((await Effect.runPromise(onSystem(finishFix(delivered.runFolder)))).outcome).toBe("stop");
    });
});
