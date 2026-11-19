import { plural } from "./text";
import type { Architecture } from "./target-types";
import type { Capability, System } from "./types";

// Where today's behaviour lands: each business rule sits in one layer of today's code (from the capability payloads) and is
// enforced by components of the proposed architecture, each in one domain. The matrix counts rules by layer and domain. It is
// computed from those two records and nothing else, so a sentence about it can be checked by a recount.

/** The column for rules that no component enforces, shown only when there are some. */
export const notPlaced = "Not placed";

export type LandingRow = {
    readonly id: string;
    readonly name: string;
    /** False for project work such as build tooling. */
    readonly product: boolean;
    readonly routines: number;
    /** The rules of this layer: the sum of the row. */
    readonly rules: number;
    /** How many of the proposed domains hold at least one of its rules. */
    readonly domains: number;
};

export type Landing = {
    readonly rows: readonly LandingRow[];
    /** The proposed domains, then `notPlaced` when some rule is in none. */
    readonly columns: readonly string[];
    /** `cells[row][column]`: the number of rules. */
    readonly cells: readonly (readonly number[])[];
    /** The domains the architecture proposes (the columns without `notPlaced`). */
    readonly domainCount: number;
    /** The distinct rules in the capability payloads. */
    readonly total: number;
    /** The rules enforced in exactly one domain. */
    readonly exactlyOne: number;
    /** The rules enforced in more than one domain. */
    readonly several: number;
    /** The rules enforced in none. */
    readonly none: number;
    /** The product layer whose rules reach the most domains. */
    readonly spread: { readonly name: string; readonly routines: number; readonly domains: number } | undefined;
};

/**
 * The layer of each rule, as the capability payloads put it. A rule met in several layers counts in the first one met.
 * @param caps the capability payloads
 * @returns the layer id by rule id
 */
export const layerOfRules = (caps: readonly Capability[]): Map<string, string> => {
    const found = new Map<string, string>();
    for (const cap of caps) for (const layer of cap.layers) for (const rule of layer.rules) if (!found.has(rule.id)) found.set(rule.id, layer.id);
    return found;
};

/**
 * The domains that enforce each rule: the domain of every component that names the rule in `enforces`.
 * @param architecture the proposed architecture
 * @returns the set of domains by rule id
 */
export const domainsOfRules = (architecture: Architecture): Map<string, Set<string>> => {
    const found = new Map<string, Set<string>>();
    for (const component of architecture.components ?? []) for (const rule of component.enforces) found.set(rule, (found.get(rule) ?? new Set<string>()).add(component.domain));
    return found;
};

/**
 * The matrix of today's layers against the proposed domains.
 * @param sys the system payload (the layers and their routines)
 * @param caps the capability payloads (the rules of each layer)
 * @param architecture the proposed architecture with components
 * @returns the counts and what is left over
 */
export const landing = (sys: System, caps: readonly Capability[], architecture: Architecture): Landing => {
    const layerOf = layerOfRules(caps);
    const domainOf = domainsOfRules(architecture);
    const domains = architecture.domains.map((domain) => domain.name);
    const rules = [...layerOf.keys()];
    const none = rules.filter((id) => (domainOf.get(id)?.size ?? 0) === 0).length;
    const columns = none > 0 ? [...domains, notPlaced] : domains;
    const layers = sys.layers.toSorted((one, other) => Number(other.product) - Number(one.product) || other.blocks - one.blocks || one.name.localeCompare(other.name));
    const cells = layers.map((layer) => {
        const row = columns.map(() => 0);
        for (const id of rules) {
            if (layerOf.get(id) !== layer.id) continue;
            const here = domainOf.get(id);
            if (here === undefined || here.size === 0) row[columns.indexOf(notPlaced)] = (row[columns.indexOf(notPlaced)] ?? 0) + 1;
            else for (const domain of here) row[columns.indexOf(domain)] = (row[columns.indexOf(domain)] ?? 0) + 1;
        }
        return row;
    });
    const rows = layers.map((layer, at): LandingRow => {
        const row = cells[at] ?? [];
        return { id: layer.id, name: layer.name, product: layer.product, routines: layer.blocks, rules: rules.filter((id) => layerOf.get(id) === layer.id).length, domains: row.slice(0, domains.length).filter((count) => count > 0).length };
    });
    const spreading = rows.filter((row) => row.product).toSorted((one, other) => other.domains - one.domains || other.routines - one.routines)[0];
    return {
        rows,
        columns,
        cells,
        domainCount: domains.length,
        total: rules.length,
        exactlyOne: rules.filter((id) => (domainOf.get(id)?.size ?? 0) === 1).length,
        several: rules.filter((id) => (domainOf.get(id)?.size ?? 0) > 1).length,
        none,
        spread: spreading === undefined ? undefined : { name: spreading.name, routines: spreading.routines, domains: spreading.domains },
    };
};

const numberWords = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
/** A small count in words, a larger one in digits. */
export const countWord = (count: number) => numberWords[count] ?? String(count);

/**
 * The sentence above the matrix, naming the layer that spreads over the most domains.
 * @param matrix the counts
 * @returns the sentence
 */
export const spreadSentence = (matrix: Landing): string => {
    const top = matrix.spread;
    if (top === undefined || matrix.domainCount === 0) return "";
    if (top.domains <= 1) return `No layer of today's code holds rules that belong to more than one of the ${countWord(matrix.domainCount)} proposed domains.`;
    const reach = top.domains === matrix.domainCount ? `all ${countWord(matrix.domainCount)}` : `${countWord(top.domains)} of the ${countWord(matrix.domainCount)}`;
    return `Today's ${top.name} layer (${plural(top.routines, "routine")}) holds rules that belong to ${reach} of the proposed domains.`;
};

/**
 * The line under the matrix. The claim that every rule lands in exactly one domain is made only when it is true; otherwise the
 * line says how many do and what is left over.
 * @param matrix the counts
 * @returns the sentence
 */
export const footerSentence = (matrix: Landing): string => {
    if (matrix.total === 0) return "No business rule was found in the code.";
    if (matrix.exactlyOne === matrix.total) return `Every one of the ${matrix.total} rules lands in exactly one domain.`;
    const left = [matrix.none > 0 ? `${matrix.none} ${matrix.none === 1 ? "is" : "are"} enforced by no component` : "", matrix.several > 0 ? `${matrix.several} ${matrix.several === 1 ? "is" : "are"} enforced in more than one domain and counted in each` : ""].filter((part) => part !== "");
    return `${matrix.exactlyOne} of the ${matrix.total} rules land in exactly one domain; ${left.join(", and ")}.`;
};
