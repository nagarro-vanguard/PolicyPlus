import { describe, expect, test } from "bun:test";
import { goalGaps } from "./checks";
import type { Architecture } from "../model/records";

const variant = (goals: { goal: number; how: string; where: string[] }[] | undefined) =>
    ({
        name: "Split by business",
        domains: [{ name: "Billing" }, { name: "Policies" }],
        containers: [{ name: "Api" }],
        goals,
    }) as unknown as Architecture;

const goals = ["Divide by domain", "Type every interface"];

describe("C9: every goal answered once, in places the variant has", () => {
    test("passes when each goal has one answer naming real places or none", () => {
        const answered = variant([
            { goal: 1, how: "Each domain owns its modules.", where: ["Billing", "Api"] },
            { goal: 2, how: "Settled in the foundation.", where: [] },
        ]);
        expect(goalGaps(answered, goals)).toEqual([]);
    });
    test("fails with the goal's number when an answer is missing", () => {
        const gaps = goalGaps(variant([{ goal: 1, how: "x", where: [] }]), goals);
        expect(gaps).toEqual(['variant "Split by business": goal 2 has 0 answers, not one']);
    });
    test("fails when a variant has no answers at all", () => {
        expect(goalGaps(variant(undefined), goals)).toHaveLength(2);
    });
    test("fails on a duplicate answer, an unknown goal and an unknown place", () => {
        const gaps = goalGaps(
            variant([
                { goal: 1, how: "x", where: ["Nowhere"] },
                { goal: 1, how: "y", where: [] },
                { goal: 2, how: "z", where: [] },
                { goal: 3, how: "w", where: [] },
            ]),
            goals,
        );
        expect(gaps.join("\n")).toContain("goal 1 has 2 answers");
        expect(gaps.join("\n")).toContain("goal 3, but the request has 2 goals");
        expect(gaps.join("\n")).toContain("names Nowhere");
    });
    test("a request without goals asks for nothing", () => {
        expect(goalGaps(variant(undefined), [])).toEqual([]);
    });
});
