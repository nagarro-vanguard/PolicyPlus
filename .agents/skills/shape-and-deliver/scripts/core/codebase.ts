import { join } from "node:path";
import { Effect, Schema } from "effect";
import { isPlainName } from "./contained-path";
import { CodebaseContractBroken } from "./script-errors";
import { System } from "./system";
import { labelled, listItems, quoted, sectionGaps, sections, singleValue, tables, withoutComments } from "./markdown";

const LayerRow = Schema.Struct({
    name: Schema.String.check(Schema.isMinLength(1)),
    path: Schema.String.check(Schema.isMinLength(1)),
    kind: Schema.Literals(["code", "test"]),
    dependsOn: Schema.Array(Schema.String),
});

/** The file every layer of a codebase, and its root, describes itself in: shape-and-deliver's contract with the codebase. */
export const contractFile = "AGENTS.md";

/** A layer of the root AGENTS.md's table. */
export type Layer = typeof LayerRow.Type;

/**
 * Whether a proposed test file is committed before the code: only a test layer's is, because it drives the running
 * product and needs none of the new code. A code layer's tests import the code they test, so they are committed with
 * it, once its functions and arguments exist.
 * @param codebase the codebase
 * @param path the file's path relative to the codebase root
 * @returns true when the file is committed with the tests alone
 */
export const commitsFirst = (codebase: Codebase, path: string) => layerOfPath(codebase, path)?.kind === "test";

/**
 * What the layer that owns screens declares in `## Design variants`; every path is from the codebase
 * root and every command runs from it.
 */
type Screens = {
    readonly layer: string;
    /** Where a story's variants live, with `{story}` for its number; each variant is a folder directly inside it. */
    readonly variants: string;
    /** Where a picked variant may be moved to. */
    readonly pickedTo: readonly string[];
    /** Commands run after a pick, in order. */
    readonly afterPick: readonly string[];
};

/** The `## ` sections of one AGENTS.md, by heading. */
type Sections = ReadonlyMap<string, readonly string[]>;

export type Codebase = {
    readonly root: string;
    readonly layers: readonly Layer[];
    /** The sections of each layer's AGENTS.md, by the layer's name, read once when the codebase is. */
    readonly layerSections: ReadonlyMap<string, Sections>;
    /** What the screens layer declares; undefined when no layer owns screens. */
    readonly screens?: Screens;
    /** The root AGENTS.md's text, which names the conventions the skills ask an agent to follow. */
    readonly rootText: string;
    /** The knowledge base folder the codebase declares, as an absolute path; undefined when it declares none. */
    readonly kbPath: string | undefined;
};

const layerColumns = ["Layer", "Path", "Kind", "Depends on"] as const;

/**
 * Makes the failure for a codebase whose AGENTS.md files break the contract shape-and-deliver reads.
 * @param issue what is wrong, worded for the operator
 * @returns a CodebaseContractBroken carrying the issue
 */
const broken = (issue: string) => new CodebaseContractBroken({ issue });

/**
 * The names a `Depends on` cell lists: comma-separated, `-` or empty for none. A bracketed note after a name narrows
 * how the layer is reached, such as `domain (types only)`, and is not part of the name.
 * @param cell the cell's text
 * @returns the layer names, in order
 */
const dependencyNames = (cell: string) =>
    cell === "-" || cell === ""
        ? []
        : cell
              .split(",")
              .map((name) => (name.includes("(") ? name.slice(0, name.indexOf("(")) : name).trim())
              .filter((name) => name.length > 0);

/**
 * Orders the layers so each comes after every layer it depends on, keeping the table's order otherwise.
 * @param layers the layers as the table lists them
 * @returns the ordered layers
 * Fails: CodebaseContractBroken for a dependency the table does not list, or a cycle.
 */
const inDependencyOrder = Effect.fnUntraced(function* (layers: readonly Layer[]) {
    const names = new Set(layers.map((layer) => layer.name));
    for (const layer of layers) {
        const unknown = layer.dependsOn.find((name) => !names.has(name));
        if (unknown !== undefined) {
            return yield* broken(`layer ${layer.name} depends on ${unknown}, which the Layers table does not list`);
        }
    }
    const ordered: Layer[] = [];
    const placed = new Set<string>();
    while (ordered.length < layers.length) {
        const next = layers.find(
            (layer) => !placed.has(layer.name) && layer.dependsOn.every((name) => placed.has(name)),
        );
        if (next === undefined) {
            const left = layers.filter((layer) => !placed.has(layer.name)).map((layer) => layer.name);
            return yield* broken(`the layers ${left.join(", ")} depend on each other in a cycle`);
        }
        ordered.push(next);
        placed.add(next.name);
    }
    return ordered;
});

/**
 * Reads the layers from the root AGENTS.md's `## Layers` table, checking each row has every column, a valid row
 * shape (a bad kind is the usual cause) and a name used once.
 * @param lines the `## Layers` section's lines
 * @returns the layers in table order
 * Fails: CodebaseContractBroken naming the first problem.
 */
const layersOfTable = Effect.fnUntraced(function* (lines: readonly string[]) {
    const rows = tables(lines)[0] ?? [];
    if (rows.length === 0) {
        return yield* broken(`the root AGENTS.md has no ## Layers table with columns ${layerColumns.join(" | ")}`);
    }
    const layers: Layer[] = [];
    for (const row of rows) {
        const missing = layerColumns.find((column) => !row.has(column));
        if (missing !== undefined) {
            return yield* broken(`the ## Layers table has no ${missing} column`);
        }
        if (!isPlainName(row.get("Layer") ?? "")) {
            return yield* broken(
                `layer name ${row.get("Layer") ?? "?"} is not a plain name; it names a folder of the run's evidence, so it holds no / or ..`,
            );
        }
        const decoded = Schema.decodeUnknownExit(LayerRow)({
            name: row.get("Layer"),
            path: row.get("Path"),
            kind: row.get("Kind"),
            dependsOn: dependencyNames(row.get("Depends on") ?? ""),
        });
        if (decoded._tag === "Failure") {
            return yield* broken(
                `layer ${row.get("Layer") ?? "?"} has kind ${row.get("Kind") ?? "?"}; use code or test`,
            );
        }
        if (layers.some((layer) => layer.name === decoded.value.name)) {
            return yield* broken(`layer ${decoded.value.name} is listed twice`);
        }
        layers.push(decoded.value);
    }
    return layers;
});

/**
 * Reads the `## ` sections of a layer's AGENTS.md, without its comments.
 * @param root the codebase root
 * @param layer the layer
 * @returns its sections
 * Fails: CodebaseContractBroken when the layer has no AGENTS.md.
 */
const readLayerSections = Effect.fnUntraced(function* (root: string, layer: Layer) {
    const system = yield* System;
    const path = join(root, layer.path, contractFile);
    if (!(yield* system.exists(path))) {
        return yield* broken(`layer ${layer.name} has no AGENTS.md at ${path}`);
    }
    return sections(withoutComments(yield* system.readText(path)));
});

/**
 * Lists the commands a section of a layer's AGENTS.md holds, each written as `` - `command` ``.
 * @param own the sections of the layer's AGENTS.md, when read
 * @param section the section's name
 * @returns the commands in order; none when the section is absent
 */
const commandsIn = (own: Sections | undefined, section: string) =>
    listItems(own?.get(section)).flatMap((item) => {
        const command = quoted(item);
        return command ? [command] : [];
    });

/**
 * Requires a layer to list at least one Verify command; the root layer (`.`) may list none, since every other layer's
 * checks exercise its configuration.
 * @param layer the layer
 * @param commands the commands the layer's `## Verify` section lists
 * @returns the commands
 * Fails: CodebaseContractBroken when a layer other than the root layer lists none.
 */
const checkedVerify = Effect.fnUntraced(function* (layer: Layer, commands: readonly string[]) {
    if (commands.length === 0 && layer.path !== ".") {
        return yield* broken(`layer ${layer.name} lists no command under ## Verify, written as - \`command\``);
    }
    return commands;
});

/**
 * Lists the commands of a layer's `## Verify` section, each written as `` - `command` ``.
 * @param codebase the codebase, its layers' sections read
 * @param layer the layer
 * @returns the commands in order
 * Fails: CodebaseContractBroken when a layer other than the root layer lists none.
 */
export const verifyCommands = (codebase: Codebase, layer: Layer) =>
    checkedVerify(layer, commandsIn(codebase.layerSections.get(layer.name), "Verify"));

/**
 * Finds the layer a file belongs to: of the layers whose path holds it, the one with the longest path. A layer at `.`
 * therefore owns only the files no other layer holds, such as a workspace's package.json.
 * @param codebase the codebase
 * @param codebase.layers its layers
 * @param path the file's path relative to the codebase root
 * @returns the layer, or undefined when no layer holds the file
 */
export const layerOfPath = <L extends Pick<Layer, "name" | "path">>(
    codebase: { readonly layers: readonly L[] },
    path: string,
) =>
    codebase.layers
        .filter((layer) => layer.path === "." || path === layer.path || path.startsWith(`${layer.path}/`))
        .toSorted((a, b) => (b.path === "." ? 0 : b.path.length) - (a.path === "." ? 0 : a.path.length))[0];

/**
 * Reads what a layer declares about screens in its `## Design variants` section.
 * @param layer the layer
 * @param bySection the sections of the layer's AGENTS.md
 * @returns the declaration, or undefined when the layer has no such section
 * Fails: CodebaseContractBroken when the section lacks its `Variants:` item.
 */
const screensOf = Effect.fnUntraced(function* (layer: Layer, bySection: Map<string, string[]>) {
    if (!bySection.has("Design variants")) {
        return undefined;
    }
    const items = listItems(bySection.get("Design variants"));
    const variants = labelled(items, "Variants")[0];
    if (variants === undefined) {
        return yield* broken(
            `layer ${layer.name} owns screens, so it lists a \`Variants:\` item under ## Design variants`,
        );
    }
    return {
        layer: layer.name,
        variants,
        pickedTo: labelled(items, "Picked to"),
        afterPick: labelled(items, "After a pick"),
    } satisfies Screens;
});

/**
 * Finds the layers a change affects, in dependency order: the root layer, the layers that hold a changed file, and
 * every layer that depends on one of them, directly or through a chain.
 * @param codebase the codebase
 * @param changed the changed files, relative to the codebase root
 * @returns the affected layers
 */
export const affectedLayers = (codebase: Codebase, changed: readonly string[]) => {
    const affected = new Set([
        ...codebase.layers.filter((layer) => layer.path === ".").map((layer) => layer.name),
        ...changed.flatMap((path) => layerOfPath(codebase, path)?.name ?? []),
    ]);
    for (let grown = true; grown;) {
        const before = affected.size;
        for (const layer of codebase.layers) {
            if (layer.dependsOn.some((name) => affected.has(name))) {
                affected.add(layer.name);
            }
        }
        grown = affected.size > before;
    }
    return codebase.layers.filter((layer) => affected.has(layer.name));
};

/**
 * Reads and checks the codebase's AGENTS.md files: the layers table, the knowledge base folder if declared, and for
 * each layer its folder, AGENTS.md, Verify commands and at most one layer owning screens.
 * @param root the codebase root, as an absolute path
 * @returns the codebase with its layers in dependency order
 * Fails: CodebaseContractBroken naming the first problem.
 */
export const readCodebase = Effect.fn("Codebase.readCodebase")(function* (root: string) {
    const system = yield* System;
    const rootAgent = join(root, contractFile);
    if (!(yield* system.exists(rootAgent))) {
        return yield* broken(`there is no AGENTS.md at ${rootAgent}`);
    }
    const rootText = yield* system.readText(rootAgent);
    const bySection = sections(withoutComments(rootText));
    const layers = yield* inDependencyOrder(yield* layersOfTable(bySection.get("Layers") ?? []));
    const kb = singleValue(bySection.get("Knowledge base"));
    if (kb && !(yield* system.isFolder(join(root, kb)))) {
        return yield* broken(`the root AGENTS.md's ## Knowledge base names ${kb}, which is not a folder`);
    }
    const read: Layer[] = [];
    const bySectionOfLayer = new Map<string, Sections>();
    let screens: Screens | undefined;
    for (const layer of layers) {
        if (!(yield* system.isFolder(join(root, layer.path)))) {
            return yield* broken(`layer ${layer.name}'s path ${layer.path} is not a folder`);
        }
        const own = yield* readLayerSections(root, layer);
        bySectionOfLayer.set(layer.name, own);
        yield* checkedVerify(layer, commandsIn(own, "Verify"));
        const owned = yield* screensOf(layer, own);
        if (owned !== undefined && screens !== undefined) {
            return yield* broken(
                `layers ${screens.layer} and ${layer.name} both list ## Design variants; one layer owns screens`,
            );
        }
        screens = owned ?? screens;
        read.push(layer);
    }
    const codebase: Codebase = {
        root,
        rootText,
        layers: read,
        layerSections: bySectionOfLayer,
        kbPath: kb ? join(root, kb) : undefined,
        ...(screens === undefined ? {} : { screens }),
    };
    return codebase;
});

/** The runs a codebase can be checked for: what each needs of its AGENTS.md files, beyond the layers. */
const runNeeds = {
    "shape-and-deliver": [],
    "shape-and-deliver, reading a story": ["Work tracking"],
} as const;

/**
 * Lists what a run needs that the codebase's AGENTS.md files do not give.
 * @param codebase the codebase, already read
 * @param run which run
 * @param kind the kind of work, for shape-and-deliver: a design also needs a layer that owns screens
 * @returns one sentence per missing section; empty when the run can start
 */
export const contractGaps = (codebase: Codebase, run: keyof typeof runNeeds, kind?: string) => [
    ...sectionGaps(codebase.rootText, runNeeds[run]),
    ...(kind === "design" && codebase.screens === undefined
        ? ["no layer lists ## Design variants, so a design has nowhere to go"]
        : []),
];

/**
 * Reports what a delivery run can and cannot do on a codebase, for a person setting its AGENTS.md files up.
 * @param codebase the codebase, already read
 * @returns `blocked`, how many missing sections stop the run (a missing design layer is not counted), and `lines`,
 * one line each for shape-and-deliver and design, saying `ok` or what is missing
 */
export const contractReport = (codebase: Codebase) => {
    const line = (run: string, gaps: readonly string[]) =>
        `${run}: ${gaps.length === 0 ? "ok" : `blocked: ${gaps.join("; ")}`}`;
    const design = contractGaps(codebase, "shape-and-deliver", "design");
    const screens = design.filter((gap) => gap.startsWith("no layer lists"));
    const own = [
        ...contractGaps(codebase, "shape-and-deliver"),
        ...contractGaps(codebase, "shape-and-deliver, reading a story"),
    ];
    return {
        blocked: own.length,
        lines: [
            line("shape-and-deliver", own),
            screens.length === 0 ? "design: ok" : `design: not available: ${screens.join("; ")}`,
        ],
    };
};
