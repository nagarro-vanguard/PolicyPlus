// The Plan page's own script: the filters of the story list and the sheet a story opens in. What the reader picks is
// kept in the address (`?q=&phase=&epic=&domain=&kind=&cell=`), so a link shows what its sender saw; a story is opened
// at `#story=<n>`, so a link opens it and closing it takes the story out of the address. A link in the page (a matrix cell or
// column) sets a filter through the hash (`#cell=2.4`, `#domain=1`), which this script moves into the query; `#phase=3`
// opens that phase. No framework: the sheet is a native modal dialog, and each story's body is read when it is
// opened from `plan/story/<n>.html`, written at build time and read as a classic script (load.ts).

import { loadFile } from "./load";

const filters = ["q", "phase", "epic", "domain", "kind"] as const;
let cell = "";
let returnTo: HTMLElement | null = null;
/** The phases that were open before a filter opened others. */
let kept: Set<string> | null = null;

const strings = (): Record<string, string> => {
    const node = document.getElementById("copy-strings");
    return node === null ? {} : (JSON.parse(node.textContent ?? "{}") as Record<string, string>);
};
const form = () => document.querySelector<HTMLFormElement>("[data-plan-filter]");
const field = (name: string) => form()?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
const setField = (name: string, value: string) => {
    const input = field(name);
    if (input === null) return;
    if (input instanceof HTMLSelectElement && value !== "" && ![...input.options].some((option) => option.value === value)) return;
    input.value = value;
};

const apply = () => {
    if (form() === null) return;
    const words = (field("q")?.value ?? "").toLowerCase().split(/\s+/).filter((word) => word !== "");
    const phase = field("phase")?.value ?? "";
    const epic = field("epic")?.value ?? "";
    const domain = field("domain")?.value ?? "";
    const kind = field("kind")?.value ?? "";
    const chosen = cell === "" ? null : document.querySelector<HTMLElement>(`[data-matrix-cell="${cell}"]`);
    if (chosen === null) cell = "";
    const inCell = chosen === null ? null : new Set((chosen.dataset.stories ?? "").split(" ").filter((n) => n !== ""));
    const rows = [...document.querySelectorAll<HTMLElement>("[data-story-row]")];
    let shown = 0;
    for (const row of rows) {
        const visible =
            (phase === "" || row.dataset.phase === phase) &&
            (epic === "" || row.dataset.epic === epic) &&
            (kind === "" || row.dataset.kind === kind) &&
            (domain === "" || (row.dataset.domains ?? "").includes(` ${domain} `)) &&
            (inCell === null || inCell.has(row.dataset.n ?? "")) &&
            words.every((word) => (row.dataset.text ?? "").includes(word));
        row.hidden = !visible;
        if (visible) shown += 1;
    }
    const count = document.querySelector<HTMLElement>("[data-story-count]");
    for (const group of document.querySelectorAll<HTMLElement>("[data-epic-group]"))
        group.hidden = group.querySelector("[data-story-row]:not([hidden])") === null;
    const filtered = words.length > 0 || phase !== "" || epic !== "" || domain !== "" || kind !== "" || inCell !== null;
    // A filter opens the phases that hold a match and shuts the others away; clearing it puts the phases back as the reader had them.
    const cards = [...document.querySelectorAll<HTMLDetailsElement>("[data-phase-card]")];
    if (filtered && kept === null) kept = new Set(cards.filter((card) => card.open).map((card) => card.dataset.phase ?? ""));
    for (const card of cards) {
        const matches = card.querySelectorAll("[data-story-row]:not([hidden])").length;
        const total = card.querySelectorAll("[data-story-row]").length;
        const holder = card.closest<HTMLElement>("[data-phase-group]");
        if (holder !== null) holder.hidden = filtered && matches === 0;
        if (filtered) card.open = matches > 0;
        else if (kept !== null) card.open = kept.has(card.dataset.phase ?? "");
        const label = card.querySelector<HTMLElement>("[data-phase-count]");
        if (label !== null)
            label.textContent = filtered ? `${matches} ${count?.dataset.of ?? ""} ${total} ${label.dataset.noun ?? ""}` : `${total} ${label.dataset.noun ?? ""}`;
    }
    if (!filtered) kept = null;
    const empty = document.querySelector<HTMLElement>("[data-story-empty]");
    if (empty !== null) empty.hidden = shown > 0;
    // The whole count is said in the page's opening; the line says how many are left only while a filter is set.
    if (count !== null) count.textContent = filtered ? `${count.dataset.shown ?? ""} ${shown} ${count.dataset.of ?? ""} ${rows.length} ${count.dataset.noun ?? ""}` : "";
    const chip = document.querySelector<HTMLElement>("[data-cell-chip]");
    if (chip !== null) {
        chip.hidden = chosen === null;
        const badge = chip.querySelector<HTMLElement>("[data-written-by]");
        if (badge !== null) {
            badge.dataset.base ??= badge.textContent ?? "";
            badge.textContent = chosen === null ? badge.dataset.base : `${badge.dataset.base}: ${chosen.getAttribute("aria-label") ?? ""}`;
        }
    }
    for (const link of document.querySelectorAll<HTMLElement>("[data-matrix-cell]")) {
        if (link.dataset.matrixCell === cell) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
    }
    for (const link of document.querySelectorAll<HTMLElement>("[data-matrix-column]")) {
        if (cell === "" && link.dataset.matrixColumn === domain) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
    }
    const params = new URLSearchParams();
    for (const name of filters) {
        const value = field(name)?.value ?? "";
        if (value !== "") params.set(name, value);
    }
    if (cell !== "") params.set("cell", cell);
    const query = params.toString();
    history.replaceState(history.state, "", `${location.pathname}${query === "" ? "" : `?${query}`}${location.hash}`);
    // The Selects drawn for the filters read the values again.
    dispatchEvent(new Event("plan:filters"));
};

const sheet = () => document.querySelector<HTMLDialogElement>("[data-story-sheet]");
const wideSheet = matchMedia("(min-width: 900px)");

/** Opens the sheet the way the detail drawer of the other pages opens: beside the page on a wide screen, over it on a narrow one. */
const showSheet = (dialog: HTMLDialogElement) => {
    if (wideSheet.matches) dialog.show();
    else dialog.showModal();
    document.body.dataset.drawer = "open";
    for (const rail of document.querySelectorAll<HTMLElement>("aside[data-contents]")) rail.hidden = true;
};

/** Marks the story the sheet shows, so the list says which one was chosen. */
const markStory = (n: string | null) => {
    for (const link of document.querySelectorAll<HTMLElement>("[data-story-open][aria-current='true']")) link.removeAttribute("aria-current");
    if (n !== null) document.querySelector<HTMLElement>(`[data-story-open="${n}"]`)?.setAttribute("aria-current", "true");
};

let reading = 0;
const openStory = async (n: string) => {
    const dialog = sheet();
    const row = document.querySelector<HTMLElement>(`[data-story-open="${n}"]`);
    if (dialog === null || row === null) return;
    // The story may stand in a phase that is shut.
    const card = row.closest<HTMLDetailsElement>("[data-phase-card]");
    if (card !== null) card.open = true;
    const body = dialog.querySelector<HTMLElement>("[data-story-sheet-body]");
    const title = dialog.querySelector<HTMLElement>("#story-sheet-title");
    if (title !== null) title.textContent = row.querySelector('[data-slot="item-title"]')?.textContent ?? "";
    const said = strings();
    body?.replaceChildren(Object.assign(document.createElement("p"), { className: "text-sm text-muted-foreground", textContent: said.loading ?? "" }));
    if (!dialog.open) {
        returnTo = row;
        showSheet(dialog);
    }
    markStory(n);
    dialog.querySelector<HTMLElement>("[data-story-close]")?.focus();
    const mine = ++reading;
    try {
        const html = await loadFile<string>(`${document.body.dataset.root ?? "./"}plan/story/${n}.html`);
        if (mine !== reading || body === null) return;
        body.innerHTML = html;
        body.scrollTop = 0;
    } catch {
        if (mine === reading) body?.replaceChildren(Object.assign(document.createElement("p"), { className: "text-sm text-muted-foreground", textContent: said.failed ?? "" }));
    }
};

const closeStory = () => {
    const dialog = sheet();
    if (dialog?.open === true) dialog.close();
};

/** Reads the hash: a story to open, or a filter a link in the page asked for. */
const onHash = () => {
    if (form() === null) return;
    const params = new URLSearchParams(location.hash.slice(1));
    const story = params.get("story");
    if (story !== null && /^\d+$/.test(story)) {
        void openStory(story);
        return;
    }
    closeStory();
    const asked = ["cell", "domain", "phase"].find((name) => params.has(name));
    if (asked === undefined) return;
    const value = params.get(asked) ?? "";
    if (asked === "phase") {
        // A link to a phase opens it where it stands; it filters nothing.
        const card = document.querySelector<HTMLDetailsElement>(`[data-phase-card][data-phase="${value}"]`);
        history.replaceState(history.state, "", `${location.pathname}${location.search}`);
        if (card !== null) {
            card.open = true;
            card.scrollIntoView({ block: "start" });
        }
        return;
    }
    if (asked === "cell") {
        for (const name of filters) setField(name, "");
        cell = value;
    } else {
        cell = "";
        setField(asked, value);
    }
    history.replaceState(history.state, "", `${location.pathname}${location.search}`);
    apply();
    document.getElementById("phases")?.scrollIntoView({ block: "start" });
};

const start = () => {
    const filter = form();
    if (filter === null || filter.dataset.bound !== undefined) return;
    filter.dataset.bound = "true";
    const params = new URLSearchParams(location.search);
    for (const name of filters) setField(name, params.get(name) ?? "");
    cell = params.get("cell") ?? "";
    filter.addEventListener("input", apply);
    filter.addEventListener("change", () => {
        cell = "";
        apply();
    });
    filter.addEventListener("submit", (event) => event.preventDefault());
    document.querySelector("[data-plan-clear]")?.addEventListener("click", () => {
        filter.reset();
        cell = "";
        apply();
    });
    const dialog = sheet();
    dialog?.querySelector("[data-story-close]")?.addEventListener("click", closeStory);
    dialog?.addEventListener("click", (event) => {
        if (event.target === dialog) closeStory();
    });
    dialog?.addEventListener("close", () => {
        delete document.body.dataset.drawer;
        for (const rail of document.querySelectorAll<HTMLElement>("aside[data-contents]")) rail.hidden = false;
        markStory(null);
        if (location.hash.startsWith("#story=")) history.replaceState(history.state, "", `${location.pathname}${location.search}`);
        returnTo?.focus();
        returnTo = null;
    });
    apply();
    onHash();
};

// The page's own links to `#story=`, `#cell=`, `#domain=` and `#phase=` are handled here: the view transition router
// takes a same-page link without a hashchange, so the click is taken first and the address is set by hand.
addEventListener(
    "click",
    (event: MouseEvent) => {
        if (form() === null || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
        const hash = link?.getAttribute("href") ?? "";
        if (!/^#(?:story|cell|domain|phase)=[\d.]+$/.test(hash)) return;
        event.preventDefault();
        event.stopPropagation();
        history.pushState(history.state, "", `${location.pathname}${location.search}${hash}`);
        onHash();
    },
    true,
);
addEventListener("hashchange", onHash);
addEventListener("popstate", onHash);
document.addEventListener("astro:page-load", start);
