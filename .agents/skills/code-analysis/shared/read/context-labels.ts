/**
 * The structure labels of a context text: the headings of its sections and the names of the lists inside them. They
 * name a section; they are not the analysis's content, which is written from the records.
 */
export const CONTEXT_LABELS = {
    whatItIs: "What it is",
    holds: "What it does or holds",
    rules: "Rules and decisions",
    reliesOn: "Relies on",
    usedBy: "Used by",
    evidence: "Evidence",
    unsure: "Unsure",
    whereToLook: "Where to look",
    saves: "Data it saves",
    reads: "Data it reads",
    layers: "Layers it uses",
    unconfirmed: "Not settled by the code",
    notFollowed: "Links the code does not follow",
    analysedAt: (repository: string, commit: string) => `Analysed from ${repository} at ${commit}`,
    code: (file: string, first: number, last: number) => `${file}, lines ${first}-${last}`,
    gates: "It refuses or blocks something.",
    doubt: "Doubt",
} as const;
