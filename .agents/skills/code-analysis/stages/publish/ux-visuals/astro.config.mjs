import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import { addressesIn, languageFindings, pathNamesRecordId, visibleText } from "./src/lib/language.ts";
import react from "@astrojs/react";

/**
 * After the build, every `/_astro/` address in a page becomes a path relative to the page, so the output folder opens
 * from any address, a subfolder of a site included.
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

// Static pages, one file per place (`capability/<id>.html`). The payloads and the output folder come from the environment,
// set by cli/build-ux-visuals.ts.
export default defineConfig({
    integrations: [react(), relativeAssets(), readerCheck()],
    output: "static",
    build: { format: "file", inlineStylesheets: "auto" },
    devToolbar: { enabled: false },
    telemetry: false,
});
