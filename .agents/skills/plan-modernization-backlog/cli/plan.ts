import { resolve } from "node:path";
import { layoutOf } from "../shared/model/layout";
import { deriveFacts } from "../shared/derive/facts";
import { loadRequest, recordFiles, runBuild, writeJson } from "../shared/derive/run";
import { standin } from "../shared/derive/standin";
import { readAnalysis } from "../shared/read/analysis";

const [command, root, ...rest] = process.argv.slice(2);
const help = `Usage: plan.ts <facts|standin|build> <Output Root> [--work-tracking <AGENTS.md>]

facts     prints what the plan derives from the analysis: surfaces, rules, who builds them.
standin   writes stand-in records (no agents) so the rest of the pipeline can be run and tested.
build     derives the plan from the accepted records, checks every gate, and writes plan.json, the work items,
          their attachments and the AGENTS.md previews; exits 1 and prints every failing gate when one fails.`;
if (command === undefined || root === undefined || command === "--help") {
    console.log(help);
    process.exit(command === "--help" ? 0 : 2);
}
const layout = layoutOf(resolve(root));
if (command === "facts") {
    const facts = deriveFacts(readAnalysis(layout.analysis));
    const surfaces = facts.capabilities.flatMap((c) => c.surfaces);
    console.log(
        `${facts.capabilities.length} capabilities, ${surfaces.length} surfaces, ${facts.rules.size} rules (${facts.shared.length} shared), ${facts.transitions.length} state changes, ${facts.unreached.length} unreached places`,
    );
    for (const c of facts.capabilities)
        console.log(
            `  ${c.name}: ${c.size} actions, ${c.surfaces.length} surfaces, owns ${c.surfaces.reduce((n, s) => n + s.owned.length, 0)} rules`,
        );
} else if (command === "standin") {
    const analysis = readAnalysis(layout.analysis);
    const records = standin(analysis, deriveFacts(analysis), loadRequest(layout));
    const files = recordFiles(layout);
    writeJson(files.layers, records.layers);
    writeJson(files.decisions, records.decisions);
    writeJson(files.stories, records.stories);
    console.log(
        `stand-in records written: ${records.layers.length} layers, ${records.decisions.length} decisions, ${records.stories.length} stories`,
    );
} else if (command === "build") {
    const at = rest.indexOf("--work-tracking");
    const result = runBuild(layout, at >= 0 ? rest[at + 1] : undefined);
    for (const gap of result.gaps.advisory) console.log(`advisory: ${gap}`);
    if (!result.written) {
        for (const gap of result.gaps.failing) console.error(`failing: ${gap}`);
        process.exit(1);
    }
    console.log(`plan written: ${result.stories} stories in ${layout.plan}`);
} else {
    console.error(help);
    process.exit(2);
}
