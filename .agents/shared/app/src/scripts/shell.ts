// The shell of every page: the shortcut hint, the search, the copy for a reader's assistant and the drawer of an action
// or a rule, opened beside the page that holds it at `#<key>`. The search reads `data/search.json`, the detail
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
    const fallback = (button.closest("[data-assistant-scope]") ?? button.closest("[data-for-assistant]"))?.querySelector<HTMLTextAreaElement>("[data-assistant-fallback]") ?? null;
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

/* ---------- the drawer of an action or a rule ---------- */
/** The pieces the server rendered once for the site (`data/parts.html`), read the first time a drawer opens. */
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
        const code = item.querySelector<HTMLElement>('[data-part="code"]');
        if (row.code === undefined) code?.remove();
        else if (code !== null) {
            code.removeAttribute("data-part");
            code.textContent = row.code;
        }
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
/** A list longer than this gets a filter above it. */
const filterFrom = 16;
/** The rows, with a filter over them when they are many. */
const filteredRows = (items: readonly RowView[]) => {
    const rows = rowsOf(items);
    if (items.length < filterFrom) return rows;
    const box = el("div", "flex flex-col gap-spacing-md");
    const filter = part("filter");
    const input = filter.querySelector("input");
    const none = part("no-match");
    none.hidden = true;
    input?.addEventListener("input", () => {
        const wanted = input.value.toLowerCase().split(/\s+/).filter((word) => word !== "");
        let shown = 0;
        for (const row of rows.children) {
            const keep = wanted.every((word) => (row.textContent ?? "").toLowerCase().includes(word));
            (row as HTMLElement).hidden = !keep;
            if (keep) shown += 1;
        }
        none.hidden = shown > 0;
    });
    box.append(filter, rows, none);
    return box;
};
/** A section of the design system with its heading, a level below the drawer's own heading. */
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
const rowOfLink = (link: NodeView["lateral"][number]["links"][number]): RowView => ({
    href: link.href,
    name: link.name,
    ...(link.code === undefined ? {} : { code: link.code }),
    ...(link.line === undefined ? {} : { line: link.line }),
    ...(link.count === undefined ? {} : { count: link.count }),
});
/** The body of the drawer: what it does, its facts, its rules, where its code lives (once), its other links, the copy for an assistant and the way to the ones beside it. */
const draw = (view: NodeView, said: Record<string, string>) => {
    const host = document.createDocumentFragment();
    if (view.summary !== "") host.append(el("p", "text-base text-muted-foreground", view.summary, "agent"));
    const facts = view.facts.slice(0, view.tests === null ? 3 : 2);
    if (facts.length > 0 || view.tests !== null) {
        const list = part("facts");
        const sample = list.querySelector("li");
        list.replaceChildren();
        const fact = (text: string, scope: string) => {
            const li = (sample?.cloneNode(false) as HTMLElement | undefined) ?? el("li");
            li.textContent = text;
            li.title = scope;
            list.append(li);
        };
        for (const each of facts) fact(each.text, each.scope);
        if (view.tests !== null) fact(`${said.checkedBy ?? ""} ${view.tests.text}`, view.tests.scope);
        host.append(list);
    }
    if (view.assistant !== null) {
        const block = part("assistant-block");
        const button = block.querySelector<HTMLElement>("[data-assistant-file]");
        button?.setAttribute("data-assistant-file", `${root}${view.assistant.file}`);
        const size = button?.querySelector<HTMLElement>('[data-part="assistant-size"]');
        if (size !== null && size !== undefined) size.textContent = (size.textContent ?? "").replace(/\d+/, String(view.assistant.kilobytes));
        host.append(block);
    }
    if (view.children.rows.length > 0) host.append(sectionOf(view.children.heading, "agent", filteredRows(view.children.rows)));
    for (const fold of view.folds.filter((each) => each.kind !== "layers")) {
        const details = part("fold");
        details.dataset.fold = fold.kind;
        const summary = details.querySelector("summary [data-written-by]");
        if (summary !== null) summary.textContent = fold.title;
        details.querySelector('[data-part="fold-body"]')?.append(filteredRows(fold.rows));
        const folds = el("div", "flex flex-col border-t border-border");
        folds.append(details);
        host.append(folds);
    }
    // Where its code lives, said once: the place it is in and the layers its work passes through, together.
    const lives = view.lateral.find((group) => group.relation === "livesIn");
    const layers = view.folds.find((fold) => fold.kind === "layers");
    const where = [...(lives?.links.map(rowOfLink) ?? []), ...(layers?.rows ?? [])];
    if (where.length > 0) host.append(sectionOf(lives?.label ?? said.livesIn ?? "", "app", filteredRows(where)));
    for (const group of view.lateral.filter((each) => each.relation !== "livesIn")) host.append(sectionOf(group.label, "app", filteredRows(group.links.map(rowOfLink))));
    if (view.prev !== null || view.next !== null) {
        const pager = el("nav", "flex flex-wrap gap-spacing-md border-t border-border pt-spacing-xl");
        pager.setAttribute("aria-label", said.detailPager ?? "");
        for (const [link, word, rel] of [
            [view.prev, said.previous ?? "", "prev"],
            [view.next, said.next ?? "", "next"],
        ] as const) {
            if (link === null) continue;
            const item = part("pager-link");
            item.setAttribute("href", `${root}${link.href}`);
            item.setAttribute("rel", rel);
            const description = slot(item, "item-description");
            if (description !== null) description.textContent = word;
            const title = slot(item, "item-title");
            if (title !== null) title.textContent = link.name;
            pager.append(item);
        }
        host.append(pager);
    }
    return host;
};

const drawer = () => document.querySelector<HTMLDialogElement>("[data-detail-drawer]");
const wideDrawer = matchMedia("(min-width: 900px)");
/** The key of the action or rule the address opens, or null. */
const detailKey = () => {
    const key = decodeURIComponent(location.hash.slice(1));
    return /^[a-z]+\/[a-z0-9-]+$/.test(key) ? key : null;
};
/** The row of the page that opens a key. */
const rowFor = (key: string) =>
    [...document.querySelectorAll<HTMLAnchorElement>("main a[href*='#']")].find((link) => link.hash !== "" && decodeURIComponent(link.hash.slice(1)) === key) ?? null;
let shownKey: string | null = null;
let returnTo: HTMLElement | null = null;
let switching = false;
let drawing = 0;
/** Opens the dialog in the way the screen wants: beside the page on a wide screen, over it on a narrow one. */
const showDrawer = (dialog: HTMLDialogElement) => {
    if (wideDrawer.matches) dialog.show();
    else dialog.showModal();
    document.body.dataset.drawer = "open";
    for (const rail of document.querySelectorAll<HTMLElement>("aside[data-contents]")) rail.hidden = true;
};
const markRow = (key: string | null) => {
    for (const link of document.querySelectorAll<HTMLElement>("main a[aria-current='true']")) link.removeAttribute("aria-current");
    if (key !== null) rowFor(key)?.setAttribute("aria-current", "true");
};
const openDetail = async (key: string) => {
    const dialog = drawer();
    if (dialog === null) return;
    const title = dialog.querySelector<HTMLElement>("#detail-title");
    const noun = dialog.querySelector<HTMLElement>("[data-detail-noun]");
    const code = dialog.querySelector<HTMLElement>("[data-detail-code]");
    const body = dialog.querySelector<HTMLElement>("[data-detail-body]");
    const said = strings();
    const first = !dialog.open;
    if (first) {
        returnTo ??= rowFor(key) ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
        showDrawer(dialog);
    }
    shownKey = key;
    markRow(key);
    const row = rowFor(key);
    if (title !== null) title.textContent = row?.querySelector('[data-slot="item-title"]')?.textContent ?? "";
    code?.replaceChildren();
    if (noun !== null) noun.textContent = "";
    body?.replaceChildren(el("p", "text-sm text-muted-foreground", said.loading ?? "", "app"));
    title?.focus();
    const mine = ++drawing;
    try {
        const [view, box] = await Promise.all([loadFile<NodeView>(`${root}${detailOf(key)}`), loadPieces()]);
        if (mine !== drawing) return;
        template = box;
        if (title !== null) title.textContent = view.name;
        if (noun !== null) noun.textContent = view.noun.one === "" ? "" : `${view.noun.one[0]?.toUpperCase() ?? ""}${view.noun.one.slice(1)}`;
        if (view.code !== null && code !== null) {
            const tag = part("code");
            tag.textContent = view.code;
            code.append(tag);
        }
        body?.replaceChildren(draw(view, said));
        if (body !== null) body.scrollTop = 0;
    } catch {
        if (mine === drawing) body?.replaceChildren(el("p", "text-sm text-muted-foreground", said.failed ?? "", "app"));
    }
};
const closeDetail = () => {
    const dialog = drawer();
    if (dialog?.open === true) dialog.close();
};
/** Shows what the address asks for: the drawer of a key, or no drawer. */
const syncDetail = () => {
    // The router may say the address changed before it says the page did: the root is read from the page shown.
    root = document.body.dataset.root ?? "./";
    const key = detailKey();
    if (key === null) closeDetail();
    else if (key !== shownKey || drawer()?.open !== true) void openDetail(key);
};
const bindDrawer = () => {
    const dialog = drawer();
    if (dialog === null || dialog.dataset.bound !== undefined) return;
    dialog.dataset.bound = "true";
    dialog.querySelector("[data-detail-close]")?.addEventListener("click", closeDetail);
    // A click on the backdrop of the modal sheet closes it.
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeDetail();
    });
    dialog.addEventListener("close", () => {
        if (switching) return;
        delete document.body.dataset.drawer;
        for (const rail of document.querySelectorAll<HTMLElement>("aside[data-contents]")) rail.hidden = false;
        const key = shownKey;
        shownKey = null;
        drawing += 1;
        markRow(null);
        if (detailKey() !== null) history.replaceState(history.state, "", `${location.pathname}${location.search}`);
        const back = (key === null ? null : rowFor(key)) ?? returnTo;
        returnTo = null;
        back?.focus();
    });
};
// A box of a view says what it is and what its record says in the same drawer, when the page has one.
window.addEventListener("view:note", (event) => {
    const dialog = drawer();
    if (dialog === null) return;
    const note = (event as CustomEvent<{ noun: string; title: string; body: string | null }>).detail;
    bindDrawer();
    const first = !dialog.open;
    if (first) {
        returnTo ??= document.activeElement instanceof HTMLElement ? document.activeElement : null;
        showDrawer(dialog);
    }
    shownKey = null;
    drawing += 1;
    const title = dialog.querySelector<HTMLElement>("#detail-title");
    if (title !== null) title.textContent = note.title;
    const noun = dialog.querySelector<HTMLElement>("[data-detail-noun]");
    if (noun !== null) noun.textContent = note.noun;
    dialog.querySelector<HTMLElement>("[data-detail-code]")?.replaceChildren();
    const body = dialog.querySelector<HTMLElement>("[data-detail-body]");
    body?.replaceChildren(...(note.body === null ? [] : [el("p", "text-sm", note.body, "agent")]));
});
// The drawer beside the page has no Escape of its own (it is not modal): Escape closes it, unless a modal is over it.
document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const dialog = drawer();
    if (dialog?.open !== true || dialog.matches(":modal") || palette?.open === true) return;
    event.preventDefault();
    closeDetail();
});
// A screen that crosses 900 pixels with the drawer open shows it the other way.
wideDrawer.addEventListener("change", () => {
    const dialog = drawer();
    if (dialog?.open !== true) return;
    switching = true;
    dialog.close();
    switching = false;
    showDrawer(dialog);
});
// A link to an action or a rule of this page opens the drawer and puts its key in the address. The view transition
// router takes a link to the same page without a hashchange, so the click is taken first and the address set by hand.
addEventListener(
    "click",
    (event: MouseEvent) => {
        if (drawer() === null || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>("a[href]");
        if (link === null || link === undefined || link.hash === "") return;
        const target = new URL(link.href, location.href);
        if (target.pathname !== location.pathname || target.search !== location.search) return;
        const key = decodeURIComponent(target.hash.slice(1));
        if (!/^[a-z]+\/[a-z0-9-]+$/.test(key)) return;
        event.preventDefault();
        event.stopPropagation();
        if (!(drawer()?.open ?? false)) returnTo = link;
        history.pushState(history.state, "", `${location.pathname}${location.search}#${encodeURI(key)}`);
        syncDetail();
    },
    true,
);
addEventListener("hashchange", syncDetail);
addEventListener("popstate", syncDetail);

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
    shownKey = null;
    returnTo = null;
    bindDrawer();
    syncDetail();
    void recover();
};
document.addEventListener("astro:page-load", start);
