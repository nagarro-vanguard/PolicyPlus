import { addToCount } from "../run/collections";
import { overlaps } from "../model/line-ranges";
import type { JsonRecord } from "../model/json-record";
import { citedRanges, scopeGaps } from "../read/record-writing";
import { FeedbackItem } from "../model/schemas/feedback";
import type { Missed } from "../model/schemas/missed";
import type { Review } from "../model/schemas/review";

type Finding = JsonRecord & { readonly id: string };

export type Verdict = typeof Review.Type;

export type VerdictCounts = Record<"findings" | "partlyCorrect" | "wrong" | "unsettled" | "missed", number>;

export const noCounts: VerdictCounts = { findings: 0, partlyCorrect: 0, wrong: 0, unsettled: 0, missed: 0 };

/**
 * Every gap in a review, on coordinates and ids only: a finding with more than one challenge; a challenge on a record
 * that is no finding of the job, citing no lines, or citing none of a finding's own lines; and a missed record
 * concerning something that is no finding of the job. A finding with no challenge is one the reviewer read and found
 * nothing against.
 * @param findings the job's findings: every record of its output with an issued id
 * @param review the challenges written (each as last written) and what the reviewer found missing
 * @param review.written the challenges
 * @param review.missed what it found missing
 * @param restorable the ids of records dropped from the output, which a missed record may concern: restoring one
 * @returns one line per gap; none when the review can be applied
 */
export function verdictGaps(
    findings: readonly Finding[],
    review: { readonly written: readonly Verdict[]; readonly missed: ReadonlyArray<typeof Missed.Type> },
    restorable: ReadonlySet<string> = new Set(),
): string[] {
    const byId = new Map(findings.map((finding) => [finding.id, finding]));
    const times = new Map<string, number>();
    review.written.forEach((verdict) => addToCount(times, verdict.finding, 1));
    return [
        ...[...times].filter(([, count]) => count > 1).map(([id, count]) => `${id} has ${count} verdicts, not one`),
        ...review.written.flatMap((verdict) => {
            const finding = byId.get(verdict.finding);
            const own = finding === undefined ? [] : citedRanges(finding);
            return [
                ...(finding === undefined
                    ? [`the verdict on ${verdict.finding} names a record that is not a finding of this job`]
                    : []),
                ...(verdict.evidence.length ? [] : [`the verdict on ${verdict.finding} cites no lines`]),
                ...(verdict.evidence.length &&
                own.length &&
                !verdict.evidence.some((one) => own.some((other) => overlaps(one, other)))
                    ? [`the verdict on ${verdict.finding} cites no line of ${verdict.finding}, which cites lines`]
                    : []),
            ];
        }),
        ...review.missed.flatMap((miss) =>
            (miss.concerns === undefined ? [] : miss.concerns)
                .filter((id) => !byId.has(id) && !restorable.has(id))
                .map((id) => `the missed record ${miss.id} concerns ${id}, which is not a finding of this job`),
        ),
    ];
}

/**
 * The counts of what a review found in a job.
 * @param findings the job's findings
 * @param verdicts the challenges
 * @param missed how many records the review found missing
 * @returns the counts
 */
export function countsOf(findings: readonly Finding[], verdicts: readonly Verdict[], missed: number): VerdictCounts {
    const counted = (ruled: Verdict["verdict"]) => verdicts.filter((verdict) => verdict.verdict === ruled).length;
    return {
        findings: findings.length,
        partlyCorrect: counted("partlyCorrect"),
        wrong: counted("wrong"),
        unsettled: counted("unsettled"),
        missed,
    };
}

/**
 * What the review sends back to the owner (D112b): each challenge with its explanation, the finding it is on and the
 * lines it cites, and each record the review found missing with its lines.
 * @param written the challenges the reviewer wrote this round
 * @param missed what it found missing
 * @returns one feedback item each
 */
export const reviewItems = (written: readonly Verdict[], missed: ReadonlyArray<typeof Missed.Type>) => [
    ...written.map((verdict) =>
        FeedbackItem.on(
            "review",
            `ruled ${verdict.verdict}: ${verdict.explanation}`,
            [verdict.finding],
            verdict.evidence,
        ),
    ),
    ...missed.map((miss) =>
        FeedbackItem.on(
            "review",
            `missed: ${miss.says}`,
            miss.concerns === undefined ? [] : miss.concerns,
            miss.evidence,
        ),
    ),
];

/**
 * Missed records pointing at lines outside a file list: the shared part of each stage's placement (D112a), since the
 * owner writes a record only on lines it may cite.
 * @param missed what the review found missing
 * @param lineCounts each listed file's line count
 * @param listing what the list is called, for the message
 * @returns one line per range outside the list
 */
export const missedOutside = (
    missed: ReadonlyArray<typeof Missed.Type>,
    lineCounts: ReadonlyMap<string, number>,
    listing: string,
) => scopeGaps(missed, lineCounts, listing, (miss) => `the missed record ${miss.id}`);
