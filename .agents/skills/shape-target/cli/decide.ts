import { resolve } from "node:path";
import { decide } from "../shared/decide";
import { gates, type Gate } from "../shared/gates";
import { layoutOf } from "../shared/model/layout";

const [gate, root] = process.argv.slice(2);
if (gate === undefined || gate === "--help" || root === undefined || !gates.includes(gate as Gate)) {
    console.log(`Usage: bun decide.ts <${gates.join("|")}> <Output Root>

Decides one of the four decisions of the target from what its stage wrote, the same way every time, and records it in target/choice-<decision>.json with the hash of the file it is about and a copy of that file in target/confirmed/<decision>.json. Nobody is asked: the journeys and the architecture take the recommended variant (the first one when none is marked), and the reviewer's challenges that stay open on what was taken are recorded in the decision. It refuses while the decision before it is not decided.`);
    process.exit(gate === "--help" ? 0 : 2);
}
const result = decide(layoutOf(resolve(root)), gate as Gate);
console.log(result.text);
process.exit(result.ok ? 0 : 1);
