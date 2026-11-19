// The shell of every page: the narrow-screen menu, the shortcut hint, the sidebar's current item and the command palette.
// The sidebar itself is plain links written at build time (layouts/Page.astro); the palette reads `data/index.json`, so the
// shell never grows with the code analysed. No framework.
import { parseQuery, search } from "../lib/palette-match";
import type { Entry } from "../lib/palette-match";
import type { AppIndex, CapSlice, IndexItem } from "../lib/slice-types";
import { navigate } from "astro:transitions/client";
import { fetchJson } from "./data";

/** The way up to the site's root from the page being shown; it changes with every navigation. */
let root = document.body.dataset.root ?? "./";
const say = (text: string) => {
    const box = document.getElementById("announce");
    if (box !== null) box.textContent = text;
};
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = "") => {
    const node = document.createElement(tag);
    if (className !== "") node.className = className;
    if (text !== "") node.textContent = text;
    return node;
};

/* ---------- the index ---------- */
type Model = {
    index: AppIndex;
    byId: Map<string, IndexItem>;
};
const modelOf = (index: AppIndex): Model => ({ index, byId: new Map(index.items.map((item) => [item.id, item] as const)) });
let model: Model | undefined;
let planLoaded: Promise<void> | undefined;
let current = document.body.dataset.node ?? "";

const labels: Record<string, string> = {
    system: "System",
    area: "Area",
    capability: "Capability",
    screen: "Screen",
    risk: "Risk",
    journey: "Journey",
    gate: "Confirmation",
    phase: "Phase",
    epic: "Epic",
    story: "Story",
    page: "Page",
    rule: "Rule",
    action: "Command",
};
const hrefOf = (item: IndexItem) => {
    const parent = item.parent ?? "";
    const withCap = item.kind === "screen" && parent.startsWith("capability:") ? `&c=${parent.slice("capability:".length)}` : "";
    return `${root}${item.href}${withCap}`;
};

/**
 * Fetches the plan's items the first time something needs them and adds them to the model, so stories and epics can be found.
 * Without a plan the file is empty and nothing changes.
 * @returns when the items are in
 */
const ensurePlan = () => {
    planLoaded ??= (async () => {
        const [index, plan] = await Promise.all([ensureIndex(), fetchJson<{ items: IndexItem[] }>("data/plan.json")]);
        model = modelOf({ ...index, items: [...index.items, ...plan.items] });
    })();
    return planLoaded;
};

/* ---------- the shortcut hint, and the menu on narrow screens ---------- */
const mac = /Mac|iPhone|iPad/.test(navigator.platform);
let menuButton: HTMLButtonElement | null = null;
let sidebar: HTMLElement | null = null;
const closeMenu = () => {
    if (sidebar !== null) sidebar.dataset.open = "false";
    menuButton?.setAttribute("aria-expanded", "false");
};
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sidebar?.dataset.open === "true") {
        closeMenu();
        menuButton?.focus();
    }
});

/* ---------- the command palette ---------- */
let dialog: HTMLDialogElement | null = null;
let input: HTMLInputElement | null = null;
let list: HTMLElement | null = null;
type Row = { entry: Entry; href?: string; run?: () => void; marks: readonly number[] };
let rows: Row[] = [];
let active = 0;
let busy = "";
let ruleEntries: (Entry & { href: string })[] | undefined;
let rulesLoading: Promise<void> | undefined;

const commands: (Entry & { run: () => void })[] = [
    {
        id: "command:copy-brief",
        kind: "action",
        headline: "Copy brief",
        summary: "Copy a ready-made brief for this page's scope",
        run: () => document.dispatchEvent(new CustomEvent("app:copy-brief")),
    },
    {
        id: "command:toggle-theme",
        kind: "action",
        headline: "Toggle theme",
        summary: "Switch between light and dark",
        run: () => {
            const root = document.documentElement;
            const dark = root.dataset.theme === undefined ? matchMedia("(prefers-color-scheme: dark)").matches : root.dataset.theme === "dark";
            document.querySelector<HTMLButtonElement>(`[data-theme-choice="${dark ? "light" : "dark"}"]`)?.click();
        },
    },
];

const loadRules = () => {
    rulesLoading ??= (async () => {
        const index = await ensureIndex();
        const caps = index.items.filter((item) => item.kind === "capability");
        // The slices are the rules; above forty capabilities only the one being read is searched, so a palette never pulls the whole system.
        const wanted = caps.length <= 40 ? caps : caps.filter((item) => item.id === current || item.id === `capability:${new URLSearchParams(location.hash.slice(1)).get("c") ?? ""}`);
        const slices = await Promise.all(wanted.map((item) => fetchJson<CapSlice>(`data/cap/${item.id.slice("capability:".length)}.json`)));
        // A rule opens on the screen whose action passes it, where it is read in its list; a rule no screen reaches opens its capability.
        ruleEntries = slices.flatMap((slice) => {
            const screenOf = new Map<string, string>();
            for (const action of slice.actions) {
                if (action.screen === "") continue;
                for (const rule of action.rules) if (!screenOf.has(rule)) screenOf.set(rule, action.screen);
            }
            return slice.rules.map((rule) => {
                const screen = screenOf.get(rule.id);
                return {
                    id: `rule:${slice.slug}:${rule.id}`,
                    kind: "rule",
                    headline: rule.headline,
                    summary: rule.detail,
                    tags: [rule.gates ? "refuses" : "plain"],
                    href: screen === undefined ? `capability/${slice.slug}.html` : `screen.html#${new URLSearchParams({ s: screen, c: slice.slug, rule: rule.id }).toString()}`,
                };
            });
        });
    })();
    return rulesLoading;
};

const render = () => {
    const listNode = list;
    if (listNode === null || input === null) return;
    listNode.replaceChildren();
    if (rows.length === 0) {
        const none = el("li", "palette-none", busy !== "" ? busy : input.value.trim() === "" ? "Nothing to show." : "Nothing matches. Try screen:, rule: or risk:high.");
        none.setAttribute("role", "presentation");
        listNode.append(none);
        input.removeAttribute("aria-activedescendant");
        return;
    }
    rows.forEach((row, at) => {
        const li = el("li", "palette-row");
        li.id = `palette-row-${at}`;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(at === active));
        const kind = el("span", "palette-kind", labels[row.entry.kind] ?? row.entry.kind);
        const name = el("span", "palette-name");
        const marks = new Set(row.marks);
        let run = "";
        let on = false;
        for (const [i, letter] of [...row.entry.headline].entries()) {
            if (marks.has(i) !== on) {
                if (run !== "") name.append(on ? Object.assign(el("mark"), { textContent: run }) : document.createTextNode(run));
                run = "";
                on = marks.has(i);
            }
            run += letter;
        }
        if (run !== "") name.append(on ? Object.assign(el("mark"), { textContent: run }) : document.createTextNode(run));
        li.append(kind, name);
        const sub = row.entry.kind === "rule" ? "" : (row.entry.summary ?? "");
        if (sub !== "") li.append(el("span", "palette-sub", sub));
        li.addEventListener("click", () => choose(row));
        li.addEventListener("pointermove", () => {
            if (active !== at) {
                active = at;
                mark();
            }
        });
        listNode.append(li);
    });
    input.setAttribute("aria-activedescendant", `palette-row-${active}`);
};
const mark = () => {
    list?.querySelectorAll("[role=option]").forEach((node, at) => node.setAttribute("aria-selected", String(at === active)));
    input?.setAttribute("aria-activedescendant", `palette-row-${active}`);
    document.getElementById(`palette-row-${active}`)?.scrollIntoView({ block: "nearest" });
};
const choose = (row: Row) => {
    dialog?.close();
    if (row.run !== undefined) {
        row.run();
        return;
    }
    if (row.href === undefined) return;
    const target = new URL(`${root}${row.href}`, location.href);
    if (target.pathname === location.pathname && target.hash !== "") location.hash = target.hash;
    else void navigate(target.href);
};
const ensureIndex = async (): Promise<AppIndex> => {
    if (model !== undefined) return model.index;
    const index = await fetchJson<AppIndex>("data/index.json");
    model = modelOf(index);
    return index;
};
let sequence = 0;
const update = async () => {
    if (input === null) return;
    const mine = ++sequence;
    const typed = input.value;
    const query = parseQuery(typed);
    const index = await ensureIndex();
    if (mine !== sequence) return;
    let pool: (Entry & { href?: string; run?: () => void })[] = [...index.items.map((item) => ({ id: item.id, kind: item.kind, headline: item.headline, summary: item.summary, tags: item.tags, href: hrefOf(item).slice(root.length) })), ...commands];
    if (query.kind === "rule") {
        if (ruleEntries === undefined) {
            busy = "Loading the rules of every capability…";
            rows = [];
            render();
            say("Loading rules");
        }
        await loadRules();
        busy = "";
        if (mine !== sequence) return;
        pool = ruleEntries ?? [];
    }
    if (typed.trim() === "") {
        const first = pool.filter((entry) => entry.kind === "action");
        const caps = pool.filter((entry) => entry.kind === "capability").slice(0, 8);
        rows = [...caps, ...first].map((entry) => ({ entry, href: entry.href, run: (entry as { run?: () => void }).run, marks: [] }));
    } else {
        const kindAction = query.kind === "" || query.kind === "action";
        const found = search(pool.filter((entry) => kindAction || entry.kind !== "action"), query, 12);
        const byId = new Map(pool.map((entry) => [entry.id, entry] as const));
        rows = found.map(({ entry, marks }) => {
            const full = byId.get(entry.id);
            return { entry, href: full?.href, run: full?.run, marks };
        });
    }
    active = 0;
    render();
    say(`${rows.length} results`);
};
const openPalette = () => {
    if (dialog === null || dialog.open) return;
    dialog.showModal();
    if (input !== null) {
        input.value = "";
        input.focus();
    }
    void update();
    // Stories and epics are searchable too, once their file is in.
    void ensurePlan().then(() => {
        if (dialog?.open === true) void update();
    });
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
const bindInput = (element: HTMLInputElement) => {
    element.addEventListener("input", () => void update());
    element.addEventListener("keydown", (event) => {
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
};

/* ---------- each page: the parts of the shell that the router replaces, and the sidebar it keeps ---------- */
const start = () => {
    root = document.body.dataset.root ?? "./";
    current = document.body.dataset.node ?? "";
    sidebar = document.querySelector<HTMLElement>("[data-sidebar]");
    menuButton = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
    dialog = document.querySelector<HTMLDialogElement>("[data-palette]");
    input = document.getElementById("palette-input") as HTMLInputElement | null;
    list = document.getElementById("palette-list");
    const hint = document.querySelector("[data-kbd]");
    if (hint !== null && !mac) hint.textContent = "Ctrl K";
    // The sidebar is kept from the first page; its links are made for that page's depth, so each points at this page's root.
    const nav = document.body.dataset.nav ?? "";
    const exact = document.body.dataset.navExact === "true";
    for (const link of sidebar?.querySelectorAll<HTMLAnchorElement>("a[data-to]") ?? []) {
        link.setAttribute("href", `${root}${link.dataset.to ?? ""}`);
        if (link.dataset.navId !== undefined && link.dataset.navId === nav) link.setAttribute("aria-current", exact ? "page" : "true");
        else link.removeAttribute("aria-current");
    }
    closeMenu();
    if (menuButton !== null && menuButton.dataset.bound === undefined) {
        menuButton.dataset.bound = "true";
        menuButton.addEventListener("click", () => {
            const next = sidebar?.dataset.open !== "true";
            if (sidebar !== null) sidebar.dataset.open = String(next);
            menuButton?.setAttribute("aria-expanded", String(next));
            if (next) sidebar?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
        });
    }
    if (sidebar !== null && sidebar.dataset.bound === undefined) {
        sidebar.dataset.bound = "true";
        sidebar.addEventListener("click", (event) => {
            if ((event.target as HTMLElement).closest("a") !== null) closeMenu();
        });
    }
    const open = document.querySelector<HTMLElement>("[data-palette-open]");
    if (open !== null && open.dataset.bound === undefined) {
        open.dataset.bound = "true";
        open.addEventListener("click", openPalette);
    }
    if (input !== null && input.dataset.bound === undefined) {
        input.dataset.bound = "true";
        bindInput(input);
    }
    if (dialog !== null && dialog.dataset.bound === undefined) {
        dialog.dataset.bound = "true";
        const self = dialog;
        dialog.addEventListener("click", (event) => {
            if (event.target === self) self.close();
        });
    }
};
document.addEventListener("astro:page-load", start);
start();

/* ---------- what pages can tell the shell ---------- */
// The screen page names itself when its data is in: `app:node` carries the index id and the breadcrumb.
document.addEventListener("app:node", (event) => {
    const detail = (event as CustomEvent<{ id: string; capability?: string; trail?: { text: string; href?: string }[] }>).detail;
    current = detail.id;
    document.body.dataset.node = detail.id;
    const host = document.querySelector<HTMLElement>("[data-crumb]");
    if (detail.trail !== undefined && host !== null) {
        const steps = detail.trail.slice(0, -1);
        host.replaceChildren();
        steps.forEach((step, at) => {
            if (at > 0) host.append(el("span", "", " / "));
            if (step.href !== undefined) {
                const a = el("a", "", step.text);
                a.href = step.href;
                host.append(a);
            } else host.append(el("span", "", step.text));
        });
        host.hidden = steps.length === 0;
    }
});
