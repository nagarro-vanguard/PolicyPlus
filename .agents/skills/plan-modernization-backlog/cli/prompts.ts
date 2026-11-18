import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { layoutOf } from "../shared/model/layout";
import { createEpicPrompt, deliverPrompt, scaffoldPrompt, type Manifest } from "../shared/derive/prompts";

const skillRoot = resolve(import.meta.dir, "..");
const [root, kind, key, ...rest] = process.argv.slice(2);
const help = `Usage: prompts.ts <Output Root> <list | epic <key> | scaffold | deliver <story key>> [--worktrees <folder>] [--base <branch>]

The one place the prompts are written; the app's pages and the conductor print this output.`;
if (root === undefined || kind === undefined || kind === "--help") {
    console.log(help);
    process.exit(kind === "--help" ? 0 : 2);
}
const layout = layoutOf(resolve(root));
const manifest = JSON.parse(readFileSync(layout.manifest, "utf8")) as Manifest;
const flag = (name: string, fallback: string) => {
    const at = [key, ...rest].indexOf(`--${name}`);
    return at >= 0 ? ([key, ...rest][at + 1] ?? fallback) : fallback;
};
const worktrees = flag("worktrees", `${layout.outputRoot}-worktrees`);
const base = flag("base", "<the repository's default branch>");
if (kind === "list") {
    for (const epic of manifest.items.filter((item) => item.kind === "epic").sort((a, b) => a.sequence - b.sequence)) {
        console.log(
            `${epic.sequence}. ${epic.key}  ${epic.title}  (after: ${epic.comesAfter.join(", ") || "nothing"})`,
        );
    }
} else if (kind === "epic" && key !== undefined) console.log(createEpicPrompt(layout, skillRoot, manifest, key));
else if (kind === "scaffold") console.log(scaffoldPrompt(layout, skillRoot, manifest, worktrees, base));
else if (kind === "deliver" && key !== undefined)
    console.log(deliverPrompt(layout, skillRoot, manifest, key, worktrees, base));
else {
    console.log(help);
    process.exit(2);
}
