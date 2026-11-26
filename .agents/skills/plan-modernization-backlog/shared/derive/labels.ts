/**
 * The structure labels of the documents the plan writes: the headings of a story's body and of its context. They name a
 * section; they are not the plan's content. Every sentence of the plan is an agent's or the analysis's.
 */
export const LABELS = {
    goal: "Goal",
    why: "Why",
    criteria: "Acceptance criteria",
    open: "Open questions",
    dependsOn: "Depends on",
    terms: "Terminologies",
    journey: "Journey",
    outOfScope: "Out of scope",
    outcome: "Outcome",
    stories: "Stories",
    comesAfter: "Comes after",
    decisions: "Decisions",
    reasons: "What we found",
    design: "Design",
    rulesBuilt: "Rules this story builds",
    rulesRelied: "Rules relied on",
    layers: "Layers",
    targetParts: "Target steps and components",
    restsOn: "What each criterion rests on",
    reading: "Reading of the existing code",
    builtBy: "Built by",
    codeUnread: "The code could not be read when this was written, so it is not included.",
    unreadPlace: "This place could not be read.",
    sameCode: "same code as",
    outside: (system: string) => `Outside system ${system}`,
    scope: (capability: string) => `Scope of ${capability}`,
    goalOfRequest: (number: number) => `Goal ${number} of the request`,
    convention: (layer: string) => `Convention for ${layer}`,
    everyLayer: "every layer",
    ruleOfToday: "A rule of today",
    ruleAt: (place: string) => `The rule at ${place}`,
    noSurface: "Entry points without a window",
    agentsNote: "Each layer's AGENTS.md governs every line in its folder; this file also governs the workspace layer.",
} as const;

/** The structure labels of the choices text. */
export const CHOICE_LABELS = {
    whatItIs: "What it is",
    holds: "What it does or holds",
    target: "Choices about the target's design",
    codebase: "Choices about the target codebase",
    chose: "Chose",
    why: "Why",
    picked: "Picked",
} as const;
