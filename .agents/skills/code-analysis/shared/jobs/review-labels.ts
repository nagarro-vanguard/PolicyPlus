import type { JsonRecord } from "../model/json-record";
import type { Verdict } from "./review-verdicts";

type Finding = JsonRecord & { readonly id: string };

export type ReviewLabel =
    | { readonly id: string; readonly label: "reviewed" | "corrected" }
    | { readonly id: string; readonly label: "disputed"; readonly reason: string };

/**
 * A record as a JSON text with its keys in order, so a record equals the copy it came from whatever order its keys
 * were written in.
 * @param value a record, or a part of it
 * @returns its text
 */
export const canonical = (value: unknown): string =>
    Array.isArray(value)
        ? `[${value.map(canonical).join(",")}]`
        : typeof value === "object" && value !== null
          ? `{${Object.entries(value)
                .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
                .map(([key, part]) => `${JSON.stringify(key)}:${canonical(part)}`)
                .join(",")}}`
          : JSON.stringify(value);

/**
 * Where review leaves each record a job writes (P1.36, 6.4): reviewed, read and not challenged, unchanged since;
 * disputed, challenged and unchanged since, with the reviewer's explanation; corrected, changed or written after the
 * review, which judges a job once.
 * A job's second review judges only what the fix changed: a changed record it challenges is disputed, with its words.
 * @param judged what the review judged: the findings it read and its challenges, at most one per finding
 * @param judged.findings the findings it read
 * @param judged.verdicts its challenges
 * @param written the records the job writes now: the judged findings, or its fix's output
 * @param later the challenges of the second review, when the fix was reviewed again
 * @returns one label per record
 */
export function labelsAfterReview(
    judged: { readonly findings: readonly Finding[]; readonly verdicts: readonly Verdict[] },
    written: readonly Finding[],
    later: readonly Verdict[] = [],
): ReviewLabel[] {
    const before = new Map(judged.findings.map((finding) => [finding.id, canonical(finding)]));
    const challengeOf = new Map<string, Verdict>(judged.verdicts.map((verdict) => [verdict.finding, verdict]));
    const laterOf = new Map<string, Verdict>(later.map((verdict) => [verdict.finding, verdict]));
    return written.map((record): ReviewLabel => {
        const challenge = challengeOf.get(record.id);
        const again = laterOf.get(record.id);
        return before.get(record.id) !== canonical(record)
            ? again === undefined
                ? { id: record.id, label: "corrected" }
                : { id: record.id, label: "disputed", reason: again.explanation }
            : challenge === undefined
              ? { id: record.id, label: "reviewed" }
              : { id: record.id, label: "disputed", reason: challenge.explanation };
    });
}
