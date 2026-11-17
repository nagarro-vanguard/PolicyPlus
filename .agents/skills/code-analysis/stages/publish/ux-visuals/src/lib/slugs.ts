import { compareText } from "./text";
import type { Capability, Knowledge, System } from "./types";

/**
 * A readable address part from a name: lower case, letters and digits, words joined by hyphens, never empty and never
 * longer than a sentence fragment. The same name always gives the same part.
 * @param text the name
 * @returns the address part
 */
export const slugify = (text: string) => {
    const words = text
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word !== "");
    let joined = "";
    for (const word of words) {
        const next = joined === "" ? word : `${joined}-${word}`;
        if (next.length > 60 && joined !== "") {
            break;
        }
        joined = next.slice(0, 60);
    }
    return joined === "" ? "item" : joined;
};

/**
 * Address parts for named things that are unique among their neighbours: the readable part, and when two share it a
 * number after it, given in a fixed order so a rebuild gives the same addresses.
 * @param items the things, each with a stable id and the name to build the part from
 * @returns the address part by id
 */
const uniqueSlugs = (items: readonly { readonly id: string; readonly name: string }[]) => {
    const taken = new Map<string, number>();
    const slugs = new Map<string, string>();
    for (const item of items.toSorted((one, other) => compareText(one.id, other.id))) {
        const base = slugify(item.name);
        const seen = taken.get(base) ?? 0;
        taken.set(base, seen + 1);
        slugs.set(item.id, seen === 0 ? base : `${base}-${seen + 1}`);
    }
    return slugs;
};

export type Slugs = {
    readonly capability: (id: string) => string;
    readonly area: (id: string) => string;
    readonly layer: (capability: string, layer: string) => string;
    readonly action: (capability: string, action: string) => string;
    readonly risk: (id: string) => string;
};

/**
 * Readable addresses for every capability, area, layer and action, so no address carries a record id.
 * @param system the system payload
 * @param capabilities every capability payload
 * @returns the lookups
 */
export const slugsOf = (
    system: System,
    capabilities: readonly Capability[],
    knowledge?: Pick<Knowledge, "risks">,
): Slugs => {
    const caps = uniqueSlugs(system.capabilities);
    const areas = uniqueSlugs(system.areas);
    const layers = new Map(capabilities.map((each) => [each.capability.id, uniqueSlugs(each.layers)] as const));
    const actions = new Map(
        capabilities.map(
            (each) =>
                [
                    each.capability.id,
                    uniqueSlugs(
                        each.layers.flatMap((layer) =>
                            layer.actions.map((action) => ({ id: action.id, name: action.purpose })),
                        ),
                    ),
                ] as const,
        ),
    );
    const risks = uniqueSlugs(
        (knowledge === undefined ? [] : knowledge.risks).map((risk) => ({
            id: risk.id,
            name: risk.statement.split(/\s+/).slice(0, 8).join(" "),
        })),
    );
    const get = (map: ReadonlyMap<string, string>, id: string) => {
        const found = map.get(id);
        if (found === undefined) {
            throw new Error(`no address for ${id}`);
        }
        return found;
    };
    return {
        capability: (id) => get(caps, id),
        area: (id) => get(areas, id),
        layer: (capability, layer) => get(layers.get(capability) ?? new Map(), layer),
        action: (capability, action) => get(actions.get(capability) ?? new Map(), action),
        risk: (id) => get(risks, id),
    };
};
