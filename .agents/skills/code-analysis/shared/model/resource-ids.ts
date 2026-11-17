import { sha1Hex } from "../run/hashing-and-random";

const resourceIdPrefix = "resource";

/**
 * The id a script issues to one data resource: the exact pair of the external system's record id and the resource as the
 * code spells it. The spelling is the one identity a script takes from a model's text (the declared exemption of
 * `ResourceId`): two spellings of one table are two ids, and the assignment and merge passes choose among them.
 * @param externalSystem the external system's record id
 * @param resource the resource, as the code spells it
 * @returns the id, `resource-` and twelve hexadecimal digits
 */
export const resourceIdOf = (externalSystem: string, resource: string) =>
    `${resourceIdPrefix}-${sha1Hex(JSON.stringify([externalSystem, resource])).slice(0, 12)}`;

/**
 * Whether a text has the shape of a resource id.
 * @param text any text
 * @returns true for `resource-` and twelve lowercase hexadecimal digits
 */
export const isResourceId = (text: string) =>
    text.startsWith(`${resourceIdPrefix}-`) &&
    text.length === resourceIdPrefix.length + 13 &&
    [...text.slice(resourceIdPrefix.length + 1)].every(
        (char) => (char >= "0" && char <= "9") || (char >= "a" && char <= "f"),
    );
