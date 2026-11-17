import { Schema } from "effect";
import { lineSpan } from "../line-ranges";
import { FindingId, Lines, Text, about, eachOnce } from "../shared-fields";

const FeedbackSource = Schema.Literals([
    "person",
    "assignments",
    "registry",
    "review",
    "gate",
    "acrossJobs",
    "store",
]).annotate(
    about(
        "Who gave it: the person, the assigning jobs (units no entry fits, notes), the registry (it changed), the review, the stage's gate, the stage's checks across jobs, or the record store's rules.",
    ),
);

type Source = typeof FeedbackSource.Type;

const headings: ReadonlyArray<readonly [Source, string, "asks" | "checks"]> = [
    ["person", "The person asked:", "asks"],
    ["assignments", "The assigning jobs found:", "asks"],
    ["registry", "The registry changed:", "asks"],
    ["review", "The review found:", "checks"],
    ["gate", "The checks of that output found:", "checks"],
    ["acrossJobs", "The checks of that output found:", "checks"],
    ["store", "The checks of that output found:", "checks"],
];

const asking = new Set<Source>(headings.flatMap(([source, , role]) => (role === "asks" ? [source] : [])));

export class FeedbackItem extends Schema.Class<FeedbackItem>("code-analysis/FeedbackItem")(
    {
        from: FeedbackSource,
        said: Text.annotate(about("What to change in the artifact, in words.")),
        concerns: Schema.optionalKey(
            Schema.NonEmptyArray(FindingId)
                .check(eachOnce((id: string) => id, "records"))
                .annotate(about("The records of the artifact it is about, each once.")),
        ),
        lines: Schema.optionalKey(
            Schema.NonEmptyArray(Lines).annotate(about("The code that shows it, where to start reading.")),
        ),
    },
    about("One thing to change in an artifact, with who said it and what it is about."),
) {
    /**
     * The person's words on an artifact.
     * @param said the words
     * @returns the item
     */
    static fromPerson(said: string) {
        return new FeedbackItem({ from: "person", said });
    }

    /**
     * One item, its records and lines kept only when there are some.
     * @param from who gave it
     * @param said what to change
     * @param concerns the records it is about
     * @param lines the code that shows it
     * @returns the item
     */
    static on(
        from: typeof FeedbackSource.Type,
        said: string,
        concerns: ReadonlyArray<typeof FindingId.Type>,
        lines: ReadonlyArray<typeof Lines.Type>,
    ) {
        const [id, ...ids] = concerns;
        const [range, ...ranges] = lines;
        return new FeedbackItem({
            from,
            said,
            ...(id === undefined ? {} : { concerns: [id, ...ids] }),
            ...(range === undefined ? {} : { lines: [range, ...ranges] }),
        });
    }

    /**
     * A script's findings on an artifact, one item each.
     * @param from the script: the gate, the checks across jobs or the record store's rules
     * @param gaps what each found
     * @returns the items
     */
    static fromGaps(from: "gate" | "acrossJobs" | "store", gaps: readonly string[]) {
        return gaps.map((said) => new FeedbackItem({ from, said }));
    }

    /**
     * One line, as `customInstructions` holds it: what was said, the records it concerns and the lines that show it.
     * @returns the line
     */
    override toString() {
        const pointers = [
            ...(this.concerns === undefined ? [] : [`records ${this.concerns.join(", ")}`]),
            ...(this.lines === undefined ? [] : [`lines ${this.lines.map(lineSpan).join(", ")}`]),
        ];
        return `- ${this.said}${pointers.length ? ` (${pointers.join("; ")})` : ""}`;
    }
}

export class Feedback extends Schema.Class<Feedback>("code-analysis/Feedback")(
    {
        artifact: Text.annotate(
            about("The output it is about: the file an agent wrote, kept where the next run reads it."),
        ),
        items: Schema.NonEmptyArray(FeedbackItem).annotate(
            about("What to change in it: the person's words, and what the review and the scripts found."),
        ),
    },
    about(
        "Feedback on an artifact an agent already produced, from the person, the review or the scripts; its text is the `customInstructions` the agent and its reviewer receive.",
    ),
) {
    /**
     * The items that ask for a change (the person's words, what the assigning jobs found, a changed registry): they stay
     * in force until an artifact that answers them is accepted.
     * @returns the items
     */
    get asks(): readonly FeedbackItem[] {
        return this.items.filter((item) => asking.has(item.from));
    }

    /**
     * The feedback on the next artifact: the items that ask carried, the checks of the earlier artifact replaced by
     * those of the new one, since each round's checks are about the artifact it judged.
     * @param artifact the new artifact
     * @param checks what the review and the scripts found in it
     * @returns the feedback
     */
    next(artifact: string, checks: readonly FeedbackItem[]) {
        const [first, ...rest] = [...this.asks, ...checks];
        if (first === undefined) {
            throw new Error("feedback on an artifact names something to change: give it checks or the person's words");
        }
        return new Feedback({ artifact, items: [first, ...rest] });
    }

    /**
     * The same feedback with further items, on the same artifact.
     * @param items the items
     * @returns the feedback
     */
    adding(items: readonly FeedbackItem[]) {
        return new Feedback({ artifact: this.artifact, items: [...this.items, ...items] });
    }

    /**
     * The same feedback, its artifact kept at another path.
     * @param artifact where the artifact is now
     * @returns the feedback
     */
    movedTo(artifact: string) {
        return new Feedback({ artifact, items: this.items });
    }

    /**
     * What to change, as a person and an agent read it: what asks for a change, by who asks, then what the review and
     * the scripts found in the artifact, each with who found it.
     * @returns the lines
     */
    get sections(): readonly string[] {
        const lines: string[] = [];
        let heading = "";
        for (const [source, title, role] of headings) {
            const items = this.items.filter((item) => item.from === source);
            if (items.length && title !== heading) {
                lines.push(title);
                heading = title;
            }
            lines.push(...items.map((item) => (role === "asks" ? String(item) : `${String(item)} [${item.from}]`)));
        }
        return lines;
    }

    /**
     * The `customInstructions` the agent and its reviewer receive: the artifact to improve, then what to change in it.
     * @returns the text
     */
    override toString() {
        return [
            `Improve your last output, ${this.artifact}: carry over what stands, and change what follows. A record you rewrite keeps its record id: append it with its record id and --findings ${this.artifact}.`,
            ...this.sections,
        ].join("\n");
    }
}
