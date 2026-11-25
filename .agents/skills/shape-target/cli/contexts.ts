#!/usr/bin/env bun
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { architectureText, journeyText } from "../shared/derive/context";

// Writes the texts a reader copies for the decided target: one per journey and one for the architecture (its domains in it).
// Reads target/*.json (the target's records and legacy.json, the old system's words); deterministic, no agent.

const root = process.argv[2];
if (root === undefined || root === "--help") {
    console.log("Usage: contexts.ts <Output Root>\n\nWrites <Output Root>/target/contexts/<kind>/NNNNN.md and an index.json.");
    process.exit(root === undefined ? 2 : 0);
}
const target = resolve(root, "target");
const out = join(target, "contexts");
const read = (name: string) => JSON.parse(readFileSync(join(target, name), "utf8")) as any;
const legacy = read("legacy.json");
const tasks = new Map<string, any>(read("current.json").tasks.map((task: any) => [task.id, task]));
const journeys = read("journeys.json") as any[];
const architecture = read("architecture.json");

const entries: { kind: string; keys: Record<string, string>; file: string }[] = [];
let count = 0;
const put = (kind: string, keys: Record<string, string>, text: string) => {
    const file = `${kind}/${String(++count).padStart(5, "0")}.md`;
    mkdirSync(dirname(join(out, file)), { recursive: true });
    writeFileSync(join(out, file), text);
    entries.push({ kind, keys, file });
};
for (const journey of journeys) put("journey", { task: journey.task }, journeyText(journey, tasks.get(journey.task), legacy));
put("architecture", { id: "architecture" }, architectureText(architecture, legacy));
writeFileSync(join(out, "index.json"), `${JSON.stringify(entries, null, 2)}\n`);
console.log(`${entries.length} contexts written to ${out}`);
