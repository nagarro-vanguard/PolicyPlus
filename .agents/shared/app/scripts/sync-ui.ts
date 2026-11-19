#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

// The app's components and design values come from Continuum's UI package, never from a hand copy (vendor/README.md).
// This script copies a named list of its components, its hook and its theme (with the fonts the theme loads) into
// vendor/ui/, laid out as the package's own src/ (components flat in components/), so the theme's relative addresses
// and the components' `@continuum/ui/*` imports hold unchanged. It records the source commit and every file's SHA-256
// in vendor/ui/SOURCE.json.
//
// bun scripts/sync-ui.ts [--from <Continuum's packages/ui>]   copy the named list; refuses a dirty source tree, a
//                                                            missing name, or a component that imports one not listed
// bun scripts/sync-ui.ts --check                             fail when a vendored file differs from SOURCE.json,
//                                                            is missing, or is not listed there (a hand edit)

const defaultSource = "/Users/anupvasudeva/me/projects/continuum/packages/ui";
const app = join(import.meta.dir, "..");
const vendor = join(app, "vendor", "ui");
const sourceFile = join(vendor, "SOURCE.json");

/** The components the reader app uses, flat files in the package's src/components/ (the dependencies they import included). */
export const components = [
    "badge",
    "button",
    "details",
    "dialog",
    "dropdown-menu",
    "empty",
    "error-state",
    "field",
    "input",
    "input-group",
    "item",
    "kbd",
    "label",
    "no-data-state",
    "page-opening",
    "separator",
    "sheet",
    "sidebar",
    "skeleton",
    "table",
    "textarea",
    "tooltip",
    "trail",
] as const;
/** The hooks the components above import. */
export const hooks = ["use-mobile"] as const;
/** The theme and the font faces it imports, with the fonts' files and licence. */
export const styles = [
    "theme.css",
    "fonts.css",
    "fonts/mulish-latin-wght-normal.woff2",
    "fonts/mulish-latin-wght-italic.woff2",
    "fonts/mulish-latin-ext-wght-normal.woff2",
    "fonts/mulish-latin-ext-wght-italic.woff2",
    "fonts/ofl.txt",
    "fonts/README.md",
] as const;
/** What the reader app's plan needs that Continuum UI does not hold yet; added there through its registry first, then synced. */
export const notInContinuum = ["command", "combobox", "progress"] as const;

/** Each vendored file's path below vendor/ui/ and below the package's src/. */
export const listed = (): string[] => [
    ...components.map((name) => `components/${name}.tsx`),
    ...hooks.map((name) => `hooks/${name}.ts`),
    ...styles.map((name) => `styles/${name}`),
];

type Source = {
    readonly from: string;
    readonly commit: string;
    readonly components: readonly string[];
    readonly hooks: readonly string[];
    readonly styles: readonly string[];
    readonly notInContinuum: readonly string[];
    readonly files: Readonly<Record<string, string>>;
};

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const walk = (folder: string): string[] =>
    readdirSync(folder).flatMap((name) => {
        const path = join(folder, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });
const git = (cwd: string, ...args: string[]) => {
    const run = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
    if (run.exitCode !== 0) throw new Error(`git ${args.join(" ")} failed in ${cwd}: ${run.stderr.toString().trim()}`);
    return run.stdout.toString().trim();
};

/**
 * The components and hooks a vendored file imports through `@continuum/ui/*` or `./<name>`.
 * @param text the file's source
 * @returns paths below vendor/ui/, such as `components/button.tsx`
 */
export const importsOf = (text: string): string[] =>
    [...text.matchAll(/from\s+["'](?:@continuum\/ui\/(components|hooks)\/([\w-]+)|\.\/([\w-]+))["']/g)].map((hit) =>
        hit[3] !== undefined ? `components/${hit[3]}.tsx` : `${hit[1]}/${hit[2]}.${hit[1] === "hooks" ? "ts" : "tsx"}`,
    );

/**
 * What differs between the vendored files and SOURCE.json: a changed, missing or unlisted file.
 * @returns one line per problem, empty when the folder matches
 */
export const drift = (): string[] => {
    if (!existsSync(sourceFile)) return ["vendor/ui/SOURCE.json is missing: run bun scripts/sync-ui.ts"];
    const recorded = JSON.parse(readFileSync(sourceFile, "utf8")) as Source;
    const problems: string[] = [];
    for (const [path, hash] of Object.entries(recorded.files)) {
        const file = join(vendor, path);
        if (!existsSync(file)) problems.push(`${path} is missing`);
        else if (sha256(readFileSync(file)) !== hash) problems.push(`${path} differs from the synced copy (a hand edit)`);
    }
    for (const file of walk(vendor)) {
        const path = relative(vendor, file).split(sep).join("/");
        if (path !== "SOURCE.json" && recorded.files[path] === undefined) problems.push(`${path} is not in SOURCE.json`);
    }
    const expected = listed().sort();
    const have = Object.keys(recorded.files).sort();
    if (JSON.stringify(expected) !== JSON.stringify(have))
        problems.push("SOURCE.json lists other files than this script names: run bun scripts/sync-ui.ts");
    return problems;
};

const sync = (from: string) => {
    const src = join(from, "src");
    if (!existsSync(src)) throw new Error(`${from} is not Continuum's UI package: it has no src/`);
    const dirty = git(from, "status", "--porcelain", "--", ".");
    if (dirty !== "") throw new Error(`the source tree has uncommitted changes, so no commit names what would be copied:\n${dirty}`);
    const missing = listed().filter((path) => !existsSync(join(src, path)));
    if (missing.length > 0) throw new Error(`not in Continuum UI: ${missing.join(", ")}`);
    const wanted = new Set(listed());
    const unlisted = listed()
        .filter((path) => /\.tsx?$/.test(path))
        .flatMap((path) => importsOf(readFileSync(join(src, path), "utf8")).filter((each) => !wanted.has(each)).map((each) => `${path} imports ${each}`));
    if (unlisted.length > 0) throw new Error(`a listed component imports one that is not listed; add it to the list:\n${unlisted.join("\n")}`);
    const commit = git(from, "rev-parse", "HEAD");
    rmSync(vendor, { recursive: true, force: true });
    const files: Record<string, string> = {};
    for (const path of listed()) {
        const bytes = readFileSync(join(src, path));
        mkdirSync(dirname(join(vendor, path)), { recursive: true });
        writeFileSync(join(vendor, path), bytes);
        files[path] = sha256(bytes);
    }
    const root = git(from, "rev-parse", "--show-toplevel");
    const record: Source = {
        from: relative(root, from).split(sep).join("/"),
        commit,
        components: [...components],
        hooks: [...hooks],
        styles: [...styles],
        notInContinuum: [...notInContinuum],
        files,
    };
    writeFileSync(sourceFile, `${JSON.stringify(record, null, 4)}\n`);
    console.log(`vendor/ui: ${Object.keys(files).length} files from ${record.from} at ${commit.slice(0, 12)}; not in Continuum yet: ${notInContinuum.join(", ")}`);
};

if (import.meta.main) {
    const args = process.argv.slice(2);
    try {
        if (args.includes("--check")) {
            const problems = drift();
            if (problems.length > 0) {
                console.error(`vendor/ui differs from vendor/ui/SOURCE.json; never edit it by hand, sync it again:\n${problems.join("\n")}`);
                process.exit(1);
            }
            console.log("vendor/ui matches SOURCE.json");
        } else {
            const at = args.indexOf("--from");
            sync(at === -1 ? defaultSource : (args[at + 1] ?? defaultSource));
        }
    } catch (error) {
        console.error(`sync-ui: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(2);
    }
}
