import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Schema } from "effect";
import { AttachmentHeader } from "../shared/model/header";
import { Ledger } from "../shared/model/ledger";
import { Plan } from "../shared/model/plan";
import { Decision, Story, TargetLayer } from "../shared/model/records";
import { ModernizationRequest } from "../shared/model/request";

const [folder] = process.argv.slice(2);
if (folder === undefined) {
    console.error(
        "Usage: write-schemas.ts <folder>: writes the JSON Schema of the plan's data for consumers in other languages.",
    );
    process.exit(2);
}
for (const [name, schema] of [
    ["request", ModernizationRequest],
    ["target-layer", TargetLayer],
    ["decision", Decision],
    ["story", Story],
    ["plan", Plan],
    ["ledger", Ledger],
    ["attachment-header", AttachmentHeader],
] as const) {
    const file = join(resolve(folder), `${name}.schema.json`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(Schema.toJsonSchemaDocument(schema).schema, null, 2)}\n`);
}
console.log(`7 schemas written to ${resolve(folder)}`);
