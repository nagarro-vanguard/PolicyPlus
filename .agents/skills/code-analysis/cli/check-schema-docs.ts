import { Console, Effect } from "effect";
import { Command } from "effect/cli";
import { undescribedProperties } from "../shared/model/schema-docs";
import { needsAction, runScript, scriptServices } from "../shared/run/run-script";
import { FileAccess } from "../shared/source/file-access";

const schemasFolder = `${import.meta.dir}/../shared/model/schemas`;

/**
 * Check that every property of every schema exported from `shared/model/schemas/` has a description of its own.
 * @returns the effect that prints each offending property; the run needs action when any is found
 */
const checkSchemaDocs = Effect.fn("checkSchemaDocs")(function* () {
    const files = yield* FileAccess;
    const names = (yield* files.entriesOf(schemasFolder)).filter((name) => name.endsWith(".ts"));
    const modules: Array<readonly [string, Readonly<Record<string, unknown>>]> = [];
    for (const name of names) {
        modules.push([name, yield* Effect.promise(() => import(`${schemasFolder}/${name}`))]);
    }
    const { problems, shapes } = undescribedProperties(modules);
    if (problems.length === 0) {
        yield* Console.log(`every property of ${shapes} schemas is described`);
        return;
    }
    yield* Console.log(problems.join("\n"));
    yield* Console.log(`\n${problems.length} undescribed or generically described properties in ${shapes} schemas`);
    yield* needsAction;
});

const command = Command.make("check-schema-docs", {}, () => checkSchemaDocs()).pipe(
    Command.withDescription(
        "Checks that every property of every schema in shared/model/schemas has a description of its own, not only the generic one of its base type; describe-shape refuses an undescribed part only for the shapes registered with it. Prints each offending property; exit 1 when any is found.",
    ),
);

runScript(command, scriptServices);
