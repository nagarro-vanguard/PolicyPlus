// Prints the reader-contract findings for a built site as markdown: counts per check, per rule with examples, and the
// pages that carry the most. Reads only. Usage: bun tests/contract/run.ts [<site folder>] [--json <file>]
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ContractFinding } from "../../src/lib/reader-contract";
import { checkSite, defaultSite, tally } from "./site";

const args = process.argv.slice(2);
const at = args.indexOf("--json");
const json = at >= 0 ? args[at + 1] : undefined;
const site = resolve(args.find((arg, i) => !arg.startsWith("--") && (at < 0 || i !== at + 1)) ?? defaultSite);
const report = await checkSite(site);

const section = (title: string, findings: readonly ContractFinding[]) => {
    const { byCheck, byRule } = tally(findings);
    const lines = [`### ${title}`, "", "| Check | Hard | Report |", "|---|---:|---:|"];
    for (const [check, counts] of [...byCheck].sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1))))
        lines.push(`| ${check} | ${counts.hard} | ${counts.report} |`);
    lines.push("", "| Rule | Hits | Examples |", "|---|---:|---|");
    for (const [rule, count] of [...byRule].sort((a, b) => b[1] - a[1])) {
        const examples = findings
            .filter((finding) => `${finding.check} ${finding.mode}: ${finding.rule}` === rule)
            .slice(0, 2)
            .map(
                (finding) =>
                    `\`${finding.where}\` (${finding.at}): ${finding.hit.slice(0, 90).replaceAll("|", "\\|").replaceAll("`", "'")}`,
            );
        lines.push(`| ${rule} | ${count} | ${examples.join("<br>")} |`);
    }
    return lines.join("\n");
};

const perPage = new Map<string, number>();
for (const finding of report.pageFindings)
    if (finding.mode === "hard") perPage.set(finding.where, (perPage.get(finding.where) ?? 0) + 1);
const worst = [...perPage].sort((a, b) => b[1] - a[1]).slice(0, 10);

console.log(
    [
        `Site: ${report.site} (${report.pages} pages)`,
        "",
        section("Pages (static HTML, attributes included)", report.pageFindings),
        "",
        `Pages with a hard finding: ${perPage.size} of ${report.pages}. Most: ${worst.map(([page, n]) => `${page} ${n}`).join(", ")}`,
        "",
        section("App copy (copy modules)", report.copyFindings),
        "",
        section("Data beside the site (payloads, target, plan)", report.dataFindings),
    ].join("\n"),
);
if (json !== undefined) writeFileSync(json, JSON.stringify(report, null, 2));
