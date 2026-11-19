/**
 * What to do about each kind of gap a gate raises, in one place: a gap's text says what is wrong where, its kind says
 * what to do, so no gate prints a complaint with no way out.
 */
const remedies = {
    "no-life": "write the life's states, or why it has none",
    "many-lives": "write one life, for the job's entity",
    "life-of-another-entity": "write the life of this job's entity only",
    "transition-of-another-life": "name the life this job writes",
    "state-beyond-life": "name only states the life holds, by their numbers",
    "rule-outside-blocks": "decide it inside a block of this job, or drop it",
    "rule-of-several-decisions":
        "split it into one rule per decision, each decided at its own lines, then drop this one with drop-record",
    "outside-listing": "cite lines of the listed files only",
    "unresolved-citation": "name a record that stands",
    "no-receipt": "list the line ranges you read in one Receipt, written last",
    "many-receipts": "keep one receipt",
    "receipt-short": "read the rest of the job's lines, and list what you read",
} as const satisfies Record<string, string>;

export type GapKind = keyof typeof remedies;

export const gapKinds: readonly string[] = Object.keys(remedies);

/**
 * The remedy for one kind of gap.
 * @param kind the gap's kind
 * @returns what to do about it
 */
const remedyFor = (kind: string): string => {
    const found = Object.entries(remedies).find(([name]) => name === kind);
    return found === undefined ? "" : found[1];
};

/**
 * A gap as a gate prints it: what is wrong, then what to do.
 * @param kind the gap's kind
 * @param what what is wrong, and where
 * @returns the line
 */
export const gap = (kind: GapKind, what: string) => `${what}: ${remedyFor(kind)}`;
