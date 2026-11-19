// The capability page, drawn in the browser from its slice: a quiet line of facts, its screens (the first six, then all of
// them), the three risks that matter most, and one fold for how it is built. No tabs: everything a person needs is on one page.
import { titleOf } from "../lib/derive";
import type { SliceRisk, SliceScreen } from "../lib/slice-types";
import { badge, count, h, say } from "./dom";
import type { Ctx } from "./context";
import { VirtualList } from "./virtual";
import type { VRow } from "./virtual";

const severityRank = { high: 0, medium: 1, low: 2 } as const;
/** How many screens and risks show before the control for the rest. */
export const firstScreens = 6;
export const firstRisks = 3;

const fact = (value: number, unit: string) => h("span", {}, h("b", { text: String(value) }), ` ${unit}`);
const section = (title: string, aside: string, ...kids: (HTMLElement | null)[]) =>
    h("section", { class: "sec" }, h("h2", {}, title, aside === "" ? null : h("small", { text: aside })), ...kids);
const none = (text: string) => h("p", { class: "muted", text });

/**
 * The capability's page content.
 * @param ctx the page's context
 * @param showDiagram draws the diagram viewer into an element; loaded only when asked for, because the layout engine is large
 * @returns the element to put in the page
 */
export const createCapabilityView = (ctx: Ctx, showDiagram: (host: HTMLElement) => Promise<void>) => {
    const { slice } = ctx;

    const meta = h("p", { class: "facts" }, fact(slice.totals.screens, "screens"), fact(slice.totals.actions, "actions"), fact(slice.rules.length, "rules"), fact(slice.risks.length, "risks"));

    /* ----- Screens: six, then all of them ----- */
    const screenRow = (screen: SliceScreen) =>
        h(
            "a",
            { class: "row", href: ctx.screenHref(screen.key) },
            h("span", { class: "t", text: screen.name }),
            h("span", { class: "r", text: count(screen.rules.length, "rule") }),
            screen.summary === "" ? null : h("span", { class: "d", text: titleOf(screen.summary) }),
        );
    const screensList = h("div", { class: "list" });
    const screensMore = h("p", { class: "more" });
    let allScreens = false;
    const drawScreens = () => {
        screensMore.replaceChildren();
        if (!allScreens || slice.screens.length <= 50) {
            screensList.className = "list";
            screensList.replaceChildren(...(allScreens ? slice.screens : slice.screens.slice(0, firstScreens)).map(screenRow));
        } else {
            // A very long list draws only what is in view; each row is two lines, so the height is fixed.
            screensList.className = "list";
            const rows: VRow[] = slice.screens.map((screen) => ({ key: screen.key, render: () => h("div", { class: "vrow nav-row" }, screenRow(screen)) }));
            new VirtualList(screensList, "Screens", "list", 3.5).set(rows);
        }
        if (slice.screens.length > firstScreens && !allScreens) {
            screensMore.append(h("button", { type: "button", class: "link-button", onclick: () => ((allScreens = true), drawScreens(), say(`All ${slice.screens.length} screens shown`)) }, `All ${slice.screens.length} screens →`));
        }
    };
    drawScreens();

    /* ----- What can go wrong: three, then all ----- */
    const sorted = [...slice.risks].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
    const riskRow = (risk: SliceRisk) =>
        h("a", { class: "row", href: `${ctx.root}risk/${risk.slug}.html` }, h("span", { class: "t", text: risk.headline }), h("span", { class: "r" }, badge(risk.severity)));
    const risksList = h("div", { class: "list" });
    const risksMore = h("p", { class: "more" });
    const risksAside = h("small");
    let allRisks = false;
    const drawRisks = () => {
        risksList.replaceChildren(...(allRisks ? sorted : sorted.slice(0, firstRisks)).map(riskRow));
        risksMore.replaceChildren();
        if (sorted.length > firstRisks && !allRisks) risksMore.append(h("button", { type: "button", class: "link-button", onclick: () => ((allRisks = true), drawRisks(), say(`All ${sorted.length} risks shown`)) }, `All ${sorted.length} risks →`));
        risksAside.textContent = sorted.length > firstRisks && !allRisks ? `${firstRisks} of ${sorted.length}` : "";
    };
    drawRisks();
    const risks = h("section", { class: "sec" }, h("h2", {}, "What can go wrong", risksAside), sorted.length === 0 ? none("The analysis found no risk in this capability.") : h("div", {}, risksList, risksMore));

    /* ----- How it is built: layers and data, folded ----- */
    const layers = slice.layers.filter((layer) => layer.product || !slice.layers.some((each) => each.product));
    const diagramHost = h("div", { class: "viewer-host wide" });
    const diagramButton = h(
        "button",
        {
            type: "button",
            class: "btn",
            onclick: async () => {
                diagramButton.disabled = true;
                diagramButton.textContent = "Loading the diagram";
                try {
                    await showDiagram(diagramHost);
                    diagramButton.hidden = true;
                    // A drawing needs the wider column; the fold that holds it takes it.
                    built.classList.add("wide");
                } catch {
                    diagramButton.disabled = false;
                    diagramButton.textContent = "Try again";
                    say("The diagram could not be loaded");
                }
            },
        },
        "Show the diagram",
    );
    const line = (name: string, aside: string, text: string) => h("div", { class: "row" }, h("span", { class: "t", text: name }), h("span", { class: "r", text: aside }), text === "" ? null : h("span", { class: "d", text }));
    const built = h(
        "details",
        { class: "fold-line" },
        h("summary", {}, "How it is built", h("span", { class: "muted", text: `${count(layers.length, "layer")} · ${count(slice.data.length, "kind of data", "kinds of data")}` })),
        h(
            "div",
            { class: "fold-body" },
            h("div", { class: "list" }, ...layers.map((layer) => line(layer.name, `${count(layer.actions, "action")} · ${count(layer.rules, "rule")}`, layer.summary))),
            slice.data.length === 0 ? null : h("h3", { text: "Data it works with" }),
            slice.data.length === 0 ? null : h("div", { class: "list" }, ...slice.data.map((kind) => line(kind.name, kind.access, kind.stores.length === 0 ? "" : `Kept in ${kind.stores.join(", ")}`))),
            h("p", {}, diagramButton),
            diagramHost,
        ),
    );

    return h(
        "div",
        { class: "explorer" },
        meta,
        section("Screens", "", slice.screens.length === 0 ? none("No screen starts an action of this capability. A person reaches it some other way, or another system starts it.") : h("div", {}, screensList, screensMore)),
        risks,
        built,
    );
};
