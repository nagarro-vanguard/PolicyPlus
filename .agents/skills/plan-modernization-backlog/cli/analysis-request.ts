import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { layoutOf } from "../shared/model/layout";
import { loadRequest } from "../shared/derive/run";
import { analysisRequestText } from "../shared/derive/leave-out";

const [root] = process.argv.slice(2);
if (root === undefined || root === "--help") {
    console.log("Usage: analysis-request.ts <Output Root>: writes <Output Root>/analysis-request.md, the code-analysis request derived from the modernization request (its Leave Out plus the target, the output root and the skills; its documents as supporting material), and prints its path.");
    process.exit(root === undefined ? 2 : 0);
}
const layout = layoutOf(resolve(root));
const file = `${layout.outputRoot}/analysis-request.md`;
writeFileSync(file, analysisRequestText(loadRequest(layout)));
console.log(file);
