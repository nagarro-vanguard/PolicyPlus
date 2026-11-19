// The sidebar: one level, three headed groups and the overview above them, no counts. Which link a page belongs to is decided
// here, from the page's place below the site's root, so a test can say it for every kind of page.

export type NavId = "overview" | "journeys" | "architecture" | "data" | "risks" | "decisions" | "plan" | "reference" | "rules";
export type NavLink = { readonly id: NavId; readonly href: string; readonly text: string; readonly dot?: boolean };
export type NavGroup = { readonly title: string | undefined; readonly links: readonly NavLink[] };

/**
 * The groups of the sidebar.
 * @param has what this build has: risks to mark with a dot, a target (its decisions) and a plan
 * @param has.risks whether the analysis found any risk
 * @param has.decisions whether there are decisions to show
 * @param has.plan whether there is a plan
 * @returns the groups in order; Modernization is left out when it would be empty
 */
export const navGroups = (has: { risks: boolean; decisions: boolean; plan: boolean }): readonly NavGroup[] => [
    { title: undefined, links: [{ id: "overview", href: "index.html", text: "Overview" }] },
    {
        title: "Understand",
        links: [
            { id: "journeys", href: "journeys.html", text: "Journeys" },
            { id: "architecture", href: "architecture.html", text: "Architecture" },
            { id: "data", href: "data.html", text: "Data" },
            { id: "risks", href: "risks.html", text: "Risks", dot: has.risks },
        ],
    },
    ...(has.decisions || has.plan
        ? [{ title: "Modernization", links: [...(has.decisions ? [{ id: "decisions", href: "decisions.html", text: "Decisions" } as const] : []), ...(has.plan ? [{ id: "plan", href: "plan.html", text: "Plan" } as const] : [])] }]
        : []),
    {
        title: "Reference",
        links: [
            { id: "reference", href: "reference.html", text: "Capabilities and screens" },
            { id: "rules", href: "rules.html", text: "Business rules" },
        ],
    },
];

const homes: Readonly<Record<string, NavId>> = {
    index: "overview",
    journey: "journeys",
    journeys: "journeys",
    architecture: "architecture",
    data: "data",
    risks: "risks",
    risk: "risks",
    decisions: "decisions",
    gate: "decisions",
    plan: "plan",
    reference: "reference",
    capability: "reference",
    screen: "reference",
    action: "reference",
    layer: "reference",
    area: "reference",
    rules: "rules",
};

/**
 * The link a page belongs to.
 * @param here the page's place below the site's root without its extension (`journey/open-it`, `risks`, `index`)
 * @returns the link's id and whether the page is that link's own page (not a page below it); none for a page in no group
 */
export const navOf = (here: string): { readonly id: NavId; readonly exact: boolean } | undefined => {
    const parts = here.split("/").filter((part) => part !== "");
    const head = parts[0] ?? "index";
    const id = homes[head];
    return id === undefined ? undefined : { id, exact: parts.length <= 1 };
};
