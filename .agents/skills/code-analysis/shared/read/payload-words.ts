import { Schema } from "effect";
import type { CapabilityPayload } from "../model/schemas/payloads";

export type Group = CapabilityPayload["layers"][number]["group"];

const groupOrder: readonly Group[] = ["ui", "api", "batch", "mixed", "logic", "data"];

/**
 * The group a modernization reads a layer under, from the role derived from the code.
 * @param role the layer's role
 * @returns its group
 */
export const groupOf = (role: string): Group => {
    switch (role) {
        case "facesPerson":
            return "ui";
        case "facesOtherSystems":
            return "api";
        case "reachesStore":
            return "data";
        case "runsOnSchedule":
        case "runsAsTooling":
            return "batch";
        case "mixedEntry":
            return "mixed";
        default:
            return "logic";
    }
};

/**
 * A nullable text as a text: empty when the store holds none.
 * @param text the text or null
 * @returns the text, or an empty string
 */
export const textOf = (text: string | null) => (text === null ? "" : text);

/**
 * The order the groups are read in: what faces a person first, then what faces other systems, then the rest.
 * @param group a layer's group
 * @returns its rank
 */
export const groupRank = (group: Group) => groupOrder.indexOf(group);

/**
 * A place as the payload writes it.
 * @param row any row with a file and lines
 * @returns the place
 */
export const placeOf = (row: { readonly file: string; readonly firstLine: number; readonly lastLine: number }) => ({
    file: row.file,
    firstLine: row.firstLine,
    lastLine: row.lastLine,
});

export const Evidence = Schema.fromJsonString(
    Schema.Array(Schema.Struct({ file: Schema.String, firstLine: Schema.Number, lastLine: Schema.Number })),
);

/**
 * A rule as one line of a context: what it says and where.
 * @param rule the rule's saying and place
 * @returns the line
 */
export const ruleLine = (rule: {
    readonly says: string;
    readonly place: { readonly file: string; readonly firstLine: number };
}) => `${rule.says} (${rule.place.file}:${rule.place.firstLine})`;

/**
 * Plural for a count and a noun.
 * @param count how many
 * @param one the noun for one
 * @param many the noun for several
 * @returns the phrase
 */
export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
