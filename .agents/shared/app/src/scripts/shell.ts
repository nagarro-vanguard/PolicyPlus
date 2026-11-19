// The shell of every page: the shortcut hint, the search, the copy for a reader's assistant and the detail of an action
// or a rule, opened on the page that holds it at `#<key>`. The search reads `data/search.json`, the detail
// `data/node/<key>.json` and the pieces it is drawn from `data/parts.html`, the assistant's text `assistant/<key>.txt`;
// all are written at build time and read as classic scripts (load.ts), so they work from `file://` too, and the shell
// never grows with the system shown. An error in a page's script shows a plain message at the top of the page instead
// of failing in silence. No framework: the detail is drawn from the pieces rendered with the design system's
// components, and the menu on a narrow screen is the MobileNav island.
import { navigate } from "astro:transitions/client";
import { detailOf } from "../case/routes";
import { loadFile } from "./load";
import type { NodeView, RowView } from "../case/view";

let root = document.body.dataset.root ?? "./";
const strings = (): Record<string, string> => {
    const node = document.getElementById("copy-strings");
    return node === null ? {} : (JSON.parse(node.textContent ?? "{}") as Record<string, string>);
};
const say = (text: string) => {
    const box = document.getElementById("announce");
    if (box !== null) box.textContent = text;
};
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = "", writtenBy?: "app" | "agent") => {
    const node = document.createElement(tag);
    if (className !== "") node.className = className;
    if (text !== "") node.textContent = text;
    if (writtenBy !== undefined) node.dataset.writtenBy = writtenBy;
    return node;
};

const mac = /Mac|iPhone|iPad/.test(navigator.platform);

/* ---------- the search ---------- */
type Hit = { name: string; level: string; parent: string; text: string; href: string };
let records: Promise<Hit[]> | undefined;
let palette: HTMLDialogElement | null = null;
let input: HTMLInputElement | null = null;
let list: HTMLElement | null = null;
let rows: Hit[] = [];
let active = 0;
const searchable = () => {
    records ??= loadFile<Hit[]>(`${root}data/search.json`).catch((error: unknown) => {
        records = undefined;
        throw error;
    });
    return records;
};
/** Every word typed must start a word of the name, the parent or the text; the name's matches come first. */
export const matches = (all: readonly Hit[], typed: string, limit = 12): Hit[] => {
    const words = typed.toLowerCase().split(/\s+/).filter((word) => word !== "");
    if (words.length === 0) return all.slice(0, limit);
    const starts = (text: string, word: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "u").test(text.toLowerCase());
    const found = all.filter((hit) => words.every((word) => starts(`${hit.name} ${hit.parent} ${hit.text}`, word)));
    const inName = found.filter((hit) => words.every((word) => starts(hit.name, word)));
    return [...inName, ...found.filter((hit) => !inName.includes(hit))].slice(0, limit);
};
const render = () => {
    if (list === null || input === null) return;
    list.replaceChildren();
    if (rows.length === 0) {
        const none = el("li", "px-spacing-md py-spacing-lg text-sm text-muted-foreground", strings().noMatch ?? "", "app");
        none.setAttribute("role", "presentation");
        list.append(none);
        input.removeAttribute("aria-activedescendant");
        return;
    }
    rows.forEach((row, at) => {
        const li = el("li", "flex cursor-pointer flex-col gap-spacing-3xs rounded-control px-spacing-md py-spacing-xs hover:bg-accent/60 aria-selected:bg-accent aria-selected:text-accent-foreground");
        li.id = `palette-row-${at}`;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(at === active));
        if (row.level !== "") li.append(el("span", "text-xs text-muted-foreground", row.level, "agent"));
        li.append(el("span", "text-sm font-medium", row.name, "agent"));
        if (row.parent !== "") li.append(el("span", "text-xs text-muted-foreground", row.parent, "agent"));
        li.addEventListener("click", () => choose(row));
        list?.append(li);
    });
    input.setAttribute("aria-activedescendant", `palette-row-${active}`);
};
const mark = () => {
    list?.querySelectorAll("[role=option]").forEach((node, at) => node.setAttribute("aria-selected", String(at === active)));
    input?.setAttribute("aria-activedescendant", `palette-row-${active}`);
    document.getElementById(`palette-row-${active}`)?.scrollIntoView({ block: "nearest" });
};
const go = (href: string) => {
    const target = new URL(`${root}${href}`, location.href);
    if (target.pathname === location.pathname && target.hash !== "") location.hash = target.hash;
    else void navigate(target.href);
};
const choose = (row: Hit) => {
    palette?.close();
    if (row.href !== "") go(row.href);
};
let sequence = 0;
const update = async () => {
    if (input === null) return;
    const mine = ++sequence;
    let all: Hit[];
    try {
        all = await searchable();
    } catch {
        if (mine !== sequence || list === null) return;
        list.replaceChildren(el("li", "px-spacing-md py-spacing-lg text-sm text-muted-foreground", strings().failed ?? "", "app"));
        return;
    }
    if (mine !== sequence) return;
    rows = matches(all, input.value);
    active = 0;
    render();
};
const openPalette = () => {
    if (palette === null || palette.open) return;
    palette.showModal();
    if (input !== null) {
        input.value = "";
        input.focus();
    }
    void update();
};
document.addEventListener("keydown", (event) => {
    const target = event.target as HTMLElement | null;
    const typing = target !== null && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
    if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        openPalette();
    } else if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        openPalette();
    }
});

/* ---------- the copy for a reader's assistant: fetched when asked for, and the result of the copy is checked ---------- */
document.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-assistant-file]");
    if (button === null) return;
    const label = button.querySelector("[data-label]");
    const fallback = button.parentElement?.querySelector<HTMLTextAreaElement>("[data-assistant-fallback]") ?? null;
    void (async () => {
        const text = await loadFile<string>(button.dataset.assistantFile ?? "", false);
        const done = () => {
            const was = label?.textContent ?? "";
            if (label !== null) label.textContent = button.dataset.copied ?? "";
            say(strings().copied ?? "");
            setTimeout(() => {
                if (label !== null) label.textContent = was;
            }, 1800);
        };
        try {
            if (navigator.clipboard === undefined) throw new Error("no clipboard");
            await navigator.clipboard.writeText(text);
            done();
        } catch {
            // The browser refused the clipboard (no permission, or an address it does not trust): the text is shown,
            // selected, and copied the older way; if that is refused too, the reader copies it by hand.
            if (fallback === null) {
                say(strings().copyFailed ?? "");
                return;
            }
            fallback.value = text;
            fallback.hidden = false;
            fallback.select();
            let copied = false;
            try {
                copied = document.execCommand("copy");
            } catch {
                copied = false;
            }
            if (copied) {
                fallback.hidden = true;
                done();
            } else say(strings().copyFailed ?? "");
        }
    })().catch(() => say(strings().failed ?? ""));
});

/* ---------- the detail of an action or a rule ---------- */
/** The pieces the server rendered once for the site (`data/parts.html`), read the first time a detail opens. */
let pieces: Promise<HTMLTemplateElement> | undefined;
let template: HTMLTemplateElement | null = null;
const loadPieces = () => {
    pieces ??= loadFile<string>(`${root}data/parts.html`).then((html) => {
        const box = document.createElement("template");
        box.innerHTML = html;
        return box;
    });
    pieces.catch(() => {
        pieces = undefined;
    });
    return pieces;
};
/** A copy of one of the pieces, with the design system's classes. */
const part = (name: string): HTMLElement => {
    const found = template?.content.querySelector<HTMLElement>(`[data-part="${name}"]`);
    if (found === null || found === undefined) throw new Error(`the page has no piece ${name}`);
    const copy = found.cloneNode(true) as HTMLElement;
    copy.removeAttribute("data-part");
    return copy;
};
/** Replaces an element's words and keeps its icon. */
const words = (host: HTMLElement, text: string) => {
    for (const node of [...host.childNodes]) if (node.nodeType === Node.TEXT_NODE) node.remove();
    host.append(text);
};
const slot = (host: HTMLElement, name: string) => host.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const rowsOf = (items: readonly RowView[]) => {
    const host = part("rows");
    for (const row of items) {
        const item = part(row.href === undefined ? "row-plain" : "row-link");
        if (row.href !== undefined) item.setAttribute("href", `${root}${row.href}`);
        const title = slot(item, "item-title");
        if (title !== null) title.textContent = row.name;
        const line = slot(item, "item-description");
        if (row.line === undefined) line?.remove();
        else if (line !== null) line.textContent = row.line;
        const actions = slot(item, "item-actions");
        const kind = actions?.querySelector<HTMLElement>('[data-part="kind"]');
        if (row.kind === undefined) kind?.remove();
        else if (kind !== null && kind !== undefined) {
            kind.removeAttribute("data-part");
            words(kind, row.kind);
        }
        const count = actions?.querySelector<HTMLElement>('[data-part="count"]');
        if (row.count === undefined) count?.remove();
        else if (count !== null && count !== undefined) {
            count.removeAttribute("data-part");
            count.textContent = row.count.text;
            count.title = row.count.scope;
        }
        if (row.risk !== undefined) {
            const risk = part(`risk-${row.risk.badge}`);
            words(risk, row.risk.word);
            count === null || count === undefined ? actions?.append(risk) : count.before(risk);
        }
        host.append(item);
    }
    return host;
};
/** A section of the design system with its heading, a level below the detail's own heading. */
const sectionOf = (title: string, writtenBy: "agent" | "app", body: HTMLElement) => {
    const wrapper = part("section");
    wrapper.dataset.writtenBy = writtenBy;
    const section = wrapper.querySelector("section");
    section?.setAttribute("aria-label", title);
    const h2 = section?.querySelector("h2");
    if (h2 !== null && h2 !== undefined) {
        const h3 = el("h3", h2.className, title);
        h2.replaceWith(h3);
    }
    section?.append(body);
    return wrapper;
};
/** The view of a node as the Explorer draws it on the server, for the detail read on demand. */
const draw = (view: NodeView, strings: Record<string, string>) => {
    const host = el("article", "flex flex-col gap-spacing-xl");
    const trail = part("trail");
    trail.dataset.writtenBy = "agent";
    trail.querySelector("nav")?.setAttribute("aria-label", strings.trail ?? "");
    const ol = trail.querySelector("ol");
    const step = ol?.querySelector("li");
    step?.remove();
    for (const crumb of view.crumbs) {
        const li = step?.cloneNode(true) as HTMLElement | undefined;
        const a = li?.querySelector("a");
        if (li === undefined || a === null || a === undefined) continue;
        a.href = `${root}${crumb.href}`;
        a.textContent = crumb.name;
        ol?.append(li);
    }
    // The last step names the place the detail sits under: no separator follows it.
    ol?.lastElementChild?.querySelector('[aria-hidden="true"]')?.remove();
    const opening = el("div", "flex flex-col gap-spacing-xs");
    const noun = part("noun");
    noun.textContent = view.noun.one;
    opening.append(el("p"), el("h2", "text-xl font-semibold", view.name, "agent"));
    opening.firstElementChild?.append(noun);
    if (view.summary !== "") opening.append(el("p", "text-base text-muted-foreground", view.summary, "agent"));
    host.append(trail, opening);
    if (view.facts.length > 0) {
        const facts = part("facts");
        const sample = facts.querySelector("li");
        facts.replaceChildren();
        const fact = (text: string, scope: string) => {
            const li = (sample?.cloneNode(false) as HTMLElement | undefined) ?? el("li");
            li.textContent = text;
            li.title = scope;
            facts.append(li);
        };
        for (const each of view.facts) fact(each.text, each.scope);
        if (view.tests !== null) fact(`${strings.checkedBy ?? ""} ${view.tests.text}`, view.tests.scope);
        host.append(facts);
    }
    if (view.children.rows.length > 0) host.append(sectionOf(view.children.heading, "agent", rowsOf(view.children.rows)));
    if (view.folds.length > 0) {
        const folds = el("div", "flex flex-col border-t border-border");
        for (const fold of view.folds) {
            const details = part("fold");
            details.dataset.fold = fold.kind;
            const summary = details.querySelector("summary [data-written-by]");
            if (summary !== null) summary.textContent = fold.title;
            details.querySelector('[data-part="fold-body"]')?.append(rowsOf(fold.rows));
            folds.append(details);
        }
        host.append(folds);
    }
    for (const group of view.lateral)
        host.append(sectionOf(group.label, "app", rowsOf(group.links.map((each) => ({ href: each.href, name: each.name, ...(each.count === undefined ? {} : { count: each.count }) })))));
    return host;
};
const showDetail = async () => {
    const panel = document.getElementById("detail");
    if (panel === null) return;
    const key = decodeURIComponent(location.hash.slice(1));
    if (!/^[a-z]+\/[a-z0-9-]+$/.test(key)) {
        panel.hidden = true;
        panel.replaceChildren();
        return;
    }
    const said = strings();
    panel.hidden = false;
    panel.replaceChildren(el("p", "text-muted-foreground", said.loading ?? "", "app"));
    try {
        const [view, box] = await Promise.all([loadFile<NodeView>(`${root}${detailOf(key)}`), loadPieces()]);
        template = box;
        panel.replaceChildren(draw(view, said));
        panel.scrollIntoView({ block: "start" });
    } catch {
        panel.replaceChildren(el("p", "text-muted-foreground", said.failed ?? "", "app"));
    }
};
addEventListener("hashchange", () => void showDetail());

/* ---------- an address with no page: an old action or rule address is sent on to the page that now holds it ---------- */
const recover = async () => {
    if (document.querySelector("[data-not-found]") === null) return;
    const path = location.pathname.replace(/\.html$/, "");
    const key = /([a-z]+\/[a-z0-9-]+)$/.exec(path)?.[1];
    if (key === undefined) return;
    const all = await searchable();
    const hit = all.find((each) => each.href.endsWith(`#${key}`) || each.href === `${key}.html`);
    if (hit !== undefined) location.replace(`${root}${hit.href}`);
};

/* ---------- an error in a page's script: a plain message at the top of the page, never silence ---------- */
const showError = () => {
    const box = document.getElementById("page-error");
    if (box !== null) box.hidden = false;
};
addEventListener("error", (event: ErrorEvent) => {
    // A browser notice with no error behind it (a resize observer that took two frames) breaks nothing.
    if (event.error === undefined || event.error === null) return;
    showError();
});
addEventListener("unhandledrejection", showError);

/* ---------- each page ---------- */
const start = () => {
    root = document.body.dataset.root ?? "./";
    // Opened from a file, a page cannot be read ahead of the click: the links are not prefetched.
    if (location.protocol === "file:") for (const link of document.querySelectorAll("[data-astro-prefetch]")) link.removeAttribute("data-astro-prefetch");
    palette = document.querySelector<HTMLDialogElement>("[data-palette]");
    input = document.getElementById("palette-input") as HTMLInputElement | null;
    list = document.getElementById("palette-list");
    const hint = document.querySelector("[data-kbd]");
    if (hint !== null && !mac) hint.textContent = "Ctrl K";
    for (const open of document.querySelectorAll<HTMLElement>("[data-palette-open]")) {
        if (open.dataset.bound !== undefined) continue;
        open.dataset.bound = "true";
        open.addEventListener("click", openPalette);
    }
    if (input !== null && input.dataset.bound === undefined) {
        input.dataset.bound = "true";
        input.addEventListener("input", () => void update());
        input.addEventListener("keydown", (event) => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                active = Math.min(rows.length - 1, active + 1);
                mark();
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                active = Math.max(0, active - 1);
                mark();
            } else if (event.key === "Enter") {
                event.preventDefault();
                const row = rows[active];
                if (row !== undefined) choose(row);
            }
        });
    }
    void showDetail();
    void recover();
};
document.addEventListener("astro:page-load", start);
