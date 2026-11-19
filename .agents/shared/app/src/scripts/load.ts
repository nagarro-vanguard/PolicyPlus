// How a page reads a file written beside it at build time (the search, the detail of an action or a rule, a story's
// sheet, the text for an assistant, the diagram's layout engine). A page opened from `file://` may not `fetch`, so each
// such file is shipped as a classic script (`<name>.js`, written by the offline packager, scripts/package/) that hands
// its content to `self.__caseFiles` under its path below the site's root, without the extension. The same script works
// over http, so there is one path for both.

type Files = Record<string, unknown>;
const files = (): Files => {
    const scope = self as unknown as { __caseFiles?: Files };
    scope.__caseFiles ??= {};
    return scope.__caseFiles;
};

/** The site's root as an absolute address, from the page's own `data-root`. */
const siteRoot = () => new URL(document.body.dataset.root ?? "./", location.href);

const pending = new Map<string, Promise<void>>();

/**
 * Runs a classic script once per address and waits for it.
 * @param address the script's address, relative to the page
 * @returns when the script has run; rejected when it could not load
 */
export const loadScript = (address: string): Promise<void> => {
    const href = new URL(address, location.href).href;
    const known = pending.get(href);
    if (known !== undefined) return known;
    const loading = new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = href;
        script.onload = () => {
            script.remove();
            resolve();
        };
        script.onerror = () => {
            script.remove();
            pending.delete(href);
            reject(new Error(`could not load ${href}`));
        };
        document.head.append(script);
    });
    pending.set(href, loading);
    return loading;
};

/**
 * The content of a file written beside the pages.
 * @param address the file's address relative to the page (`../data/search.json`); its script is the same name with `.js`
 * @param keep false to let the content go once read (a large text read once)
 * @returns the JSON value or the text the file holds
 */
export const loadFile = async <T>(address: string, keep = true): Promise<T> => {
    const url = new URL(address, location.href);
    const root = siteRoot();
    const path = decodeURIComponent(url.pathname.startsWith(root.pathname) ? url.pathname.slice(root.pathname.length) : url.pathname);
    const key = path.replace(/\.[a-z]+$/, "");
    const store = files();
    if (!(key in store)) {
        const script = new URL(`${key.split("/").map(encodeURIComponent).join("/")}.js`, root);
        // A file read once and let go is read again when asked again: its script must run again.
        pending.delete(script.href);
        try {
            await loadScript(script.href);
        } catch (error) {
            // The development server serves the files as they are, not packaged: read the file itself there.
            if (url.protocol === "file:") throw error;
            const response = await fetch(url.href);
            if (!response.ok) throw error;
            store[key] = path.endsWith(".json") ? await response.json() : await response.text();
        }
        if (!(key in store)) throw new Error(`${key} did not load`);
    }
    const value = store[key] as T;
    if (!keep) delete store[key];
    return value;
};
