import type { Architecture } from "./target-types";
import type { Knowledge } from "./types";

// The kinds of data the system keeps, each with how it changes, who touches it today and, when there is a modernized
// architecture, which domain owns it now.

export type Kind = {
    readonly id: string;
    readonly name: string;
    /** The states it moves through, in order; empty when the analysis found none. */
    readonly states: readonly string[];
    readonly savedBy: readonly string[];
    readonly readBy: readonly string[];
    /** The domain that owns it now and the name it has there; undefined when no domain does or there is no architecture. */
    readonly owner: { readonly domain: string; readonly as: string } | undefined;
};

/**
 * The kinds of data, from what the analysis found of each kind's life and use.
 * @param knowledge what the analysis knows of the system as a whole
 * @param architecture the modernized architecture, when there is one
 * @returns the kinds by name
 */
export const kindsOfData = (knowledge: Knowledge, architecture: Architecture | undefined): Kind[] => {
    const entities = new Map<string, string>();
    for (const life of knowledge.lifecycles) entities.set(life.entity.id, life.entity.name);
    for (const use of knowledge.dataUse) entities.set(use.entity.id, use.entity.name);
    return [...entities]
        .map(([id, name]): Kind => {
            const life = knowledge.lifecycles.find((each) => each.entity.id === id);
            const uses = knowledge.dataUse.filter((use) => use.entity.id === id);
            const domain = architecture?.domains.find((each) => each.facts.some((fact) => fact.from.includes(id)));
            const fact = domain?.facts.find((each) => each.from.includes(id));
            return {
                id,
                name,
                states: life?.states ?? [],
                savedBy: uses.filter((use) => use.saves).map((use) => use.capability.name),
                readBy: uses.filter((use) => use.reads && !use.saves).map((use) => use.capability.name),
                owner: domain === undefined || fact === undefined ? undefined : { domain: domain.name, as: fact.name },
            };
        })
        .toSorted((one, other) => one.name.localeCompare(other.name));
};
