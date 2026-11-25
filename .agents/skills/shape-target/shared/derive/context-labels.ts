/**
 * The structure labels of the texts a reader copies for the target: section headings and the plain words of a step's
 * stored change. They name; the content is the designers' and the analysis's words.
 */
export const CONTEXT_LABELS = {
    whatItIs: "What it is",
    holds: "What it does or holds",
    rules: "Rules and decisions",
    reliesOn: "Relies on",
    usedBy: "Used by",
    unsure: "Unsure",
    whereToLook: "Where to look",
    today: "Today, step by step",
    newWay: "The new way, step by step",
    leftOut: "Left out on purpose",
    cost: "Cost",
    keeps: "Rules it keeps",
    changes: "Rules it changes",
    entryPoints: "Entry points of today it replaces",
    facts: "Data it owns",
    parts: "Parts that carry it",
    dependsOn: "Domains it relies on",
    containers: "Parts that run it",
    integrations: "Outside systems it needs",
    recommended: "Why this one",
    changeWords: {
        kept: "kept as today",
        new: "new",
        merged: "joined with another step",
        split: "split in two",
        reordered: "moved earlier or later",
        deferred: "done later",
        defaulted: "filled in for the person",
        inferred: "done for the person",
    } as Readonly<Record<string, string>>,
} as const;
