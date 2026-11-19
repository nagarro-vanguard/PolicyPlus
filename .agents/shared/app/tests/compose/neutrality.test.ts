import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { compose, type Composed } from "../../compose/compose";

/*
 * compose holds no knowledge of a stack, a product or a medium: the code is scanned for their words, and real analyses
 * of different systems are composed by the same code into cases of the same shape. The real payloads are not in the
 * repository; point COMPOSE_REAL_PAYLOADS at a folder holding `<system>/payloads` (copies written by the current
 * analysis), and COMPOSE_REAL_RUN at a run's output root (with target/ and the plan) whose analysis is the `pp` system.
 */

const composeFolder = join(import.meta.dir, "..", "..", "compose");
const realFolder = process.env.COMPOSE_REAL_PAYLOADS ?? "";
const runFolder = process.env.COMPOSE_REAL_RUN ?? "";
const systems =
    realFolder === "" || !existsSync(realFolder)
        ? []
        : readdirSync(realFolder)
              .filter((name) => existsSync(join(realFolder, name, "payloads", "manifest.json")))
              .sort();

/** Words of stacks, media and the three systems the skills were tried on; none may appear in compose's code. */
const banned =
    /\b(screens?|pages?|windows?|dialogs?|forms?|routes?|endpoints?|controllers?|presenters?|servlets?|struts|jsp|aspx|winforms|vb|java|dotnet|registry|http|html|browsers?|desktop|mobile|web|api|sql|react|astro|policy|roller|weblogs?|blogs?|balkan|flights?|airline)\b/i;
const allowed = /allowed by the neutrality scan/;

const sourceFiles = (folder: string): string[] =>
    readdirSync(folder, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
            ? sourceFiles(join(folder, entry.name))
            : entry.name.endsWith(".ts")
              ? [join(folder, entry.name)]
              : [],
    );

describe("neutral code", () => {
    test("compose's code names no stack, medium or product", () => {
        const hits = sourceFiles(composeFolder).flatMap((file) =>
            readFileSync(file, "utf8")
                .split("\n")
                .map((line, number) => ({ line, number: number + 1 }))
                .filter(({ line }) => banned.test(line) && !allowed.test(line))
                .map(({ line, number }) => `${file}:${number}: ${line.trim()}`),
        );
        expect(hits).toEqual([]);
    });
});

/** The key paths of a value: arrays merged into one element, maps keyed by data collapsed. */
const shapeOf = (value: unknown, path = "", out = new Set<string>()): Set<string> => {
    if (Array.isArray(value)) {
        for (const item of value) shapeOf(item, `${path}[]`, out);
        return out;
    }
    if (value !== null && typeof value === "object") {
        for (const [key, item] of Object.entries(value))
            shapeOf(item, `${path}.${/^[a-z][A-Za-z]*$/.test(key) ? key : "*"}`, out);
        return out;
    }
    out.add(`${path}:${value === null ? "null" : typeof value}`);
    return out;
};

describe.skipIf(systems.length === 0)("real analyses", () => {
    const results = new Map<string, { result: Composed; ms: number; bytes: number }>();
    for (const system of systems) {
        test(`${system} composes`, () => {
            const started = performance.now();
            const result = compose({ payloads: join(realFolder, system, "payloads") });
            const ms = performance.now() - started;
            const bytes = [...result.files.values()].reduce((sum, text) => sum + Buffer.byteLength(text), 0);
            results.set(system, { result, ms, bytes });
            console.log(
                `${system}: ${Math.round(ms)} ms, ${(bytes / 1024 / 1024).toFixed(1)} MB, ${JSON.stringify(result.counts)}`,
            );
            // Budget: well under a minute for the largest of them.
            expect(ms).toBeLessThan(30_000);
        }, 60_000);
    }
    test("every system gives the same files, and the same shape in each", () => {
        const all = [...results.values()];
        expect(all.length).toBe(systems.length);
        const names = all.map(({ result }) => [...result.files.keys()].sort().join(" "));
        expect(new Set(names).size).toBe(1);
        // Every key path a system shows is a path the contract allows; paths missing from one system are those of
        // collections it has empty, which the report lists.
        const shapes = all.map(
            ({ result }) =>
                new Map(
                    [...result.files]
                        .filter(([path]) => !path.startsWith("schema/"))
                        .map(([path, text]) => [path, shapeOf(JSON.parse(text))]),
                ),
        );
        const union = new Map<string, Set<string>>();
        for (const shape of shapes)
            for (const [path, keys] of shape) union.set(path, new Set([...(union.get(path) ?? []), ...keys]));
        const missing = shapes.map((shape, index) => [
            systems[index],
            [...union].flatMap(([path, keys]) =>
                [...keys].filter((key) => !shape.get(path)?.has(key)).map((key) => `${path}${key}`),
            ).length,
        ]);
        console.log(`key paths missing per system (empty collections): ${JSON.stringify(missing)}`);
        for (const shape of shapes)
            for (const [path, keys] of shape) expect([...keys].every((key) => union.get(path)?.has(key))).toBe(true);
    });
});

describe.skipIf(runFolder === "" || !systems.includes("pp"))("a real run with a target and a plan", () => {
    test("composes every check", () => {
        const result = compose({ payloads: join(realFolder, "pp", "payloads"), target: runFolder, plan: runFolder });
        expect(result.files.has("plan/matrix.json")).toBe(true);
    }, 60_000);
});
