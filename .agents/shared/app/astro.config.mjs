import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { addressesIn, isPlanPage, languageFindings, pathNamesRecordId, planFindings, visibleText } from "./src/lib/language.ts";
import { buildConfig } from "./src/case/build-config.ts";
import { openCase } from "./src/case/read.ts";
import { assistantTexts } from "./src/case/raw-data.ts";

/**
 * After the build, every `/_astro/` address in a page becomes a path relative to the page, and every one in a stylesheet
 * (the theme's fonts) a path relative to the stylesheet, so the output folder opens from any address, a subfolder of a
 * site included.
 * @returns the integration
 */
const relativeAssets = () => ({
    name: "relative-assets",
    hooks: {
        "astro:build:done": ({ dir }) => {
            const out = fileURLToPath(dir);
            const walk = (folder) =>
                readdirSync(folder).flatMap((name) => {
                    const path = join(folder, name);
                    return statSync(path).isDirectory() ? walk(path) : [path];
                });
            for (const file of walk(out).filter((each) => each.endsWith(".html"))) {
                const depth = relative(out, file).split(sep).length - 1;
                const prefix = depth === 0 ? "./" : "../".repeat(depth);
                const html = readFileSync(file, "utf8");
                writeFileSync(
                    file,
                    html.replaceAll('"/_astro/', `"${prefix}_astro/`).replaceAll("'/_astro/", `'${prefix}_astro/`),
                );
            }
            for (const file of walk(join(out, "_astro")).filter((each) => each.endsWith(".css")))
                writeFileSync(file, readFileSync(file, "utf8").replaceAll(/url\((["']?)\/_astro\//g, "url($1./"));
        },
    },
});

/**
 * After the build, the texts a reader copies for an assistant are written beside the pages, one file per node, read from
 * the case on demand by the copy button: a large system holds tens of megabytes of them, so no page carries them.
 * @returns the integration
 */
const assistantFiles = () => ({
    name: "assistant-files",
    hooks: {
        "astro:build:done": ({ dir }) => {
            const out = fileURLToPath(dir);
            for (const [path, text] of assistantTexts(openCase(buildConfig().caseDir))) {
                mkdirSync(dirname(join(out, path)), { recursive: true });
                writeFileSync(join(out, path), text);
            }
        },
    },
});

/**
 * After the build, every page is read the way a person reads it. A record id in the text, an address or a file name fails the
 * build; a word of the analysis's own machinery or boilerplate phrasing is written to language-report.json for the person.
 * @returns the integration
 */
const readerCheck = () => ({
    name: "reader-check",
    hooks: {
        "astro:build:done": ({ dir }) => {
            const out = fileURLToPath(dir);
            const walk = (folder) =>
                readdirSync(folder).flatMap((name) => {
                    const path = join(folder, name);
                    return statSync(path).isDirectory() ? walk(path) : [path];
                });
            const hard = [];
            const soft = [];
            for (const file of walk(out)) {
                const page = relative(out, file).split(sep).join("/");
                if (pathNamesRecordId(page))
                    hard.push({ rule: "a record id is in a file name", hit: page, where: page });
                if (!file.endsWith(".html")) continue;
                const html = readFileSync(file, "utf8");
                const found = languageFindings(visibleText(html), page);
                hard.push(...found.hard);
                if (isPlanPage(page)) hard.push(...planFindings(html, page));
                soft.push(...found.soft);
                for (const address of addressesIn(html).filter(pathNamesRecordId))
                    hard.push({ rule: "a record id is in an address", hit: address, where: page });
            }
            writeFileSync(
                join(out, "language-report.json"),
                JSON.stringify(
                    {
                        findings: soft.length,
                        byRule: Object.fromEntries(
                            [...Map.groupBy(soft, (f) => f.rule)].map(([rule, list]) => [rule, list.length]),
                        ),
                        examples: soft.slice(0, 40),
                    },
                    null,
                    2,
                ),
            );
            if (hard.length > 0) {
                throw new Error(
                    `A reader would meet the analysis's bookkeeping:\n${hard
                        .slice(0, 20)
                        .map((f) => `${f.rule}: ${f.hit} (${f.where})`)
                        .join("\n")}`,
                );
            }
            console.log(`reader check: ${soft.length} places to look at, see language-report.json`);
        },
    },
});

// The stylesheet is never inlined: its font addresses are relative to it, so it must stay one file in _astro/.
// The design system's components (vendor/ui, synced from Continuum UI, imported as `@continuum/ui/*`) are React, rendered
// to HTML at build time; only the islands listed in src/layouts/Page.astro ship a script.
// Static pages, one file per node of a page level (`capability/<slug>.html`). The app's only input is the case folder
// compose wrote, named by src/case/build-config.ts (checked once; the build fails without it).
buildConfig();
export default defineConfig({
    integrations: [react(), relativeAssets(), assistantFiles(), readerCheck()],
    vite: {
        plugins: [tailwindcss()],
        resolve: { alias: [{ find: /^@continuum\/ui\//, replacement: `${fileURLToPath(new URL("./vendor/ui/", import.meta.url))}` }] },
    },
    output: "static",
    build: { format: "file", inlineStylesheets: "never" },
    devToolbar: { enabled: false },
    telemetry: false,
});
