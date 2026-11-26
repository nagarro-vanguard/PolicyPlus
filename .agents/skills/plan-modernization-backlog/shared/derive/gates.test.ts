import { describe, expect, test } from "bun:test";
import { goalGaps } from "./gates";
import type { Decision } from "../model/records";

const goals = ["Divide by domain.", "Type every interface.", "Use plugins."];

const goalDecision = (id: string, number: number) =>
    ({ id, topic: { _tag: "goal", number }, layer: "workspace", chose: "x", reason: "y" }) as unknown as Decision;
const criterion = (...from: object[]) => ({ criteria: [{ says: "s", from }] }) as never;

describe("P1: every goal has one decision", () => {
    test("names the goal that has none", () => {
        const gaps = goalGaps(
            goals,
            [goalDecision("d1", 1), goalDecision("d2", 2)],
            [criterion({ _tag: "goal", number: 1 }, { _tag: "goal", number: 2 }, { _tag: "goal", number: 3 })],
        );
        expect(gaps).toEqual([`goal 3 has no decision: "Use plugins."`]);
    });

    test("flags two decisions for one goal and a decision for a goal that does not exist", () => {
        const gaps = goalGaps(
            ["one"],
            [goalDecision("d1", 1), goalDecision("d2", 1), goalDecision("d3", 4)],
            [criterion({ _tag: "goal", number: 1 })],
        );
        expect(gaps).toContain(`goal 1 has 2 decisions, not one: "one"`);
        expect(gaps).toContain("a decision names goal 4, which the request does not have");
    });
});

describe("P2: every goal is carried by a criterion", () => {
    const decisions = [goalDecision("d1", 1), goalDecision("d2", 2), goalDecision("d3", 3)];

    test("a criterion may cite the goal or the goal's decision", () => {
        const gaps = goalGaps(goals, decisions, [
            criterion({ _tag: "goal", number: 1 }),
            criterion({ _tag: "decision", id: "d2" }, { _tag: "decision", id: "d3" }),
        ]);
        expect(gaps).toEqual([]);
    });

    test("names the goals no criterion carries", () => {
        const gaps = goalGaps(goals, decisions, [
            criterion({ _tag: "goal", number: 1 }),
            criterion({ _tag: "rule", id: "r" }),
        ]);
        expect(gaps).toEqual([
            `goal 2 is carried by no story criterion: "Type every interface."`,
            `goal 3 is carried by no story criterion: "Use plugins."`,
        ]);
    });
});

test("a request with no goals has nothing to decide or carry", () => {
    expect(goalGaps([], [], [])).toEqual([]);
});
