/**
 * The catalogue of contexts: which kinds of node have a text and who writes it. The same table as compose/CONTRACT.md
 * ("Context"). A `section` text belongs to a section's page (risks, architecture, choices).
 */
export type ContextKind = {
    /** The kind's name: the file `context/<kind>.json` that holds its texts. */
    readonly kind: string;
    /** The skill that writes the text. */
    readonly producer: "code-analysis" | "shape-target" | "plan";
};

export const CONTEXT_KINDS: readonly ContextKind[] = [
    { kind: "system", producer: "code-analysis" },
    { kind: "area", producer: "code-analysis" },
    { kind: "capability", producer: "code-analysis" },
    { kind: "surface", producer: "code-analysis" },
    { kind: "action", producer: "code-analysis" },
    { kind: "rule", producer: "code-analysis" },
    { kind: "journey", producer: "shape-target" },
    { kind: "persona", producer: "code-analysis" },
    { kind: "story", producer: "plan" },
    { kind: "section", producer: "code-analysis" },
];
