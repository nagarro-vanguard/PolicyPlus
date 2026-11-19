// The Architecture page: the lens control, the open fold and the drawings. The address holds the lens and the fold
// (`#lens=today&fold=connections`), so a link shows what its sender saw. A drawing is loaded when its lens is first shown,
// because the layout engine behind it is large and a hidden block has no size to draw into. The page may be reached through the
// shell's page transitions, so everything starts on `astro:page-load`, which fires for the first load and for each visit.
import { lensIds, readHash, writeHash } from "../lib/architecture-page";
import type { Fold, Lens } from "../lib/architecture-page";
import type { ViewerData } from "../lib/slice-types";

const start = () => {
    const root = document.querySelector<HTMLElement>("[data-arch]");
    if (root === null) return;
    const available = (root.dataset.lenses ?? "today").split(" ").filter((lens): lens is Lens => (lensIds as readonly string[]).includes(lens));
    const fallback = (root.dataset.default ?? "today") as Lens;
    const buttons = [...root.querySelectorAll<HTMLButtonElement>("[data-lens-button]")];
    const state: { lens: Lens; fold: Fold | undefined } = { lens: fallback, fold: undefined };

    const draw = async (host: HTMLElement) => {
        if (host.dataset.state === "drawn" || host.dataset.state === "loading") return;
        host.dataset.state = "loading";
        try {
            // Relative to this page, so the file is found from wherever the shell first loaded the script.
            const response = await fetch(new URL(host.dataset.drawing ?? "", location.href));
            if (!response.ok) throw new Error(`${host.dataset.drawing}: ${response.status}`);
            const data = (await response.json()) as ViewerData | null;
            if (data === null) throw new Error("nothing to draw");
            const { mountViewer } = await import("./viewer");
            host.replaceChildren();
            await mountViewer(host, data, { title: host.dataset.title ?? data.name, open: data.groups.length === 1 ? [0] : [] });
            host.dataset.state = "drawn";
        } catch {
            host.dataset.state = "";
            const note = document.createElement("p");
            note.className = "arch-wait";
            note.textContent = "The drawing could not be loaded. The lists on this page say the same.";
            host.replaceChildren(note);
        }
    };

    // The components of a domain are listed when it is opened, from the file the drawing reads, so a page with
    // a hundred components does not carry them all in its markup.
    const list = async (details: HTMLDetailsElement) => {
        const target = details.querySelector<HTMLElement>("[data-components]");
        if (target === null || target.dataset.state === "listed") return;
        target.dataset.state = "listed";
        try {
            const response = await fetch(new URL("data/architecture-modernized.json", location.href));
            if (!response.ok) throw new Error(String(response.status));
            const data = (await response.json()) as ViewerData | null;
            const group = Number(details.dataset.domain);
            const items = (data?.boxes ?? []).filter((box) => box.g === group).toSorted((one, other) => one.n.localeCompare(other.n));
            target.replaceChildren(...items.map((box) => {
                const item = document.createElement("li");
                const name = document.createElement("b");
                name.textContent = box.n;
                const first = /^.+?[.!?](?=\s|$)/.exec(box.note ?? "")?.[0] ?? box.note ?? "";
                item.append(name, first);
                return item;
            }));
        } catch {
            target.dataset.state = "";
            target.textContent = "The list could not be loaded. Open the drawing's table view for the same list.";
        }
    };
    for (const details of root.querySelectorAll<HTMLDetailsElement>("details[data-domain]")) details.addEventListener("toggle", () => {
        if (details.open) void list(details);
    });

    const show = (lens: Lens) => {
        state.lens = lens;
        root.dataset.lens = lens;
        for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.lensButton === lens));
        for (const host of root.querySelectorAll<HTMLElement>("[data-lens-only]")) if (host.dataset.lensOnly === lens) void draw(host);
    };
    const open = (fold: Fold | undefined, scroll: boolean) => {
        state.fold = fold;
        if (fold === undefined) return;
        const target = root.querySelector<HTMLDetailsElement>(`details[data-fold="${fold}"]`);
        if (target === null) return;
        target.open = true;
        if (scroll) target.scrollIntoView({ block: "start" });
    };
    const write = () => history.replaceState(history.state, "", writeHash(state.lens, state.fold));
    const read = (scroll: boolean) => {
        const asked = readHash(location.hash, available, fallback);
        show(asked.lens);
        open(asked.fold, scroll);
    };

    for (const button of buttons) button.addEventListener("click", () => {
        show(button.dataset.lensButton as Lens);
        write();
    });
    for (const details of root.querySelectorAll<HTMLDetailsElement>("details[data-fold]")) details.addEventListener("toggle", () => {
        if (details.open) state.fold = details.dataset.fold as Fold;
        else if (state.fold === details.dataset.fold) state.fold = undefined;
        write();
    });
    // One listener for the page that is showing; a visit that leaves the page takes its root away and the listener does nothing.
    const onHash = () => {
        if (root.isConnected) read(true);
    };
    window.addEventListener("hashchange", onHash);
    document.addEventListener("astro:before-swap", () => window.removeEventListener("hashchange", onHash), { once: true });
    read(true);
};

// Without the transitions the event never fires, so the page starts at once.
if (document.querySelector('meta[name="astro-view-transitions-enabled"]') === null) start();
else document.addEventListener("astro:page-load", start);
