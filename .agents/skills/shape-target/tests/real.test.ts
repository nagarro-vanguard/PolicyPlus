import { describe, expect, test } from "bun:test";
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    statSync,
    utimesSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveCurrent } from "../shared/derive/current";
import { deriveLegacy } from "../shared/derive/legacy";
import { layoutOf } from "../shared/model/layout";

const seed = join(import.meta.dir, "../../../../.modernization/.code-analysis/payloads");

describe.skipIf(!existsSync(seed))("the analysis of the example system", () => {
    test("every entry point and rule has its words, and the old system's names are kept apart", () => {
        const sheet = deriveLegacy(seed);
        expect(Object.keys(sheet.actions).length).toBe(163);
        expect(Object.keys(sheet.rules).length).toBe(445);
        expect(Object.values(sheet.actions).every((action) => action.what.length > 0)).toBe(true);
        expect(Object.values(sheet.rules).every((rule) => rule.statement.length > 0)).toBe(true);
        expect(sheet.identifiers.length).toBeGreaterThan(100);
        const owners = new Set(Object.values(sheet.actions).map((action) => action.owner));
        expect(owners.size).toBeGreaterThan(1);
    });
});

const run = join(import.meta.dir, "../../../../.modernization");

describe.skipIf(!existsSync(join(run, "target/current.json")) || !existsSync(seed))(
    "the example run, adopted by the analysis's journeys",
    () => {
        test("an analysis that holds the same journeys leaves target/current.json as it was", () => {
            const root = mkdtempSync(join(tmpdir(), "shape-real-"));
            const layout = layoutOf(root);
            mkdirSync(layout.target, { recursive: true });
            copyFileSync(join(run, "target/current.json"), layout.current);
            copyFileSync(join(run, "request.json"), layout.requestJson);
            writeFileSync(layout.legacy, JSON.stringify(deriveLegacy(seed)));
            const past = new Date(Date.now() - 60_000);
            utimesSync(layout.current, past, past);
            const before = statSync(layout.current).mtimeMs;
            const tasks = (JSON.parse(readFileSync(layout.current, "utf8")) as { tasks: unknown[] }).tasks;
            mkdirSync(layout.payloads, { recursive: true });
            writeFileSync(join(layout.payloads, "journeys.json"), JSON.stringify({ journeys: tasks }));
            const payload = JSON.parse(readFileSync(join(layout.payloads, "journeys.json"), "utf8")) as {
                journeys: unknown[];
            };
            expect(payload.journeys).toHaveLength(tasks.length);
            expect(deriveCurrent(layout)).toMatchObject({ ok: true });
            expect(statSync(layout.current).mtimeMs).toBe(before);
        });
    },
);
