import { describe, expect, test } from "bun:test";
import { figureGaps, screenGaps } from "../stages/publish/check-briefing";

const screen = (id: string, places: string[]) => ({
    id: `screen-${id}`,
    name: "Book a flight",
    purpose: "Pick a flight and pay.",
    kind: "screen",
    places,
});

const figure = (id: string, fields: Record<string, unknown>) => ({
    id: `figure-${id}`,
    kind: "parts",
    question: "What is the system made of?",
    caption: "The website, the services and the database it keeps data in.",
    records: [],
    ...fields,
});

describe("the briefing's screen gate", () => {
    test("every candidate screen in exactly one Screen", () => {
        expect(screenGaps([screen("11111111111111111111", ["a", "b"])], ["a", "b"])).toEqual([]);
    });

    test("names a candidate left out, one named twice and one that is no candidate", () => {
        const gaps = screenGaps(
            [screen("11111111111111111111", ["a", "c"]), screen("22222222222222222222", ["a"])],
            ["a", "b"],
        );
        expect(gaps.some((gap) => gap.startsWith("b is a candidate screen no Screen names"))).toBe(true);
        expect(gaps.some((gap) => gap.startsWith("a is named 2 times"))).toBe(true);
        expect(gaps.some((gap) => gap.startsWith("c is named by a Screen"))).toBe(true);
    });
});

describe("the briefing's figure gate", () => {
    const menu = new Map([["parts", ["part-111111", "part-222222"]]]);

    test("a figure on the menu naming offered records passes", () => {
        expect(figureGaps([figure("11111111111111111111", { records: ["part-111111"] })], menu)).toEqual([]);
        expect(figureGaps([figure("11111111111111111111", {})], menu)).toEqual([]);
    });

    test("refuses a record its line does not hold", () => {
        expect(figureGaps([figure("11111111111111111111", { records: ["part-999999"] })], menu).join(" ")).toContain(
            "part-999999",
        );
    });

    test("refuses a caption that states a count", () => {
        expect(figureGaps([figure("11111111111111111111", { caption: "Eight parts make it up." })], menu)).toEqual([]);
        expect(
            figureGaps([figure("11111111111111111111", { caption: "8 parts make it up." })], menu).join(" "),
        ).toContain("states a count");
    });
});
