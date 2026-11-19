// The drawer: one rule or one action in full, beside the table it was opened from. It exists for the table view of a long screen,
// where a row cannot hold a rule's sentence; the list reads rules where they stand. Which one is open is in the address
// (`rule=` or `action=`), so a link opens it.
import { titleOf } from "../lib/derive";
import { tagOf, tagWords } from "../lib/slice-model";
import type { SliceAction, SliceRule } from "../lib/slice-types";
import { badge, copyText, count, evidence, h, icon, say } from "./dom";
import type { Ctx } from "./context";

/** What the full text says after its title, which the drawer shows as its heading; nothing when the title is the whole text. */
const rest = (detail: string) => {
    const flat = detail.replaceAll(/\s+/g, " ").trim();
    const more = flat.slice(titleOf(flat).length).trim();
    return more === "" ? null : h("p", { class: "drawer-text", text: more });
};

const button = (text: string, onclick: () => void, className = "btn btn-ghost") => h("button", { type: "button", class: className, onclick }, text);

const listOf = (title: string, items: HTMLElement[]) =>
    h("section", { class: "drawer-block" }, h("h3", { text: title }), items.length === 0 ? h("p", { class: "muted", text: "None." }) : h("ul", { class: "drawer-list" }, ...items.map((item) => h("li", {}, item))));

const copyBrief = (ctx: Ctx, pick: (brief: Awaited<ReturnType<Ctx["brief"]>>) => string | undefined) =>
    h(
        "button",
        {
            type: "button",
            class: "btn",
            onclick: async (event: Event) => {
                const target = (event.currentTarget as HTMLElement).querySelector("[data-label]");
                const text = pick(await ctx.brief());
                if (text === undefined) return;
                await copyText(text);
                say("Copied to the clipboard");
                if (target !== null) {
                    target.textContent = "Copied";
                    setTimeout(() => (target.textContent = "Copy brief"), 1800);
                }
            },
        },
        icon("copy"),
        h("span", { "data-label": "", text: "Copy brief" }),
    );

/**
 * Creates the drawer and keeps it in step with the address.
 * @param ctx the page's context
 * @returns the drawer's element, to be added to the page, and the way to open the rule or action named in the address
 */
export const createDrawer = (ctx: Ctx) => {
    const title = h("h2", { id: "drawer-title", class: "drawer-title" });
    const kind = h("p", { class: "drawer-kind" });
    const body = h("div", { class: "drawer-body" });
    const close = h("button", { type: "button", class: "btn btn-ghost drawer-close", "aria-label": "Close", onclick: () => ctx.set({ rule: "", action: "" }) }, icon("x"));
    const node = h("aside", { class: "drawer", role: "dialog", "aria-modal": "false", "aria-labelledby": "drawer-title", hidden: true }, h("header", { class: "drawer-head" }, h("div", {}, kind, title), close), body);
    let opener: HTMLElement | null = null;

    const ruleBody = (rule: SliceRule) => {
        const used = (ctx.model.usedBy.get(rule.id) ?? []).flatMap((id) => ctx.model.action.get(id) ?? []);
        const screens = [...new Set(used.map((action) => action.screen).filter((key) => key !== ""))].flatMap((key) => ctx.model.screen.get(key) ?? []);
        const layer = ctx.model.layer.get(rule.layer);
        const show = (...nodes: (Node | null)[]) => body.replaceChildren(...nodes.filter((node): node is Node => node !== null));
        show(
            rest(rule.detail),
            h("div", { class: "drawer-badges" }, badge(rule.provenance), badge("neutral", tagWords[tagOf(rule)])),
            h("div", { class: "drawer-evidence" }, evidence(rule.place, true)),
            layer === undefined ? null : h("p", { class: "drawer-fact" }, h("span", { class: "muted", text: "Decided in the layer " }), layer.name),
            listOf(
                `Used by ${count(used.length, "action")}`,
                used.map((action) => button(titleOf(action.detail), () => ctx.set({ action: action.id, rule: "" }), "link-button")),
            ),
            screens.length === 0 ? null : listOf("On screens", screens.map((screen) => h("a", { href: ctx.screenHref(screen.key), text: screen.name }))),
            h("div", { class: "drawer-actions" }, copyBrief(ctx, (brief) => brief.rules[rule.id]), button("Copy link", async () => (await copyText(location.href), say("Link copied")))),
        );
        title.textContent = titleOf(rule.detail);
        kind.textContent = "Business rule";
    };

    const actionBody = (action: SliceAction) => {
        const screen = ctx.model.screen.get(action.screen);
        const rules = action.rules.flatMap((id) => ctx.model.rule.get(id) ?? []);
        const show = (...nodes: (Node | null)[]) => body.replaceChildren(...nodes.filter((node): node is Node => node !== null));
        show(
            rest(action.detail),
            h("div", { class: "drawer-badges" }, badge(action.provenance), action.state === "" ? null : badge(action.state)),
            h("div", { class: "drawer-evidence" }, evidence(action.place, true)),
            h("p", { class: "drawer-fact" }, h("span", { class: "muted", text: "Started by " }), action.startedBy === "person" ? "a person" : action.startedBy, screen === undefined ? null : [" on ", h("a", { href: ctx.screenHref(screen.key), text: screen.name })]),
            h("p", { class: "drawer-fact" }, h("span", { class: "muted", text: "Passes through " }), action.path.map((id) => ctx.model.layer.get(id)?.name ?? id).join(", ")),
            listOf(
                `Rules it passes (${rules.length})`,
                rules.map((rule) => button(titleOf(rule.detail), () => ctx.set({ rule: rule.id, action: "" }), "link-button")),
            ),
            h("div", { class: "drawer-actions" }, copyBrief(ctx, (brief) => brief.actions[action.id]), button("Copy link", async () => (await copyText(location.href), say("Link copied")))),
        );
        title.textContent = titleOf(action.detail);
        kind.textContent = "Action";
    };

    const sync = () => {
        const state = ctx.state();
        // The drawer belongs to the table of rules; in the list a rule is read where it stands.
        const rule = state.view === "table" ? ctx.model.rule.get(state.rule) : undefined;
        const action = state.view === "table" ? ctx.model.action.get(state.action) : undefined;
        const wasOpen = !node.hidden;
        if (rule !== undefined) ruleBody(rule);
        else if (action !== undefined) actionBody(action);
        const show = rule !== undefined || action !== undefined;
        node.hidden = !show;
        document.body.classList.toggle("drawer-open", show);
        if (show && !wasOpen) {
            opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            close.focus();
        } else if (show) {
            // Another item in the same drawer: keep the place, tell the reader.
            say(`${kind.textContent}: ${title.textContent}`);
        }
        if (!show && wasOpen) {
            if (opener !== null && opener.isConnected) opener.focus();
            opener = null;
        }
    };
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !node.hidden && !document.querySelector("dialog[open]")) ctx.set({ rule: "", action: "" });
    });
    ctx.listen(sync);
    sync();
    return node;
};
