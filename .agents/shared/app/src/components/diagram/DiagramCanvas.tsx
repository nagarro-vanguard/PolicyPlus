import ElkApi from "elkjs/lib/elk-api.js";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { loadScript } from "../../scripts/load";

// The drawing of one diagram, the app's one diagram island (`client:visible`): its script is loaded only when a diagram
// comes into view. The layout engine (ELK, about 1.5 MB) runs in a worker made from a `blob:` address, off the page's
// thread; its source is the classic script `_astro/elk-layout.js` the offline packager writes (scripts/package/), read
// once per page, so it works from `file://` too. One grammar for every kind: boxes with their full names (wrapped, never cut), lines
// with arrowheads from one box to another, a line's style for its kind, groups drawn as labelled boundaries, no number on a line. Text keeps the diagram tokens' size; a drawing larger than its frame
// scrolls inside it and is never scaled down. Selecting a box (click, Enter or Space) brightens what it reaches and what
// reaches it, says so in words below the drawing and opens what the box is and says in the page's detail drawer (when the
// page has one). Escape clears the selection.

export type GraphCite = { text: string; href: string | null };
export type GraphNode = {
    id: string;
    label: string;
    /** The frame that holds it, when one does. */
    group: string | null;
    /** What the writer says the box is or does, and the records it rests on. */
    note: string | null;
    cites: readonly GraphCite[];
};
/** A box that holds others, drawn as a frame named for it. */
export type GraphGroup = { id: string; words: string; group: string | null; note: string | null; cites: readonly GraphCite[] };
export type GraphEdge = { from: string; to: string; label: string | null };
export type GraphWords = {
    drawing: string;
    loading: string;
    failed: string;
    scroll: string;
    reaches: string;
    reachedFrom: string;
    nothing: string;
    pick: string;
    noun: string;
    rests: string;
};
export type GraphProps = {
    label: string;
    nodes: readonly GraphNode[];
    groups: readonly GraphGroup[];
    edges: readonly GraphEdge[]; 
    words: GraphWords;
};

type Box = { id: string; x: number; y: number; width: number; height: number; lines: string[] };
type Frame = { id: string; words: string; x: number; y: number; width: number; height: number };
type Line = { key: string; from: string; to: string; label: string | null; labelAt: { x: number; y: number }; path: string };
type Layout = { width: number; height: number; boxes: Box[]; frames: Frame[]; lines: Line[]; lineHeight: number; padX: number; padY: number };

type ElkPoint = { x: number; y: number };
type ElkNode = {
    id: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    children?: ElkNode[];
    edges?: { id: string; sections?: { startPoint: ElkPoint; endPoint: ElkPoint; bendPoints?: ElkPoint[] }[] }[];
};

const maxText = 208;

type Layouter = { layout: (graph: unknown) => Promise<unknown> };
let engine: Promise<Layouter> | undefined;
/** The layout engine in its worker, started once per page and shared by its diagrams. */
const layouter = (): Promise<Layouter> => {
    engine ??= loadScript(`${document.body.dataset.root ?? "./"}_astro/elk-layout.js`).then(() => {
        const source = (self as unknown as { __elkWorker?: string }).__elkWorker;
        if (source === undefined) throw new Error("the layout engine did not load");
        const address = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
        return new ElkApi({ workerFactory: () => new Worker(address) }) as unknown as Layouter;
    });
    engine.catch(() => {
        engine = undefined;
    });
    return engine;
};

/** The pixel size of a length token at the page's root, such as `0.8125rem`. */
const pixels = (value: string) => {
    const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const number = Number.parseFloat(value);
    if (Number.isNaN(number)) return 13;
    return value.trim().endsWith("rem") ? number * root : number;
};

/** A label in lines no wider than the box allows, broken between words (a word longer than a line keeps its line). */
const wrap = (text: string, measure: (text: string) => number): string[] => {
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/).filter((each) => each !== "")) {
        const next = line === "" ? word : `${line} ${word}`;
        if (line !== "" && measure(next) > maxText) {
            lines.push(line);
            line = word;
        } else line = next;
    }
    if (line !== "") lines.push(line);
    return lines.length === 0 ? [text] : lines;
};

const layoutOf = async (props: GraphProps, font: { size: number; family: string }): Promise<Layout> => {
    const context = document.createElement("canvas").getContext("2d");
    const measure = (text: string) => {
        if (context === null) return text.length * font.size * 0.55;
        context.font = `500 ${font.size}px ${font.family}`;
        return context.measureText(text).width;
    };
    const lineHeight = Math.round(font.size * 1.4);
    const padX = 10;
    const padY = 7;
    const known = new Set(props.nodes.map((node) => node.id));
    const lines = new Map<string, Box["lines"]>();
    const sized = (node: GraphNode) => {
        const wrapped = wrap(node.label, measure);
        lines.set(node.id, wrapped);
        return {
            id: node.id,
            width: Math.ceil(Math.max(48, ...wrapped.map(measure)) + 2 * padX),
            height: wrapped.length * lineHeight + 2 * padY,
        };
    };
    const grouped = new Set(props.groups.map((group) => group.id));
    const groupTop = lineHeight + 12;
    // A frame holds the boxes and the frames that name it; a group no frame names, or a loop, is not nested.
    const holds = (parent: string | null): ElkNode[] => [
        ...props.groups
            .filter((group) => (group.group !== null && grouped.has(group.group) ? group.group : null) === parent)
            .map((group) => ({
                id: `group:${group.id}`,
                layoutOptions: { "elk.padding": `[top=${groupTop},left=12,bottom=12,right=12]`, "elk.nodeSize.minimum": `(${Math.ceil(measure(group.words)) + 24}, 0)`, "elk.nodeSize.constraints": "MINIMUM_SIZE" },
                children: holds(group.id),
            })),
        ...props.nodes.filter((node) => (node.group !== null && grouped.has(node.group) ? node.group : null) === parent).map(sized),
    ];
    const children = holds(null);
    const elkId = (id: string) => (grouped.has(id) ? `group:${id}` : id);
    const edges = props.edges
        .filter((edge) => (known.has(edge.from) || grouped.has(edge.from)) && (known.has(edge.to) || grouped.has(edge.to)))
        .map((edge, at) => ({
            id: `edge:${at}`,
            sources: [elkId(edge.from)],
            targets: [elkId(edge.to)],
        }));
    const outs = new Map<string, number>();
    for (const edge of edges) outs.set(edge.sources[0] ?? "", (outs.get(edge.sources[0] ?? "") ?? 0) + 1);
    const fanOut = Math.max(0, ...outs.values());
    const graph = {
        id: "root",
        layoutOptions: {
            "elk.algorithm": "layered",
            "elk.direction": "RIGHT",
            "elk.hierarchyHandling": "INCLUDE_CHILDREN",
            // Right angles read best until one box fans out to many; then straight lines keep each one apart.
            "elk.edgeRouting": fanOut > 8 ? "POLYLINE" : "ORTHOGONAL",
            "elk.layered.spacing.nodeNodeBetweenLayers": "56",
            "elk.spacing.nodeNode": "20",
            "elk.spacing.edgeNode": "14",
            "elk.spacing.edgeEdge": "8",
            "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
            "elk.padding": "[top=16,left=16,bottom=16,right=16]",
            "elk.json.shapeCoords": "ROOT",
            "elk.json.edgeCoords": "ROOT",
        },
        children,
        edges,
    };
    const done = (await (await layouter()).layout(graph)) as ElkNode;
    const boxes: Box[] = [];
    const frames: Frame[] = [];
    const words = new Map(props.groups.map((group) => [`group:${group.id}`, group.words]));
    const visit = (node: ElkNode) => {
        for (const child of node.children ?? []) {
            const shape = { x: child.x ?? 0, y: child.y ?? 0, width: child.width ?? 0, height: child.height ?? 0 };
            const frame = words.get(child.id);
            if (frame !== undefined) frames.push({ id: child.id, words: frame, ...shape });
            else boxes.push({ id: child.id, lines: lines.get(child.id) ?? [], ...shape });
            visit(child);
        }
    };
    visit(done);
    const routed = (done.edges ?? []).flatMap((edge) => {
        const at = Number(edge.id.slice("edge:".length));
        const source = props.edges.filter((each) => (known.has(each.from) || grouped.has(each.from)) && (known.has(each.to) || grouped.has(each.to)))[at];
        const section = edge.sections?.[0];
        if (source === undefined || section === undefined) return [];
        const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
        return [
            {
                key: edge.id,
                from: source.from,
                to: source.to,
                label: source.label,
                labelAt: points[Math.floor(points.length / 2)] ?? section.startPoint,
                path: points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" "),
            },
        ];
    });
    return { width: Math.ceil(done.width ?? 0), height: Math.ceil(done.height ?? 0), boxes, frames, lines: routed, lineHeight, padX, padY };
};

/**
 * The drawing.
 * @param props the graph, its label and the words the drawing says
 * @returns the drawing, laid out once it is in view
 */
export function DiagramCanvas(props: GraphProps) {
    const [layout, setLayout] = useState<Layout | null>(null);
    const [failed, setFailed] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);
    const [overflows, setOverflows] = useState(false);
    const frame = useRef<HTMLDivElement>(null);
    const id = useId().replaceAll(":", "");
    useEffect(() => {
        let live = true;
        const style = getComputedStyle(frame.current ?? document.body);
        const size = pixels(getComputedStyle(document.documentElement).getPropertyValue("--diagram-text") || "0.8125rem");
        layoutOf(props, { size, family: style.fontFamily })
            .then((done) => {
                if (live) setLayout(done);
            })
            .catch(() => {
                if (live) setFailed(true);
            });
        return () => {
            live = false;
        };
    }, [props]);
    useEffect(() => {
        const region = frame.current?.closest<HTMLElement>("[data-diagram-region]");
        if (region === null || region === undefined || layout === null) return;
        const check = () => setOverflows(region.scrollWidth > region.clientWidth + 1 || region.scrollHeight > region.clientHeight + 1);
        check();
        const observer = new ResizeObserver(check);
        observer.observe(region);
        return () => observer.disconnect();
    }, [layout]);
    const names = useMemo(() => new Map([...props.nodes.map((node) => [node.id, node.label] as const), ...props.groups.map((group) => [group.id, group.words] as const)]), [props.nodes, props.groups]);
    const near = useMemo(() => {
        if (selected === null) return null;
        const reaches = props.edges.filter((edge) => edge.from === selected).map((edge) => edge.to);
        const reachedFrom = props.edges.filter((edge) => edge.to === selected).map((edge) => edge.from);
        return { reaches, reachedFrom, all: new Set([selected, ...reaches, ...reachedFrom]) };
    }, [selected, props.edges]);
    const toggle = (node: string) => {
        const now = selected === node ? null : node;
        setSelected(now);
        const box = now === null ? undefined : (props.nodes.find((each) => each.id === now) ?? props.groups.find((each) => each.id === now));
        // The page's drawer, when it has one, says what the writer says the box is and the records it rests on.
        if (box !== undefined && (box.note !== null || box.cites.length > 0)) {
            const root = document.body.dataset.root ?? "./";
            window.dispatchEvent(
                new CustomEvent("view:note", {
                    detail: {
                        noun: props.words.noun,
                        title: "label" in box ? box.label : box.words,
                        body: box.note,
                        rests: props.words.rests,
                        cites: box.cites.map((cite) => ({ text: cite.text, href: cite.href === null ? null : `${root}${cite.href}` })),
                    },
                }),
            );
        }
    };
    const onKey = (node: string) => (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggle(node);
        } else if (event.key === "Escape") setSelected(null);
    };
    const list = (ids: readonly string[]) => (ids.length === 0 ? props.words.nothing : ids.map((each) => names.get(each) ?? "").join(", "));
    if (failed)
        return (
            <p ref={frame} className="p-spacing-lg text-muted-foreground" data-written-by="app">
                {props.words.failed}
            </p>
        );
    if (layout === null)
        return (
            <p ref={frame} className="p-spacing-lg text-muted-foreground" aria-busy="true" data-written-by="app">
                {props.words.loading}
            </p>
        );
    const lineState = (line: Line) =>
        selected === null ? "normal" : line.from === selected ? "uses" : line.to === selected ? "usedby" : "dim";
    const stroke = { normal: "stroke-(--diagram-edge)", uses: "stroke-(--diagram-uses)", usedby: "stroke-(--diagram-usedby)", dim: "stroke-(--diagram-dimmed)" };
    const fill = { normal: "fill-(--diagram-edge)", uses: "fill-(--diagram-uses)", usedby: "fill-(--diagram-usedby)", dim: "fill-(--diagram-dimmed)" };
    const order = (line: Line) => ({ dim: 0, normal: 1, usedby: 2, uses: 3 })[lineState(line)];
    return (
        <div ref={frame} className="flex flex-col">
            <svg
                width={layout.width}
                height={layout.height}
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                role="group"
                aria-label={props.label}
                className="block max-w-none text-(length:--diagram-text) font-medium"
                onKeyDown={(event) => {
                    if (event.key === "Escape") setSelected(null);
                }}
            >
                <defs>
                    {(["normal", "uses", "usedby", "dim"] as const).map((state) => (
                        <marker key={state} id={`${id}-${state}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                            <path d="M0 0 L10 5 L0 10 z" className={fill[state]} />
                        </marker>
                    ))}
                </defs>
                {layout.frames.map((each) => (
                    <g key={each.id}>
                        <rect x={each.x} y={each.y} width={each.width} height={each.height} rx="8" className="fill-(--diagram-group) stroke-(--diagram-box-edge)" strokeDasharray="4 3" />
                        <text
                            x={each.x + 12}
                            y={each.y + layout.lineHeight}
                            role="button"
                            tabIndex={0}
                            aria-label={each.words}
                            className="cursor-pointer fill-(--diagram-box-text) text-(length:--diagram-text-small) font-semibold outline-none"
                            onClick={() => toggle(each.id.slice("group:".length))}
                            onKeyDown={onKey(each.id.slice("group:".length))}
                            data-written-by="agent"
                        >
                            {each.words}
                        </text>
                    </g>
                ))}
                {layout.lines.toSorted((one, other) => order(one) - order(other)).map((line) => {
                    const state = lineState(line);
                    return (
                        <g key={line.key} data-state={state}>
                            <path d={line.path} fill="none" strokeWidth={state === "uses" || state === "usedby" ? 2 : 1.25} className={stroke[state]} markerEnd={`url(#${id}-${state})`} />
                            {line.label === null ? null : (
                                <text x={line.labelAt.x} y={line.labelAt.y - 4} textAnchor="middle" className={state === "dim" ? "fill-(--diagram-dimmed)" : "fill-(--diagram-box-text)"} style={{ paintOrder: "stroke", stroke: "var(--background)", strokeWidth: 3 }} data-written-by="agent">
                                    {line.label}
                                </text>
                            )}
                        </g>
                    );
                })}
                {layout.boxes.map((box) => {
                    const node = props.nodes.find((each) => each.id === box.id);
                    const dim = near !== null && !near.all.has(box.id);
                    const on = selected === box.id;
                    return (
                        <g
                            key={box.id}
                            role="button"
                            tabIndex={0}
                            aria-pressed={on}
                            aria-label={node?.label ?? ""}
                            className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-(--diagram-selected) [&:focus-visible>rect]:stroke-[3]"
                            onClick={() => toggle(box.id)}
                            onKeyDown={onKey(box.id)}
                        >
                            <rect
                                x={box.x}
                                y={box.y}
                                width={box.width}
                                height={box.height}
                                rx="6"
                                strokeWidth={on ? 2.5 : 1}
                                className={`fill-(--diagram-box) ${on ? "stroke-(--diagram-selected)" : dim ? "stroke-(--diagram-dimmed)" : "stroke-(--diagram-box-edge)"}`}
                            />
                            <text className={dim ? "fill-(--diagram-dimmed)" : "fill-(--diagram-box-text)"} data-written-by="agent">
                                {box.lines.map((line, at) => (
                                    <tspan key={`${String(at)}${line}`} x={box.x + layout.padX} y={box.y + layout.padY + (at + 0.78) * layout.lineHeight}>
                                        {line}
                                    </tspan>
                                ))}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <div className="sticky start-0 flex max-w-[min(100%,var(--container-wide))] flex-col gap-spacing-2xs border-t border-border p-spacing-md text-sm" aria-live="polite">
                {near === null || selected === null ? (
                    <p className="text-muted-foreground" data-written-by="app">
                        {props.words.pick}
                    </p>
                ) : (
                    <>
                        <p className="font-medium" data-written-by="agent">
                            {names.get(selected)}
                        </p>
                        <p>
                            <span className="text-(--diagram-uses)" data-written-by="app">
                                {props.words.reaches}
                            </span>{" "}
                            <span data-written-by="agent">{list(near.reaches)}</span>
                        </p>
                        <p>
                            <span className="text-(--diagram-usedby)" data-written-by="app">
                                {props.words.reachedFrom}
                            </span>{" "}
                            <span data-written-by="agent">{list(near.reachedFrom)}</span>
                        </p>
                    </>
                )}
                {overflows ? (
                    <p className="text-muted-foreground" data-written-by="app">
                        {props.words.scroll}
                    </p>
                ) : null}
            </div>
        </div>
    );
}
