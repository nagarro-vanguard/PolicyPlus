import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { addressesIn, isPlanPage, languageFindings, pathNamesRecordId, planFindings, visibleText } from "./src/lib/language.ts";
import { buildConfig } from "./src/case/build-config.ts";
import { openCase } from "./src/case/read.ts";
import { contextTexts } from "./src/case/raw-data.ts";
import { offlinePackage } from "./scripts/package/index.ts";
import { writeDataFile } from "./scripts/package/data.ts";

/**
 * After the build, the texts a reader copies as context are written beside the pages, one file per node, read from
 * the case on demand by the copy button: a large system holds tens of megabytes of them, so no page carries them. Each is a
 * classic script (scripts/package/data.ts), so a page opened from `file://` can read it.
 * @returns the integration
 */
const contextFiles = () => ({
    name: "context-files",
    hooks: {
        "astro:build:done": ({ dir }) => {
            const out = fileURLToPath(dir);
            for (const [path, text] of contextTexts(openCase(buildConfig().caseDir))) {
                writeDataFile(out, path, text);
                // The real file, beside its script: what "Copy file path" and "Download" name, and what an editor or a coding agent reads.
                const real = join(out, path.replace(/\.txt$/, ".md"));
                mkdirSync(dirname(real), { recursive: true });
                writeFileSync(real, text);
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
// The offline packager (scripts/package/) runs last, after the reader check has read the pages as Astro wrote them: it
// makes every address relative, every script classic, every data file a script, and adds the Content-Security-Policy.
// The design system's components (vendor/ui, synced from Continuum UI, imported as `@continuum/ui/*`) are React, rendered
// to HTML at build time; only the islands listed in src/layouts/Page.astro ship a script.
// Static pages, one file per node of a page level (`capability/<slug>.html`). The app's only input is the case folder
// compose wrote, named by src/case/build-config.ts (checked once; the build fails without it).
buildConfig();
export default defineConfig({
    integrations: [react(), contextFiles(), readerCheck(), offlinePackage(fileURLToPath(new URL("./src/styles/app.css", import.meta.url)))],
    vite: {
        plugins: [tailwindcss()],
        resolve: { alias: [{ find: /^@continuum\/ui\//, replacement: `${fileURLToPath(new URL("./vendor/ui/", import.meta.url))}` }] },
    },
    output: "static",
    build: { format: "file", inlineStylesheets: "never" },
    devToolbar: { enabled: false },
    telemetry: false,
});
