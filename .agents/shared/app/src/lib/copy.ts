import type { DiagramKind } from "../../compose/build/diagrams";
import type { FoldKind, Level } from "../../compose/build/hierarchy";

// Every word the app writes itself, in one place so its voice can be read and tested as a whole. The app owns the titles
// of the closed lists the case uses (folds, links between nodes, change words, diagram kinds, risk words, sections); every
// noun for a thing of the analysed system comes from the case (a node's noun, `facts/kinds.json`, a number's noun).
// Nothing here names a kind of program, screen or platform: the same words serve any system.

/** The plain word and badge of each risk severity the case may hold; a severity without one fails the build. */
export const severityWords: Readonly<Record<string, { word: string; badge: "high" | "medium" | "low" }>> = {
    high: { word: "High risk", badge: "high" },
    medium: { word: "Medium risk", badge: "medium" },
    low: { word: "Low risk", badge: "low" },
};

/** The title of each fold a node may carry. */
export const foldTitles: Readonly<Record<FoldKind, string>> = {
    parts: "Parts the code is organised in",
    checkFirst: "Check these first",
    unplaced: "What no capability holds",
    tooling: "What builds, releases or runs it",
    tests: "Automated tests that check it",
    data: "Data it reads and saves",
    risks: "Risks",
    openPoints: "Open points",
    sharedRules: "Business rules many places share",
    rulesOnNoEntryPoint: "Business rules no action reaches",
    entryPointsOnNoSurface: "Actions in no place",
    layers: "Layers the work passes through",
    rulesInNoCapability: "Business rules in no capability",
    entryPointsInNoSurface: "Actions in no place",
    entryPointsInNoCapability: "Actions in no capability",
    entryPointsInNoPart: "Actions whose code is in no part",
    capabilitiesInNoArea: "Capabilities in no area",
};

/** The label of each kind of link from one node to another. */
export const relationLabels: Readonly<Record<"alsoUsedBy" | "livesIn" | "usedBy" | "reachedFrom" | "decidedFor", string>> =
    {
        alsoUsedBy: "Also used by",
        livesIn: "Where its code lives",
        usedBy: "Used by",
        reachedFrom: "Reached from",
        decidedFor: "Decided for",
    };

/** The plain label of each change word a step of a new journey carries; the stored word is never shown. */
export const changeWords: Readonly<Record<string, string>> = {
    kept: "Kept as today",
    new: "New",
    merged: "Joined with another step",
    split: "Split in two",
    reordered: "Moved earlier or later",
    deferred: "Done later",
    defaulted: "Filled in for the person",
    inferred: "Done for the person",
};

/** The title of each kind of diagram, used when the analysis gave the diagram no caption. */
export const diagramTitles: Readonly<Record<DiagramKind, string>> = {
    organisation: "How it is organised",
    context: "What it connects to",
    navigation: "How people move from place to place",
    data: "What data it reads and saves",
    flow: "How the work passes through it",
    compare: "Today and the new way side by side",
};

/** The heading of a level's rows when the rows do not share one noun. */
export const levelWords: Readonly<Record<Level, string>> = {
    overview: "Systems",
    area: "Areas",
    capability: "Capabilities",
    surface: "Places",
    action: "Actions",
    rule: "Business rules",
    part: "Parts",
    place: "Places",
    unplaced: "Not placed",
};

/** The sections a reader can open, each answering one question. */
export const sectionWords = {
    overview: { label: "Overview", question: "What does the system do?" },
    reference: { label: "Reference", question: "Which part handles what?" },
    journeys: { label: "Journeys", question: "What happens when someone does a task?" },
    architecture: { label: "Architecture", question: "How is it built, today and next?" },
    choices: { label: "Choices", question: "What was decided?" },
    plan: { label: "Plan", question: "What is built, and in what order?" },
    risks: { label: "Risks", question: "What should be checked first?" },
} as const;

export const copy = {
    site: {
        skip: "Skip to the content",
        menu: "Menu",
        search: "Search",
        searchOpen: "Search or jump to",
        searchHint: "Type a name or a few words",
        searchHelp: "Arrow keys to move, Enter to open, Escape to close.",
        results: "Results",
        noMatch: "Nothing matches. Try fewer words.",
        copied: "Copied",
        copiedAnnounce: "Copied to the clipboard",
        copyFailed: "The browser did not allow the copy. Select the text below and copy it by hand.",
        trail: "Trail",
        sections: "Site",
        sectionsTitle: "Sections",
    },
    reference: {
        /** The Reference section's label: the capability noun and the places noun the case gives. */
        label: (capabilities: string, places: string) => `${capabilities} and ${places}`,
    },
    explorer: {
        up: "Up",
        previous: "Previous",
        next: "Next",
        facts: "In numbers",
        checkedBy: (count: string) => `Checked by ${count}`,
        diagramText: "Text version",
        diagramLegend: "What the lines mean",
        forAssistant: "For your assistant",
        copyForAssistant: "Copy for your assistant",
        size: (kilobytes: number) => `about ${kilobytes} KB`,
        fullerText: "A fuller text, with the code, is written by running:",
        loading: "Loading",
        failed: "This part did not load. Open the page again to try once more.",
        kind: "Kind",
    },
    overview: {
        goals: "Goals",
        notProvided: "Not provided",
        goalsNote: "Written by the people who asked for this work, and shown as they wrote it.",
        open: "Open the reference",
    },
    notFound: {
        title: "Start from the top",
        lead: "The address you opened leads to no page here. Pick one of these, or search.",
        moved: "Opening the page it now has",
    },
} as const;
