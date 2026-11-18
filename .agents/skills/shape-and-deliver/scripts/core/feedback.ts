import { Schema } from "effect";
import { about, Text } from "./records";

const FeedbackSource = Schema.Literals(["run", "approver", "check", "review"]).annotate(
    about(
        "Who gave it: the run itself (what it knows of the work, such as the design a build follows), the approver (the request's Custom Instructions), a script's check, or the review.",
    ),
);

const headings = [
    ["run", "The run says:"],
    ["approver", "The approver asked:"],
    ["check", "The checks found:"],
    ["review", "The review found:"],
] as const;

/**
 * Builds the line that tells an agent to update the output it already produced instead of starting again.
 * @param work the artifacts the agent produced so far; empty before any output exists
 * @returns a list holding that one line, or an empty list when there is no output yet
 */
const updating = (work: readonly string[]) =>
    work.length > 0
        ? [`Update your last output (${work.join("; ")}), addressing each item below; keep what stands.`]
        : [];

/**
 * Builds the text an agent receives as its `customInstructions`: the feedback's text, or only the update line when
 * there is no feedback but an output already exists.
 * @param feedback the round's feedback, if any
 * @param work the artifacts the agent produced so far; empty before any output exists
 * @returns the text, empty when there is neither feedback nor output
 */
export const instructionsOf = (feedback: Feedback | undefined, work: readonly string[]) =>
    feedback === undefined ? updating(work).join("\n") : feedback.instructions(work);

export class FeedbackItem extends Schema.Class<FeedbackItem>("shape-and-deliver/FeedbackItem")(
    {
        from: FeedbackSource,
        said: Text.annotate(about("What to change, in words.")),
        about: Schema.optionalKey(Schema.NonEmptyArray(Text).annotate(about("The record ids or files it concerns."))),
        lines: Schema.optionalKey(Schema.NonEmptyArray(Text).annotate(about("Where to start reading, as file:line."))),
    },
    about("One thing to change in an output, with who said it and what it is about."),
) {
    /**
     * Writes the item as one bullet line: what was said, then what it concerns and where to read.
     * @returns the line
     */
    override toString() {
        const pointers = [
            ...(this.about === undefined ? [] : [`about ${this.about.join(", ")}`]),
            ...(this.lines === undefined ? [] : [`see ${this.lines.join(", ")}`]),
        ];
        return `- ${this.said}${pointers.length > 0 ? ` (${pointers.join("; ")})` : ""}`;
    }
}

export class Feedback extends Schema.Class<Feedback>("shape-and-deliver/Feedback")(
    {
        items: Schema.NonEmptyArray(FeedbackItem),
    },
    about("Feedback on an output an agent already wrote; its text is the agent's customInstructions."),
) {
    /**
     * Builds the feedback for the next round: the run's and the approver's items stay, and the checks' and review's
     * items are replaced by the new findings, since each judged an earlier output.
     * @param checks what the checks and the review found in the new output
     * @returns the feedback, or undefined when nothing is left to change
     */
    next(checks: readonly FeedbackItem[]): Feedback | undefined {
        const [first, ...rest] = [
            ...this.items.filter((item) => item.from === "run" || item.from === "approver"),
            ...checks,
        ];
        return first === undefined ? undefined : new Feedback({ items: [first, ...rest] });
    }

    /**
     * Writes the text the agent receives: the update line when an output exists, then the items of each source (run,
     * approver, checks, review) under its heading, one line each.
     * @param work the artifacts the agent produced so far; empty before any output exists
     * @returns the text
     */
    instructions(work: readonly string[]) {
        const sections = headings.flatMap(([from, heading]) => {
            const items = this.items.filter((item) => item.from === from);
            return items.length === 0 ? [] : [heading, ...items.map(String)];
        });
        return [...updating(work), ...sections].join("\n");
    }
}

/**
 * Puts a note from the run itself in front of a feedback's items.
 * @param feedback the feedback so far, if any
 * @param note what the run says, if anything
 * @returns the feedback with the note first, or the feedback unchanged when there is no note
 */
export const withRunNote = (feedback: Feedback | undefined, note: string | undefined) =>
    note === undefined
        ? feedback
        : new Feedback({ items: [new FeedbackItem({ from: "run", said: note }), ...(feedback?.items ?? [])] });
