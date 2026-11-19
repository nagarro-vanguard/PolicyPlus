// A filter over a long list on a page: the input `[data-filter-input="<id>"]` keeps the rows `[data-filter-row]` inside
// `#<id>` whose words hold every word typed, and shows `[data-filter-empty]` there when none does. No framework; set
// up again each time the router shows a page.

const words = (text: string) =>
    text
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word !== "");

const bind = () => {
    for (const input of document.querySelectorAll<HTMLInputElement>("[data-filter-input]")) {
        if (input.dataset.bound === "true") continue;
        input.dataset.bound = "true";
        const list = document.getElementById(input.dataset.filterInput ?? "");
        if (list === null) continue;
        const rows = [...list.querySelectorAll<HTMLElement>("[data-filter-row]")];
        const texts = rows.map((row) => (row.textContent ?? "").toLowerCase());
        const empty = list.querySelector<HTMLElement>("[data-filter-empty]");
        input.addEventListener("input", () => {
            const wanted = words(input.value);
            let shown = 0;
            rows.forEach((row, at) => {
                const keep = wanted.every((word) => texts[at]?.includes(word) ?? false);
                row.hidden = !keep;
                if (keep) shown += 1;
            });
            if (empty !== null) empty.hidden = shown > 0;
        });
    }
};

document.addEventListener("astro:page-load", bind);
bind();

export {};
