import { Console, Effect, Layer } from "effect";
import { Argument, Command } from "effect/cli";
import { describeShape } from "../shared/model/describe-shape";
import { writingStandard } from "../shared/run/writing-standard";
import { DocumentInvalid, UsageInvalid } from "../shared/run/script-errors";
import { runScript, scriptServices } from "../shared/run/run-script";
import { ShapeRegistry } from "../shared/model/shape-registry";
import { registeredShapes } from "../shared/model/registered-shapes";

/**
 * Print one registered shape: a record an agent writes, headed by the writing standard (D64), or a document an agent
 * reads.
 * @param name the shape's name
 * @returns the effect that prints it; UsageInvalid naming every shape when the name is unknown, DocumentInvalid
 *  naming every part of the shape that has no description
 */
const printShape = Effect.fn("printShape")(function* (name: string) {
    const { records, documents } = yield* ShapeRegistry;
    const record = records[name];
    const schema = record === undefined ? documents[name] : record.schema;
    if (!schema) {
        const known = [...Object.keys(records), ...Object.keys(documents)].join(", ");
        return yield* new UsageInvalid({ issue: `unknown shape ${name}; one of ${known}` });
    }
    const { lines, undescribed, readers } = describeShape(name, schema.ast);
    if (undescribed.length) {
        return yield* new DocumentInvalid({
            path: name,
            issue: `these parts have no description, so an agent would meet them unexplained: ${undescribed.join(", ")}`,
        });
    }
    yield* Console.log([...(readers.has("person") ? [`Writing: ${writingStandard}`] : []), ...lines].join("\n"));
});

const command = Command.make("describe-shape", { name: Argument.String("shapeName") }, ({ name }) =>
    printShape(name),
).pipe(
    Command.withDescription(
        "Prints the properties of a record an agent writes or a document an agent reads, read from its schema, so no contract has to restate a shape; a record with text the person reads is headed by the one standard that text meets, and each text field says who reads it. Exit 2 names every known shape when the name is unknown; a shape with a part that has no description is refused, naming the part.",
    ),
);

runScript(command, Layer.mergeAll(scriptServices, registeredShapes));
