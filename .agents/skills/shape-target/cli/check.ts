import { resolve } from "node:path";
import { finalGaps } from "../shared/derive/checks";
import { designContext } from "../shared/jobs/stages";
import { layoutOf } from "../shared/model/layout";
import { loadArchitecture } from "../shared/run";

const [rootArg] = process.argv.slice(2);
if (rootArg === undefined || rootArg === "--help") {
    console.log(
        "Usage: bun check.ts <Output Root>\n\nRuns checks C2 to C6 on target/architecture.json against the chosen journeys; exits 1 and prints each gap.",
    );
    process.exit(rootArg === undefined ? 2 : 0);
}
const layout = layoutOf(resolve(rootArg));
const architecture = loadArchitecture(layout);
if (architecture === undefined) {
    console.log("target/architecture.json does not exist: run the components stage first");
    process.exit(1);
}
const gaps = finalGaps(architecture, designContext(layout));
console.log(gaps.length === 0 ? "no gap" : gaps.map((gap) => `- ${gap}`).join("\n"));
process.exit(gaps.length === 0 ? 0 : 1);
