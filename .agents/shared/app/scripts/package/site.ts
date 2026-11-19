import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, sep } from "node:path";

// The built folder as the packager's steps see it: every page's HTML is read once, changed in memory by each step and
// written once at the end.

/**
 * Every file under a folder.
 * @param folder the folder
 * @returns the files' paths
 */
export const walk = (folder: string): string[] =>
    readdirSync(folder).flatMap((name) => {
        const path = join(folder, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });

/**
 * The way from a file in the output to the output's root (`./`, `../`, `../../`).
 * @param out the output folder
 * @param file a file in it
 * @returns the prefix
 */
export const prefixOf = (out: string, file: string): string => {
    const depth = relative(out, file).split(sep).length - 1;
    return depth === 0 ? "./" : "../".repeat(depth);
};

/**
 * The output's path of a file, with forward slashes.
 * @param out the output folder
 * @param file a file in it
 * @returns the path below the root
 */
export const pathOf = (out: string, file: string): string => relative(out, file).split(sep).join("/");

/**
 * A short content hash for a file name, so a changed file gets a new address and a browser's cache never serves an old one.
 * @param text the content
 * @returns eight hex characters
 */
export const hashOf = (text: string): string => createHash("sha256").update(text).digest("hex").slice(0, 8);

export type Site = {
    out: string;
    /** Every page: a full HTML document, keyed by its file. */
    pages: Map<string, string>;
    /** The pieces of HTML a page's script reads into itself (a story's sheet): their classes are the pages' classes. */
    fragments: Map<string, string>;
};

/**
 * Reads the built pages.
 * @param out the output folder
 * @param isFragment true for an HTML file that is a piece read by a page, not a page
 * @returns the site in memory
 */
export const readSite = (out: string, isFragment: (path: string) => boolean): Site => {
    const pages = new Map<string, string>();
    const fragments = new Map<string, string>();
    for (const file of walk(out).filter((each) => each.endsWith(".html")))
        (isFragment(pathOf(out, file)) ? fragments : pages).set(file, readFileSync(file, "utf8"));
    return { out, pages, fragments };
};

/**
 * Writes the pages and the pieces back.
 * @param site the site in memory
 */
export const writeSite = (site: Site) => {
    for (const [file, html] of [...site.pages, ...site.fragments]) writeFileSync(file, html);
};

/** The parts of a page outside its script and style elements, the only parts a step may rewrite as markup. */
export const markupParts = (html: string, change: (markup: string) => string): string =>
    html
        .split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>)/)
        .map((part, at) => (at % 2 === 1 ? part : change(part)))
        .join("");
