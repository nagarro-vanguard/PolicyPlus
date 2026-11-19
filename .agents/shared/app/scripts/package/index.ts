import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { compactClasses } from "./compact";
import { contentSecurityPolicy } from "./csp";
import { dataScripts, isDataFile } from "./data";
import { classicScripts } from "./scripts";
import { pathOf, prefixOf, readSite, walk, writeSite, type Site } from "./site";

// The offline packager, the build's last step: it makes the output folder a site that works opened from `file://`, from
// any subfolder of a server and from a server's root alike. In order:
// 1. every `/_astro/` address becomes relative to the page or stylesheet that names it;
// 2. module scripts become classic scripts (scripts.ts);
// 3. repeated class lists and inline styles become shared classes (compact.ts);
// 4. files the pages read after opening become classic scripts (data.ts);
// 5. every page gets the Content-Security-Policy (csp.ts);
// 6. the output is checked: no address from the server's root, no module script, no `fetch` of a file.

/** Every `/_astro/` address in a page becomes relative to it, and in a stylesheet (the fonts) relative to the stylesheet. */
const relativeAssets = (site: Site) => {
    for (const [file, html] of site.pages) {
        const prefix = prefixOf(site.out, file);
        site.pages.set(file, html.replaceAll('"/_astro/', `"${prefix}_astro/`).replaceAll("'/_astro/", `'${prefix}_astro/`));
    }
    for (const file of walk(join(site.out, "_astro")).filter((each) => each.endsWith(".css")))
        writeFileSync(file, readFileSync(file, "utf8").replaceAll(/url\((["']?)\/_astro\//g, "url($1./"));
};

/** Fails the build when the output still asks for something a page opened from a file or a subfolder cannot have. */
const check = (out: string) => {
    const found: string[] = [];
    for (const file of walk(out).filter((each) => /\.(html|js|css)$/.test(each))) {
        const text = readFileSync(file, "utf8");
        const where = pathOf(out, file);
        if (/["'`(]\/_astro\//.test(text)) found.push(`${where}: an address from the server's root`);
        if (file.endsWith(".html") && /<script[^>]*type="module"/.test(text)) found.push(`${where}: a module script`);
        const markup = text.replaceAll(/<astro-island\b[\s\S]*?<\/astro-island>|<script\b[\s\S]*?<\/script>/g, "");
        if (file.endsWith(".html") && /\sstyle="/.test(markup)) found.push(`${where}: an inline style`);
    }
    if (found.length > 0) throw new Error(`offline packager: the site would not work opened from a file:\n${found.slice(0, 20).join("\n")}`);
};

/**
 * The integration.
 * @param stylesheet the app's stylesheet, which the shared classes take their utilities from
 * @returns the integration
 */
export const offlinePackage = (stylesheet: string) => ({
    name: "offline-package",
    hooks: {
        "astro:build:done": async ({ dir }: { dir: URL }) => {
            const out = fileURLToPath(dir);
            const site = readSite(out, isDataFile);
            relativeAssets(site);
            await classicScripts(site);
            await compactClasses(site, stylesheet);
            dataScripts(site);
            contentSecurityPolicy(site);
            writeSite(site);
            check(out);
        },
    },
});
