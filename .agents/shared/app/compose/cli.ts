#!/usr/bin/env bun
import { resolve } from "node:path";
import { compose } from "./compose";
import { ComposeError } from "./errors";
import { writeFolder } from "./io";

/*
 * bun compose/cli.ts --payloads <dir> [--target <root>] [--plan <root>] [--source <dir>] --out <case dir>
 *
 * --payloads  the analysis's payloads folder (it holds manifest.json)
 * --target    the run's output root that holds target/ (shape-target's output), when the target is designed
 * --plan      the run's output root that holds .modernization-backlog/ and work-items/, when the plan is written
 * --source    the analysed code's folder, for evidence excerpts; the analysis's own record of it when left out
 * --out       the case folder to write; what was in it is replaced
 *
 * Exits 0 when the case is built; 2 when an input cannot be read, a fact is missing or a version is unknown (nothing is
 * written).
 */

const usage =
    "usage: bun compose/cli.ts --payloads <dir> [--target <root>] [--plan <root>] [--source <dir>] --out <case dir>";

const argsOf = (argv: readonly string[]) => {
    const named = new Map<string, string>();
    for (let index = 0; index < argv.length; index += 2) {
        const flag = argv[index] ?? "";
        const value = argv[index + 1];
        if (!["--payloads", "--target", "--plan", "--source", "--out"].includes(flag) || value === undefined) {
            throw new ComposeError(
                "input",
                `${flag === "" ? "no arguments" : `unknown or empty argument ${flag}`}\n${usage}`,
            );
        }
        named.set(flag.slice(2), resolve(value));
    }
    const payloads = named.get("payloads");
    const out = named.get("out");
    if (payloads === undefined || out === undefined)
        throw new ComposeError("input", `--payloads and --out are required\n${usage}`);
    return { payloads, out, target: named.get("target"), plan: named.get("plan"), source: named.get("source") };
};

const main = () => {
    const started = performance.now();
    try {
        const args = argsOf(process.argv.slice(2));
        const result = compose(args);
        writeFolder(args.out, result.files);
        let bytes = 0;
        for (const text of result.files.values()) bytes += Buffer.byteLength(text);
        console.log(
            `case written to ${args.out}: ${result.files.size} files, ${(bytes / 1024 / 1024).toFixed(1)} MB, ${Math.round(performance.now() - started)} ms; ${Object.entries(
                result.counts,
            )
                .map(([key, value]) => `${key} ${value}`)
                .join(", ")}`,
        );
    } catch (error) {
        if (error instanceof ComposeError) {
            console.error(`compose: ${error.message}`);
            process.exit(2);
        }
        throw error;
    }
};

if (import.meta.main) main();
