import { Schema } from "effect";
import { about } from "../model/shared-fields";

const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

export const ReviewReport = Schema.Struct({
    outcome: Schema.Literals(["accepted", "redo", "refused"]).annotate(
        about(
            "Where the job stands once decided (P1.33, P1.37): accepted, its output written; redo, set aside for its one fix; refused, its output still failing its checks after its fix, so not written.",
        ),
    ),
    round: Count,
    partlyCorrect: Count,
    wrong: Count,
    unsettled: Count,
    missed: Count,
});

/**
 * How a stage's jobs were decided, in one line `finish` prints (P1.33, P1.37): written after review, set aside for their
 * one fix, and refused.
 * @param outcomes each decided job's outcome
 * @returns the line
 */
export const outcomesInWords = (
    outcomes: ReadonlyArray<{ readonly outcome: (typeof ReviewReport.Type)["outcome"] }>,
) => {
    const count = (outcome: (typeof ReviewReport.Type)["outcome"]) =>
        outcomes.filter((each) => each.outcome === outcome).length;
    return `${count("accepted")} accepted, ${count("redo")} to fix, ${count("refused")} refused`;
};
