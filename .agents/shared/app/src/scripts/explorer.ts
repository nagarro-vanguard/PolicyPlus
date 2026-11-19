// The entry of the pages that show a capability or a screen from its slice: fetches the slice, draws the page, and keeps
// the address, the drawer and the diagram in step. A page that cannot load says so and offers to try again.
import { modelOf } from "../lib/slice-model";
import type { AppIndex, CapBrief, CapSlice } from "../lib/slice-types";
import { viewerOfSlice } from "../lib/slice";
import { decodeState } from "../lib/url-state";
import { createCapabilityView } from "./capability-view";
import { makeContext } from "./context";
import type { Ctx } from "./context";
import { fetchJson, siteRoot } from "./data";
import { copyText, h, icon, say } from "./dom";
import { createDrawer } from "./drawer";
import { createScreenView } from "./screen-view";

// The page is replaced by the router, so what the script holds of it is found again when a page is shown.
let host: HTMLElement | null = null;
let mode = "";
let live: Ctx | undefined;
let drawerNode: HTMLElement | undefined;
let loaded = "";

const fail = (title: string, message: string, retry?: () => void) => {
    if (host === null) return;
    host.replaceChildren(
        h(
            "div",
            { class: "state state-error", role: "alert" },
            h("span", { class: "state-icon" }, icon("alert-circle")),
            h("div", {}, h("p", { class: "state-title", text: title }), h("p", { class: "state-message", text: message }), retry === undefined ? null : h("button", { type: "button", class: "btn", onclick: retry }, "Try again")),
        ),
    );
};

const setHead = (title: string, lead: string) => {
    const heading = document.querySelector("main h1");
    if (heading !== null) heading.textContent = title;
    let sub = document.querySelector("main .opening .lead");
    if (sub === null && heading !== null && lead !== "") {
        sub = h("p", { class: "lead" });
        heading.after(sub);
    }
    if (sub !== null) sub.textContent = lead;
    document.title = title;
};

const copyBrief = (ctx: Ctx, screenKey: string) => async () => {
    const state = ctx.state();
    const brief = await ctx.brief();
    const text = state.rule !== "" ? brief.rules[state.rule] : state.action !== "" ? brief.actions[state.action] : screenKey !== "" ? brief.screens[screenKey] : brief.capability;
    if (text !== undefined) {
        await copyText(text);
        say("Brief copied to the clipboard");
    }
};
let briefListener: (() => void) | undefined;

const open = async () => {
    if (host === null) return;
    const state = decodeState(location.hash);
    let slug = host.dataset.slug ?? "";
    let key = "";
    if (mode === "screen") {
        key = state.s;
        if (key === "") return fail("No screen is named in this address", "Open a screen from a capability, the sidebar or the search.");
        slug = state.c;
        if (slug === "") {
            const index = await fetchJson<AppIndex>("data/index.json").catch(() => undefined);
            const parent = index?.items.find((item) => item.id === `screen:${key}`)?.parent ?? "";
            slug = parent.startsWith("capability:") ? parent.slice("capability:".length) : "";
        }
        if (slug === "") return fail("This screen is not in the index", `No screen has the key ${key}.`);
    }
    loaded = `${slug}/${key}`;
    let slice: CapSlice;
    try {
        slice = await fetchJson<CapSlice>(`data/cap/${slug}.json`);
    } catch {
        return fail("The page's data could not be loaded", "Its data file did not arrive. If you opened this page from disk, serve the folder with a static server instead.", () => void open());
    }
    live?.dispose();
    drawerNode?.remove();
    const model = modelOf(slice);
    const ctx = makeContext(siteRoot(), slice, model, () => fetchJson<CapBrief>(`data/brief/${slug}.json`));
    live = ctx;
    if (briefListener !== undefined) document.removeEventListener("app:copy-brief", briefListener);
    briefListener = () => void copyBrief(ctx, key)();
    document.addEventListener("app:copy-brief", briefListener);
    // The static "copy a brief" button of a capability page.
    for (const button of document.querySelectorAll<HTMLElement>("[data-copy-brief]")) button.onclick = () => void copyBrief(ctx, "")();
    if (mode === "capability") {
        host.replaceChildren(
            createCapabilityView(ctx, async (target) => {
                const { mountViewer } = await import("./viewer");
                await mountViewer(target, viewerOfSlice(slice), { title: `${slice.name}: layers and actions` });
            }),
        );
    } else {
        const screen = slice.screens.find((each) => each.key === key);
        if (screen === undefined) return fail("This screen is not part of that capability", `${slice.name} has no screen with the key ${key}.`);
        setHead(screen.name, screen.summary);
        const place = host.dataset.bundlePlace ?? "";
        host.replaceChildren(createScreenView(ctx, screen, `cd .agents/skills/code-analysis && CODE_ANALYSIS_ROOT=${place} bun cli/build-bundle.ts screen ${screen.key}`));
        document.dispatchEvent(
            new CustomEvent("app:node", {
                detail: {
                    id: `screen:${key}`,
                    capability: slice.slug,
                    trail: [
                        { text: "Overview", href: `${siteRoot()}index.html` },
                        ...(slice.area === undefined ? [] : [{ text: slice.area.name, href: `${siteRoot()}reference.html#${slice.area.slug}` }]),
                        { text: slice.name, href: `${siteRoot()}capability/${slice.slug}.html` },
                        { text: screen.name },
                    ],
                },
            }),
        );
    }
    drawerNode = createDrawer(ctx);
    document.body.append(drawerNode);
    document.dispatchEvent(new CustomEvent("app:content"));
};

/** Draws the page's content when a page that holds it is shown. */
const start = () => {
    host = document.querySelector<HTMLElement>("[data-explorer]");
    mode = host?.dataset.explorer ?? "";
    live = undefined;
    drawerNode = undefined;
    loaded = "";
    if (host !== null && host.dataset.drawn === undefined) {
        host.dataset.drawn = "true";
        void open();
    }
};
addEventListener("hashchange", () => {
    if (host === null || mode !== "screen") return;
    const state = decodeState(location.hash);
    if (state.s !== "" && `${state.c}/${state.s}` !== loaded && state.c !== "") void open();
});
document.addEventListener("astro:page-load", start);
start();
