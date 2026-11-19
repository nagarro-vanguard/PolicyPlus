import { describe, expect, test } from "bun:test";
import { outsideQuotes, ruleNotices, splitReasons, wordsOutsideQuotes } from "../shared/model/rule-wording";
import { oneDecisionGaps } from "../stages/capability-rules/check";

/**
 * One decision per rule: a rule over forty words, or one whose words add a second decision, is refused and split by
 * its writer; a rule over twenty-five words, or with a semicolon, is only reported. Read on copies of real rules of
 * the Roller and Policy Plus analyses; the stored rules are never rewritten.
 */

// Copies of stored rules, word for word.
const rollerFourDecisions =
    "Deleting a planet group does not protect the default group 'all'. A delete post with no group id or handle, or with handle 'all', resolves to the default group and deletes it, and the person is told 'Subscription successfully deleted'. A post naming a group that is not found does nothing. A failed deletion is reported as 'Error deleting planet group'.";
const policyPlusRegFile =
    "When a REG file is applied to a source, a key marked for removal is cleared, a value marked for deletion is deleted and any other value is saved. A key name starting with the prefix is applied without it. A key not starting with the prefix is applied with its full original name, so the registry source would create a key of that name. The source branch limit is not checked.";
const rollerAlso =
    'A Planet setting returns its saved value when one exists. When none has been saved, as on a new site before Planet Config is first saved, it returns the default from the Planet settings definitions, for example "Roller Planet" for the site name. A setting with no definition and no saved value is empty, and any error also gives an empty result.';
const policyPlusSemicolon =
    "A drop-down list has a preselected item only when the language file names one; otherwise none is preselected.";
const policyPlusPlain = "A check box starts unticked unless the language file marks it ticked.";
const balkanQuoted =
    'When a single aircraft manufacturer is requested with an Id of zero or less, the request is refused with "Id cannot be less or equal to zero!".';

const rule = (id: string, says: string) => ({
    id: `businessrule-${id}`,
    says,
    decidedAt: { file: "a.vb", firstLine: 1, lastLine: 2 },
    evidence: [],
});

describe("how many words a rule runs to", () => {
    test("a quotation counts as one word, and an apostrophe is no quotation", () => {
        expect(wordsOutsideQuotes(balkanQuoted)).toBe(20);
        expect(outsideQuotes("A person's name is kept.")).toBe("A person's name is kept.");
        expect(wordsOutsideQuotes(policyPlusPlain)).toBe(12);
    });
});

describe("the one-decision gate on real rules", () => {
    test("refuses a rule of several decisions over forty words, and one adding a decision with `also`", () => {
        expect(splitReasons(rollerFourDecisions)).toEqual(["runs to 56 words"]);
        expect(splitReasons(policyPlusRegFile)).toEqual(["runs to 72 words"]);
        expect(splitReasons(rollerAlso)).toEqual([
            "runs to 61 words",
            "says `also`",
            "has a second sentence with its own condition",
        ]);
        const gaps = oneDecisionGaps([
            rule("11111111111111111111", rollerFourDecisions),
            rule("22222222222222222222", policyPlusRegFile),
        ]);
        expect(gaps).toHaveLength(2);
        expect(gaps[0]).toContain("split it into one rule per decision");
    });

    test("passes a rule of one decision, a quoted message and a semicolon's branches, reporting what is long or hints at more", () => {
        expect(
            oneDecisionGaps([rule("1", policyPlusPlain), rule("2", balkanQuoted), rule("3", policyPlusSemicolon)]),
        ).toEqual([]);
        expect(ruleNotices(policyPlusSemicolon)).toEqual(["joins statements with a semicolon"]);
        expect(ruleNotices(policyPlusPlain)).toEqual([]);
        expect(ruleNotices("When a booking is paid and the seat is free, ".repeat(3))).toEqual(["runs to 30 words"]);
    });

    test("a second condition joined by `and when` is refused, whatever the length", () => {
        expect(splitReasons("A post is refused when empty, and when it is too long it is cut.")).toEqual([
            "adds a second condition with `and when`",
        ]);
    });
});
