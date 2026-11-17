import { Console, Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { graphInvariants } from "../shared/graph/graph-invariants";
import { needsAction, rootServices, runScript } from "../shared/run/run-script";
import { FileAccess } from "../shared/source/file-access";
import { RecordStore } from "../shared/store/database";

const Baseline = Schema.Struct({
    unresolvedLinkRate: Schema.optionalKey(Schema.Number),
    unattributedBlockRate: Schema.optionalKey(Schema.Number),
    linksOutsideBlocksRate: Schema.optionalKey(Schema.Number),
});

const marks = { pass: "PASS", gap: "GAP ", fail: "FAIL" } as const;

/**
 * Check the code graph of the finished analysis and print one line per check; the run needs action when any fails.
 * @param baselinePath a JSON file of the rates the known gaps may not exceed; none checks the gaps against nothing
 * @returns the effect that prints the outcomes
 */
const checkGraph = Effect.fn("checkGraph")(function* (baselinePath: string | undefined) {
    const files = yield* FileAccess;
    const text = baselinePath === undefined ? "{}" : yield* files.readText(baselinePath);
    const baseline = yield* Effect.orDie(Schema.decodeUnknownEffect(Schema.fromJsonString(Baseline))(text));
    const outcomes = yield* graphInvariants(yield* RecordStore, baseline);
    const width = Math.max(...outcomes.map((outcome) => outcome.name.length));
    for (const outcome of outcomes) {
        yield* Console.log(`${marks[outcome.status]}  ${outcome.name.padEnd(width)}  ${outcome.detail}`.trimEnd());
    }
    const failed = outcomes.filter((outcome) => outcome.status === "fail").length;
    yield* Console.log(failed === 0 ? "\nthe graph holds" : `\n${failed} invariant(s) fail`);
    if (failed > 0) {
        yield* needsAction;
    }
});

const command = Command.make("check-graph", { baseline: Flag.String("baseline").pipe(Flag.optional) }, ({ baseline }) =>
    checkGraph(baseline._tag === "Some" ? baseline.value : undefined),
).pipe(
    Command.withDescription(
        "Checks the code graph of a finished analysis: blocks lie in their files and have a layer, blocks nest, every link has a source and a target or a reason, every entry point has one capability, every rule has a block, every layer is used, no layer or code kind is held twice, and the stored reach equals the reach recomputed by the rule. Prints one line per check and counts two known gaps (links that reach nothing, blocks no entry point reaches) against the rates in --baseline, a JSON file. Read only; exit 1 when a check fails or a gap is worse than its baseline.",
    ),
);

runScript(command, rootServices);
