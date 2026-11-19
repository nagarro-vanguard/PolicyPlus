// The diagram viewer: one level of a system at a time, drawn at full size so the text is never below 12 pixels.
//   Map     groups only; open one group to see its boxes; select a box to dim everything it does not touch (focus and context).
//   Matrix  groups against groups, with a count in each cell; a cell opens the boxes behind it.
//   Table   every box with what it uses and what uses it, filterable; the text version of the drawing.
// Rules from the diagram spike: at most 12 boxes in a viewport and about 30 in a drawing, collapse by default, Fit stops at
// 100 % (a drawing too large to fit is panned, never shrunk), and `minTextPx()` reports the smallest text on screen.
import type { ViewerData } from "../lib/slice-types";
import type { ElkExtendedEdge, ElkNode } from "elkjs";
import { h, say } from "./dom";

type Box = ViewerData["boxes"][number];
type Pair = { readonly from: number; readonly to: number; readonly toGroup: number };
type Rect = { x: number; y: number; w: number; h: number };
type Laid = { boxes: Map<string, Rect>; edges: { agg: { a: string; b: string; pairs: Pair[] }; pts: { x: number; y: number }[]; label?: { x: number; y: number; width: number; height: number } | undefined }[]; intra: { pair: [number, number]; pts: { x: number; y: number }[] }[]; width: number; height: number };

const BOX_W = 216;
const GROUP_W = 240;
const GROUP_H = 66;
/** An open group is at least this wide, so a long name and its count share the header. */
const OPEN_W = 440;
/** A group's name wraps to this many lines, never cut. */
const GROUP_LINES = 2;
const TITLE_LINE = 17;
const LINE = 16;
const HEAD = 44;
const PAD = 14;
/** The most boxes drawn for one open group; the rest are in the table. */
export const MAX_BOXES = 30;
/** Text is never drawn below this many pixels. */
export const MIN_TEXT = 12;
/** A table of at most this many boxes has no filter. */
export const FILTER_ABOVE = 50;

const esc = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const wrap = (text: string, room: number, maxLines = 3) => {
    const out: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
        if (`${line} ${word}`.trim().length > room && line !== "") {
            out.push(line);
            line = word;
        } else line = `${line} ${word}`.trim();
    }
    if (line !== "") out.push(line);
    const cut = out.slice(0, maxLines);
    if (out.length > maxLines) cut[maxLines - 1] = `${(cut[maxLines - 1] ?? "").slice(0, room - 1)}…`;
    return cut;
};

type Selection = { kind: "box" | "group"; id: number } | undefined;

/**
 * Draws a viewer into an element.
 * @param host the element
 * @param data what to draw
 * @param options the title for a screen reader
 * @param options.title the drawing's name
 * @param options.open the groups to show open at first
 * @returns the viewer's controls, for a test or another script
 */
export const mountViewer = async (host: HTMLElement, data: ViewerData, options: { title: string; open?: readonly number[] }) => {
    const { default: ELK } = await import("elkjs/lib/elk.bundled.js");
    const elk = new ELK();
    const words = data.words;
    const byGroup: number[][] = data.groups.map(() => []);
    data.boxes.forEach((box, at) => byGroup[box.g]?.push(at));
    const usedBy: number[][] = data.boxes.map(() => []);
    data.boxes.forEach((box, at) => box.u.forEach((target) => usedBy[target]?.push(at)));
    const hasBoxLinks = data.boxes.some((box) => box.u.length > 0);

    const state = { view: "map" as "map" | "matrix" | "table", open: new Set<number>(options.open ?? []), sel: undefined as Selection, scale: 1, tx: 0, ty: 0, mx: undefined as [number, number] | undefined, filter: "", group: "" };
    let laid: Laid | undefined;

    /* ----- the boxes' sizes: text wraps to three lines at most, so a box's height follows its name ----- */
    const lines = (box: number) => wrap(data.boxes[box]?.n ?? "", 30, 3);
    const groupName = (group: number) => wrap(data.groups[group]?.name ?? "", 26, GROUP_LINES);
    const groupH = GROUP_H + TITLE_LINE * (Math.max(1, ...data.groups.map((_, at) => groupName(at).length)) - 1);
    const count = (n: number) => `${n} ${n === 1 ? words.box : words.boxes}`;
    const heightOf = (box: number) => 14 + LINE * lines(box).length;

    /* ----- layout: each open group on its own, then the groups as fixed boxes ----- */
    const inner = new Map<number, { w: number; h: number; boxes: { id: string; x: number; y: number; w: number; h: number }[]; edges: { pair: [number, number]; pts: { x: number; y: number }[] }[]; more: number }>();
    const layoutInner = async (group: number) => {
        const cached = inner.get(group);
        if (cached !== undefined) return cached;
        const all = (byGroup[group] ?? []).slice().sort((a, b) => (data.boxes[a]?.n ?? "").localeCompare(data.boxes[b]?.n ?? ""));
        const ids = all.slice(0, MAX_BOXES);
        const set = new Set(ids);
        const edges = ids.flatMap((from) => (data.boxes[from]?.u ?? []).filter((to) => set.has(to) && to !== from).map((to): [number, number] => [from, to]));
        let result;
        if (edges.length < ids.length / 3) {
            // Few links among them: a grid reads better than a layered graph, and its shape is predictable.
            const columns = ids.length > 6 ? 2 : 1;
            const rowHeights: number[] = [];
            ids.forEach((id, at) => {
                const row = Math.floor(at / columns);
                rowHeights[row] = Math.max(rowHeights[row] ?? 0, heightOf(id));
            });
            const tops = rowHeights.map((_, row) => rowHeights.slice(0, row).reduce((sum, each) => sum + each + 18, 0));
            result = {
                w: columns * BOX_W + (columns - 1) * 18,
                h: Math.max(0, (tops[tops.length - 1] ?? 0) + (rowHeights[rowHeights.length - 1] ?? 0)),
                boxes: ids.map((id, at) => ({ id: `b${id}`, x: (at % columns) * (BOX_W + 18), y: tops[Math.floor(at / columns)] ?? 0, w: BOX_W, h: heightOf(id) })),
                edges: [] as { pair: [number, number]; pts: { x: number; y: number }[] }[],
            };
        } else {
            const graph: ElkNode = {
                id: "r",
                layoutOptions: { "elk.algorithm": "layered", "elk.direction": "DOWN", "elk.aspectRatio": "1.2", "elk.layered.wrapping.strategy": "MULTI_EDGE", "elk.spacing.nodeNode": "22", "elk.layered.spacing.nodeNodeBetweenLayers": "40", "elk.edgeRouting": "ORTHOGONAL", "elk.padding": "[top=0,left=0,bottom=0,right=0]" },
                children: ids.map((id) => ({ id: `b${id}`, width: BOX_W, height: heightOf(id) })),
                edges: edges.map(([f, t], k): ElkExtendedEdge => ({ id: `i${k}`, sources: [`b${f}`], targets: [`b${t}`], sections: [] })),
            };
            const out = await elk.layout(graph);
            result = {
                w: out.width ?? 0,
                h: out.height ?? 0,
                boxes: (out.children ?? []).map((c) => ({ id: c.id, x: c.x ?? 0, y: c.y ?? 0, w: c.width ?? BOX_W, h: c.height ?? 0 })),
                edges: (out.edges ?? []).map((e, k) => {
                    const s = e.sections?.[0];
                    return { pair: edges[k] as [number, number], pts: s === undefined ? [] : [s.startPoint, ...(s.bendPoints ?? []), s.endPoint] };
                }),
            };
        }
        const made = { ...result, more: all.length - ids.length };
        inner.set(group, made);
        return made;
    };

    const aggregate = () => {
        const agg = new Map<string, { a: string; b: string; pairs: Pair[] }>();
        const add = (a: number, b: number, pair: Pair) => {
            if (a === b) return;
            const key = `${a}>${b}`;
            const found = agg.get(key) ?? { a: `g${a}`, b: `g${b}`, pairs: [] };
            found.pairs.push(pair);
            agg.set(key, found);
        };
        data.boxes.forEach((box, from) => {
            box.u.forEach((to) => add(box.g, data.boxes[to]?.g ?? box.g, { from, to, toGroup: data.boxes[to]?.g ?? box.g }));
            (box.ug ?? []).forEach((group) => add(box.g, group, { from, to: -1, toGroup: group }));
        });
        return agg;
    };
    const groupLinks = aggregate();

    const layoutMap = async (): Promise<Laid> => {
        for (const group of state.open) await layoutInner(group);
        const children = data.groups.map((_, at) => {
            const made = inner.get(at);
            return state.open.has(at) && made !== undefined ? { id: `g${at}`, width: Math.max(GROUP_W, made.w + 2 * PAD, OPEN_W), height: made.h + HEAD + PAD + (made.more > 0 ? 22 : 0) } : { id: `g${at}`, width: GROUP_W, height: groupH };
        });
        const edges = [...groupLinks.values()].map((agg, k) => ({ id: `e${k}`, sources: [agg.a], targets: [agg.b], labels: [{ text: String(agg.pairs.length), width: 22, height: 16 }], agg }));
        const graph: ElkNode = {
            id: "root",
            layoutOptions: { "elk.algorithm": "layered", "elk.direction": "RIGHT", "elk.spacing.nodeNode": "28", "elk.layered.spacing.nodeNodeBetweenLayers": "80", "elk.layered.spacing.edgeNodeBetweenLayers": "20", "elk.spacing.edgeNode": "14", "elk.spacing.edgeEdge": "10", "elk.layered.spacing.edgeEdgeBetweenLayers": "10", "elk.edgeRouting": "ORTHOGONAL", "elk.padding": "[top=16,left=16,bottom=16,right=16]", "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES" },
            children,
            edges: edges.map(({ agg: _agg, ...edge }): ElkExtendedEdge => ({ ...edge, sections: [] })),
        };
        const out = await elk.layout(graph);
        const boxes = new Map<string, Rect>();
        const intra: Laid["intra"] = [];
        for (const child of out.children ?? []) {
            const x = child.x ?? 0;
            const y = child.y ?? 0;
            boxes.set(child.id, { x, y, w: child.width ?? GROUP_W, h: child.height ?? groupH });
            const made = inner.get(Number(child.id.slice(1)));
            if (made !== undefined && state.open.has(Number(child.id.slice(1)))) {
                made.boxes.forEach((box) => boxes.set(box.id, { x: box.x + x + PAD, y: box.y + y + HEAD, w: box.w, h: box.h }));
                made.edges.forEach((edge) => intra.push({ pair: edge.pair, pts: edge.pts.map((p) => ({ x: p.x + x + PAD, y: p.y + y + HEAD })) }));
            }
        }
        return {
            boxes,
            edges: (out.edges ?? []).map((edge, k) => {
                const s = edge.sections?.[0];
                return { agg: (edges[k] as (typeof edges)[number]).agg, pts: s === undefined ? [] : [s.startPoint, ...(s.bendPoints ?? []), s.endPoint], label: edge.labels?.[0] as { x: number; y: number; width: number; height: number } | undefined };
            }),
            intra,
            width: out.width ?? 0,
            height: out.height ?? 0,
        };
    };

    /* ----- what the selection touches ----- */
    const relation = () => {
        const sel = state.sel;
        if (sel === undefined) return undefined;
        const set = new Set(sel.kind === "box" ? [sel.id] : byGroup[sel.id] ?? []);
        const uses = new Set<number>();
        const users = new Set<number>();
        const groups = new Set<number>();
        const groupUses = new Set<number>();
        for (const id of set) {
            const box = data.boxes[id];
            for (const to of box?.u ?? []) if (!set.has(to)) uses.add(to);
            for (const group of box?.ug ?? []) groupUses.add(group);
            for (const from of usedBy[id] ?? []) if (!set.has(from)) users.add(from);
        }
        groups.add(sel.kind === "box" ? data.boxes[sel.id]?.g ?? 0 : sel.id);
        for (const id of [...uses, ...users]) groups.add(data.boxes[id]?.g ?? 0);
        for (const group of groupUses) groups.add(group);
        const wires = new Map<number, "o" | "i">();
        laid?.edges.forEach((edge, at) => {
            const out = edge.agg.pairs.some((pair) => set.has(pair.from));
            const inn = edge.agg.pairs.some((pair) => set.has(pair.to));
            if (out) wires.set(at, "o");
            else if (inn) wires.set(at, "i");
        });
        const intraWires = new Map<number, "o" | "i">();
        laid?.intra.forEach((edge, at) => {
            if (set.has(edge.pair[0]) && !set.has(edge.pair[1])) intraWires.set(at, "o");
            else if (set.has(edge.pair[1]) && !set.has(edge.pair[0])) intraWires.set(at, "i");
        });
        return { set, uses, users, groups, groupUses, wires, intraWires };
    };

    /* ----- drawing the map ----- */
    const drawMap = () => {
        if (laid === undefined) return "";
        const rel = relation();
        const width = Math.ceil(laid.width);
        const height = Math.ceil(laid.height);
        let groupsSvg = "";
        let boxesSvg = "";
        let wiresSvg = "";
        let labelsSvg = "";
        data.groups.forEach((group, at) => {
            const rect = laid?.boxes.get(`g${at}`);
            if (rect === undefined) return;
            const open = state.open.has(at);
            const selected = state.sel?.kind === "group" && state.sel.id === at;
            const dim = rel !== undefined && !rel.groups.has(at) ? " dim" : "";
            const label = `${group.name}, ${count(byGroup[at]?.length ?? 0)}, ${open ? "open" : "closed"}`;
            const cls = `vg${open ? " open" : ""}${selected ? " sel" : ""}${dim}`;
            if (open) {
                const made = inner.get(at);
                groupsSvg += `<g class="${cls}" data-g="${at}"><rect class="b box" x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" rx="10"/><text class="t14" x="${rect.x + 14}" y="${rect.y + 27}">${esc(group.name)}</text><text class="t12" x="${rect.x + rect.w - 14}" y="${rect.y + 27}" text-anchor="end">${count(byGroup[at]?.length ?? 0)}, close</text>${made !== undefined && made.more > 0 ? `<text class="t12" x="${rect.x + 14}" y="${rect.y + rect.h - 8}">${made.more} more ${words.boxes} are in the table</text>` : ""}<rect class="hit" role="button" tabindex="0" aria-label="${esc(label)}: close" data-toggle="${at}" x="${rect.x}" y="${rect.y}" width="${rect.w}" height="40"/></g>`;
            } else {
                groupsSvg += `<g class="${cls}" data-g="${at}"><title>${esc(group.name)}</title><rect class="b box" x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" rx="10"/>${groupName(at).map((line, k) => `<text class="t14" x="${rect.x + 14}" y="${rect.y + 27 + k * TITLE_LINE}">${esc(line)}</text>`).join("")}<text class="t12" x="${rect.x + 14}" y="${rect.y + 49 + (groupName(at).length - 1) * TITLE_LINE}">${count(byGroup[at]?.length ?? 0)} · open</text><rect class="hit" role="button" tabindex="0" aria-label="${esc(label)}: open" data-open="${at}" x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}"/></g>`;
            }
            if (!open) return;
            for (const id of (inner.get(at)?.boxes ?? []).map((box) => Number(box.id.slice(1)))) {
                const box = laid?.boxes.get(`b${id}`);
                if (box === undefined) continue;
                let kind = "";
                if (rel !== undefined) kind = state.sel?.kind === "box" && state.sel.id === id ? " sel" : rel.uses.has(id) ? " uses" : rel.users.has(id) ? " usedby" : rel.set.has(id) ? "" : " dim";
                const name = data.boxes[id]?.n ?? "";
                boxesSvg += `<g class="vb${kind}" data-b="${id}"><title>${esc(name)}</title><rect class="b box" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="6"/>${lines(id).map((line, k) => `<text class="t13" x="${box.x + 10}" y="${box.y + 20 + k * LINE}">${esc(line)}</text>`).join("")}<rect class="hit" role="button" tabindex="0" aria-label="${esc(name)}: select" data-select="${id}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"/></g>`;
            }
        });
        laid.edges.forEach((edge, at) => {
            if (edge.pts.length === 0) return;
            const kind = rel?.wires.get(at) ?? "";
            const dim = rel !== undefined && kind === "" ? " dim" : "";
            wiresSvg += `<polyline class="wire ${kind}${dim}" points="${edge.pts.map((p) => `${p.x},${p.y}`).join(" ")}" marker-end="url(#ar${kind})"/>`;
            if (edge.label?.x !== undefined) labelsSvg += `<g class="${dim}"><rect class="lblbg" x="${edge.label.x - 3}" y="${edge.label.y - 1}" width="${edge.label.width + 6}" height="${edge.label.height + 2}" rx="8"/><text class="t12 lbl" x="${edge.label.x + edge.label.width / 2}" y="${edge.label.y + 12}" text-anchor="middle">${edge.agg.pairs.length}</text></g>`;
        });
        laid.intra.forEach((edge, at) => {
            const kind = rel?.intraWires.get(at) ?? "";
            const dim = rel !== undefined && kind === "" ? " dim" : "";
            wiresSvg += `<polyline class="wire ${kind}${dim}" points="${edge.pts.map((p) => `${p.x},${p.y}`).join(" ")}" marker-end="url(#ar${kind})"/>`;
        });
        const marker = (id: string, cls: string) => `<marker id="ar${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" class="ar ${cls}"/></marker>`;
        return `<svg class="vsvg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="${esc(options.title)}"><defs>${marker("", "")}${marker("o", "o")}${marker("i", "i")}</defs>${groupsSvg}${wiresSvg}${boxesSvg}${labelsSvg}</svg>`;
    };

    /* ----- the matrix and the table ----- */
    const groupCell = (a: number, b: number) => groupLinks.get(`${a}>${b}`)?.pairs.length ?? 0;
    const matrix = () => {
        const mx = state.mx;
        let rows: number[];
        let cols: number[];
        let cell: (r: number, c: number) => number;
        let label: (i: number) => string;
        let caption: string;
        if (mx === undefined) {
            rows = data.groups.map((_, i) => i);
            cols = rows;
            cell = groupCell;
            label = (i) => data.groups[i]?.name ?? "";
            caption = `Each cell counts the ${words.boxes} of the row ${words.group} that use something in the column ${words.group}. Select a cell to see them.`;
        } else if (!hasBoxLinks) {
            const [r, c] = mx;
            const list = (byGroup[r] ?? []).filter((id) => (data.boxes[id]?.ug ?? []).includes(c));
            return `<div class="vcrumbs"><button type="button" class="btn" data-mx-up>Back to the ${words.groups}</button><span>${list.length} ${words.boxes} of ${esc(data.groups[r]?.name ?? "")} use ${esc(data.groups[c]?.name ?? "")}</span></div><ul class="vlist-plain">${list.map((id) => `<li>${esc(data.boxes[id]?.n ?? "")}</li>`).join("")}</ul>`;
        } else {
            rows = byGroup[mx[0]] ?? [];
            cols = byGroup[mx[1]] ?? [];
            cell = (r, c) => (data.boxes[r]?.u.includes(c) ? 1 : 0);
            label = (i) => data.boxes[i]?.n ?? "";
            caption = `${data.groups[mx[0]]?.name ?? ""} (rows) uses ${data.groups[mx[1]]?.name ?? ""} (columns)`;
        }
        const crumbs = `<div class="vcrumbs"><button type="button" class="btn" data-mx-up ${mx === undefined ? "disabled" : ""}>Back to the ${words.groups}</button><span>${esc(caption)}</span></div>`;
        const max = Math.max(1, ...rows.flatMap((r) => cols.map((c) => cell(r, c))));
        const head = Math.max(...cols.map((c) => label(c).length), 4) * 7 + 12;
        let html = `${crumbs}<table class="vmatrix"><caption class="visually-hidden">${esc(caption)}</caption><thead><tr><th><span class="visually-hidden">${words.group}</span></th>${cols.map((c) => `<th class="c" scope="col" style="height:${head}px"><div>${esc(label(c))}</div></th>`).join("")}</tr></thead><tbody>`;
        for (const r of rows) {
            html += `<tr><th class="r" scope="row">${esc(label(r))}</th>`;
            for (const c of cols) {
                const value = cell(r, c);
                const strength = value === 0 ? 0 : 15 + (70 * value) / max;
                html += value === 0 ? "<td></td>" : `<td class="n" style="--strength:${strength}%">${mx === undefined ? `<button type="button" data-mx="${r},${c}" aria-label="${esc(label(r))} uses ${esc(label(c))}: ${value}">${value}</button>` : `<span aria-label="yes">&#x25CF;</span>`}</td>`;
            }
            html += "</tr>";
        }
        return `${html}</tbody></table>`;
    };
    const table = () => {
        const f = state.filter.toLowerCase();
        const rows = data.boxes.map((box, at) => ({ box, at })).filter(({ box }) => (state.group === "" || String(box.g) === state.group) && (f === "" || box.n.toLowerCase().includes(f)));
        const names = (ids: readonly number[], groups: readonly number[]) => [...ids.map((id) => data.boxes[id]?.n ?? ""), ...groups.map((id) => `the ${words.group} ${data.groups[id]?.name ?? ""}`)].join(", ") || "nothing";
        // A control earns its place only on a long list: a table of a few dozen rows is read, not filtered.
        const long = data.boxes.length > FILTER_ABOVE;
        const controls = long ? `<label class="visually-hidden" for="vflt">Filter the ${words.boxes}</label><input id="vflt" type="search" placeholder="Filter the ${words.boxes}" value="${esc(state.filter)}"><label class="visually-hidden" for="vgrp">${words.group}</label><select id="vgrp"><option value="">All ${words.groups}</option>${data.groups.map((g, i) => `<option value="${i}" ${state.group === String(i) ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select>` : "";
        return `<div class="vcrumbs">${controls}<span>${rows.length} of ${data.boxes.length} ${words.boxes}</span></div><table class="vtable-text table"><thead><tr><th>${words.box}</th><th>${words.group}</th><th>Uses</th><th>Used by</th></tr></thead><tbody>${rows.map(({ box, at }) => `<tr><td>${esc(box.n)}</td><td>${esc(data.groups[box.g]?.name ?? "")}</td><td>${esc(names(box.u, box.ug ?? []))}</td><td>${esc(names(usedBy[at] ?? [], []))}</td></tr>`).join("")}</tbody></table>`;
    };

    /* ----- the side panel ----- */
    const aside = () => {
        const sel = state.sel;
        if (state.view !== "map") return `<h3>${state.view === "matrix" ? "Matrix" : "Table"}</h3><p>The same ${words.groups} and ${words.boxes} as the map, as ${state.view === "matrix" ? "counts" : "text"}.</p>`;
        if (sel === undefined) return `<h3>${esc(options.title)}</h3><p>${data.groups.length} ${words.groups}, ${data.boxes.length} ${words.boxes}. Open a ${words.group} to see its ${words.boxes}; select a ${words.box} to see what it touches.</p>`;
        if (sel.kind === "box") {
            const box = data.boxes[sel.id] as Box;
            const uses = [...box.u.map((id) => data.boxes[id]?.n ?? ""), ...(box.ug ?? []).map((id) => `the ${words.group} ${data.groups[id]?.name ?? ""}`)];
            const users = (usedBy[sel.id] ?? []).map((id) => data.boxes[id]?.n ?? "");
            return `<h3>${esc(box.n)}</h3><p>${esc(data.groups[box.g]?.name ?? "")}</p>${box.note === undefined || box.note === "" ? "" : `<p class="muted">${esc(box.note)}</p>`}<h4>Uses (${uses.length})</h4><ul>${uses.map((n) => `<li>${esc(n)}</li>`).join("") || "<li>nothing</li>"}</ul><h4>Used by (${users.length})</h4><ul>${users.map((n) => `<li>${esc(n)}</li>`).join("") || "<li>nothing</li>"}</ul>`;
        }
        const outs = [...groupLinks].filter(([key]) => key.startsWith(`${sel.id}>`));
        const ins = [...groupLinks].filter(([key]) => key.endsWith(`>${sel.id}`));
        return `<h3>${esc(data.groups[sel.id]?.name ?? "")}</h3><p>${byGroup[sel.id]?.length ?? 0} ${words.boxes}</p>${data.groups[sel.id]?.note === undefined ? "" : `<p class="muted">${esc(data.groups[sel.id]?.note ?? "")}</p>`}<h4>Relies on</h4><ul>${outs.map(([key, v]) => `<li>${esc(data.groups[Number(key.split(">")[1])]?.name ?? "")} (${v.pairs.length})</li>`).join("") || "<li>nothing</li>"}</ul><h4>Relied on by</h4><ul>${ins.map(([key, v]) => `<li>${esc(data.groups[Number(key.split(">")[0])]?.name ?? "")} (${v.pairs.length})</li>`).join("") || "<li>nothing</li>"}</ul>`;
    };

    /* ----- the page ----- */
    const stage = h("div", { class: "viewer-stage", tabindex: "0", role: "region", "aria-label": `${options.title}, drawing` });
    const side = h("aside", { class: "viewer-aside", "aria-live": "polite", "aria-label": "Selection" });
    const hud = h("p", { class: "viewer-hud muted", "aria-live": "off" });
    const seg = (view: typeof state.view, text: string) => h("button", { type: "button", class: "seg", "data-view": view, "aria-pressed": "false", onclick: () => void go(view) }, text);
    const zoomIn = h("button", { type: "button", class: "btn", "aria-label": "Zoom in", onclick: () => zoomBy(1.25) }, "+");
    const zoomOut = h("button", { type: "button", class: "btn", "aria-label": "Zoom out", onclick: () => zoomBy(0.8) }, "−");
    const fitButton = h("button", { type: "button", class: "btn", title: "Show the drawing whole if it fits at 100 %, otherwise at 100 % from the open group", onclick: () => fit() }, "Fit");
    const reset = h("button", { type: "button", class: "btn", onclick: () => ((state.open.clear(), (state.sel = undefined)), void go("map")) }, `Close all ${words.groups}`);
    const views = h("div", { class: "segmented", role: "group", "aria-label": "How to show it" }, seg("map", "Map"), seg("matrix", "Matrix"), seg("table", "Table"));
    const zoom = h("div", { class: "zoom", role: "group", "aria-label": "Zoom" }, zoomOut, zoomIn, fitButton);
    const bar = h("div", { class: "viewer-bar" }, views, zoom, reset, hud);
    const root = h("div", { class: "viewer" }, bar, h("div", { class: "viewer-body" }, stage, side));
    host.replaceChildren(root);

    const apply = () => {
        const world = stage.querySelector<HTMLElement>(".viewer-world");
        if (world !== null) world.style.transform = `translate(${state.tx}px,${state.ty}px) scale(${state.scale})`;
        zoomOut.disabled = state.scale <= 1.0001;
        measure();
    };
    const zoomBy = (factor: number, cx?: number, cy?: number) => {
        const box = stage.getBoundingClientRect();
        const x = cx ?? box.width / 2;
        const y = cy ?? box.height / 2;
        const next = Math.min(3, Math.max(1, state.scale * factor));
        state.tx = x - ((x - state.tx) * next) / state.scale;
        state.ty = y - ((y - state.ty) * next) / state.scale;
        state.scale = next;
        apply();
    };
    const fit = () => {
        if (laid === undefined) return;
        const box = stage.getBoundingClientRect();
        state.scale = 1;
        state.tx = laid.width + 24 < box.width ? (box.width - laid.width) / 2 : 12;
        state.ty = laid.height + 24 < box.height ? (box.height - laid.height) / 2 : 12;
        apply();
        say(laid.width + 24 > box.width || laid.height + 24 > box.height ? "The drawing is larger than the room, so it is shown at 100 percent" : "The drawing fits");
    };
    const focusRect = (rect: Rect) => {
        const box = stage.getBoundingClientRect();
        state.scale = 1;
        state.tx = rect.w + 24 < box.width ? box.width / 2 - (rect.x + rect.w / 2) : 12 - rect.x;
        state.ty = rect.h + 24 < box.height ? box.height / 2 - (rect.y + rect.h / 2) : 12 - rect.y;
        apply();
    };

    /**
     * The smallest text on the diagram, as it is drawn: a text's font size times the scale of the drawing it sits in.
     * @returns the size in pixels, and the words of the smallest text
     */
    const minTextPx = () => {
        let min = Number.POSITIVE_INFINITY;
        let who = "";
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
            const text = (node.nodeValue ?? "").trim();
            const el = node.parentElement;
            if (text === "" || el === null || el.closest(".visually-hidden,title,option,script,style,.viewer-hud") !== null) continue;
            let px = Number.parseFloat(getComputedStyle(el).fontSize);
            if (el instanceof SVGElement) {
                const matrixOf = (el as unknown as SVGGraphicsElement).getScreenCTM();
                if (matrixOf === null) continue;
                px *= Math.hypot(matrixOf.a, matrixOf.b);
            } else if (el.getClientRects().length === 0) continue;
            if (px < min) {
                min = px;
                who = text.slice(0, 30);
            }
        }
        return { px: Number.isFinite(min) ? Math.round(min * 100) / 100 : 0, who };
    };
    const measure = () => {
        const m = minTextPx();
        const frame = stage.getBoundingClientRect();
        const drawn = [...stage.querySelectorAll(".box")];
        const inView = drawn.filter((el) => {
            const r = el.getBoundingClientRect();
            return r.right > frame.left && r.left < frame.right && r.bottom > frame.top && r.top < frame.bottom;
        }).length;
        hud.textContent = state.view === "map" ? `Smallest text ${m.px} px · ${drawn.length} boxes drawn, ${inView} in view · zoom ${Math.round(state.scale * 100)} %` : `Smallest text ${m.px} px`;
        return { minTextPx: m.px, smallest: m.who, boxesDrawn: drawn.length, boxesInView: inView, scale: state.scale, view: state.view };
    };

    const render = async () => {
        for (const button of views.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.view === state.view));
        zoom.hidden = state.view !== "map";
        reset.hidden = state.view !== "map";
        if (state.view === "map") {
            if (laid === undefined || laid === null) laid = await layoutMap();
            stage.innerHTML = `<div class="viewer-world">${drawMap()}</div>`;
            apply();
        } else {
            stage.innerHTML = `<div class="viewer-sheet">${state.view === "matrix" ? matrix() : table()}</div>`;
            if (state.view === "table") {
                const input = stage.querySelector<HTMLInputElement>("#vflt");
                if (input !== null && state.filter !== "") {
                    input.focus();
                    input.setSelectionRange(input.value.length, input.value.length);
                }
            }
            measure();
        }
        side.innerHTML = aside();
    };
    const go = async (view: typeof state.view) => {
        state.view = view;
        await render();
    };
    const relayout = async () => {
        laid = await layoutMap();
        await render();
    };

    stage.addEventListener("click", (event) => {
        const target = event.target as Element;
        const mx = target.closest<HTMLElement>("[data-mx]");
        if (mx !== null) {
            const [r, c] = (mx.dataset.mx ?? "0,0").split(",").map(Number) as [number, number];
            state.mx = [r, c];
            void render();
            return;
        }
        if (target.closest("[data-mx-up]") !== null) {
            state.mx = undefined;
            void render();
            return;
        }
        if (state.view !== "map") return;
        const toggle = target.closest<HTMLElement>("[data-toggle]");
        if (toggle !== null) {
            const group = Number(toggle.dataset.toggle);
            state.open.delete(group);
            state.sel = undefined;
            void relayout().then(fit);
            return;
        }
        const select = target.closest<HTMLElement>("[data-select]");
        if (select !== null) {
            state.sel = { kind: "box", id: Number(select.dataset.select) };
            void render().then(() => say(`${data.boxes[state.sel?.id ?? 0]?.n ?? ""} selected`));
            return;
        }
        const open = target.closest<HTMLElement>("[data-open]");
        if (open !== null) {
            const group = Number(open.dataset.open);
            state.open.add(group);
            state.sel = undefined;
            void relayout().then(() => {
                const rect = laid?.boxes.get(`g${group}`);
                if (rect !== undefined) focusRect(rect);
                if ((byGroup[group]?.length ?? 0) > MAX_BOXES) say(`Showing the first ${MAX_BOXES} of ${byGroup[group]?.length ?? 0}; the rest are in the table`);
            });
            return;
        }
        if (state.sel !== undefined) {
            state.sel = undefined;
            void render();
        }
    });
    stage.addEventListener("keydown", (event) => {
        const target = event.target as Element;
        if ((event.key === "Enter" || event.key === " ") && target.matches("[role=button]")) {
            event.preventDefault();
            (target as unknown as SVGElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
            return;
        }
        if (state.view !== "map") return;
        const step = 48;
        if (event.key === "ArrowLeft") state.tx += step;
        else if (event.key === "ArrowRight") state.tx -= step;
        else if (event.key === "ArrowUp") state.ty += step;
        else if (event.key === "ArrowDown") state.ty -= step;
        else if (event.key === "+" || event.key === "=") zoomBy(1.25);
        else if (event.key === "-") zoomBy(0.8);
        else if (event.key === "0") fit();
        else if (event.key === "Escape" && state.sel !== undefined) {
            state.sel = undefined;
            void render();
            return;
        } else return;
        event.preventDefault();
        apply();
    });
    stage.addEventListener("input", (event) => {
        const target = event.target as HTMLInputElement;
        if (target.id === "vflt") {
            state.filter = target.value;
            void render();
        }
    });
    stage.addEventListener("change", (event) => {
        const target = event.target as HTMLSelectElement;
        if (target.id === "vgrp") {
            state.group = target.value;
            void render();
        }
    });
    let drag: { x: number; y: number; tx: number; ty: number; moved: boolean } | undefined;
    stage.addEventListener("pointerdown", (event) => {
        if (state.view === "map" && (event.target as Element).closest("[role=button]") === null) drag = { x: event.clientX, y: event.clientY, tx: state.tx, ty: state.ty, moved: false };
    });
    window.addEventListener("pointermove", (event) => {
        if (drag === undefined) return;
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
        if (drag.moved) {
            state.tx = drag.tx + dx;
            state.ty = drag.ty + dy;
            apply();
        }
    });
    window.addEventListener("pointerup", () => setTimeout(() => (drag = undefined), 0));
    stage.addEventListener(
        "wheel",
        (event) => {
            if (state.view !== "map" || !(event.ctrlKey || event.metaKey)) return;
            event.preventDefault();
            const rect = stage.getBoundingClientRect();
            zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15, event.clientX - rect.left, event.clientY - rect.top);
        },
        { passive: false },
    );
    const controls = {
        minTextPx: () => minTextPx().px,
        metrics: measure,
        state,
        open: async (group: number) => {
            state.open.add(group);
            await relayout();
            const rect = laid?.boxes.get(`g${group}`);
            if (rect !== undefined) focusRect(rect);
            return measure();
        },
        select: async (kind: "box" | "group", id: number) => {
            state.sel = { kind, id };
            await render();
            return measure();
        },
        view: async (view: typeof state.view) => {
            await go(view);
            return measure();
        },
        fit: () => {
            fit();
            return measure();
        },
    };
    (window as unknown as { diagram?: typeof controls; minTextPx?: () => number }).diagram = controls;
    (window as unknown as { minTextPx?: () => number }).minTextPx = controls.minTextPx;
    await render();
    fit();
    return controls;
};
