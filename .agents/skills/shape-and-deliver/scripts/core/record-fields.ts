import { Schema } from "effect";
import { about } from "./annotations";
import { AcId as KitAcId } from "./work-item-parser";
import { isFilePathInside } from "./contained-path";

export { about };

/** Who reads a record's property; a quote is the work item's own words. */
type Reader = "approver" | "engineer" | "operator" | "agent" | "quote";

/**
 * Builds the annotation of one record property: what it holds and who reads it. Every property carries one, so
 * `append-records --describe` can tell the agent whom it writes for.
 * @param description what the property holds, for whom and where it appears
 * @param readBy who reads it
 * @returns the annotation
 */
export const field = (description: string, readBy: Reader) => ({ description, readBy });

export const Text = Schema.String.check(Schema.isMinLength(1));
/** A position counted from 1: a step's place in a path, a line in a file. */
export const Position = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1));

export const AcId = KitAcId.annotate(
    field("An acceptance criterion's id, such as AC-1, as work-item.json numbers it.", "agent"),
);

/** The prefix of each record type's id, such as `step` for `step-1`. */
export const idPrefix = {
    EntityTouched: "entity",
    InvariantAtRisk: "invariant",
    JourneyAffected: "journey",
    SeamCrossed: "seam",
    PathStep: "step",
    Question: "question",
    ChangedFile: "change",
    DesignDecision: "decision",
    PlanView: "view",
    AcceptanceTest: "test",
    LoadThreshold: "threshold",
    Finding: "finding",
    Deviation: "deviation",
    TestSupportFile: "support",
    SkillProblem: "problem",
} as const;

/**
 * Tells whether a text is a record id of one prefix: the prefix, a dash and a number from 1.
 * @param prefix the record type's prefix
 * @param text the text to test
 * @returns true when the text is such an id
 */
export function isRecordIdOf(prefix: string, text: string): boolean {
    const digits = text.slice(prefix.length + 1);
    return (
        text.startsWith(`${prefix}-`) &&
        digits.length > 0 &&
        digits[0] !== "0" &&
        [...digits].every((char) => char >= "0" && char <= "9")
    );
}

/**
 * Builds the optional id property of a record type; a missing id is numbered when the record is appended.
 * @param prefix the record type's prefix
 * @returns the id schema
 */
export const idOf = (prefix: string) =>
    Schema.optionalKey(
        Schema.String.check(Schema.makeFilter((text: string) => isRecordIdOf(prefix, text) || `a ${prefix} id`)),
    ).annotate(
        field(
            `The record's id, ${prefix}-1, ${prefix}-2 and so on. Leave it out when first writing a record; give it to correct one. Ids are for agents: no text a person reads names one.`,
            "agent",
        ),
    );

export const RepoPath = Text.check(
    Schema.makeFilter(
        (path: string) =>
            isFilePathInside(path) ||
            "a file inside the codebase, relative to its root: not a folder, `.`, `..` or `.git`",
    ),
).annotate(field("A file's path relative to the codebase root.", "engineer"));

export const Lines = Schema.Struct({ first: Position, last: Position })
    .check(Schema.makeFilter((range) => range.first <= range.last || "first must not be after last"))
    .annotate(field("The lines a claim rests on, from first to last, counting from 1.", "engineer"));
