import { Console, Effect, Layer, Option, Predicate, Schema, Stdio, Stream } from "effect";
import { registeredShapes } from "../shared/model/registered-shapes";
import { Argument, Command, Flag } from "effect/cli";
import { appendRecords, recordTypeOf } from "../shared/read/record-writing";
import { RecordRejected } from "../shared/run/script-errors";
import { rootServices, runScript } from "../shared/run/run-script";
import { FileAccess } from "../shared/source/file-access";

const parseJson = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));

/**
 * The records to append: the JSON argument, or one JSON object per line of standard input. Each line is first read
 * as JSON of any shape, so a line that is JSON but not an object is named as such; the record's schema is applied
 * later, when the records are appended.
 * @param json the JSON argument; when absent, the file `from` names, else standard input, is read
 * @param from a file of one JSON object per line
 * @returns the JSON objects, or RecordRejected naming the first line that is not one
 */
const recordsFrom = Effect.fn("recordsFrom")(function* (json: string | undefined, from: string | undefined) {
    const input =
        json !== undefined
            ? json
            : from !== undefined
              ? yield* (yield* FileAccess).readText(from)
              : yield* (yield* Stdio.Stdio).stdin.pipe(Stream.decodeText(), Stream.mkString);
    const lines = input
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    return yield* Effect.forEach(lines, (line) =>
        parseJson(line).pipe(
            Effect.mapError(() => new RecordRejected({ reason: `not JSON: ${line.slice(0, 200)}` })),
            Effect.flatMap((value) =>
                Predicate.isObject(value)
                    ? Effect.succeed(value)
                    : Effect.fail(new RecordRejected({ reason: `not a JSON object: ${line.slice(0, 200)}` })),
            ),
        ),
    );
});

const append = Command.make(
    "append-agent-records",
    {
        record: Argument.String("recordName"),
        outputPath: Argument.String("outputPath"),
        json: Argument.String("json").pipe(Argument.optional),
        findings: Flag.String("findings").pipe(Flag.optional),
        from: Flag.String("from").pipe(Flag.optional),
    },
    ({ record, outputPath, json, findings, from }) =>
        Effect.gen(function* () {
            yield* recordTypeOf(record);
            const records = yield* recordsFrom(Option.getOrUndefined(json), Option.getOrUndefined(from));
            const ids = yield* appendRecords(record, outputPath, records, Option.getOrUndefined(findings));
            if (ids.length) {
                yield* Console.log(ids.join("\n"));
            }
        }),
).pipe(
    Command.withDescription(
        "Appends records to an output file from the JSON argument, from --from <file> of one JSON object per line, or one JSON object per line of standard input, validating each against its schema strictly; cited lines are checked by each stage's gate, not here. A record without an id gets a fresh record id, or the record id of the record its identity matches; a record given an id must correct one already in the output file or, with --findings <artifactPath>, among the records of that artifact: the findings a reviewer reviews, or the last output an owner's feedback names, for a record carry left out. Prints the record ids. With no record, it creates the output file when it is absent, so an agent with nothing to record still leaves its output; exit 1 names the problem, an unknown record name included. `describe-shape <Record>` prints a record's properties.",
    ),
);

runScript(append, Layer.mergeAll(rootServices, registeredShapes));
