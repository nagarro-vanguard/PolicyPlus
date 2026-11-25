import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathOf, walk, type Site } from "./site";

// Files a page reads after it opens, shipped as classic scripts. A page opened from `file://` may not fetch, but it may
// run a script, so each file becomes `<name>.js`, which hands its content to `self.__caseFiles` under its path below
// the site's root without the extension; src/scripts/load.ts reads it back. A JSON file is kept as a string and parsed
// with `JSON.parse`, which a browser reads many times faster than the same value written as a script literal.

/** The folders and kinds of file the pages read with load.ts. */
export const dataFiles: readonly { folder: string; extension: string }[] = [
    { folder: "data/", extension: ".json" },
    { folder: "data/", extension: ".html" },
    { folder: "plan/story/", extension: ".html" },
    { folder: "plan/brief/", extension: ".txt" },
    { folder: "context/", extension: ".txt" },
];

/**
 * True for a file the pages read with load.ts.
 * @param path its path below the site's root
 * @returns whether it is one
 */
export const isDataFile = (path: string): boolean =>
    dataFiles.some((each) => path.startsWith(each.folder) && path.endsWith(each.extension));

/**
 * The classic script that carries a file's content.
 * @param path the file's path below the site's root
 * @param text its content
 * @returns the script's path and text
 */
export const scriptOf = (path: string, text: string): { path: string; text: string } => {
    const key = path.replace(/\.[a-z]+$/, "");
    const value = path.endsWith(".json") ? `JSON.parse(${JSON.stringify(text)})` : JSON.stringify(text);
    return { path: `${key}.js`, text: `(self.__caseFiles||(self.__caseFiles={}))[${JSON.stringify(key)}]=${value};\n` };
};

/**
 * Writes a file the pages read, as its classic script.
 * @param out the output folder
 * @param path the file's path below the site's root
 * @param text its content
 */
export const writeDataFile = (out: string, path: string, text: string) => {
    const script = scriptOf(path, text);
    mkdirSync(dirname(join(out, script.path)), { recursive: true });
    writeFileSync(join(out, script.path), script.text);
};

/**
 * Replaces every data file the build wrote with its classic script; the pieces of HTML among them are taken from the
 * site in memory, where the earlier steps changed them.
 * @param site the site in memory
 */
export const dataScripts = (site: Site) => {
    for (const file of walk(site.out)) {
        const path = pathOf(site.out, file);
        if (!isDataFile(path)) continue;
        const text = site.fragments.get(file) ?? readFileSync(file, "utf8");
        writeDataFile(site.out, path, text);
        unlinkSync(file);
        site.fragments.delete(file);
    }
};
