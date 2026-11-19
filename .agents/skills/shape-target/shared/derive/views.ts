import type { ArchitectureRecord, Drop, Risk, Task } from "../model/records";
import type { LegacySheet } from "./legacy";

/*
 * What readers need that code works out from the records, so no writer states it: a risk read the same way whether it
 * was written before risks were structured or after, the steps of today a drop ends, how the parts of a variant talk
 * to each other, and the line of the Target Stack each part is built with. Pure; nothing here is stored.
 */

/** A risk as readers see it: `unlinked` when it names no part, as every risk written as a plain sentence does. */
export type RiskView = Risk & { readonly unlinked: boolean };

/**
 * The risks of a variant, each as a structured risk. A risk written before risks were structured is read as an
 * accepted risk that cites nothing, and is flagged `unlinked`.
 * @param architecture the variant
 * @returns its risks
 */
export const risksOf = (architecture: Pick<ArchitectureRecord, "risks">): RiskView[] =>
    architecture.risks.map((risk) =>
        typeof risk === "string"
            ? { statement: risk, kind: "accepted", cites: [], unlinked: true }
            : { ...risk, unlinked: risk.cites.length === 0 },
    );

/**
 * The steps of today a drop concerns: those made of an entry point it drops, or of one whose rules it drops. A step all
 * of whose entry points are dropped ends with it.
 * @param drop the drop
 * @param task the task of the variant that drops it
 * @param legacy the legacy sheet, which says which rules each entry point decides
 * @returns the ids of the steps of today it touches and of those it ends, as `<task id>#<number>`
 */
export const dropSteps = (drop: Drop, task: Task, legacy: LegacySheet) => {
    const dropped = new Set<string>(drop.actions);
    const rules = new Set<string>(drop.rules);
    const reached = new Set<string>([
        ...dropped,
        ...task.actions.filter((id) => (legacy.actions[id]?.rules ?? []).some((rule) => rules.has(rule))),
    ]);
    const today = task.current.map((step, at) => ({
        id: `${task.id}#${at + 1}`,
        from: step.from as readonly string[],
    }));
    return {
        steps: today.filter((step) => step.from.some((id) => reached.has(id))).map((step) => step.id),
        ends: today.filter((step) => step.from.every((id) => dropped.has(id))).map((step) => step.id),
    };
};

/**
 * How one part reaches another or an outside system: `calls` it over its contract, `links` it in (a library),
 * `stores` its data in it (a store), or `reaches` an outside system (`to` is then the outside system's id).
 */
export type PartLink = {
    readonly from: string;
    readonly to: string;
    readonly how: "calls" | "links" | "stores" | "reaches";
};

/**
 * How the parts of a variant talk, from what it holds: a component's use of one in another part (or, before there are
 * components, a domain's dependency on one held by another part), the stores that keep a domain's data, and the
 * integrations. Parts that hold both ends of a use talk in process and are not listed.
 * @param architecture the variant
 * @returns each link once
 */
export const partLinks = (architecture: ArchitectureRecord): PartLink[] => {
    const runners = architecture.containers.filter((container) => container.kind !== "store");
    const partOf = (domain: string) => runners.find((container) => container.holds.includes(domain));
    const domainOf = new Map((architecture.components ?? []).map((component) => [component.name, component.domain]));
    const pairs: [string, string][] =
        architecture.components === undefined
            ? architecture.domains.flatMap((domain) =>
                  domain.dependsOn.map((dep): [string, string] => [domain.name, dep]),
              )
            : architecture.components.flatMap((component) =>
                  component.uses.flatMap((use): [string, string][] => {
                      const domain = domainOf.get(use);
                      return domain === undefined ? [] : [[component.domain, domain]];
                  }),
              );
    const links = new Map<string, PartLink>();
    const add = (link: PartLink) => links.set(`${link.from}\u0000${link.to}\u0000${link.how}`, link);
    for (const [from, to] of pairs) {
        const source = partOf(from);
        const target = partOf(to);
        if (source === undefined || target === undefined || source === target) continue;
        add({ from: source.name, to: target.name, how: target.kind === "library" ? "links" : "calls" });
    }
    for (const store of architecture.containers.filter((container) => container.kind === "store"))
        for (const domain of store.holds) {
            const source = partOf(domain);
            if (source !== undefined) add({ from: source.name, to: store.name, how: "stores" });
        }
    for (const integration of architecture.integrations) {
        const source = partOf(integration.domain);
        if (source !== undefined) add({ from: source.name, to: integration.need, how: "reaches" });
    }
    return [...links.values()];
};

/**
 * The line of the Target Stack each part is built with, copied from the request: the part's `tech` is a phrase of a
 * line, and the words before the line's first colon say what that line is for.
 * @param architecture the variant
 * @param stack the request's Target Stack lines
 * @returns per part, the lines that hold its `tech`, and their role when exactly one does
 */
export const stackOf = (architecture: Pick<ArchitectureRecord, "containers">, stack: readonly string[]) =>
    architecture.containers.map((container) => {
        const lines = stack.filter((line) => line.toLowerCase().includes(container.tech.trim().toLowerCase()));
        const [only] = lines;
        const role =
            lines.length === 1 && only !== undefined && only.includes(":")
                ? only.slice(0, only.indexOf(":")).trim()
                : undefined;
        return { container: container.name, tech: container.tech, lines, ...(role === undefined ? {} : { role }) };
    });
