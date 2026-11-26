import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { goalsSha } from "./goals";
import { loadGoalsStamps, stampGoals } from "./goals-stamps";
import { writeManifest } from "./manifest";
import { layoutOf } from "./model/layout";

const root = mkdtempSync(join(tmpdir(), "goals-stamp-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("goalsSha", () => {
    test("is the sha256 of the goals as JSON, in order", () => {
        expect(goalsSha(["a", "b"])).toBe(
            new Bun.CryptoHasher("sha256").update(JSON.stringify(["a", "b"])).digest("hex"),
        );
        expect(goalsSha(["a", "b"])).not.toBe(goalsSha(["b", "a"]));
    });
});

describe("stamping a finished stage", () => {
    test("records the stage's stamp and the manifest carries it", () => {
        const layout = layoutOf(root);
        mkdirSync(layout.target, { recursive: true });
        writeFileSync(layout.requestJson, JSON.stringify({ stack: ["TypeScript"], goals: ["one", "two"] }));
        const sha = stampGoals(layout, "journeys");
        expect(sha).toBe(goalsSha(["one", "two"]));
        expect(loadGoalsStamps(layout)).toEqual({ journeys: sha });
        writeManifest(layout);
        const manifest = JSON.parse(readFileSync(layout.manifest, "utf8")) as { goalsSha?: { journeys?: string } };
        expect(manifest.goalsSha?.journeys).toBe(sha);
    });
    test("an edited goal gives another stamp", () => {
        const layout = layoutOf(root);
        writeFileSync(layout.requestJson, JSON.stringify({ stack: ["TypeScript"], goals: ["one", "changed"] }));
        expect(stampGoals(layout, "architecture")).not.toBe(goalsSha(["one", "two"]));
        expect(loadGoalsStamps(layout).journeys).toBe(goalsSha(["one", "two"]));
    });
});
