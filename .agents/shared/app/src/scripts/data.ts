// Data files, fetched once each for the life of the site (the router keeps the script between pages). Paths are relative to the
// site's root, which is read when a file is asked for, because the page shown may be deeper or shallower than the last.
const cached = new Map<string, Promise<unknown>>();

/** The way up to the site's root from the page being shown. */
export const siteRoot = () => document.body.dataset.root ?? "./";

/**
 * One fetch of a data file.
 * @param path the path below the site's root, such as `data/index.json`
 * @returns the parsed file
 */
export const fetchJson = <T>(path: string): Promise<T> => {
    let found = cached.get(path);
    if (found === undefined) {
        found = fetch(`${siteRoot()}${path}`).then((response) => {
            if (!response.ok) throw new Error(`${path}: ${response.status}`);
            return response.json();
        });
        found.catch(() => cached.delete(path));
        cached.set(path, found);
    }
    return found as Promise<T>;
};
