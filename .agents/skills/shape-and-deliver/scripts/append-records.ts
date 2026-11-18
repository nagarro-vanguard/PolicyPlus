import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { appendRecords, describeRecord } from "./core/record-files";
import { RequestInvalid } from "./core/script-errors";
import { recordTypes } from "./core/records";
import { isInRunWork } from "./core/run-layout";
import { runScript } from "./core/run-script";

/**
 * Read standard input to its end as text; a failed read is a defect in the scripts.
 * @returns the text on standard input
 */
const readInput = Effect.promise(async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
        chunks.push(Buffer.from(chunk as Uint8Array));
    }
    return Buffer.concat(chunks).toString("utf8");
});

/**
 * Append the records on standard input to an output file and print their ids, or print a record type's fields instead.
 * @param type the name of the record type
 * @param outputPath the file to append to; only --describe may leave it out
 * @param describe true to print the type's fields and write nothing
 * @returns nothing; the Effect prints one line per record id, or one per field with `describe`
 * Writes: the output file, appended to; nothing when any input line is invalid.
 * Fails: RequestInvalid when the output file is missing and `describe` is off.
 */
const appendOrDescribe = Effect.fn("appendOrDescribe")(function* (
    type: string,
    outputPath: Option.Option<string>,
    describe: boolean,
) {
    if (describe) {
        for (const line of yield* describeRecord(type)) {
            yield* Console.log(line);
        }
        return;
    }
    if (Option.isNone(outputPath)) {
        return yield* new RequestInvalid({ issue: "append-records needs the output file to append to" });
    }
    if (!isInRunWork(outputPath.value)) {
        return yield* new RequestInvalid({
            issue: `${outputPath.value} is not inside a run's folder; append-records writes only the output file it was given, under .artifacts/shape-and-deliver/story-<n>/internal/work/`,
        });
    }
    for (const id of yield* appendRecords(type, outputPath.value, yield* readInput)) {
        yield* Console.log(id);
    }
});

const command = Command.make(
    "append-records",
    {
        type: Argument.String("type").pipe(Argument.withDescription("The record type to append, such as PathStep.")),
        outputPath: Argument.String("outputPath").pipe(
            Argument.withDescription("The file the records are appended to; only --describe may leave it out."),
            Argument.optional,
        ),
        describe: Flag.Boolean("describe").pipe(
            Flag.withDescription("Print the type's fields and write nothing."),
            Flag.withDefault(false),
        ),
    },
    ({ type, outputPath, describe }) => appendOrDescribe(type, outputPath, describe),
).pipe(
    Command.withDescription(
        `Appends the records of one type on standard input, one JSON object per line, to an output file after checking each against its schema, and prints each record's id; nothing is written when a line is invalid. {"id": "<id>", "withdrawn": true} withdraws a record written earlier. With --describe it prints the type's fields instead; the types are ${Object.keys(recordTypes).join(", ")}.`,
    ),
);

runScript(command);
