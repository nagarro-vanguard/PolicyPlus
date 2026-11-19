// The shell of every page: the narrow-screen menu, the shortcut hint, the search, the copy for a reader's assistant and
// the detail of an action or a rule, opened on the page that holds it at `#<key>`. The search reads `data/search.json`,
// the detail `data/node/<key>.json`, the assistant's text `assistant/<key>.txt`; all are written at build time, so the
// shell never grows with the system shown. No framework.
import { navigate } from "astro:transitions/client";
import { detailOf } from "../case/routes";
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

/* ---------- the menu on narrow screens ---------- */
const mac = /Mac|iPhone|iPad/.test(navigator.platform);
let menuButton: HTMLButtonElement | null = null;
let sidebar: HTMLElement | null = null;
const closeMenu = () => {
    if (sidebar !== null) sidebar.dataset.open = "false";
    menuButton?.setAttribute("aria-expanded", "false");
};

/* ---------- the search ---------- */
type Hit = { name: string; level: string; parent: string; text: string; href: string };
let records: Promise<Hit[]> | undefined;
let palette: HTMLDialogElement | null = null;
let input: HTMLInputElement | null = null;
let list: HTMLElement | null = null;
let rows: Hit[] = [];
let active = 0;
const searchable = () => {
    records ??= fetch(`${root}data/search.json`).then((response) => response.json() as Promise<Hit[]>);
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
        const none = el("li", "palette-none", strings().noMatch ?? "", "app");
        none.setAttribute("role", "presentation");
        list.append(none);
        input.removeAttribute("aria-activedescendant");
        return;
    }
    rows.forEach((row, at) => {
        const li = el("li", "palette-row");
        li.id = `palette-row-${at}`;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(at === active));
        if (row.level !== "") li.append(el("span", "palette-kind", row.level, "agent"));
        li.append(el("span", "palette-name", row.name, "agent"));
        if (row.parent !== "") li.append(el("span", "palette-sub", row.parent, "agent"));
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
    const all = await searchable();
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
    if (event.key === "Escape" && sidebar?.dataset.open === "true") {
        closeMenu();
        menuButton?.focus();
        return;
    }
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
    const fallback = button.parentElement?.querySelector<HTMLTextAreaElement>(".assistant-fallback") ?? null;
    void (async () => {
        const text = await fetch(button.dataset.assistantFile ?? "").then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))));
        try {
            if (navigator.clipboard === undefined) throw new Error("no clipboard");
            await navigator.clipboard.writeText(text);
            const was = label?.textContent ?? "";
            if (label !== null) label.textContent = button.dataset.copied ?? "";
            say(strings().copied ?? "");
            setTimeout(() => {
                if (label !== null) label.textContent = was;
            }, 1800);
        } catch {
            if (fallback !== null) {
                fallback.value = text;
                fallback.hidden = false;
                fallback.select();
            }
            say(strings().copyFailed ?? "");
        }
    })().catch(() => say(strings().failed ?? ""));
});

/* ---------- the detail of an action or a rule ---------- */
const link = (href: string, className: string, name: string) => {
    const a = el("a", className, name, "agent");
    a.href = `${root}${href}`;
    return a;
};
const rowsOf = (items: readonly RowView[]) => {
    const host = el("div", "list");
    for (const row of items) {
        const item = row.href === undefined ? el("div", "row") : link(row.href, "row", "");
        item.removeAttribute("data-written-by");
        item.append(el("span", "t", row.name, "agent"));
        const right = el("span", "r");
        if (row.kind !== undefined) right.append(el("span", "badge", row.kind, "agent"));
        if (row.risk !== undefined) right.append(el("span", `badge badge-${row.risk.badge}`, row.risk.word, "app"));
        if (row.count !== undefined) {
            const count = el("span", "", row.count.text, "app");
            count.title = row.count.scope;
            right.append(count);
        }
        item.append(right);
        if (row.line !== undefined) item.append(el("span", "d", row.line, "agent"));
        host.append(item);
    }
    return host;
};
/** The view of a node as the Explorer draws it on the server, for the detail read on demand. */
const draw = (view: NodeView, words: Record<string, string>) => {
    const host = el("article", "explorer detail-view");
    const trail = el("nav", "trail");
    trail.setAttribute("aria-label", words.trail ?? "");
    const ol = el("ol");
    for (const crumb of view.crumbs) {
        const li = el("li");
        li.append(link(crumb.href, "", crumb.name));
        ol.append(li);
    }
    trail.append(ol);
    host.append(trail, el("p", "node-noun", view.noun.one, "agent"), el("h2", "detail-title", view.name, "agent"));
    if (view.summary !== "") host.append(el("p", "lead", view.summary, "agent"));
    if (view.facts.length > 0) {
        const facts = el("ul", "facts");
        for (const fact of view.facts) {
            const li = el("li", "", fact.text, "app");
            li.title = fact.scope;
            facts.append(li);
        }
        if (view.tests !== null) {
            const li = el("li", "", `${words.checkedBy ?? ""} ${view.tests.text}`, "app");
            li.title = view.tests.scope;
            facts.append(li);
        }
        host.append(facts);
    }
    if (view.children.rows.length > 0) {
        const section = el("section", "sec");
        section.append(el("h3", "", view.children.heading, "agent"), rowsOf(view.children.rows));
        host.append(section);
    }
    for (const fold of view.folds) {
        const details = el("details", "fold-line");
        details.dataset.fold = fold.kind;
        const body = el("div", "fold-body");
        body.append(rowsOf(fold.rows));
        details.append(el("summary", "", fold.title, "app"), body);
        host.append(details);
    }
    for (const group of view.lateral) {
        const section = el("section", "sec");
        section.append(el("h3", "", group.label, "app"), rowsOf(group.links.map((each) => ({ href: each.href, name: each.name, ...(each.count === undefined ? {} : { count: each.count }) }))));
        host.append(section);
    }
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
    const words = strings();
    panel.hidden = false;
    panel.replaceChildren(el("p", "muted", words.loading ?? "", "app"));
    try {
        const response = await fetch(`${root}${detailOf(key)}`);
        if (!response.ok) throw new Error(String(response.status));
        const view = (await response.json()) as NodeView;
        panel.replaceChildren(draw(view, words));
        panel.scrollIntoView({ block: "start" });
    } catch {
        panel.replaceChildren(el("p", "note", words.failed ?? "", "app"));
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

/* ---------- each page ---------- */
const start = () => {
    root = document.body.dataset.root ?? "./";
    sidebar = document.querySelector<HTMLElement>("[data-sidebar]");
    menuButton = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
    palette = document.querySelector<HTMLDialogElement>("[data-palette]");
    input = document.getElementById("palette-input") as HTMLInputElement | null;
    list = document.getElementById("palette-list");
    const hint = document.querySelector("[data-kbd]");
    if (hint !== null && !mac) hint.textContent = "Ctrl K";
    // The sidebar is kept from the first page; its links are made for that page's depth, so each points at this page's root.
    for (const anchor of sidebar?.querySelectorAll<HTMLAnchorElement>("a[data-section]") ?? []) {
        const href = anchor.getAttribute("href") ?? "";
        const own = href.replace(/^(?:\.\.\/|\.\/)+/, "");
        anchor.setAttribute("href", `${root}${own}`);
    }
    closeMenu();
    if (menuButton !== null && menuButton.dataset.bound === undefined) {
        menuButton.dataset.bound = "true";
        menuButton.addEventListener("click", () => {
            const next = sidebar?.dataset.open !== "true";
            if (sidebar !== null) sidebar.dataset.open = String(next);
            menuButton?.setAttribute("aria-expanded", String(next));
        });
    }
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
