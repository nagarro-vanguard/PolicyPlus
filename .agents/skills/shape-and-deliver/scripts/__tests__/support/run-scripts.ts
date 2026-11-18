import { spawnSync } from "node:child_process";
import { join } from "node:path";

const scripts = join(import.meta.dirname, "..", "..");

/**
 * Run one of the skill's entry scripts as the orchestrator would.
 * @param script the script's name, without .ts
 * @param args its arguments
 * @param input what to send on standard input
 * @returns its exit code and what it printed
 */
export function script(script: string, args: string[], input = "") {
    const result = spawnSync("bun", [join(scripts, `${script}.ts`), ...args], { input, encoding: "utf8" });
    return { code: result.status ?? 1, out: `${result.stdout}${result.stderr}` };
}
