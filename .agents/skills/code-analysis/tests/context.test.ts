import { describe, expect, test } from "bun:test";
import { contextOf, shown } from "../shared/read/payload-context";

/**
 * The context of a place has the shape plans/ux-lean-design.md documents: an ask, the scope, a map with pointers (own
 * files first, then the shared ones, the most widely shared first), the data saved and read, the rules, what is
 * unconfirmed, what was not followed and the commit; capped, with the count left out; and no record id.
 */
const input = {
    scope: "Entry point in the EditSetting screen of Setting policies: Applies the chosen state.",
    startsAt: "PolicyPlus/EditSetting.vb:312",
    files: [
        { file: "PolicyPlus/Zeta.vb", capabilities: 1 },
        { file: "PolicyPlus/Wide.vb", capabilities: 5 },
        { file: "PolicyPlus/Narrow.vb", capabilities: 2 },
        { file: "PolicyPlus/Alpha.vb", capabilities: 1 },
    ],
    saves: ["Policy setting"],
    reads: ["Policy comment"],
    rules: Array.from({ length: 11 }, (_, i) => `Rule ${i + 1} (PolicyPlus/A.vb:${i})`),
    unconfirmed: ["The menu action belongs to browsing. If wrong: it moves."],
    notFollowed: [],
    commit: "abc123",
};

describe("the context of a place", () => {
    test("lines come in the documented order", () => {
        const lines = contextOf(input).text.split("\n");
        const order = [
            "Ask:",
            "Scope:",
            "Where to look first:",
            "Data saved:",
            "Data read:",
            "Rules decided here:",
            "Unconfirmed:",
            "Commit:",
        ];
        const at = order.map((head) => lines.findIndex((line) => line.startsWith(head)));
        expect(at.every((index) => index >= 0)).toBe(true);
        expect([...at].sort((a, b) => a - b)).toEqual(at);
    });

    test("it starts at the entry point, then the files only this capability uses, then shared ones, the widest first", () => {
        expect(contextOf(input).lookFirst).toEqual([
            "Starts at PolicyPlus/EditSetting.vb:312",
            "PolicyPlus/Alpha.vb (only this capability)",
            "PolicyPlus/Zeta.vb (only this capability)",
            "PolicyPlus/Wide.vb (shared with 4 other capabilities)",
            "PolicyPlus/Narrow.vb (shared with 1 other capability)",
        ]);
    });

    test("a long list is capped and says how many it left out", () => {
        const context = contextOf(input);
        expect(context.rules).toHaveLength(shown.rules);
        expect(context.rulesNotShown).toBe(11 - shown.rules);
        expect(context.rulesTotal).toBe(11);
        expect(context.text).toContain(`...and ${11 - shown.rules} more`);
        const many = contextOf({
            ...input,
            files: Array.from({ length: 20 }, (_, i) => ({ file: `F${i}.vb`, capabilities: 1 })),
        });
        expect(many.lookFirstNotShown).toBe(21 - shown.files);
    });

    test("a place with nothing unconfirmed says so, and a place with no files has no map of files", () => {
        const context = contextOf({ ...input, unconfirmed: [], files: [], startsAt: undefined });
        expect(context.text).toContain("Unconfirmed: nothing the analysis could not settle here");
        expect(context.text).not.toContain("Where to look first:");
    });

    test("it carries the commit and no record id", () => {
        const text = contextOf(input).text;
        expect(text).toContain("Commit: abc123");
        expect(text).not.toMatch(/-\d{10,}/);
    });
});
