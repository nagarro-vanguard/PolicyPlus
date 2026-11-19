import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gateState, subjectOf } from "../shared/gates";
import { layoutOf } from "../shared/model/layout";

const layout = layoutOf(mkdtempSync(join(tmpdir(), "shape-gates-")));
const base = Date.now() - 100_000;
const at = (step: number) => new Date(base + step * 1000);
const made = (path: string, step: number) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "[]");
    utimesSync(path, at(step), at(step));
};
const decided = (path: string, step: number) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ confirmedAt: at(step).toISOString() }));
};

describe("where a decision recorded before hashes were kept stands, by time alone", () => {
    test("nothing proposed is not made, and a decision waits on the one before it", () => {
        expect(gateState(layout, "as-is")).toBe("not made");
        made(layout.current, 0);
        expect(gateState(layout, "as-is")).toBe("waiting");
        made(layout.journeyVariants, 2);
        expect(gateState(layout, "journeys")).toBe("blocked");
    });
    test("a record not older than its proposal confirms it, and a newer proposal changes it", () => {
        decided(layout.choiceAsIs, 1);
        expect(gateState(layout, "as-is")).toBe("confirmed");
        expect(gateState(layout, "journeys")).toBe("waiting");
        made(layout.current, 5);
        expect(gateState(layout, "as-is")).toBe("changed");
        expect(gateState(layout, "journeys")).toBe("blocked");
    });
    test("a proposal made before the decision it rests on was confirmed again is changed, not confirmed", () => {
        made(layout.current, 0);
        decided(layout.choiceAsIs, 10);
        decided(layout.choiceJourneys, 11);
        expect(gateState(layout, "as-is")).toBe("confirmed");
        expect(gateState(layout, "journeys")).toBe("changed");
    });
    test("a record without a date does not confirm", () => {
        writeFileSync(layout.choiceAsIs, "{}");
        expect(gateState(layout, "as-is")).toBe("waiting");
    });
});

describe("where a decision stands, by the hash it recorded", () => {
    const fresh = layoutOf(mkdtempSync(join(tmpdir(), "shape-gates-hash-")));
    const confirm = (path: string, proposal: string, step: number) => {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, JSON.stringify({ confirmedAt: at(step).toISOString(), subject: subjectOf(proposal) }));
    };
    test("touching what it decides on, or copying it, changes nothing; changing one byte does", () => {
        made(fresh.current, 5);
        confirm(fresh.choiceAsIs, fresh.current, 1);
        expect(gateState(fresh, "as-is")).toBe("confirmed");
        utimesSync(fresh.current, at(50), at(50));
        expect(gateState(fresh, "as-is")).toBe("confirmed");
        writeFileSync(fresh.current, "[ ]");
        expect(gateState(fresh, "as-is")).toBe("changed");
        writeFileSync(fresh.current, "[]");
        expect(gateState(fresh, "as-is")).toBe("confirmed");
    });
    test("a decision confirmed before the one it rests on was confirmed again has changed", () => {
        made(fresh.journeyVariants, 3);
        confirm(fresh.choiceJourneys, fresh.journeyVariants, 4);
        expect(gateState(fresh, "journeys")).toBe("confirmed");
        confirm(fresh.choiceAsIs, fresh.current, 6);
        expect(gateState(fresh, "journeys")).toBe("changed");
        confirm(fresh.choiceJourneys, fresh.journeyVariants, 7);
        expect(gateState(fresh, "journeys")).toBe("confirmed");
    });
});
