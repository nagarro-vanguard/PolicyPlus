// The filter of the list of journeys: words, an area, and two plain checks (changes in the new way, something left out
// on purpose). What the reader picks is kept in the address (`?q=&area=&changes=1&dropped=1`), so a link shows what its
// sender saw. An area with no journey left hides; the drops follow the area. No framework, no count: the words say
// whether anything matches.

const apply = () => {
    const form = document.querySelector<HTMLFormElement>("[data-journey-filter]");
    if (form === null) return;
    const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
    const words = (field("q")?.value ?? "").toLowerCase().split(/\s+/).filter((word) => word !== "");
    const area = field("area")?.value ?? "";
    const changes = (field("changes") as HTMLInputElement | null)?.checked ?? false;
    const dropped = (field("dropped") as HTMLInputElement | null)?.checked ?? false;
    let any = false;
    for (const row of document.querySelectorAll<HTMLElement>("[data-journey-row]")) {
        const shown =
            (area === "" || row.dataset.area === area) &&
            (!changes || row.dataset.changes === "1") &&
            (!dropped || row.dataset.dropped === "1") &&
            words.every((word) => (row.dataset.text ?? "").includes(word));
        row.hidden = !shown;
        any ||= shown;
    }
    for (const block of document.querySelectorAll<HTMLElement>("[data-journey-capability], [data-journey-group]"))
        block.hidden = block.querySelector("[data-journey-row]:not([hidden])") === null;
    for (const drop of document.querySelectorAll<HTMLElement>("[data-drop]")) drop.hidden = area !== "" && drop.dataset.area !== area;
    const status = document.querySelector<HTMLElement>("[data-journey-status]");
    const filtered = words.length > 0 || area !== "" || changes || dropped;
    if (status !== null) status.textContent = !filtered ? "" : any ? (status.dataset.showing ?? "") : (status.dataset.none ?? "");
    const params = new URLSearchParams();
    if (words.length > 0) params.set("q", field("q")?.value ?? "");
    if (area !== "") params.set("area", area);
    if (changes) params.set("changes", "1");
    if (dropped) params.set("dropped", "1");
    const query = params.toString();
    history.replaceState(history.state, "", `${location.pathname}${query === "" ? "" : `?${query}`}${location.hash}`);
    dispatchEvent(new Event("filters"));
};

const start = () => {
    const form = document.querySelector<HTMLFormElement>("[data-journey-filter]");
    if (form === null || form.dataset.bound !== undefined) return;
    form.dataset.bound = "true";
    const params = new URLSearchParams(location.search);
    const set = (name: string, value: string | null) => {
        const input = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
        if (input === null || value === null) return;
        if (input instanceof HTMLInputElement && input.type === "checkbox") input.checked = value === "1";
        else if (input instanceof HTMLSelectElement) {
            if ([...input.options].some((option) => option.value === value)) input.value = value;
        } else input.value = value;
    };
    for (const name of ["q", "area", "changes", "dropped"]) set(name, params.get(name));
    form.addEventListener("input", apply);
    form.addEventListener("change", apply);
    form.addEventListener("submit", (event) => event.preventDefault());
    apply();
};

document.addEventListener("astro:page-load", start);
export {};
