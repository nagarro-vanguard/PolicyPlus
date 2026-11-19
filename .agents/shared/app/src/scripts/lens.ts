// The journey page's lens: today, modernized or side by side. The choice is kept in the address (`#lens=today`), so a link shows what
// its sender saw; the page opens side by side when a modernized way exists. A fold named in the address (`#data`) opens too.
import { lensOf } from "../lib/journey-lens";
import type { Lens } from "../lib/journey-lens";
import { fresh, onPage } from "./page";

onPage(() => {
    const root = document.querySelector<HTMLElement>("[data-lens-root]");
    const bar = document.querySelector<HTMLElement>("[data-lens-bar]");
    if (root !== null && bar !== null && fresh(bar)) {
        const buttons = [...bar.querySelectorAll<HTMLButtonElement>("[data-lens-set]")];
        const show = (lens: Lens) => {
            root.dataset.lens = lens;
            for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.lensSet === lens));
        };
        show(lensOf(location.hash, true));
        for (const button of buttons) {
            button.addEventListener("click", () => {
                const lens = (button.dataset.lensSet ?? "both") as Lens;
                show(lens);
                try {
                    history.replaceState(null, "", lens === "both" ? location.pathname + location.search : `${location.pathname}${location.search}#lens=${lens}`);
                } catch {
                    // A page opened from a file cannot rewrite its address; the lens still works.
                }
            });
        }
        addEventListener("hashchange", () => {
            if (document.body.contains(root)) show(lensOf(location.hash, true));
        });
    }
    const id = location.hash.slice(1);
    if (id !== "" && !id.includes("=")) document.getElementById(id)?.closest("details")?.setAttribute("open", "");
});
