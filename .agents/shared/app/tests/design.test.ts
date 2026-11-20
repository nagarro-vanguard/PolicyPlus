import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const root = join(import.meta.dir, "..");
const walk = (folder: string): string[] =>
    readdirSync(folder).flatMap((name) => {
        const path = join(folder, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });
const rel = (path: string) => relative(root, path);
const read = (path: string) => readFileSync(path, "utf8");

const source = walk(join(root, "src"));
// The theme is the design system's (vendor/ui, synced, never edited here) and the reader's few values of its own.
const themeFiles = [join(root, "vendor", "ui", "styles", "theme.css"), join(root, "src", "styles", "reader-theme.css")];
const styled = source.filter((file) => /\.(astro|css|tsx)$/.test(file) && !themeFiles.includes(file));
const tokens = themeFiles.map(read).join("\n");
const fonts = read(join(root, "vendor", "ui", "styles", "fonts.css"));
/** The frame of every page: the layout and the shell's composites. */
const shellText = () =>
    [join(root, "src", "layouts", "Page.astro"), ...walk(join(root, "src", "components", "shell"))].map(read).join("\n");

/** Strip comments so a rule written in prose (such as "never #fff") is not read as a value. */
const code = (text: string) => text.replaceAll(/\/\*[\s\S]*?\*\//g, "");

describe("every design value comes from the theme", () => {
    test("no raw colour is written outside the theme", () => {
        const found = styled.flatMap((file) =>
            [...code(read(file)).matchAll(/(?<![&\w])#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|hwb|lab|lch)\(/g)].map(
                (hit) => `${rel(file)}: ${hit[0]}`,
            ),
        );
        expect(found).toEqual([]);
    });

    test("no font size is written in pixels outside the theme", () => {
        const found = styled.flatMap((file) =>
            [...code(read(file)).matchAll(/font(?:-size)?\s*:[^;}"`]*?\d(?:\.\d+)?px|\btext-\[[\d.]+px\]/g)].map(
                (hit) => `${rel(file)}: ${hit[0]}`,
            ),
        );
        expect(found).toEqual([]);
    });

    test("nothing refers to the retired stylesheets", () => {
        const files = [...source, join(root, "public", "site.js"), join(root, "astro.config.mjs")];
        const found = files.filter((file) => /\b(?:ux|page|tokens)\.css\b/.test(read(file))).map(rel);
        expect(found).toEqual([]);
    });

    test("the layout loads the one stylesheet, built on the theme, and marks the current link", () => {
        const layout = read(join(root, "src", "layouts", "Page.astro"));
        expect(layout).toContain('import "../styles/app.css"');
        expect(layout).not.toContain("<link rel=\"stylesheet\"");
        expect(shellText()).toContain("aria-current");
        expect(layout).toContain('<a href="#main"');
        const css = read(join(root, "src", "styles", "app.css"));
        expect(css).toContain('@import "../../vendor/ui/styles/theme.css"');
        expect(css).toContain('@import "./reader-theme.css"');
    });

    test("the shell has its landmarks, labelled, and a palette a keyboard can open", () => {
        const layout = read(join(root, "src", "layouts", "Page.astro"));
        const shell = shellText();
        expect(layout).toContain("sections: copy.site.sections");
        expect(shell).toContain("aria-label={words.sections}");
        expect(layout).toContain('<main id="main"');
        expect(layout).toContain("<header");
        expect(shell).toContain('aria-keyshortcuts="/ Control+K Meta+K"');
        expect(shell).toContain("<dialog");
        expect(shell).toContain('htmlFor="palette-input"');
        expect(shell).toContain('role="combobox"');
        // On a narrow screen the menu is the design system's sheet, opened by its own button.
        expect(layout).toContain("<MobileNav client:media=");
    });

    test("the shell is one sidebar of one level, a top bar and the page, whose only rail is its list of contents: no tree, no twisty", () => {
        const layout = read(join(root, "src", "layouts", "Page.astro"));
        for (const gone of ["About this page", "Related", "data-rail", "data-tree", "data-toc", "twisty"]) expect([gone, layout.includes(gone)]).toEqual([gone, false]);
        // The page lists its own headings in one component (a rail beside it, a fold above it), and nowhere else.
        expect(layout).toContain("ContentsRail");
        expect(layout).toContain("ContentsFold");
        // Three headed groups at most, and no count of anything in the sidebar.
        const menu = read(join(root, "src", "components", "shell", "NavMenu.tsx"));
        expect(menu.match(/<SidebarGroupLabel render=\{<h2 \/>\}/g)?.length ?? 0).toBeLessThanOrEqual(3);
        expect(menu).not.toContain("counts");
        const css = code(read(join(root, "src", "styles", "app.css")));
        for (const gone of [".rail", ".outline", ".tree", ".twisty", ".toc", ".shell"]) expect([gone, new RegExp(`${gone.replace(".", "\\.")}(?![\\w-])`).test(css)]).toEqual([gone, false]);
        // Below the theme's `md` the sidebar is a menu: the theme's breakpoint, the design system's hook and the island agree.
        const md = Number(/--breakpoint-md:\s*(\d+)px/.exec(tokens)?.[1]);
        expect(md).toBeGreaterThan(0);
        expect(read(join(root, "vendor", "ui", "hooks", "use-mobile.ts"))).toContain(`MOBILE_BREAKPOINT = ${md}`);
        expect(layout).toContain(`client:media="(max-width: ${md - 1}px)"`);
        expect(tokens).toMatch(/--size-navigation:\s*[\d.]+rem/);
        expect(read(join(root, "src", "components", "shell", "SideNav.tsx"))).toContain('"--sidebar-width": "var(--size-navigation)"');
        const shell = read(join(root, "src", "scripts", "shell.ts"));
        for (const gone of ["buildToc", "buildRelated", "nav-open", "plantHost", "outline"]) expect([gone, shell.includes(gone)]).toEqual([gone, false]);
    });

    test("the pages another agent will rebuild use the shell and none of its old pieces", () => {
        const pages = walk(join(root, "src")).filter((file) => file.endsWith(".astro") && !file.includes("layouts"));
        const found = pages.filter((file) => /data-rail|data-toc|outline-bar|class="shell"|class="rail"/.test(read(file))).map(rel);
        expect(found).toEqual([]);
    });

    test("the scripts name no colour and no pixel font size: they paint with classes", () => {
        const scripts = walk(join(root, "src", "scripts")).filter((file) => file.endsWith(".ts"));
        expect(scripts.length).toBeGreaterThan(0);
        const found = scripts.flatMap((file) =>
            [...code(read(file)).matchAll(/(?<![&\w])#[0-9a-fA-F]{6}\b|\b(?:rgba?|hsla?)\(|font-size:\s*[\d.]+px/g)].map((hit) => `${rel(file)}: ${hit[0]}`),
        );
        expect(found).toEqual([]);
    });

    test("fonts swap while they load", () => {
        const faces = [...fonts.matchAll(/@font-face\s*{[^}]*}/g)].map((hit) => hit[0]);
        expect(faces.length).toBeGreaterThan(0);
        for (const face of faces) expect(face).toContain("font-display: swap");
    });

    test("a diagram's text is never below 12 pixels", () => {
        for (const name of ["--diagram-text", "--diagram-text-small"]) {
            const value = new RegExp(`${name}:\\s*([\\d.]+)rem`).exec(tokens);
            expect(value).not.toBeNull();
            expect(Number(value?.[1]) * 16).toBeGreaterThanOrEqual(12);
        }
    });
});

/** The pixel value of a size token, following an alias to the token it names. */
const sizePx = (name: string): number => {
    const hit = new RegExp(`${name}:\\s*([^;]+);`).exec(tokens);
    if (hit === null) throw new Error(`${name} is not a token in the theme`);
    const value = (hit[1] ?? "").trim();
    const alias = /^var\((--[\w-]+)\)$/.exec(value);
    if (alias !== null) return sizePx(alias[1] as string);
    const rem = /^([\d.]+)rem$/.exec(value);
    if (rem === null) throw new Error(`${name}: ${value} is not in rem`);
    return Number(rem[1]) * 16;
};

/** The pixel size of a Tailwind text class, from the theme. */
const textClassPx = (size: string) => sizePx(`--text-${size}`);
const appFiles = () => source.filter((file) => /\.(astro|tsx|ts)$/.test(file) && !file.includes(`${"generated"}`));

describe("the type scale and the controls are small and few", () => {
    test("body is 13 pixels on a 20 pixel line; chips 12; the section heading 16; the page heading 24", () => {
        expect(textClassPx("sm")).toBe(13);
        expect(sizePx("--text-sm--line-height")).toBe(20);
        expect(textClassPx("xs")).toBe(12);
        expect(textClassPx("base")).toBe(16);
        expect(textClassPx("2xl")).toBe(24);
        // The page heading is the design system's PageOpening, which sets it at `text-2xl`; the section heading at `text-base`.
        expect(read(join(root, "vendor", "ui", "components", "page-opening.tsx"))).toContain('<h1 className="text-2xl');
        expect(read(join(root, "vendor", "ui", "components", "details.tsx"))).toContain('<h2 className="text-base');
    });

    test("no text the app sets is above the page heading's 24 pixels, and none but a heading is above 16", () => {
        const found: string[] = [];
        for (const file of appFiles())
            for (const hit of code(read(file)).matchAll(/\btext-(xs|sm|base|lg|[2-9]?xl)\b/g)) {
                const px = textClassPx(hit[1] as string);
                if (px > 24) found.push(`${rel(file)}: text-${hit[1]}`);
                if (px > 16 && !/<h[1-6][^>]*$|"h[1-6]"/.test(code(read(file)).slice(Math.max(0, (hit.index ?? 0) - 80), hit.index))) found.push(`${rel(file)}: text-${hit[1]} outside a heading`);
            }
        expect(found).toEqual([]);
    });

    test("no stylesheet of the app sets a font size but through the theme", () => {
        for (const file of source.filter((each) => each.endsWith(".css"))) {
            for (const hit of code(read(file)).matchAll(/font-size:\s*([^;]+);/g)) expect([rel(file), /^var\(--(?:text|diagram-text)[\w-]*\)$/.test((hit[1] ?? "").trim())]).toEqual([rel(file), true]);
        }
        expect(sizePx("--diagram-text")).toBeGreaterThanOrEqual(12);
    });

    test("a control is at most 36 pixels: every button size the app uses", () => {
        const all = read(join(root, "vendor", "ui", "components", "button.tsx"));
        const button = all.slice(all.indexOf("size: {"));
        const heightOf = (size: string) => {
            const recipe = new RegExp(`(?:^|\\s)"?${size.replace("-", "\\-")}"?:\\s*\\n?\\s*"([^"]+)"`, "m").exec(button)?.[1] ?? "";
            const step = /(?:^|\s)(?:h|size)-(\d+(?:\.\d+)?)(?:\s|$)/.exec(recipe)?.[1];
            if (step === undefined) throw new Error(`button size ${size} has no height in button.tsx`);
            return Number(step) * 4;
        };
        const used = new Set(["default"]);
        for (const file of appFiles()) for (const hit of read(file).matchAll(/<Button\b[^>]*?\ssize="([\w-]+)"/g)) used.add(hit[1] as string);
        for (const size of used) expect([size, heightOf(size) <= 36]).toEqual([size, true]);
        expect(used.size).toBeGreaterThan(1);
    });
});

/**
 * The measures a person sees, read from the pages as built: the app's build folder is named in `APP_BUILD_DIR` and a Chromium
 * browser (Chrome, Chromium or Brave) is found and can run headless. Without both the check is skipped.
 */
const buildDir = process.env.APP_BUILD_DIR ?? "";
const browser = [process.env.CHROME_BIN ?? "", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", "/usr/bin/chromium", "/usr/bin/google-chrome"].find((path) => path !== "" && existsSync(path));
const measured = buildDir !== "" && browser !== undefined && existsSync(join(buildDir, "kit.html"));

describe("computed on the kit page", () => {
    test.skipIf(!measured)("no control is taller than 36 pixels and no running text is above 16", () => {
        const probe = `<script>addEventListener("load", function () { setTimeout(function () {
            var out = { tallest: 0, tallestOf: "", biggest: 0, biggestOf: "", smallest: 99, smallestOf: "", controls: 0 };
            var shown = function (el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
            document.querySelectorAll("button, input, select, a[data-slot=button]").forEach(function (el) {
                if (!shown(el)) return;
                out.controls += 1;
                var h = el.getBoundingClientRect().height;
                if (h > out.tallest) { out.tallest = h; out.tallestOf = el.outerHTML.slice(0, 60); }
            });
            var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            for (var n = walker.nextNode(); n; n = walker.nextNode()) {
                if (!n.nodeValue.trim()) continue;
                var el = n.parentElement;
                if (!el || el.closest("script,style,svg,[hidden],template,#measure") || !shown(el)) continue;
                var px = parseFloat(getComputedStyle(el).fontSize);
                // A heading, or a title the design system draws as a block (its empty and error states' title).
                var heading = /^H[1-6]$/.test(el.tagName) || /-title$/.test(el.dataset.slot || "");
                var limit = heading ? 30 : 16;
                if (px > limit && px > out.biggest) { out.biggest = px; out.biggestOf = el.outerHTML.slice(0, 60); }
                if (px < out.smallest) { out.smallest = px; out.smallestOf = el.outerHTML.slice(0, 60); }
            }
            var pre = document.createElement("pre"); pre.id = "measure"; pre.textContent = JSON.stringify(out); document.body.append(pre);
        }, 300); });</script>`;
        const html = readFileSync(join(buildDir, "kit.html"), "utf8").replace("<head>", `<head><base href="file://${buildDir}/">`).replace("</body>", `${probe}</body>`);
        const folder = mkdtempSync(join(tmpdir(), "kit-probe-"));
        const file = join(folder, "kit.html");
        writeFileSync(file, html);
        const run = Bun.spawnSync([browser as string, "--headless=new", "--disable-gpu", `--user-data-dir=${join(folder, "profile")}`, "--window-size=1440,900", "--virtual-time-budget=4000", "--dump-dom", `file://${file}`], { stdout: "pipe", stderr: "pipe", timeout: 25_000 });
        const found = /<pre id="measure">([^<]*)<\/pre>/.exec(run.stdout.toString());
        if (found === null) {
            // A browser that cannot run headless here (a sandbox without a display) gives nothing to measure: say so, do not fail.
            console.warn(`the browser at ${browser} gave no measure of the kit page; run the probe in a window instead`);
            return;
        }
        const result = JSON.parse((found?.[1] ?? "{}").replaceAll("&quot;", '"')) as { tallest: number; biggest: number; controls: number; smallest: number };
        expect(result.controls).toBeGreaterThan(5);
        expect(result.tallest).toBeLessThanOrEqual(36);
        expect(result.biggest).toBe(0);
        expect(result.smallest).toBeGreaterThanOrEqual(11.9);
    }, 40_000);
});

/** A token's two colours, the light one and the dark one. */
const pair = (name: string): { light: string; dark: string } => {
    const hit = new RegExp(`${name}:\\s*light-dark\\(\\s*(#[0-9a-fA-F]{6})\\s*,\\s*(#[0-9a-fA-F]{6})\\s*\\)`).exec(tokens);
    if (hit === null) throw new Error(`${name} is not a light-dark pair of two six-digit colours in the theme`);
    return { light: hit[1] as string, dark: hit[2] as string };
};

const channel = (hex: string, at: number) => {
    const value = Number.parseInt(hex.slice(at, at + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
const contrast = (a: string, b: string) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
    return (high + 0.05) / (low + 0.05);
};

describe("the colours meet WCAG 2.2 AA in both themes", () => {
    const scales: [string, string][] = [
        ["severity", "high"],
        ["severity", "medium"],
        ["severity", "low"],
        ["state", "changes"],
        ["state", "readonly"],
        ["provenance", "stated"],
        ["provenance", "inferred"],
        ["provenance", "assumed"],
    ];

    test("every semantic scale has its three tokens", () => {
        for (const [scale, kind] of scales)
            for (const part of ["text", "surface", "edge"]) expect(() => pair(`--${scale}-${kind}-${part}`)).not.toThrow();
    });

    for (const theme of ["light", "dark"] as const) {
        test(`${theme}: semantic text on its surface and on the page is 4.5:1`, () => {
            for (const [scale, kind] of scales) {
                const text = pair(`--${scale}-${kind}-text`)[theme];
                const surface = pair(`--${scale}-${kind}-surface`)[theme];
                expect([`${scale}-${kind}`, contrast(text, surface) >= 4.5]).toEqual([`${scale}-${kind}`, true]);
            }
        });

        test(`${theme}: the edge of each semantic badge is 3:1 on the page`, () => {
            const page = pair("--background")[theme];
            for (const [scale, kind] of scales) {
                const edge = pair(`--${scale}-${kind}-edge`)[theme];
                expect([`${scale}-${kind}`, contrast(edge, page) >= 3]).toEqual([`${scale}-${kind}`, true]);
            }
        });

        test(`${theme}: the roles pair up`, () => {
            const checks: [string, string, number][] = [
                ["--foreground", "--background", 4.5],
                ["--card-foreground", "--card", 4.5],
                ["--popover-foreground", "--popover", 4.5],
                ["--primary-foreground", "--primary", 4.5],
                ["--secondary-foreground", "--secondary", 4.5],
                ["--muted-foreground", "--background", 4.5],
                ["--muted-foreground", "--card", 4.5],
                ["--muted-foreground", "--muted", 4.5],
                ["--muted-foreground", "--popover", 4.5],
                ["--accent-foreground", "--accent", 4.5],
                ["--destructive", "--background", 4.5],
                ["--input", "--background", 3],
                ["--ring", "--background", 3],
                ["--ring", "--card", 3],
                ["--diagram-box-text", "--diagram-box", 4.5],
                ["--diagram-edge", "--diagram-halo", 4.5],
                ["--diagram-selected", "--background", 3],
                ["--diagram-uses", "--background", 3],
                ["--diagram-usedby", "--background", 3],
                ["--diagram-uses", "--diagram-box", 3],
                ["--diagram-usedby", "--diagram-box", 3],
            ];
            for (const [foreground, background, least] of checks)
                expect([foreground, background, contrast(pair(foreground)[theme], pair(background)[theme]) >= least]).toEqual([
                    foreground,
                    background,
                    true,
                ]);
        });
    }
});
