import { readFileSync } from "node:fs";
import { problemsOf } from "./problems";

const [path] = process.argv.slice(2);

if (path === undefined || path === "--help" || path === "-h") {
    console.log(
        "Usage: check-work-item.ts <file>\n\nChecks a work item's markdown, `# <title>` first, for what a tracker must not show: a missing or long title, an HTML comment, an emoji, a line crediting the tool that wrote it and a path a clone doesn't have. Prints `ok`, or one problem per line and exits 1.\n\nARGUMENTS\n  file    The work item's markdown file.",
    );
    process.exit(path === undefined ? 2 : 0);
}

const problems = problemsOf(readFileSync(path, "utf8"));
console.log(problems.length === 0 ? "ok" : problems.map((problem) => `- ${problem}`).join("\n"));
process.exit(problems.length === 0 ? 0 : 1);
