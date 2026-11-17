import { join } from "node:path";
import { Effect } from "effect";
import { analysisPaths, skillRoot } from "../run/analysis-layout";
import { FileAccess } from "../source/file-access";

/**
 * Write one launcher per skill script into the analysis root (G1 of plan 0003): a file a shell runs by its path, which
 * names the analysis root and runs the script. `scriptsCommand` is their folder, so `<scriptsCommand>/<script>.ts` is
 * one word that works typed, held in a variable, and in any shell.
 * @param root the analysis root
 * @returns the effect that writes them
 */
export const writeLaunchers = Effect.fnUntraced(function* (root: string) {
    const files = yield* FileAccess;
    const scripts = join(skillRoot, "cli");
    for (const name of (yield* files.entriesOf(scripts)).filter((entry) => entry.endsWith(".ts"))) {
        yield* files.writeExecutable(
            join(analysisPaths(root).launchers, name),
            [
                "#!/usr/bin/env bun",
                `process.env.CODE_ANALYSIS_ROOT = ${JSON.stringify(root)};`,
                `await import(${JSON.stringify(join(scripts, name))});`,
                "",
            ].join("\n"),
        );
    }
});
