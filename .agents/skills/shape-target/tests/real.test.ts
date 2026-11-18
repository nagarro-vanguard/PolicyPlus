import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { deriveLegacy } from "../shared/derive/legacy";

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
