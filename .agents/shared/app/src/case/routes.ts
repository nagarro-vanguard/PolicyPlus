import type { Level } from "../../compose/build/hierarchy";

// Addresses, made from node keys and nothing else. A node of a page level has its own page at `<key>.html`
// (`capability/keeping-records.html`, `overview.html`); actions and rules are many (thousands on a large system), so
// they have no page of their own: each opens on the page of its nearest page-level crumb, at `#<key>`, and its detail
// is read from `data/node/<key>.json` when the reader opens it.

/** The levels that have a page per node. */
export const pageLevels: readonly Level[] = ["overview", "area", "capability", "surface", "part", "place", "unplaced"];

/** Whether a level's nodes have pages of their own. */
export const hasPage = (level: Level) => pageLevels.includes(level);

/**
 * The path of a page-level node below the site's root, without `.html`: its key, except that a last part `index` (a
 * place named "Index") becomes `index_`, since a page named index is a folder's own page to the router. Slugs hold no
 * underscore, so no other key can take that path.
 */
export const pathOf = (key: string) => key.replace(/\/index$/, "/index_");

/** The node key of a page path made by `pathOf`. */
export const keyOfPath = (path: string) => path.replace(/\/index_$/, "/index");

/** The file of a page-level node, below the site's root. */
export const pageOf = (key: string) => `${pathOf(key)}.html`;

/** The detail of an action or rule node, below the site's root. */
export const detailOf = (key: string) => `data/node/${pathOf(key)}.json`;

/** The context text of a node, below the site's root. */
export const contextFileOf = (key: string) => `context/${key}.txt`;

/**
 * The address of a node below the site's root: its page, or the page of its nearest page-level crumb with the node's key
 * after `#`.
 * @param node the node's key, level and crumbs
 * @param levelOf the level of another node, by key
 * @returns the address
 */
export const addressOf = (
    node: { key: string; level: Level; crumbs: readonly string[] },
    levelOf: (key: string) => Level | undefined,
): string => {
    if (hasPage(node.level)) return pageOf(node.key);
    const home = [...node.crumbs].reverse().find((crumb) => {
        const level = levelOf(crumb);
        return level !== undefined && hasPage(level);
    });
    return `${pageOf(home ?? "overview")}#${node.key}`;
};

/**
 * The way up from a page to the site's root.
 * @param path the page's file below the root (`capability/x.html`)
 * @returns `./` for a page at the root, else one `../` per folder
 */
export const rootOf = (path: string) => {
    const depth = path.split("/").length - 1;
    return depth === 0 ? "./" : "../".repeat(depth);
};
