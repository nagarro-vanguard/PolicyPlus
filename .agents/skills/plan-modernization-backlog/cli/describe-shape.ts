import { Schema } from "effect";
import { Decision, Story, TargetLayer } from "../shared/model/records";

const shapes = { TargetLayer, Decision, Story } as const;
const [name] = process.argv.slice(2);
const schema = shapes[name as keyof typeof shapes];
if (schema === undefined) {
    console.log(
        `Usage: describe-shape.ts <${Object.keys(shapes).join("|")}>: prints the JSON Schema of a record, with what each property means.`,
    );
    process.exit(name === undefined ? 2 : 1);
}
console.log(JSON.stringify(Schema.toJsonSchemaDocument(schema).schema, null, 2));
