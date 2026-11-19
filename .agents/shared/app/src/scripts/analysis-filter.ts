// A list of rows with a filter, a scope, or both. The filter: words typed in the box (every word must be in the row) and chips (a
// row must match one chip of each group that has any). The scope: a link from an action page (`?action=`) shows only the rows
// that action passes, with a line that says so and a control to show them all. The rows keep their own markup; only `hidden`
// changes. The choice lives in the address, so a link shows what its sender saw, and the number of rows shown is announced.
import { fresh, onPage } from "./page";

const key = (group: string) => `data-g-${group}`;

type Scope = Record<string, { i: number; t: string; n: number }>;

const start = (list: HTMLElement) => {
    const id = list.dataset.aList ?? "";
    const rows = [...list.querySelectorAll<HTMLElement>("[data-row]")];
    const host = document.querySelector<HTMLElement>(`[data-a-filter="${id}"]`);
    const input = host?.querySelector<HTMLInputElement>("[data-a-q]") ?? null;
    const clear = host?.querySelector<HTMLButtonElement>("[data-a-clear]") ?? null;
    const status = host?.querySelector<HTMLElement>("[data-a-status]") ?? null;
    const empty = document.querySelector<HTMLElement>(`[data-a-empty="${id}"]`);
    const groups = host === null || host === undefined ? [] : [...host.querySelectorAll<HTMLElement>("[data-a-group]")];
    const noun = host?.dataset.noun ?? "rows";
    const chosen = new Map<string, Set<string>>(groups.map((group) => [group.dataset.aGroup ?? "", new Set<string>()]));
    const note = document.querySelector<HTMLElement>(`[data-a-scope="${id}"]`);
    let scoped: number | undefined;
    let scopedName = "";

    const apply = () => {
        const words = (input?.value ?? "").toLowerCase().split(/\s+/).filter((word) => word !== "");
        let shown = 0;
        let inScope = 0;
        for (const row of rows) {
            let fits = scoped === undefined || (row.dataset.a ?? "").split(",").includes(String(scoped));
            if (fits) inScope += 1;
            const text = row.dataset.search ?? "";
            fits = fits && words.every((word) => text.includes(word));
            for (const [group, values] of chosen) if (fits && values.size > 0) fits = values.has(row.getAttribute(key(group)) ?? "");
            row.hidden = !fits;
            if (fits) shown += 1;
        }
        const active = words.length > 0 || [...chosen.values()].some((values) => values.size > 0);
        if (clear !== null) clear.hidden = !active;
        if (status !== null) status.textContent = active ? `${shown} of ${inScope} ${noun}` : scoped !== undefined ? "" : `${rows.length} ${noun}`;
        if (empty !== null) empty.hidden = shown > 0;
        list.hidden = shown === 0;
        if (note !== null) {
            note.hidden = scoped === undefined;
            const text = note.querySelector<HTMLElement>("[data-a-scope-text]");
            if (text !== null && scoped !== undefined) text.textContent = `${scopedName} `;
        }
        const url = new URL(location.href);
        for (const name of ["q", "action", ...chosen.keys()]) url.searchParams.delete(name);
        if ((input?.value ?? "") !== "") url.searchParams.set("q", input?.value ?? "");
        for (const [group, values] of chosen) if (values.size > 0) url.searchParams.set(group, [...values].join(","));
        if (scoped !== undefined) url.searchParams.set("action", scopeSlug);
        try {
            history.replaceState(null, "", url);
        } catch {
            // A page opened from a file cannot rewrite its address; the filter still works.
        }
    };

    let scopeSlug = "";
    const params = new URLSearchParams(location.search);
    const wanted = params.get("action");
    if (note !== null && wanted !== null) {
        let data: Scope = {};
        try {
            data = JSON.parse(note.querySelector("[data-a-scope-data]")?.textContent ?? "{}") as Scope;
        } catch {
            data = {};
        }
        const found = data[wanted];
        if (found !== undefined) {
            scoped = found.i;
            scopeSlug = wanted;
            scopedName = `Showing the ${found.n} ${found.n === 1 ? "rule" : "rules"} that “${found.t}” passes.`;
        }
    }
    note?.querySelector("[data-a-scope-clear]")?.addEventListener("click", () => {
        scoped = undefined;
        apply();
    });

    input?.addEventListener("input", () => apply());
    for (const group of groups) {
        const name = group.dataset.aGroup ?? "";
        for (const chip of group.querySelectorAll<HTMLButtonElement>("button[data-value]")) {
            chip.addEventListener("click", () => {
                const values = chosen.get(name);
                const value = chip.dataset.value ?? "";
                if (values === undefined) return;
                if (values.has(value)) values.delete(value);
                else values.add(value);
                const on = values.has(value);
                chip.setAttribute("aria-pressed", String(on));
                chip.classList.toggle("on", on);
                apply();
            });
        }
    }
    clear?.addEventListener("click", () => {
        if (input !== null) input.value = "";
        for (const values of chosen.values()) values.clear();
        for (const chip of host?.querySelectorAll<HTMLButtonElement>("button[data-value]") ?? []) {
            chip.setAttribute("aria-pressed", "false");
            chip.classList.remove("on");
        }
        apply();
        input?.focus();
    });

    // Read the address once: a link may carry a filter.
    if (input !== null && params.get("q") !== null) input.value = params.get("q") ?? "";
    for (const group of groups) {
        const name = group.dataset.aGroup ?? "";
        const values = new Set((params.get(name) ?? "").split(",").filter((value) => value !== ""));
        for (const chip of group.querySelectorAll<HTMLButtonElement>("button[data-value]")) {
            if (!values.has(chip.dataset.value ?? "")) continue;
            chosen.get(name)?.add(chip.dataset.value ?? "");
            chip.setAttribute("aria-pressed", "true");
            chip.classList.add("on");
        }
    }
    apply();
};

onPage(() => {
    for (const list of document.querySelectorAll<HTMLElement>("[data-a-list]")) if (fresh(list)) start(list);
});
