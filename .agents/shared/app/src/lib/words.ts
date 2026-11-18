// The reader's words for the closed sets the payloads use. Every value of each set has a word.
export const groupWords: Record<string, string> = {
    ui: "Screens a person uses",
    api: "Calls from other systems",
    batch: "Runs on a schedule",
    mixed: "Mixed entry",
    logic: "Business logic",
    data: "Data and storage",
};
export const groupOrder = ["ui", "api", "batch", "mixed", "logic", "data"];

export const roleWords: Record<string, string> = {
    facesPerson: "A person starts work here",
    facesOtherSystems: "Other systems start work here",
    runsOnSchedule: "Starts on a schedule",
    runsAsTooling: "Build or install scripts start work here",
    mixedEntry: "Work starts here in several ways",
    reachesStore: "Reads and saves stored data",
    decides: "Decides and calls: starts nothing itself",
};

export const startedWords: Record<string, string> = {
    person: "a person",
    schedule: "a schedule",
    otherSystem: "another system",
};

export const kindWords: Record<string, string> = {
    dataStore: "Data store",
    messaging: "Messaging service",
    outsideService: "Outside service",
    library: "Library",
};

export const accessWords: Record<string, string> = {
    call: "calls",
    reads: "reads",
    saves: "saves",
    renders: "shows",
    request: "requests",
    dispatches: "dispatches",
    leadsTo: "leads to",
};

export const verdictWords: Record<string, string> = {
    crossCutting: "Used across the whole system",
    sharedDomain: "Business logic shared with other capabilities",
    neither: "Small helper",
};

export const accessKindWords: Record<string, string> = {
    reads: "Reads",
    saves: "Saves",
    "reads and saves": "Reads and saves",
    "saves and reads": "Reads and saves",
};

export const gapWords: Record<string, string> = {
    call: "call",
    reads: "read",
    saves: "save",
    renders: "screen display",
    leadsTo: "navigation",
    request: "request",
    dispatches: "event",
};

/**
 * A word for a value of a closed set, or the value itself when the set has no word for it.
 * @param words the set's words
 * @param value the value
 * @returns the word
 */
export const wordFor = (words: Readonly<Record<string, string>>, value: string): string => {
    const word = words[value];
    return word === undefined ? value : word;
};

export const partKindWords: Record<string, string> = {
    program: "Program",
    site: "Web site",
    service: "Service",
    database: "Database",
    library: "Shared library",
    tool: "Tool",
    tests: "Automated tests",
};

export const severityWords: Record<string, string> = { high: "High", medium: "Medium", low: "Low" };
export const severityOrder = ["high", "medium", "low"];

/** The headings the answers sit under, in the order a reader meets them. */
export const answerGroups = {
    madeOf: ["What it is", "How it is built inside"],
    keeps: ["What it keeps"],
    runs: [
        "Where it runs, and how each part starts and stops",
        "How each part is built and released",
        "How work enters, and how it is handled",
        "Who can do what, settings, and when things fail",
        "What it offers",
    ],
} as const;

export const subjectWords: Record<string, string> = {
    system: "The whole system",
    part: "Part",
    technology: "Technology",
    capability: "Capability",
    entity: "Data",
};
