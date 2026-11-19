import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { rolldown } from "rolldown";
import { hashOf, prefixOf, walk, type Site } from "./site";

// Classic scripts in place of module scripts. A page opened from `file://` may not load a module script, import one
// later or fetch a file, so every module script of the build is bundled again as a classic script:
// - `_astro/app.<hash>.js`: Astro's island element and its `client:` directives (inline on every page before), then
//   every page's own module scripts (the router, the shell, each page's filters), in one file loaded with `defer` by
//   every page and cached once. Each was written to run on any page (it looks for its own elements), as the view
//   transition router already keeps a module script running across pages.
// - `_astro/islands.<hash>.js`: the islands (the narrow-screen menu, the diagram) with their one copy of React, loaded by
//   the island loader the first time an island wakes. Astro's island element imports its component; that import is
//   replaced by the loader, which reads the component from this file.
// - `_astro/elk-layout.js`: the layout engine's worker source as a string, when a diagram is built; the diagram starts
//   its worker from a `blob:` address (src/components/diagram/DiagramCanvas.tsx).
// The module files are then removed, so nothing asks for them.

const moduleSource = /<script type="module" src="([^"]+)"><\/script>/g;
const moduleInline = /<script type="module">([\s\S]*?)<\/script>/g;
const islandAttribute = /(?:component-url|renderer-url)="([^"]+)"/g;
const islandRuntime = "customElements.define(`astro-island`";
const islandDirective = "(self.Astro||(self.Astro={})).";
/** Astro's inline island scripts (the element and its `client:` directives), the same text on every page. */
const isIslandScript = (code: string) => code.includes(islandRuntime) || code.includes(islandDirective);

/** Astro's island element, changed to take its component from the islands file instead of importing it. */
const patchRuntime = (text: string, islands: string): string => {
    const start = text.indexOf("async importWithRetry(");
    const end = text.indexOf("handleHydrationError(", start);
    if (start < 0 || end < 0) throw new Error("offline packager: Astro's island element has changed; read its importWithRetry again");
    let patched = `${text.slice(0, start)}async importWithRetry(e){return self.__islandImport(e)}${text.slice(end)}`;
    patched = patched.replaceAll("await import(", "await self.__islandImport(");
    if (/\bimport\(/.test(patched)) throw new Error("offline packager: Astro's island element still imports a module");
    const loader =
        `self.__islandImport=self.__islandImport||function(u){var n=String(u).split("?")[0].split("/").pop(),r=function(){var m=(self.__islands||{})[n];if(!m)throw new Error("no island "+n);return m};` +
        `if(self.__islands&&self.__islands[n])return Promise.resolve(self.__islands[n]);` +
        `self.__islandsLoading=self.__islandsLoading||new Promise(function(ok,no){var s=document.createElement("script");s.src=new URL((document.body.dataset.root||"./")+${JSON.stringify(`_astro/${islands}`)},location.href).href;s.onload=function(){ok()};s.onerror=function(){self.__islandsLoading=void 0;no(new Error("islands did not load"))};document.head.append(s)});` +
        `return self.__islandsLoading.then(r)};`;
    return loader + patched;
};

/** One classic script from an entry, with the bundler the build itself uses (rolldown), so Node and Bun both run it. */
const bundle = async (entry: string): Promise<string> => {
    const build = await rolldown({ input: entry, platform: "browser", logLevel: "silent" });
    const { output } = await build.generate({ format: "iife", minify: true });
    await build.close();
    const [chunk] = output;
    if (chunk === undefined || chunk.type !== "chunk") throw new Error("offline packager: the bundler wrote nothing");
    return chunk.code;
};

/**
 * Turns the build's module scripts into classic scripts.
 * @param site the site in memory
 */
export const classicScripts = async (site: Site) => {
    const assets = join(site.out, "_astro");
    const work = mkdtempSync(join(site.out, ".package-"));
    try {
        // Every module script, in the order the pages name them: the router first, then the shell, then the rest.
        const entries: string[] = [];
        const runtime: string[] = [];
        const inline = new Map<string, string>();
        const islands = new Map<string, string>();
        for (const [file, html] of [...site.pages].sort(([a], [b]) => a.localeCompare(b))) {
            for (const [, src] of html.matchAll(moduleSource)) {
                const path = resolve(dirname(file), src as string);
                if (!entries.includes(path)) entries.push(path);
            }
            for (const [, code] of html.matchAll(moduleInline)) {
                if (inline.has(code as string)) continue;
                // An inline module names its imports relative to its page: it is bundled from a file beside that page.
                const path = join(dirname(file), `.package-inline-${inline.size}.mjs`);
                writeFileSync(path, code as string);
                inline.set(code as string, path);
                entries.push(path);
            }
            for (const [, code] of html.matchAll(/<script>([\s\S]*?)<\/script>/g))
                if (isIslandScript(code as string) && !runtime.includes(code as string)) runtime.push(code as string);
            for (const [, src] of html.matchAll(islandAttribute)) islands.set(basename(src as string), resolve(dirname(file), src as string));
        }
        let islandsName = "";
        if (islands.size > 0) {
            const islandsEntry = join(work, "islands.mjs");
            const names = [...islands].sort(([a], [b]) => a.localeCompare(b));
            writeFileSync(
                islandsEntry,
                [
                    ...names.map(([, path], at) => `import * as m${at} from ${JSON.stringify(path)};`),
                    "const all = (self.__islands ||= {});",
                    ...names.map(([name], at) => `all[${JSON.stringify(name)}] = m${at};`),
                ].join("\n"),
            );
            const text = await bundle(islandsEntry);
            islandsName = `islands.${hashOf(text)}.js`;
            writeFileSync(join(assets, islandsName), text);
            if (text.includes("elk-layout.js")) {
                const worker = readFileSync(createRequire(import.meta.url).resolve("elkjs/lib/elk-worker.min.js"), "utf8");
                writeFileSync(join(assets, "elk-layout.js"), `self.__elkWorker=${JSON.stringify(worker)};\n`);
            }
        }

        // The island element and its directives run first, then the pages' own scripts.
        const appEntry = join(work, "app.mjs");
        writeFileSync(appEntry, entries.map((path) => `import ${JSON.stringify(path)};`).join("\n"));
        const bundled = await bundle(appEntry);
        for (const path of inline.values()) unlinkSync(path);
        const directives = runtime.filter((code) => !code.includes(islandRuntime));
        const element = runtime.filter((code) => code.includes(islandRuntime)).map((code) => patchRuntime(code, islandsName));
        const app = [...directives, ...element, bundled].map((code) => code.trim().replace(/;?$/, ";")).join("\n");
        const appName = `app.${hashOf(app)}.js`;
        writeFileSync(join(assets, appName), app);

        for (const [file, html] of site.pages) {
            const prefix = prefixOf(site.out, file);
            let next = html.replaceAll(moduleSource, "").replaceAll(moduleInline, "");
            next = next.replace("</head>", `<script defer src="${prefix}_astro/${appName}"></script></head>`);
            next = next.replaceAll(/<script>([\s\S]*?)<\/script>/g, (whole, code: string) => (isIslandScript(code) ? "" : whole));
            site.pages.set(file, next);
        }
        const kept = new Set([appName, islandsName, "elk-layout.js"]);
        for (const file of walk(assets).filter((each) => each.endsWith(".js") && !kept.has(basename(each)))) unlinkSync(file);
    } finally {
        rmSync(work, { recursive: true, force: true });
    }
};
