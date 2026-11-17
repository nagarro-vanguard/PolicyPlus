import { Result, Schema } from "effect";

/** One record taken out of a job's output: its id, why it went, and its text as last written. */
export const Dropped = Schema.Struct({ id: Schema.String, why: Schema.String, record: Schema.String });

/** What dropping a record did: the lines that stay and the drop to keep, or why it was refused. */
export type DropResult =
    | { readonly kind: "dropped"; readonly kept: readonly string[]; readonly drop: typeof Dropped.Type }
    | { readonly kind: "refused"; readonly reason: string };

const decodeId = Schema.decodeUnknownResult(Schema.fromJsonString(Schema.Struct({ id: Schema.String })));

/**
 * The record id a line of a job's output carries.
 * @param line the line
 * @returns the id, or none for a line that is no record
 */
const idOf = (line: string): string | undefined => {
    const decoded = decodeId(line);
    return Result.isSuccess(decoded) ? decoded.success.id : undefined;
};

/**
 * Remove one record from a job's output, every copy of it, keeping its text for the job's drops. Refused for an id the
 * output does not hold, and while a record that stands cites it: the citing record goes first, or is corrected.
 * @param input the output's lines, the record's id, why it goes, and the ids of the records that cite it
 * @param input.lines the output's lines
 * @param input.id the record's id
 * @param input.why why it goes
 * @param input.citedBy the ids of the records that cite it
 * @returns the lines that stay and the drop to keep, or why it is refused
 */
export const dropRecord = (input: {
    readonly lines: readonly string[];
    readonly id: string;
    readonly why: string;
    readonly citedBy: readonly string[];
}): DropResult => {
    const held = input.lines.filter((line) => idOf(line) === input.id);
    const [last] = held.slice(-1);
    if (last === undefined) {
        return { kind: "refused", reason: `${input.id} is no record of this job's output: drop only its records` };
    }
    if (input.citedBy.length) {
        return {
            kind: "refused",
            reason: `${input.citedBy.join(", ")} cite${input.citedBy.length === 1 ? "s" : ""} ${input.id}: drop or correct them first`,
        };
    }
    return {
        kind: "dropped",
        kept: input.lines.filter((line) => idOf(line) !== input.id),
        drop: { id: input.id, why: input.why, record: last },
    };
};

/**
 * What the reviewer is handed of the records that were dropped: each one's text and why it went, so a drop is judged
 * like any finding and may be restored by a `Missed`.
 * @param drops the job's drops
 * @returns the text, empty when nothing was dropped
 */
export const droppedForReview = (drops: readonly (typeof Dropped.Type)[]): string =>
    drops.length
        ? [
              "## Dropped records",
              ...drops.map((drop) => `- ${drop.id}, dropped because ${drop.why}\n  ${drop.record}`),
          ].join("\n")
        : "";
