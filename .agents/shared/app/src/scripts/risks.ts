// The Risks page's own script: the filter by severity and by capability. What the reader picks is kept in the address
// (`?severity=&capability=`), so a link shows what its sender saw; a risk's own anchor (`#risk-<rank>`) is left alone.
// No framework.

const names = ["severity", "capability"] as const;

const apply = () => {
    const form = document.querySelector<HTMLFormElement>("[data-risk-filter]");
    if (form === null) return;
    const value = (name: string) => (form.elements.namedItem(name) as HTMLSelectElement | null)?.value ?? "";
    const severity = value("severity");
    const capability = value("capability");
    const rows = [...document.querySelectorAll<HTMLElement>("[data-risk-row]")];
    let shown = 0;
    for (const row of rows) {
        const visible = (severity === "" || row.dataset.severity === severity) && (capability === "" || (row.dataset.capabilities ?? "").includes(` ${capability} `));
        row.hidden = !visible;
        if (visible) shown += 1;
    }
    const empty = document.querySelector<HTMLElement>("[data-risk-empty]");
    if (empty !== null) empty.hidden = shown > 0;
    const count = document.querySelector<HTMLElement>("[data-risk-count]");
    // The whole count is the page's own fact; the line says how many are left only while a filter is set.
    if (count !== null) count.textContent = severity === "" && capability === "" ? "" : `${count.dataset.shown ?? ""} ${shown} ${count.dataset.of ?? ""} ${rows.length} ${count.dataset.noun ?? ""}`;
    const params = new URLSearchParams();
    for (const name of names) if (value(name) !== "") params.set(name, value(name));
    const query = params.toString();
    history.replaceState(history.state, "", `${location.pathname}${query === "" ? "" : `?${query}`}${location.hash}`);
};

const start = () => {
    const form = document.querySelector<HTMLFormElement>("[data-risk-filter]");
    if (form === null || form.dataset.bound !== undefined) return;
    form.dataset.bound = "true";
    const params = new URLSearchParams(location.search);
    for (const name of names) {
        const select = form.elements.namedItem(name) as HTMLSelectElement | null;
        const wanted = params.get(name);
        if (select !== null && wanted !== null && [...select.options].some((option) => option.value === wanted)) select.value = wanted;
    }
    form.addEventListener("change", apply);
    form.addEventListener("reset", () => setTimeout(apply, 0));
    form.addEventListener("submit", (event) => event.preventDefault());
    apply();
};

document.addEventListener("astro:page-load", start);

export {};
