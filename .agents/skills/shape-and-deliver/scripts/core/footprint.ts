import { dirname, join } from "node:path";
import { Effect, Option, Schema } from "effect";
import ts from "typescript";
import { layerOfPath, readCodebase, type Codebase } from "./codebase";
import { System } from "./system";

/** What the code of one journey reaches, found from the screens that carry its `@user-journey`. */
type Footprint = {
    readonly journey: string;
    /** What the journey is, from the description under its `@user-journey` tag: who, steps, outcome and failures; undefined when it has none. */
    readonly description: string | undefined;
    /** The screens that carry the journey's tag, relative to the codebase root. */
    readonly routes: readonly string[];
    /** Every file reached from them through imports, and the other layers' files of the same capabilities. */
    readonly files: readonly { readonly path: string; readonly layer: string | undefined }[];
    /** The business terms the reached `model.ts` files define, with the sentence each carries. */
    readonly terms: readonly { readonly name: string; readonly file: string; readonly definition: string }[];
    /** The tests of the reached files, beside them, and the journey's own suite, when they exist. */
    readonly suites: readonly string[];
    /** Where the trace ended because an import could not be followed, so a person looks there. */
    readonly stops: readonly string[];
};

const extensions = [".ts", ".tsx"];

/**
 * A name as the file system spells it: lower case words joined by hyphens, as a journey's suite is named.
 * @param name the journey's name, in the product owner's words
 * @returns the kebab-case name
 */
const kebabOf = (name: string) =>
    name
        .toLowerCase()
        .split("")
        .map((char) => ((char >= "a" && char <= "z") || (char >= "0" && char <= "9") ? char : " "))
        .join("")
        .split(" ")
        .filter((word) => word !== "")
        .join("-");

/**
 * The journeys a source text names with `@user-journey`.
 * @param text a file's text
 * @returns each journey's name, as written, in order
 */
const journeysIn = (text: string) =>
    text
        .split("\n")
        .map((line) => line.split("@user-journey")[1])
        .flatMap((rest) => (rest === undefined ? [] : [rest.replace("*/", "").trim()]))
        .filter((name) => name !== "");

/**
 * The description written under a journey's `@user-journey` tag: the lines after it up to the next tag or the end of
 * the comment.
 * @param text a route file's text
 * @param journey the journey's name, as written on its tag
 * @returns the description's lines without their comment marks, or undefined when no tag names the journey
 */
const descriptionIn = (text: string, journey: string) => {
    const lines = text.split("\n").map((line) => line.replace(/^\s*(\/\*\*|\*\/|\*)\s?/, "").trimEnd());
    const at = lines.findIndex((line) => line.toLowerCase() === `@user-journey ${journey}`.toLowerCase());
    if (at < 0) {
        return undefined;
    }
    const rest = lines.slice(at + 1);
    const next = rest.findIndex((line) => line.startsWith("@") || line.startsWith("export "));
    return (next < 0 ? rest : rest.slice(0, next)).join("\n").trim();
};

/**
 * The name a top-level statement declares.
 * @param statement the statement
 * @param source the file it is in
 * @returns the name, or undefined for a statement that declares none
 */
const nameOf = (statement: ts.Statement, source: ts.SourceFile) => {
    if (ts.isVariableStatement(statement)) {
        return statement.declarationList.declarations[0]?.name.getText(source);
    }
    if (
        ts.isClassDeclaration(statement) ||
        ts.isFunctionDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isEnumDeclaration(statement)
    ) {
        return statement.name?.text;
    }
    return undefined;
};

/**
 * The exported business terms of a model file that carry a `@definition`.
 * @param text the model file's text
 * @returns each term's name and the sentence of its definition
 */
const termsIn = (text: string) => {
    const source = ts.createSourceFile("model.ts", text, ts.ScriptTarget.Latest, true);
    return source.statements.flatMap((statement) => {
        const exported = ts.canHaveModifiers(statement)
            ? (ts.getModifiers(statement) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
            : false;
        const definition = ts.getJSDocTags(statement).find((tag) => tag.tagName.text === "definition");
        const name = nameOf(statement, source);
        return exported && definition !== undefined && name !== undefined
            ? [{ name, definition: ts.getTextOfJSDocComment(definition.comment) ?? "" }]
            : [];
    });
};

/**
 * The capability a path belongs to: the folder under `src/` (or `src/features/`), named alike in every layer.
 * @param path a path relative to the codebase root
 * @returns the capability's name, or undefined when the path is not in one
 */
const capabilityOf = (path: string) => {
    const parts = path.split("/");
    const at = parts.indexOf("src");
    if (at < 0) {
        return undefined;
    }
    const next = parts[at + 1] === "features" ? parts[at + 2] : parts[at + 1];
    return next !== undefined && !next.includes(".") && next !== "routes" && !next.startsWith("-") ? next : undefined;
};

/**
 * A path without its source extension.
 * @param path the path
 * @returns the path up to `.ts` or `.tsx`
 */
const withoutExtension = (path: string) => {
    const found = extensions.find((extension) => path.endsWith(extension));
    return found === undefined ? path : path.slice(0, -found.length);
};

/**
 * Finds the file a module specifier names, trying the extensions and an index file.
 * @param base the path the specifier points at, without an extension
 * @returns the file's path, or undefined when none exists
 */
const fileAt = Effect.fnUntraced(function* (base: string) {
    const system = yield* System;
    const candidates = [base, ...extensions.map((extension) => `${base}${extension}`)];
    const indexes = extensions.map((extension) => join(base, `index${extension}`));
    for (const candidate of [...candidates, ...indexes]) {
        if ((yield* system.exists(candidate)) && !(yield* system.isFolder(candidate))) {
            return candidate;
        }
    }
    return undefined;
});

const Manifest = Schema.fromJsonString(
    Schema.Struct({
        exports: Schema.optionalKey(Schema.Union([Schema.String, Schema.Record(Schema.String, Schema.Unknown)])),
    }),
);

/**
 * The string targets of a package manifest's `exports`, by the path they serve.
 * @param text the manifest's JSON text
 * @returns each exported path and the file it names; empty when there are none
 */
const exportsOf = (text: string): Readonly<Record<string, string>> => {
    const exported = Option.getOrUndefined(Schema.decodeUnknownOption(Manifest)(text))?.exports;
    const table = typeof exported === "string" ? { ".": exported } : (exported ?? {});
    return Object.fromEntries(
        Object.entries(table).flatMap(([path, value]) => (typeof value === "string" ? [[path, value]] : [])),
    );
};

/**
 * What a `*` in an exports path stands for, for a path that matches it.
 * @param pattern the exports path, which may hold one `*`
 * @param key the path asked for
 * @returns the text the `*` stands for ("" for a pattern without one that equals the key), or undefined when no match
 */
const starOf = (pattern: string, key: string) => {
    if (!pattern.includes("*")) {
        return pattern === key ? "" : undefined;
    }
    const [head = "", tail = ""] = pattern.split("*");
    return key.startsWith(head) && key.endsWith(tail) && key.length >= head.length + tail.length
        ? key.slice(head.length, key.length - tail.length)
        : undefined;
};

/**
 * Resolves an import to a file of the codebase: a relative one, or one of a workspace package by its `exports`.
 * @param codebase the codebase
 * @param from the importing file, absolute
 * @param specifier the module specifier
 * @returns the file's absolute path; undefined for a library; "stop" when it names the codebase but cannot be followed
 */
const resolveImport = Effect.fnUntraced(function* (codebase: Codebase, from: string, specifier: string) {
    const system = yield* System;
    if (specifier.startsWith(".")) {
        return (yield* fileAt(join(dirname(from), specifier))) ?? "stop";
    }
    if (!specifier.startsWith("@continuum/")) {
        return undefined;
    }
    const [name = "", ...sub] = specifier.slice("@continuum/".length).split("/");
    const layer = codebase.layers.find((each) => each.name === name);
    if (layer === undefined) {
        return "stop";
    }
    const manifest = join(codebase.root, layer.path, "package.json");
    const table = (yield* system.exists(manifest)) ? exportsOf(yield* system.readText(manifest)) : {};
    const key = sub.length === 0 ? "." : `./${sub.join("/")}`;
    const target = Object.entries(table).flatMap(([pattern, value]) => {
        const star = starOf(pattern, key);
        return star === undefined ? [] : [value.replace("*", star)];
    })[0];
    return target === undefined ? "stop" : ((yield* fileAt(join(codebase.root, layer.path, target))) ?? "stop");
});

/**
 * The source files of a layer, relative to the codebase root: its `src` and `__tests__` folders.
 * @param root the codebase root
 * @param layerPath the layer's path
 * @returns the files' paths
 */
const filesOfLayer = Effect.fnUntraced(function* (root: string, layerPath: string) {
    const system = yield* System;
    const own = [];
    for (const folder of ["src", "__tests__"]) {
        for (const file of yield* system.listFiles(join(root, layerPath, folder))) {
            own.push(join(layerPath, folder, file));
        }
    }
    return own.filter((file) => extensions.some((extension) => file.endsWith(extension)));
});

/**
 * Finds what the code of one journey reaches: the screens that carry its `@user-journey`, every file they import
 * through the codebase's own layers, the other layers' files of the same capabilities, the business terms defined
 * there, and the tests beside them. Nothing is stored; it is derived from the code each time.
 * @param root the codebase root, absolute
 * @param journey the journey's name, compared without case
 * @returns the footprint
 * Fails: CodebaseContractBroken when the codebase's AGENTS.md files do not hold.
 */
export const footprintOf = Effect.fn("Footprint.footprintOf")(function* (root: string, journey: string) {
    const system = yield* System;
    const codebase = yield* readCodebase(root);
    const all = (yield* Effect.forEach(codebase.layers, (layer) => filesOfLayer(root, layer.path))).flat();
    const routes: string[] = [];
    for (const file of all) {
        const tagged = journeysIn(yield* system.readText(join(root, file)));
        if (tagged.some((name) => name.toLowerCase() === journey.toLowerCase())) {
            routes.push(file);
        }
    }
    const reached = new Set(routes.map((route) => join(root, route)));
    const stops: string[] = [];
    const queue = [...reached];
    for (const file of queue) {
        const imported = ts.preProcessFile(yield* system.readText(file), true, true).importedFiles;
        for (const { fileName } of imported) {
            const target = yield* resolveImport(codebase, file, fileName);
            if (target === "stop") {
                stops.push(`${file.slice(root.length + 1)} imports ${fileName}`);
            } else if (target !== undefined && !reached.has(target)) {
                reached.add(target);
                queue.push(target);
            }
        }
    }
    const paths = [...reached].map((file) => file.slice(root.length + 1));
    const capabilities = new Set(paths.flatMap((path) => capabilityOf(path) ?? []));
    const beside = all.filter(
        (file) =>
            !paths.includes(file) &&
            !file.includes("__tests__") &&
            !file.includes(".test.") &&
            capabilities.has(capabilityOf(file) ?? ""),
    );
    const files = [...paths, ...beside].sort().map((path) => ({ path, layer: layerOfPath(codebase, path)?.name }));
    const terms = [];
    for (const { path } of files.filter((file) => file.path.endsWith("/model.ts"))) {
        for (const term of termsIn(yield* system.readText(join(root, path)))) {
            terms.push({ ...term, file: path });
        }
    }
    const kebab = kebabOf(journey);
    const testsBeside = new Set(files.map((known) => `${withoutExtension(known.path)}.test`));
    const suites = all.filter((file) => testsBeside.has(withoutExtension(file)) || file.includes(`journeys/${kebab}.`));
    const described = [];
    for (const route of routes) {
        described.push(descriptionIn(yield* system.readText(join(root, route)), journey));
    }
    const description = described.find((text) => text !== undefined && text !== "");
    return {
        journey,
        description,
        routes,
        files,
        terms,
        suites: suites.sort(),
        stops: stops.sort(),
    } satisfies Footprint;
});

/** Where the journeys are tagged, and the screens that carry none. */
type JourneyRoutes = {
    /** Each journey's name, as written, and the screens that carry it. */
    readonly journeys: Readonly<Record<string, readonly string[]>>;
    /** Screens (route files) with no `@user-journey`: the code reaches them, the index does not. */
    readonly untagged: readonly string[];
};

/**
 * Lists every journey and the screens that carry it, and the screens that carry none, so a journey that has no tag
 * is seen as a gap and not missed.
 * @param root the codebase root, absolute
 * @returns the journeys with their screens, and the untagged screens
 * Fails: CodebaseContractBroken when the codebase's AGENTS.md files do not hold.
 */
export const routesOf = Effect.fn("Footprint.routesOf")(function* (root: string) {
    const system = yield* System;
    const codebase = yield* readCodebase(root);
    const all = (yield* Effect.forEach(codebase.layers, (layer) => filesOfLayer(root, layer.path))).flat();
    const screens = all.filter((file) => {
        const parts = file.split("/");
        const name = parts.at(-1) ?? "";
        return (
            file.endsWith(".tsx") &&
            parts.includes("routes") &&
            !name.startsWith("__") &&
            !parts.some((part) => part.startsWith("-"))
        );
    });
    const journeys: Record<string, string[]> = {};
    const untagged: string[] = [];
    for (const screen of screens) {
        const names = journeysIn(yield* system.readText(join(root, screen)));
        if (names.length === 0) {
            untagged.push(screen);
        }
        for (const name of names) {
            journeys[name] = [...(journeys[name] ?? []), screen];
        }
    }
    return { journeys, untagged } satisfies JourneyRoutes;
});
