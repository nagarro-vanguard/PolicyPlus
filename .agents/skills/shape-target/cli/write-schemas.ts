import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Schema } from "effect";
import { layoutOf } from "../shared/model/layout";
import { Manifest } from "../shared/manifest";
import { Choice, Dispute, FinalArchitecture, StoredArchitecture, StoredJourney, Task } from "../shared/model/records";

const [rootArg] = process.argv.slice(2);
if (rootArg === undefined || rootArg === "--help") {
    console.log(
        "Usage: bun write-schemas.ts <Output Root>\n\nWrites the JSON Schema of the target's records beside them, for consumers in other languages.",
    );
    process.exit(rootArg === undefined ? 2 : 0);
}
const folder = layoutOf(resolve(rootArg)).schemas;
mkdirSync(folder, { recursive: true });
for (const [name, schema] of Object.entries({
    task: Task,
    journey: StoredJourney,
    architecture: FinalArchitecture,
    "architecture-variant": StoredArchitecture,
    choice: Choice,
    dispute: Dispute,
    manifest: Manifest,
}))
    writeFileSync(
        join(folder, `${name}.schema.json`),
        `${JSON.stringify(Schema.toJsonSchemaDocument(schema).schema, null, 2)}\n`,
    );
console.log(`schemas written to ${folder}`);
