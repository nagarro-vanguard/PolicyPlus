import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { changedSinceBuilt } from "../shared/derive/built-from";
import type { Plan } from "../shared/model/plan";
import { layoutOf } from "../shared/model/layout";
import { deriveFacts } from "../shared/derive/facts";
import { loadRequest, recordFiles, runBuild, writeJson } from "../shared/derive/run";
import { standin } from "../shared/derive/standin";
import { readAnalysis } from "../shared/read/analysis";
import { targetGaps } from "../shared/read/confirmed";

const [command, root] = process.argv.slice(2);
const help = `Usage: plan.ts <facts|standin|build|status> <Output Root>

facts     prints what the plan derives from the analysis: surfaces, rules, who builds them.
standin   writes stand-in records (no agents) so the rest of the pipeline can be run and tested.
build     derives the plan from the accepted records, checks every gate, and writes plan.json, the story bodies,
          their attachments and the AGENTS.md previews; exits 1 and prints every failing gate when one fails.
status    says whether plan.json is the plan of the analysis and the decisions that hold now, by the hashes it was built
          from (\`builtFrom\`); exits 1 when something changed since, 0 when it is current or too old to say.`;
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
    const undecided = targetGaps(layout);
    if (undecided.length > 0) {
        for (const gap of undecided) console.error(`failing: ${gap}`);
        console.error("the target is not decided, so the plan cannot be built");
        process.exit(1);
    }
    const result = runBuild(layout);
    for (const gap of result.gaps.advisory) console.log(`advisory: ${gap}`);
    if (!result.written) {
        for (const gap of result.gaps.failing) console.error(`failing: ${gap}`);
        process.exit(1);
    }
    console.log(`plan written: ${result.stories} stories in ${layout.plan}`);
} else if (command === "status") {
    if (!existsSync(layout.plan)) {
        console.error(`no plan at ${layout.plan}: build it first`);
        process.exit(1);
    }
    const plan = JSON.parse(readFileSync(layout.plan, "utf8")) as Pick<Plan, "builtFrom">;
    const changed = changedSinceBuilt(layout, plan);
    if (changed === undefined)
        console.log("the plan was built before it kept what it was built from: build it again to know");
    else if (changed.length === 0) console.log("the plan is current");
    else {
        console.log(`the plan is out of date: ${changed.join(", ")} changed since it was built`);
        process.exit(1);
    }
} else {
    console.error(help);
    process.exit(2);
}
