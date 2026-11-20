import { Schema } from "effect";
import { Architecture, Component, Journey, Task } from "../shared/model/records";
import { ViewBody as View } from "../shared/model/view";

const shapes = { Task, Journey, Architecture, Component, View } as const;
const [name] = process.argv.slice(2);
const schema = shapes[name as keyof typeof shapes];
if (schema === undefined) {
    console.log(
        `Usage: describe-shape.ts <${Object.keys(shapes).join("|")}>: prints the JSON Schema of a record, with what each property means.`,
    );
    process.exit(name === undefined ? 2 : 1);
}
console.log(JSON.stringify(Schema.toJsonSchemaDocument(schema).schema, null, 2));
