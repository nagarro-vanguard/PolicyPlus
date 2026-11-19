// The rules reference, drawn from `data/rules.json` in chunks: the rules are in chunks of thirty rows, only the chunks near the
// screen are drawn (found on scroll, from where each chunk sits), and the others keep the height they last had, so the scroll bar
// is right and the page stays small however many rules there are. One facet toggle (rules that refuse something) appears above fifty rules; the address holds it.
import type { RuleLine } from "../lib/rules-data";
import { fetchJson, siteRoot } from "./data";
import { badge, evidence, h, say } from "./dom";
import { fresh, onPage } from "./page";

const chunkSize = 30;
const facetAbove = 50;
/** A guess at one row's height in pixels until the first chunk has been drawn and measured. */
const guess = 72;
/** How far beyond the screen, in pixels, chunks are drawn. */
const margin = 1200;

const row = (rule: RuleLine) =>
    h(
        "li",
        { class: "rr" },
        h("a", { class: "rr-text", href: `${siteRoot()}${rule.h}`, text: rule.t }),
        h("span", { class: "rr-sub" }, evidence(rule.p), h("span", { text: `${rule.l} · ${rule.c}` }), rule.g ? badge("changes-state") : null),
    );

const draw = (host: HTMLElement, rules: readonly RuleLine[]) => {
    const wanted = () => new URLSearchParams(location.hash.slice(1)).has("refuses");
    const bar = h("div", { class: "rr-bar" });
    const status = h("p", { class: "meta", "aria-live": "polite" });
    const list = h("div", { class: "rr-chunks" });
    let facet: HTMLButtonElement | undefined;
    let timer = 0;
    let average = guess;
    let shown: readonly RuleLine[] = rules;

    const fill = (chunk: HTMLElement, at: number) => {
        if (chunk.dataset.drawn === "true") return;
        chunk.dataset.drawn = "true";
        const items = shown.slice(at * chunkSize, (at + 1) * chunkSize);
        chunk.replaceChildren(h("ul", { class: "rr-list" }, ...items.map(row)));
        chunk.style.minHeight = "";
        // Once drawn the chunk is as tall as its rows are, which the next chunks are guessed from.
        if (items.length === chunkSize) average = chunk.getBoundingClientRect().height / items.length;
    };
    const empty = (chunk: HTMLElement) => {
        if (chunk.dataset.drawn !== "true") return;
        const height = chunk.getBoundingClientRect().height;
        chunk.dataset.drawn = "false";
        chunk.replaceChildren();
        chunk.style.minHeight = `${Math.round(height)}px`;
    };
    /** Draws the chunks within a screen and a half of the viewport and empties the others. */
    const update = () => {
        timer = 0;
        const chunks = [...list.children] as HTMLElement[];
        const near = chunks.map((chunk) => {
            const box = chunk.getBoundingClientRect();
            return box.bottom > -margin && box.top < innerHeight + margin;
        });
        chunks.forEach((chunk, at) => (near[at] ? fill(chunk, at) : empty(chunk)));
    };
    const soon = () => {
        if (timer === 0) timer = window.setTimeout(update, 40);
    };
    const build = () => {
        shown = wanted() ? rules.filter((rule) => rule.g) : rules;
        list.replaceChildren();
        status.textContent = wanted() ? `${shown.length} of ${rules.length} rules` : "";
        const chunks = Math.ceil(shown.length / chunkSize);
        for (let at = 0; at < chunks; at += 1) {
            const size = Math.min(chunkSize, shown.length - at * chunkSize);
            const chunk = h("div", { class: "rr-chunk", "data-at": at });
            chunk.style.minHeight = `${Math.round(size * average)}px`;
            list.append(chunk);
        }
        update();
        if (facet !== undefined) facet.setAttribute("aria-pressed", String(wanted()));
        say(`${shown.length} rules`);
    };
    if (rules.length > facetAbove) {
        facet = h("button", { type: "button", class: "btn", "aria-pressed": "false", text: host.dataset.facet ?? "Only rules that refuse something" });
        facet.addEventListener("click", () => {
            const on = !wanted();
            try {
                history.replaceState(null, "", on ? `${location.pathname}${location.search}#refuses` : `${location.pathname}${location.search}`);
            } catch {
                // A page opened from a file cannot rewrite its address; the toggle still works.
            }
            build();
        });
        bar.append(facet, status);
    }
    host.replaceChildren(bar, list);
    build();
    const onScroll = () => {
        if (document.body.contains(host)) soon();
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    addEventListener("hashchange", () => {
        if (document.body.contains(host)) build();
    });
};

onPage(() => {
    const host = document.querySelector<HTMLElement>("[data-rules-page]");
    if (host === null || !fresh(host)) return;
    fetchJson<RuleLine[]>("data/rules.json").then(
        (rules) => draw(host, rules),
        () => host.replaceChildren(h("p", { class: "note", text: "The rules could not be loaded. If you opened this page from disk, serve the folder with a static server instead." })),
    );
});
