import { getCollection, getEntry } from "astro:content";
import { compareText } from "./text";
import { slugsOf } from "./slugs";
import type { Slugs } from "./slugs";
import type { Capability, Knowledge, Layer, System } from "./types";

/**
 * The system payload.
 * @returns the payload
 */
export const system = async (): Promise<System> => {
    const entry = await getEntry("system", "system");
    if (entry === undefined) {
        throw new Error("the payloads hold no system.json");
    }
    return entry.data;
};

/**
 * What the analysis knows of the system as a whole: its parts, answers, risks and pictures.
 * @returns the payload
 */
export const knowledge = async (): Promise<Knowledge> => {
    const entry = await getEntry("knowledge", "knowledge");
    if (entry === undefined) {
        throw new Error("the payloads hold no knowledge.json: run write-payloads again");
    }
    return entry.data;
};

/**
 * Every capability payload, by name.
 * @returns the payloads
 */
export const capabilities = async (): Promise<Capability[]> =>
    (await getCollection("capabilities"))
        .map((entry) => entry.data)
        .toSorted((one, other) => compareText(one.capability.name, other.capability.name));

/**
 * The relative path from a page to the site's root, by how many folders deep the page is.
 * @param depth how many folders deep
 * @returns "./" or one "../" per folder
 */
export const rootOf = (depth: number) => (depth === 0 ? "./" : "../".repeat(depth));

/**
 * The link to a screen: its key's folders are folders of the output.
 * @param root the path to the root
 * @param key the screen's key
 * @returns the link
 */
export const screenHref = (root: string, key: string) =>
    `${root}screen/${key.split("/").map(encodeURIComponent).join("/")}.html`;

/**
 * The layer of a capability by id.
 * @param capability the capability
 * @param id the layer's id
 * @returns the layer, or none
 */
export const layerById = (capability: Capability, id: string): Layer | undefined =>
    capability.layers.find((layer) => layer.id === id);

/**
 * The layers an action passes through, in the order its flow first meets them.
 * @param capability the capability
 * @param action the action's path
 * @param action.path the layers it reaches with their depth
 * @returns the layers
 */
export const pathOf = (
    capability: Capability,
    action: { readonly path: readonly { readonly layer: string; readonly depth: number }[] },
) =>
    action.path.flatMap((step) => {
        const layer = layerById(capability, step.layer);
        return layer === undefined ? [] : [layer];
    });

let slugCache: Promise<Slugs> | undefined;

/**
 * The readable addresses of every page, made once per build.
 * @returns the lookups
 */
export const slugs = (): Promise<Slugs> => {
    slugCache ??= Promise.all([system(), capabilities(), knowledge()]).then(([sys, caps, know]) =>
        slugsOf(sys, caps, know),
    );
    return slugCache;
};

/**
 * The ids of the layers that are the product, not project work such as tests and build scripts.
 * @param sys the system payload
 * @returns the ids
 */
export const productLayers = (sys: System): ReadonlySet<string> =>
    new Set(sys.layers.filter((layer) => layer.product).map((layer) => layer.id));
