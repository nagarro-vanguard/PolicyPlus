/** The closed catalogue of the kinds of work a story is, in plain words; the app shows these words as they are. */
export const workLabels = {
    feature: "New feature",
    rebuilt: "Rebuilt from today's behaviour",
    designed: "Designed first, then built",
    technical: "Technical change",
    "technical-rebuilt": "Technical change that keeps today's behaviour",
    fix: "Fix",
} as const;

export type WorkLabel = keyof typeof workLabels;
