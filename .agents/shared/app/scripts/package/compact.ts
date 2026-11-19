import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { __unstable__loadDesignSystem as loadDesignSystem, compile, optimize } from "@tailwindcss/node";
import { hashOf, markupParts, prefixOf, walk, type Site } from "./site";

// Shorter pages. The design system's components carry long lists of Tailwind classes, and a page repeats the same few
// hundred lists thousands of times (every row, every badge, every menu item): they were most of each page's bytes. Each
// distinct list is named once, `k<n>`, and one shared stylesheet, `_astro/compact.<hash>.css`, gives that name the list's
// utilities through Tailwind's `@apply`, against the app's own stylesheet, so the rules are the ones Tailwind wrote for the
// list. A class that is not a utility (`group/item`, `peer/menu-button`, `lucide`), or one a selector reads by its text
// (`[class*='size-']`, on an icon), stays as it is. An island's markup is named too: React keeps the classes it finds
// when it takes the markup over, and a class it writes later is a utility the app's stylesheet already has.
// A `style` attribute becomes a class too (`s<n>`), unlayered, as an inline style is, so the strict Content-Security-Policy
// allows no inline style at all. An icon's drawing attributes (size, stroke) become a class the same way, at the weight
// an attribute has.

const entities: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#x27;": "'", "&#39;": "'" };
const unescape = (text: string) => text.replaceAll(/&(?:amp|lt|gt|quot|#x27|#39);/g, (hit) => entities[hit] ?? hit);
const escape = (text: string) => text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const tag = /<([a-zA-Z][\w-]*)(\s[^<>]*?)?(\/?)>/g;
/** A class list is named per kind of element, an icon or anything else, as the theme reads an icon's classes by their text. */
const keyOf = (element: string, list: string) => `${element === "svg" ? "svg" : "any"} ${list}`;
const listOf = (key: string) => key.slice(key.indexOf(" ") + 1);
/** An icon's drawing attributes, which a class gives as well, at the same lowest weight (`:where`, in the base layer). */
const drawing = ["width", "height", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"] as const;
const drawingOf = (attributes: string) =>
    drawing.flatMap((name) => {
        const value = attribute(name).exec(attributes)?.[1];
        return value === undefined ? [] : [`${name}:${/^\d+(\.\d+)?$/.test(value) && (name === "width" || name === "height") ? `${value}px` : value}`];
    });
const attribute = (name: string) => new RegExp(`\\s${name}="([^"]*)"`);

/**
 * Names each repeated class list once and moves inline styles into classes.
 * @param site the site in memory
 * @param stylesheet the app's own stylesheet, which the classes' utilities come from
 */
export const compactClasses = async (site: Site, stylesheet: string) => {
    const documents = [...site.pages, ...site.fragments];
    const lists = new Map<string, number>();
    const styles = new Map<string, number>();
    const icons = new Set<string>();
    for (const [, html] of documents)
        markupParts(html, (markup) => {
            for (const [, name, attributes] of markup.matchAll(tag)) {
                const list = attribute("class").exec(attributes ?? "")?.[1];
                if (list !== undefined) lists.set(keyOf(name as string, list), (lists.get(keyOf(name as string, list)) ?? 0) + 1);
                const style = attribute("style").exec(attributes ?? "")?.[1];
                if (style !== undefined) styles.set(style, (styles.get(style) ?? 0) + 1);
                if (name === "svg" && drawingOf(attributes ?? "").length >= 3) icons.add(drawingOf(attributes ?? "").join(";"));
            }
            return markup;
        });

    // Which classes are utilities, and which a selector reads by their text.
    const base = join(stylesheet, "..");
    const design = await loadDesignSystem(readFileSync(stylesheet, "utf8"), { base });
    const tokens = [...new Set([...lists.keys()].flatMap((key) => unescape(listOf(key)).split(/\s+/)).filter((each) => each !== ""))];
    const rules = design.candidatesToCss(tokens);
    const utility = new Set(tokens.filter((_, at) => rules[at] !== null));
    const built = walk(join(site.out, "_astro"))
        .filter((file) => file.endsWith(".css"))
        .map((file) => readFileSync(file, "utf8"))
        .join("\n");
    const textual = [...`${built}\n${rules.join("\n")}`.matchAll(/\[class[*^$|~]?=\\?['"]?([^'"\]\\]+)/g)].map((hit) => hit[1] as string);
    // Every such selector in the theme reads an icon's classes (`svg:not([class*='size-'])`): on an icon they are kept.
    const keptOn = (key: string) => (token: string) => !utility.has(token) || (key.startsWith("svg ") && textual.some((text) => token.includes(text)));

    // One name per list with utilities in it, the most repeated first; a name a page already uses is skipped.
    const names = new Map<string, string>();
    const sheet: string[] = [];
    let next = 0;
    const fresh = (prefix: string) => {
        let name = `${prefix}${(next++).toString(36)}`;
        while (tokens.includes(name)) name = `${prefix}${(next++).toString(36)}`;
        return name;
    };
    for (const [key] of [...lists].sort(([a, x], [b, y]) => y * b.length - x * a.length || a.localeCompare(b))) {
        const kept = keptOn(key);
        const parts = unescape(listOf(key)).split(/\s+/).filter((each) => each !== "");
        const applied = parts.filter((each) => !kept(each));
        if (applied.length === 0) continue;
        const name = fresh("k");
        names.set(key, escape([...parts.filter(kept), name].join(" ")));
        sheet.push(`.${name}{@apply ${applied.join(" ")};}`);
    }
    next = 0;
    const styleNames = new Map<string, string>();
    const plain: string[] = [];
    for (const [style] of [...styles].sort(([a], [b]) => a.localeCompare(b))) {
        const name = fresh("s");
        styleNames.set(style, name);
        plain.push(`.${name}{${unescape(style)}}`);
    }
    next = 0;
    const iconNames = new Map<string, string>();
    const drawn: string[] = [];
    for (const icon of [...icons].sort()) {
        const name = fresh("v");
        iconNames.set(icon, name);
        drawn.push(`:where(.${name}){${icon}}`);
    }
    const compiled = (
        await compile(`@reference ${JSON.stringify(stylesheet)};\n@layer base{\n${drawn.join("\n")}\n}\n@layer utilities{\n${sheet.join("\n")}\n}\n${plain.join("\n")}\n`, {
            base,
            onDependency: () => {},
        })
    ).build([]);
    const css = optimize(compiled, { minify: true }).code;
    const cssName = `compact.${hashOf(css)}.css`;
    writeFileSync(join(site.out, "_astro", cssName), css);

    // The design system marks each piece's anatomy (`data-slot`, `data-sidebar`, `data-variant`, `data-size`) for its own
    // styles and scripts. A mark nothing reads (no rule, no script names that value) is dropped; a link keeps its
    // `data-slot` (a rule reads its presence), and an island keeps all of them.
    const scriptFiles = [...walk(join(site.out, "_astro")).filter((file) => file.endsWith(".js")), join(site.out, "site.js")];
    const scripts = scriptFiles.map((file) => readFileSync(file, "utf8")).join("\n");
    // A page's own script may name a value alone and build the selector around it (`[data-slot="${name}"]`); the
    // islands' scripts only write their marks, inside their own markup, which keeps them.
    const pageScripts = scriptFiles
        .filter((file) => !/[\\/](islands\.[^\\/]*|elk-layout)\.js$/.test(file))
        .map((file) => readFileSync(file, "utf8"))
        .join("\n");
    const styleText = `${built}\n${css}`;
    const read = new Map<string, boolean>();
    const isRead = (mark: string, value: string) => {
        const key = `${mark}=${value}`;
        let found = read.get(key);
        if (found === undefined) {
            const text = value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
            found =
                new RegExp(`${mark}=["']?${text}["'\\]]`).test(`${styleText}\n${scripts}`) ||
                new RegExp(`["'\`]${text}["'\`]`).test(pageScripts);
            read.set(key, found);
        }
        return found;
    };
    const anatomy = /\s(data-slot|data-sidebar|data-variant|data-size)="([^"]*)"/g;
    const trim = (element: string, attributes: string) =>
        attributes.replaceAll(anatomy, (whole, mark: string, value: string) =>
            (mark === "data-slot" && (element === "a" || / aria-invalid=/.test(attributes))) || isRead(mark, value) ? whole : "",
        );
    const rewriteMarkup = (markup: string, island: boolean) =>
        markup.replaceAll(tag, (whole, name: string, found: string | undefined, close: string) => {
            if (found === undefined) return whole;
            const attributes = island ? found : trim(name, found);
            const list = attribute("class").exec(attributes)?.[1];
            const style = attribute("style").exec(attributes)?.[1];
            const icon = name === "svg" && drawingOf(attributes).length >= 3 ? iconNames.get(drawingOf(attributes).join(";")) : undefined;
            if (list === undefined && style === undefined && icon === undefined) return attributes === found ? whole : `<${name}${attributes}${close}>`;
            const classes = [list === undefined ? "" : (names.get(keyOf(name, list)) ?? list), style === undefined ? "" : (styleNames.get(style) ?? ""), icon ?? ""]
                .filter((each) => each !== "")
                .join(" ");
            let rest = attributes.replace(attribute("style"), "");
            // An icon in an HTML page needs no namespace, and its drawing attributes are its class.
            if (icon !== undefined) for (const each of ["xmlns", ...drawing]) rest = rest.replace(attribute(each), "");
            rest = list === undefined ? `${rest} class="${classes}"` : rest.replace(attribute("class"), ` class="${classes}"`);
            return `<${name}${rest}${close}>`;
        });
    const rewrite = (html: string) =>
        markupParts(html, (markup) =>
            markup
                .split(/(<astro-island\b[\s\S]*?<\/astro-island>)/)
                .map((part, at) => rewriteMarkup(part, at % 2 === 1))
                .join(""),
        );
    for (const [file, html] of site.pages) {
        const linked = rewrite(html).replace(/(<link rel="stylesheet" href="[^"]*">)/, `$1<link rel="stylesheet" href="${prefixOf(site.out, file)}_astro/${cssName}">`);
        site.pages.set(file, linked);
    }
    for (const [file, html] of site.fragments) site.fragments.set(file, rewrite(html));
};
