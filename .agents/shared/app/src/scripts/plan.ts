// The Plan page's own script: the filters of the story list and the sheet a story opens in. What the reader picks is
// kept in the address (`?q=&phase=&epic=&domain=&kind=&cell=`), so a link shows what its sender saw; a story is opened
// at `#story=<n>`, so a link opens it and closing it takes the story out of the address. A link in the page (a phase's "List its stories",
// a matrix cell or column) sets a filter through the hash (`#phase=3`, `#cell=2.4`, `#domain=1`), which this script
// moves into the query. No framework: the sheet is a native modal dialog, and each story's body is read when it is
// opened from `plan/story/<n>.html`, written at build time and read as a classic script (load.ts).

import { loadFile } from "./load";

const filters = ["q", "phase", "epic", "domain", "kind"] as const;
let cell = "";
let returnTo: HTMLElement | null = null;

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
    for (const group of document.querySelectorAll<HTMLElement>("[data-phase-group]"))
        group.hidden = group.querySelector("[data-story-row]:not([hidden])") === null;
    const empty = document.querySelector<HTMLElement>("[data-story-empty]");
    if (empty !== null) empty.hidden = shown > 0;
    const count = document.querySelector<HTMLElement>("[data-story-count]");
    // The whole count is said in the page's opening; the line says how many are left only while a filter is set.
    const filtered = words.length > 0 || phase !== "" || epic !== "" || domain !== "" || kind !== "" || inCell !== null;
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
};

const sheet = () => document.querySelector<HTMLDialogElement>("[data-story-sheet]");

let reading = 0;
const openStory = async (n: string) => {
    const dialog = sheet();
    const row = document.querySelector<HTMLElement>(`[data-story-open="${n}"]`);
    if (dialog === null || row === null) return;
    const body = dialog.querySelector<HTMLElement>("[data-story-sheet-body]");
    const title = dialog.querySelector<HTMLElement>("#story-sheet-title");
    if (title !== null) title.textContent = row.querySelector('[data-slot="item-title"]')?.textContent ?? "";
    const said = strings();
    body?.replaceChildren(Object.assign(document.createElement("p"), { className: "text-sm text-muted-foreground", textContent: said.loading ?? "" }));
    if (!dialog.open) {
        returnTo = row;
        dialog.showModal();
    }
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
    if (asked === "cell") {
        for (const name of filters) setField(name, "");
        cell = value;
    } else {
        cell = "";
        setField(asked, value);
    }
    history.replaceState(history.state, "", `${location.pathname}${location.search}`);
    apply();
    document.getElementById("stories")?.scrollIntoView({ block: "start" });
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
