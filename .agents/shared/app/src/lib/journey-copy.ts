import { plural } from "./text";

// What the journey pages, the decisions page and the reference pages say themselves. One place, so the voice can be read whole.
export const journeyCopy = {
    list: {
        title: "Journeys",
        lead: (journeys: number, areas: number, proposed: number) =>
            `${plural(journeys, "thing")} people get done with the system, in ${plural(areas, "area")}. ${proposed === 0 ? "No new way is proposed yet." : `${proposed} have a proposed way beside how they work today.`}`,
        empty: { title: "No journeys yet", message: "The analysis has not yet written down what people get done with the system. Run the analysis's publish stage again." },
        steps: (today: number, proposed: number | undefined) => (proposed === undefined ? plural(today, "step") : `${today} → ${plural(proposed, "step")}`),
        status: { "today only": "Today only", proposed: "Proposed", decided: "Decided" },
    },
    page: {
        today: "Today",
        modernized: "Modernized",
        both: "Side by side",
        todayHead: "Today, read from the code",
        modernHead: (name: string) => `Modernized: ${name}`,
        nothingToday: "Nothing today. This step is new.",
        notCarried: "Not carried over.",
        why: "Why this way",
        tradeoff: "Trade-off",
        noWay: "No modernized way is proposed for this journey yet, so only how it works today is shown.",
        recommended: "recommended",
        chosen: "chosen",
        mirrors: "mirrors today",
    },
    folds: {
        carries: "What carries it",
        rules: "Rules kept and dropped",
        dropped: (n: number) => `Dropped: ${plural(n, "action")}`,
        data: "Data it touches",
        others: "Other ways considered",
        evidence: "Evidence from the code",
        stories: "Stories that deliver it",
    },
    decisions: {
        title: "Decisions",
        lead: "Four confirmations, in order, before anything is planned.",
        none: { title: "No decisions yet", message: "No modernization has been started for this system, so there is nothing to confirm." },
    },
    reference: {
        title: "Capabilities and screens",
        lead: "Every capability the analysis found, grouped by area. Open one for its screens, actions and rules.",
        usedIn: "Used in journeys",
        more: (n: number) => `${n} more`,
    },
    rules: {
        title: "Business rules",
        lead: (rules: number) => `The ${plural(rules, "business rule")} the code decides, each written once with the place that decides it.`,
        facet: "Only rules that refuse something",
    },
    moved: "This page has moved.",
} as const;
