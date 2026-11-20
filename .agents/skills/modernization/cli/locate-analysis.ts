import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { locationNote } from "./analysis";
import { pathsOf } from "./steps";

const [rootArg, storeArg] = process.argv.slice(2);
if (rootArg === undefined || storeArg === undefined || rootArg === "--help") {
    console.log(
        "Usage: bun locate-analysis.ts <Output Root> <folder that holds analysis.sqlite>\n\nNames where the analysis's store is when it was made outside the Output Root, so the payloads can be written again from the Output Root alone.",
    );
    process.exit(rootArg === "--help" ? 0 : 2);
}
const store = resolve(storeArg);
if (!existsSync(join(store, "analysis.sqlite"))) {
    console.log(`${store} holds no analysis.sqlite`);
    process.exit(1);
}
const paths = pathsOf(resolve(rootArg));
mkdirSync(paths.analysis, { recursive: true });
writeFileSync(locationNote(paths), `${JSON.stringify({ root: store }, null, 2)}\n`);
console.log(`the analysis's store is ${store}; noted in ${locationNote(paths)}`);
