import { plural } from "./text";

// Every sentence the pages and figures say themselves, in one place, so the voice can be read and tested as a whole.
// The voice is that of a business analyst, product owner or architect presenting the system to people deciding about it:
// plain words first, a name from the code only as evidence beside them, one idea to a sentence, "we" for the analysis,
// and no word of the analysis's own machinery. See stages/publish/rules/narrative.md.
export const copy = {
    site: {
        home: "Overview",
        search: "Search screens, actions and business rules",
        copyBrief: "Copy a brief",
        copied: "Copied",
        copiedAnnounce: "Copied to the clipboard",
        noMatch:
            "Nothing matches. The search looks in capability names and purposes, screens, what each action does and business rules.",
        moreResults: (n: number) => `…and ${n} more; narrow the search`,
        figureDescription: (items: number, links: number) =>
            `${plural(items, "item")} and ${plural(links, "connection")}; the text version below lists them.`,
        download: "Download as SVG",
        figureText: (items: number, links: number) =>
            `Text version (${plural(items, "item")}, ${plural(links, "connection")})`,
        showAll: (shown: number, total: number, noun: string) =>
            `Showing ${shown} of ${total} ${noun}. Show all ${total}`,
    },
    system: {
        title: "System overview",
        noPurpose: "We found nothing in the code that says what this system is for.",
        offers: "What the product offers",
        built: "How the system is built",
        layersHeading: "The layers in plain words",
        layersProject: "Project work, not part of the product",
        gaps: "What we could not follow",
        gapsText: (calls: number, pieces: number) =>
            `${plural(calls, "call")} lead somewhere the code does not show, and ${plural(pieces, "piece of code", "pieces of code")} could not be tied to any capability. Each capability page lists its own gaps.`,
        noAreas: "We found no groupings of capabilities, so every capability is listed on its own.",
        inNoArea: "Not in a group",
        cardCounts: (screens: number, actions: number, rules: number) =>
            `${plural(screens, "screen")} · ${plural(actions, "action")} · ${plural(rules, "rule")}`,
    },
    area: { capabilities: "Capabilities in this group" },
    capability: {
        rulesNote: (rules: number, offScreen: number) =>
            offScreen === 0
                ? `${plural(rules, "business rule")} apply here, and every one can be reached from a screen listed below.`
                : `${plural(rules, "business rule")} apply here; ${offScreen} can only be reached from actions that no screen starts.`,
        screens: (n: number) => `Screens (${n})`,
        noScreens: "A person starts nothing in this capability from a screen.",
        otherStarts: (n: number) => `Started by other systems or on a schedule (${n})`,
        noOtherStarts: "Nothing in this capability is started by another system or on a schedule.",
        startedFrom: (name: string) => `Started from ${name}`,
        projectWork: (names: string[]) =>
            `Project work, not part of the product, and left out here: ${names.join(", ")}.`,
        layers: "Layers it uses",
        shared: "Code it shares with other capabilities",
        noShared: "None of this capability's work passes through code that we judged to be shared.",
        data: "Data it uses",
        noData: "We could not tie any data to this capability.",
        assumptions: (n: number) => `Assumptions we made (${n})`,
        noAssumptions: "We made no assumptions about this capability.",
        gaps: (n: number) => `What we could not follow (${n})`,
        gapTitle: (kind: string) => `A ${kind} whose target the code does not show`,
        gapWhere: (where: string) => `In the code: ${where}`,
        keptIn: (stores: string[]) => `Kept in ${stores.join(" and ")}`,
        noGaps: "Every call in this capability leads somewhere the code shows.",
        alsoUsedElsewhere: "Part of its code is also used by other capabilities.",
        why: "Why",
        ifWrong: "If we are wrong",
        hereActions: (n: number, others: number) =>
            `${plural(n, "action")} here${others > 0 ? ` · also in ${plural(others, "other capability", "other capabilities")}` : ""}`,
    },
    layer: {
        started: (n: number) => `What can be started here (${n})`,
        noStarted: "Nothing starts in this layer; work reaches it from other layers.",
        rules: (n: number) => `Business rules in this layer (${n})`,
        noRules: "We found no business rule in this layer that this capability reaches.",
        shapes: (n: number) => `Data structures defined here (${n})`,
        noShapes: "This layer defines no data structure for this capability.",
        lead: (capability: string, actions: number, rules: number, shared: boolean) =>
            `In ${capability}: ${plural(actions, "action")} and ${plural(rules, "business rule")}.${shared ? " Part of its code is also used by other capabilities." : ""}`,
    },
    action: {
        startedBy: (who: string, where: string) => `Started by ${who}. In the code: ${where}`,
        passes: "What it passes through",
        passesNote:
            "Layers are listed in the order this action first reaches them. Where the code picks an implementation while running, the path shown is likely rather than certain.",
        rules: (n: number) => `Business rules along the way (${n})`,
        noRules: "We found no business rule in the code this action reaches.",
    },
    screen: {
        figureFiles: (files: string[]) => `Built from ${files.join(", ")}`,
        filter: "Capabilities",
        layers: (n: number) => `Layers this screen uses (${n})`,
        columns: {
            layer: "Layer",
            does: "What it does for this screen",
            actions: "Actions",
            rules: "Rules",
            code: "Code",
            data: "Data",
        },
        passesThrough: "passes through",
        shared: (n: number) => `${n} shared`,
        codeCount: (n: number) => `Code (${n})`,
        dataCount: (n: number) => `Data (${n})`,
        noData: "none named",
        controls: (n: number) => `On-screen controls (${n})`,
        noControls: "We could not read this screen's layout, so its controls are not listed.",
        controlsNote:
            "Each control is listed by the words a person sees on it, with its kind and its name in the page.",
        controlName: (name: string) => `Named ${name} in the page`,
        actions: (n: number) => `What a person can do here (${n})`,
        rules: (n: number) => `Business rules for this screen (${n})`,
        noRules: "We found no business rule in the code this screen's actions reach.",
        sharedWithOthers: (n: number) => ` (${n} shared with other actions)`,
    },
    words: {
        changesState: "Changes a state",
        screensLabel: "Screens",
    },
    notDrawn: (reason: string) => `Not drawn: ${reason}.`,
    folded: (omitted: number, what: string) =>
        `${omitted} ${what} are folded into the “+${omitted} more” item; the text version names them.`,
    leftOut: (names: string[]) => `Left out because it is project work, not part of the product: ${names.join(", ")}.`,
    tooBig: "This figure is too large to read at the width of a page, even with items folded together. Read the text version, or pan and zoom.",
} as const;
