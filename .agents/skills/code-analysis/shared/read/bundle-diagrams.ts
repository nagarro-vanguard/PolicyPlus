import type { BundlePayload } from "../model/schemas/bundle-payload";
import { overlaps } from "./bundle-places";
import { specificCapabilities, type Payloads, type Slice } from "./bundle-slice";

type Life = BundlePayload["lifecycles"][number];

/**
 * A label safe inside a Mermaid quoted label: no quotes, brackets or runs of space.
 * @param text the text
 * @returns the cleaned text
 */
const label = (text: string) =>
    [...text]
        .map((char) => (char === '"' ? "'" : "[](){}<>|".includes(char) || char.trim() === "" ? " " : char))
        .join("")
        .split(" ")
        .filter((word) => word !== "")
        .join(" ");

/**
 * A diagram as a fenced Mermaid block.
 * @param lines the diagram's lines
 * @returns the block's lines
 */
const fenced = (lines: readonly string[]) => ["```mermaid", ...lines, "```"];

/**
 * Add a value to the set kept under a key, making the set when the key is new.
 * @param sets the sets by key
 * @param key the key
 * @param value the value
 */
const addTo = (sets: Map<string, Set<string>>, key: string, value: string) => {
    const set = sets.get(key);
    if (set === undefined) {
        sets.set(key, new Set([value]));
    } else {
        set.add(value);
    }
};

/**
 * The layers of the system and the links between them, with the outside systems they reach, and the layers the slice
 * touches marked.
 * @param payloads everything the analysis wrote
 * @param touched the record ids of the layers the slice touches
 * @returns the diagram's lines
 */
export const systemDiagram = (payloads: Payloads, touched: ReadonlySet<string>) => {
    const { layers, edges, externals } = payloads.system;
    const node = new Map(layers.map((layer, number) => [layer.id, `L${number}`]));
    const lines = ["flowchart LR"];
    for (const layer of layers) {
        lines.push(`  ${node.get(layer.id)}["${label(layer.name)}"]${touched.has(layer.id) ? ":::hit" : ""}`);
    }
    const joined = new Map<string, Set<string>>();
    for (const edge of edges) {
        const from = node.get(edge.from);
        const to = node.get(edge.to);
        if (from !== undefined && to !== undefined && from !== to) {
            addTo(joined, `${from} ${to}`, edge.kind);
        }
    }
    for (const [key, kinds] of joined) {
        const [from, to] = key.split(" ");
        lines.push(`  ${from} -->|"${[...kinds].toSorted().join(", ")}"| ${to}`);
    }
    externals.forEach((external, number) => {
        lines.push(`  X${number}[("${label(external.name)}")]`);
        const reach = new Map<string, Set<string>>();
        for (const each of external.reach) {
            const from = node.get(each.layer);
            if (from !== undefined) {
                addTo(reach, from, each.access);
            }
        }
        for (const [from, access] of reach) {
            lines.push(`  ${from} -.->|"${[...access].toSorted().join(", ")}"| X${number}`);
        }
    });
    lines.push("  classDef hit fill:#fde68a,stroke:#b45309,color:#1f2937");
    return fenced(lines);
};

type Use = { readonly name: string; readonly reads: boolean; readonly saves: boolean };

/**
 * The kinds of data a slice reads or saves, with how.
 * @param payloads everything the analysis wrote
 * @param slice the slice
 * @returns the kinds of data by record id, each with its name and how it is used
 */
export const dataOf = (payloads: Payloads, slice: Slice) => {
    const used = new Map<string, Use>();
    for (const access of payloads.index.access) {
        if (slice.blocks.has(access.block)) {
            const before = used.get(access.entity.id);
            const found = before === undefined ? { name: access.entity.name, reads: false, saves: false } : before;
            used.set(access.entity.id, {
                name: found.name,
                reads: found.reads || access.kind === "reads",
                saves: found.saves || access.kind === "saves",
            });
        }
    }
    return used;
};

/**
 * How a kind of data is used, in words.
 * @param use the use
 * @returns `reads`, `saves` or `reads and saves`
 */
export const howUsed = (use: Use) => [use.reads ? "reads" : "", use.saves ? "saves" : ""].filter(Boolean).join(" and ");

/**
 * The lines of the diagram of a screen: its capabilities, the screens that open it and those it opens, and its data.
 * @param slice the slice
 * @param data the kinds of data the slice uses
 * @returns the lines
 */
const screenPosition = (slice: Slice, data: ReadonlyMap<string, Use>) => {
    const lines = [`  S0["${label(slice.title)}"]:::hit`];
    slice.openedBy.forEach((each, number) => {
        lines.push(`  P${number}["${label(each.screen.name)}"] -->|"${each.how}"| S0`);
    });
    slice.opens.forEach((each, number) => {
        lines.push(`  N${number}["${label(each.screen.name)}"]`, `  S0 -->|"${each.how}"| N${number}`);
    });
    [...data].forEach(([, use], number) => lines.push(`  S0 -.->|"${howUsed(use)}"| E${number}`));
    slice.capabilities.forEach((capability, number) => {
        lines.push(`  C${number}(["${label(capability.capability.name)}"])`, `  C${number} --- S0`);
    });
    return lines;
};

/**
 * The lines of the diagram of a capability: its screens, its data and the capabilities it shares code with.
 * @param slice the slice
 * @param data the kinds of data the slice uses
 * @returns the lines
 */
const capabilityPosition = (slice: Slice, data: ReadonlyMap<string, Use>) => {
    const lines = [`  C0(["${label(slice.title)}"]):::hit`];
    slice.screens.forEach((screen, number) => {
        lines.push(`  S${number}["${label(screen.name)}"]`, `  C0 --> S${number}`);
    });
    [...data].forEach(([, use], number) => lines.push(`  C0 -.->|"${howUsed(use)}"| E${number}`));
    [...specificCapabilities(slice)].forEach(([name, rules], number) => {
        lines.push(`  D${number}(["${label(name)}"])`, `  C0 -.->|"shares ${rules} rules"| D${number}`);
    });
    return lines;
};

/**
 * Where the slice sits: a capability's screens and the data and capabilities around it, or a screen's neighbours.
 * @param payloads everything the analysis wrote
 * @param slice the slice
 * @returns the diagram's lines
 */
export const positionDiagram = (payloads: Payloads, slice: Slice) => {
    const data = dataOf(payloads, slice);
    return fenced([
        "flowchart LR",
        ...[...data].map(([, use], number) => `  E${number}[("${label(use.name)}")]`),
        ...(slice.kind === "screen" ? screenPosition(slice, data) : capabilityPosition(slice, data)),
        "  classDef hit fill:#fde68a,stroke:#b45309,color:#1f2937",
    ]);
};

/**
 * The life of one kind of data as a state diagram, each change of state named by its short id.
 * @param life the life
 * @param short the short id of a change of state
 * @returns the diagram's lines
 */
export const lifeDiagram = (life: Life, short: (id: string) => string) => {
    const lines = ["stateDiagram-v2", "  direction LR"];
    life.states.forEach((state, number) => lines.push(`  state "${label(state)}" as s${number + 1}`));
    for (const transition of life.transitions) {
        const from = transition.from.length === 0 ? ["[*]"] : transition.from.map((number) => `s${number}`);
        for (const origin of from) {
            lines.push(`  ${origin} --> s${transition.to} : ${short(transition.id)}`);
        }
    }
    return fenced(lines);
};

/**
 * Whether a change of state is written inside code the slice runs.
 * @param slice the slice
 * @param transition the change of state
 * @returns true when its lines overlap a block of the slice
 */
export const inSlice = (slice: Slice, transition: Life["transitions"][number]) =>
    [...slice.blocks.values()].some((block) => overlaps(block, transition));
