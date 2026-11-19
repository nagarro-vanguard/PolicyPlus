// The screen page, drawn in the browser from the slice of the capability it is read through. One list: what a person can do
// here, each action a row that opens to the rules it passes, in plain sentences. No filter, grouping or table: the search
// finds a rule by its words. The controls, the layers and the brief are single folded lines.
import { titleOf } from "../lib/derive";
import type { SliceRisk, SliceRule, SliceScreen } from "../lib/slice-types";
import { badge, copyText, count, evidence, h, say } from "./dom";
import type { Ctx } from "./context";

/** The most rules drawn under one row before a control for the rest. */
const firstRules = 50;
const severityRank = { high: 0, medium: 1, low: 2 } as const;
const base = (path: string) => path.slice(path.lastIndexOf("/") + 1);

type Group = { readonly key: string; readonly title: string; readonly rules: readonly SliceRule[] };

/**
 * The screen's content.
 * @param ctx the page's context, read through one capability
 * @param screen the screen in that capability's slice
 * @param bundleCommand the command that builds the screen's bundle for a coding assistant
 * @returns the element to put in the page
 */
export const createScreenView = (ctx: Ctx, screen: SliceScreen, bundleCommand: string) => {
    const { slice, model } = ctx;
    const actions = screen.actions.flatMap((id) => model.action.get(id) ?? []);
    const rules = screen.rules.flatMap((id) => model.rule.get(id) ?? []);
    const touched = screen.layers.flatMap((entry) => {
        const layer = model.layer.get(entry.layer);
        return layer === undefined ? [] : [{ info: layer, actions: entry.actions, rules: entry.rules }];
    });

    /* ----- the quiet line of facts ----- */
    const place = screen.files.length === 0 ? "" : screen.files.length === 1 ? base(screen.files[0] ?? "") : `${base(screen.files[0] ?? "")} and ${count(screen.files.length - 1, "more file")}`;
    const meta = h(
        "p",
        { class: "facts" },
        h("span", {}, h("b", { text: String(actions.length) }), ` ${actions.length === 1 ? "action" : "actions"}`),
        h("span", {}, h("b", { text: String(rules.length) }), ` ${rules.length === 1 ? "rule" : "rules"}`),
        h("span", { text: count(screen.controls.length, "control") }),
        place === "" ? null : h("span", {}, "Built from ", h("code", { class: "inline", text: place })),
    );
    // A screen shared by several capabilities is read through one at a time; the others are one choice away.
    const switcher =
        screen.otherCapabilities.length === 0
            ? null
            : h(
                  "p",
                  { class: "switcher" },
                  h("label", { for: "read-through", text: "Read through" }),
                  h(
                      "select",
                      {
                          id: "read-through",
                          onchange: (event: Event) => {
                              const slug = (event.target as HTMLSelectElement).value;
                              location.hash = `s=${encodeURIComponent(screen.key)}&c=${encodeURIComponent(slug)}`;
                          },
                      },
                      h("option", { value: slice.slug, selected: true, text: slice.name }),
                      ...screen.otherCapabilities.map((other) => h("option", { value: other.slug, text: other.name })),
                  ),
                  h("span", { class: "muted", text: `Part of ${count(screen.otherCapabilities.length + 1, "capability", "capabilities")}` }),
              );

    /* ----- the journeys that use this screen's actions ----- */
    const used = slice.journeys.filter((journey) => journey.actions.some((id) => screen.actions.includes(id)));
    const link = (journey: (typeof used)[number]) => h("a", { href: `${ctx.root}journey/${journey.slug}.html`, text: journey.title });
    const usedLine =
        used.length === 0
            ? null
            : h(
                  "p",
                  { class: "jr-used" },
                  h("span", { class: "jr-used-label", text: "Used in journeys" }),
                  ...used.slice(0, 3).map(link),
                  used.length > 3 ? h("details", { class: "jr-used-more" }, h("summary", { text: `${used.length - 3} more` }), ...used.slice(3).map(link)) : null,
              );

    /* ----- the risks of this screen's files, above the list, only when there are any ----- */
    const mine = slice.risks.filter((risk) => risk.files.some((file) => screen.files.includes(file))).sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
    let callout: HTMLElement | null = null;
    if (mine.length > 0) {
        const worst = mine[0]?.severity ?? "low";
        const list = h("ul", { class: "callout-list" });
        const more = h("p", { class: "callout-more" });
        let all = false;
        const item = (risk: SliceRisk) => h("li", {}, badge(risk.severity), " ", h("a", { href: `${ctx.root}risk/${risk.slug}.html`, text: risk.headline }));
        const draw = () => {
            list.replaceChildren(...(all ? mine : mine.slice(0, 3)).map(item));
            more.replaceChildren();
            if (!all && mine.length > 3) more.append(h("button", { type: "button", class: "link-button", onclick: () => ((all = true), draw()) }, `${mine.length - 3} more`));
        };
        draw();
        callout = h("div", { class: `callout callout-${worst}`, role: "group", "aria-label": "What can go wrong on this screen" }, h("p", { class: "t", text: "What can go wrong on this screen" }), list, more);
    }

    /* ----- the one list: what a person can do here ----- */
    const opened = new Set<string>();
    if (actions.length <= 3 && actions[0] !== undefined && actions[0].rules.length > 0) opened.add(`action:${actions[0].id}`);
    const listHost = h("div", { class: "list" });
    const empty = h("p", { class: "muted", hidden: true, text: "No action of this capability starts from this screen." });

    const groups = (): Group[] => actions.map((action) => ({ key: action.id, title: titleOf(action.detail), rules: action.rules.flatMap((id) => model.rule.get(id) ?? []) }));
    const ruleItem = (rule: SliceRule) =>
        h("li", { "data-rule": rule.id, class: ctx.state().rule === rule.id ? "hit" : undefined }, h("span", { class: "rule-text", text: rule.detail }), h("span", { class: "ev" }, evidence(rule.place)));
    const ruleList = (group: Group) => {
        // A rule a link points at is always drawn, however far down its group it stands.
        const wanted = ctx.state().rule;
        const shown = group.rules.findIndex((rule) => rule.id === wanted) >= firstRules ? group.rules.length : firstRules;
        const list = h("ul", { class: "rules" }, ...group.rules.slice(0, shown).map(ruleItem));
        if (group.rules.length > shown) {
            const rest = h("li", {}, h("button", { type: "button", class: "link-button", onclick: () => (rest.replaceWith(...group.rules.slice(shown).map(ruleItem)), say(`All ${group.rules.length} rules shown`)) }, `Show all ${group.rules.length} rules`));
            list.append(rest);
        }
        return list;
    };
    const groupRow = (group: Group, openNow: boolean) => {
        const total = group.rules.length === 0 ? "no rules" : count(group.rules.length, "rule");
        if (group.rules.length === 0) return h("div", { class: "row row-plain" }, h("div", { class: "row-head" }, h("span", { class: "t", text: group.title }), h("span", { class: "r", text: total })));
        const details = h("details", { class: "row", "data-key": group.key, open: openNow }, h("summary", {}, h("span", { class: "t", text: group.title }), h("span", { class: "r", text: total })));
        const fill = () => {
            if (details.querySelector("ul") === null) details.append(ruleList(group));
        };
        details.addEventListener("toggle", () => {
            if (details.open) {
                opened.add(group.key);
                fill();
            } else opened.delete(group.key);
        });
        if (openNow) fill();
        return details;
    };
    const drawList = () => {
        const state = ctx.state();
        const all = groups();
        const target = state.rule === "" ? undefined : all.find((group) => group.rules.some((rule) => rule.id === state.rule));
        if (target !== undefined) opened.add(target.key);
        listHost.replaceChildren(...all.map((group) => groupRow(group, opened.has(group.key))));
        empty.hidden = all.length > 0;
        if (target !== undefined) requestAnimationFrame(() => listHost.querySelector(`[data-rule="${state.rule}"]`)?.scrollIntoView({ block: "center" }));
    };
    ctx.listen((state, before) => {
        if (state.rule !== before.rule) {
            for (const el of listHost.querySelectorAll<HTMLElement>("[data-rule]")) el.classList.toggle("hit", el.dataset.rule === state.rule);
            if (state.rule !== "" && listHost.querySelector(`[data-rule="${state.rule}"]`) === null) drawList();
        }
    });

    /* ----- single folded lines ----- */
    const fold = (title: string, aside: string, ...kids: (HTMLElement | null)[]) => h("details", { class: "fold-line" }, h("summary", {}, title, h("span", { class: "muted", text: aside })), h("div", { class: "fold-body" }, ...kids));
    const controls = fold(
        "Controls",
        String(screen.controls.length),
        screen.controls.length === 0 ? h("p", { class: "muted", text: "The analysis found no control on this screen." }) : h("ul", { class: "control-list" }, ...screen.controls.map(([text, kind]) => h("li", {}, h("span", { text }), " ", h("span", { class: "muted", text: kind })))),
    );
    const layers = fold(
        "Where it runs",
        touched.map(({ info }) => info.name).join(", "),
        h("div", { class: "list" }, ...touched.map(({ info, actions: a, rules: r }) => h("div", { class: "row" }, h("span", { class: "t", text: info.name }), h("span", { class: "r", text: `${count(a, "action")} · ${count(r, "rule")}` }), info.summary === "" ? null : h("span", { class: "d", text: info.summary })))),
    );
    const copyBrief = h("button", { type: "button", class: "btn", onclick: async () => ((await copyText((await ctx.brief()).screens[screen.key] ?? "")), say("Brief copied to the clipboard")) }, "Copy brief for this screen");
    const assistant = fold(
        "For a coding assistant",
        "copy a brief",
        h("p", {}, copyBrief),
        h("p", { class: "note", text: "Or build a bundle of this screen's code and rules to hand over:" }),
        h("pre", { class: "command" }, h("code", { text: bundleCommand })),
        h("p", {}, h("button", { type: "button", class: "btn", onclick: () => void copyText(bundleCommand) }, "Copy command")),
    );

    const heading: HTMLElement = h("section", { class: "sec" }, h("h2", { text: "What a person can do here" }), listHost, empty);
    const root = h("div", { class: "explorer" }, meta, usedLine, switcher, callout, heading, h("div", { class: "folds" }, controls, layers, assistant));
    drawList();
    return root;
};
