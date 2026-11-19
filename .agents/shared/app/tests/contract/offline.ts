// Opt-in (bun run test:contract:offline): opens a built site in headless Chromium over file:// and from a subfolder of
// a static server, and fails on any console error, uncaught error, failed or blocked request, or a request outside
// the subfolder. Reads only. Expected to FAIL until Phase 5's offline packager.
//
// Usage: bun tests/contract/offline.ts [<site folder>] [--all] [--json <file>]
// Playwright is not a dependency of the app: set PLAYWRIGHT_CORE to a playwright-core module (a folder or its
// index.mjs), else `playwright-core` must resolve from here. CHROMIUM_PATH picks the browser binary; otherwise
// playwright-core uses the Chromium it downloaded.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { pageFindings } from "../../src/lib/reader-contract";
import { defaultSite } from "./site";

type Message = { type(): string; text(): string };
type Request = { url(): string; failure(): { errorText: string } | null };
type Response = { url(): string; status(): number };
type Page = {
    on(event: "console", listener: (message: Message) => void): void;
    on(event: "pageerror", listener: (error: Error) => void): void;
    on(event: "requestfailed", listener: (request: Request) => void): void;
    on(event: "response", listener: (response: Response) => void): void;
    goto(url: string, options: { waitUntil: "load" }): Promise<unknown>;
    waitForTimeout(ms: number): Promise<void>;
    content(): Promise<string>;
    close(): Promise<void>;
};
type Browser = { newPage(): Promise<Page>; close(): Promise<void> };
type Chromium = { launch(options: { headless: boolean; executablePath?: string }): Promise<Browser> };

const args = process.argv.slice(2);
const flag = (name: string) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const json = flag("json");
const site = resolve(args.find((arg, i) => !arg.startsWith("--") && args[i - 1] !== "--json") ?? defaultSite);
if (!existsSync(join(site, "index.html"))) {
    console.error(`No built site at ${site} (no index.html).`);
    process.exit(2);
}

const walk = (folder: string): string[] =>
    readdirSync(folder).flatMap((name) => {
        const path = join(folder, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });
const all = walk(site)
    .filter((file) => file.endsWith(".html"))
    .map((file) => relative(site, file))
    .sort();
/** Every top-level page and the first page of each folder, unless --all. */
const pages = args.includes("--all")
    ? all
    : all.filter(
          (page, i) =>
              !page.includes("/") || page.split("/")[0] !== all[i - 1]?.split("/")[0] || !all[i - 1]?.includes("/"),
      );

// A static server that holds the site two folders down, so any address that starts at the server's root shows up.
const prefix = "/reader/app/";
const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".png": "image/png",
};
const outside: string[] = [];
const server = Bun.serve({
    port: 0,
    fetch(request) {
        const path = decodeURIComponent(new URL(request.url).pathname);
        if (!path.startsWith(prefix)) {
            outside.push(path);
            return new Response("outside the subfolder", { status: 404 });
        }
        let file = join(site, path.slice(prefix.length));
        if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
        if (!file.startsWith(site) || !existsSync(file)) return new Response("missing", { status: 404 });
        return new Response(Bun.file(file), {
            headers: { "content-type": types[extname(file)] ?? "application/octet-stream" },
        });
    },
});

const spec = process.env.PLAYWRIGHT_CORE ?? "playwright-core";
const target = existsSync(spec) && statSync(spec).isDirectory() ? join(spec, "index.mjs") : spec;
const { chromium } = (await import(target)) as { chromium: Chromium };
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });

type Problem = { mode: "file" | "subfolder"; page: string; kind: string; detail: string };
const problems: Problem[] = [];
/** C4: hard reader-contract findings that exist only in the DOM after its scripts ran (served from the subfolder). */
const rendered: { page: string; check: string; at: string; hit: string }[] = [];
const keyOf = (finding: { check: string; at: string; hit: string }) => `${finding.check}|${finding.at}|${finding.hit}`;
const open = async (mode: Problem["mode"], page: string) => {
    const url =
        mode === "file" ? pathToFileURL(join(site, page)).href : `http://localhost:${server.port}${prefix}${page}`;
    const tab = await browser.newPage();
    const add = (kind: string, detail: string) => problems.push({ mode, page, kind, detail: detail.slice(0, 300) });
    tab.on("console", (message) => {
        if (message.type() === "error") add("console error", message.text());
    });
    tab.on("pageerror", (error) => add("uncaught error", String(error)));
    tab.on("requestfailed", (request) =>
        add("request failed", `${request.url()} ${request.failure()?.errorText ?? ""}`),
    );
    tab.on("response", (response) => {
        if (response.status() >= 400) add(`HTTP ${response.status()}`, response.url());
    });
    await tab.goto(url, { waitUntil: "load" });
    await tab.waitForTimeout(600);
    if (mode === "subfolder") {
        const before = new Set((await pageFindings(readFileSync(join(site, page), "utf8"), page)).map(keyOf));
        for (const finding of await pageFindings(await tab.content(), page))
            if (finding.mode === "hard" && finding.check !== "C11" && !before.has(keyOf(finding)))
                rendered.push({ page, check: finding.check, at: finding.at, hit: finding.hit });
    }
    await tab.close();
};

for (const page of pages) {
    await open("file", page);
    const before = outside.length;
    await open("subfolder", page);
    for (const path of outside.slice(before))
        problems.push({ mode: "subfolder", page, kind: "request outside the subfolder", detail: path });
}
await browser.close();
await server.stop(true);

const counts = new Map<string, number>();
for (const problem of problems)
    counts.set(`${problem.mode}: ${problem.kind}`, (counts.get(`${problem.mode}: ${problem.kind}`) ?? 0) + 1);
const failing = (mode: Problem["mode"]) =>
    new Set(problems.filter((problem) => problem.mode === mode).map((problem) => problem.page)).size;
console.log(`Site: ${site}; ${pages.length} of ${all.length} pages opened in each mode.`);
console.log(`Pages with a problem: over file:// ${failing("file")}, from a subfolder ${failing("subfolder")}.`);
for (const [kind, n] of [...counts].sort((a, b) => b[1] - a[1])) {
    const example = problems.find((problem) => `${problem.mode}: ${problem.kind}` === kind);
    console.log(`- ${kind}: ${n} (e.g. ${example?.page}: ${example?.detail})`);
}
console.log(
    `C4: ${rendered.length} hard reader-contract findings appear only once scripts have run (${new Set(rendered.map((each) => each.page)).size} pages; reported, not failed here).`,
);
if (json !== undefined) writeFileSync(json, JSON.stringify({ site, pages, problems, rendered }, null, 2));
process.exit(problems.length > 0 ? 1 : 0);
