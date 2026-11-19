import type { ViewerData } from "./slice-types";
import type { Architecture, Journey, Legacy } from "./target-types";

/**
 * What the diagram viewer draws for an architecture that has no components yet: a part that is built and run is a group, a
 * domain is a box, and a domain uses the domains it relies on.
 * @param variant the architecture
 * @returns the data
 */
export const viewerOfVariant = (variant: Architecture): ViewerData => {
    const parts = variant.containers.filter((container) => container.kind !== "store" || container.holds.length > 0);
    const holder = (domain: string) => {
        const own = parts.findIndex((container) => container.kind !== "store" && container.holds.includes(domain));
        return own === -1 ? parts.findIndex((container) => container.holds.includes(domain)) : own;
    };
    const unplaced = variant.domains.some((domain) => holder(domain.name) === -1);
    const groups = [...parts.map((container) => ({ name: container.name, note: `${container.kind}: ${container.tech}` })), ...(unplaced ? [{ name: "Not placed in a part", note: "" }] : [])];
    const index = new Map(variant.domains.map((domain, at) => [domain.name, at] as const));
    return {
        name: variant.name,
        words: { group: "part", groups: "parts", box: "domain", boxes: "domains" },
        groups,
        boxes: variant.domains.map((domain) => ({
            n: domain.name,
            g: holder(domain.name) === -1 ? groups.length - 1 : holder(domain.name),
            u: domain.dependsOn.flatMap((name) => (index.has(name) ? [index.get(name) as number] : [])),
            note: domain.concept,
        })),
    };
};

/** The old behaviours and rules the lineage rows name, for the page to read when a row is opened. */
export type LineageWords = { readonly actions: Readonly<Record<string, string>>; readonly rules: Readonly<Record<string, string>> };

/**
 * The words of every old behaviour a step replaces and every rule it keeps, once each.
 * @param journeys the chosen way of each task
 * @param legacy what the old system does
 * @returns the words by id
 */
export const lineageWords = (journeys: readonly Journey[], legacy: Legacy | undefined): LineageWords => {
    const actions: Record<string, string> = {};
    const rules: Record<string, string> = {};
    for (const step of journeys.flatMap((journey) => journey.steps)) {
        if (step.link._tag !== "legacy") continue;
        for (const id of step.link.from) actions[id] = legacy?.actions[id]?.what ?? "an entry point of the old system";
        for (const id of step.link.keeps) rules[id] = legacy?.rules[id]?.statement ?? "a rule of the old system";
    }
    return { actions, rules };
};
