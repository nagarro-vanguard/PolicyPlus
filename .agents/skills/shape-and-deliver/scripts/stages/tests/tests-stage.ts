import { Effect } from "effect";
import { layerOfPath, type Codebase } from "../../core/codebase";
import { readRecords, recordsOf } from "../../core/record-files";
import { System } from "../../core/system";
import { citationGaps, uncitedInvariants } from "../../core/orient-gates";
import { coverageGaps } from "../../core/plan-gates";
import { sharedArguments, orientationArguments, type ProducerStage, type StageContext } from "../../core/record-stage";

/**
 * Names the layer that proves a criterion through a record: the layer of its file, or the layer a command check names.
 * @param codebase the codebase
 * @param record an AcceptanceTest or LoadThreshold
 * @param record.file the test file, when the record has one
 * @param record.layer the layer a command check names
 * @returns the layer's name, or "no layer" when the file is in none
 */
const layerNameOf = (codebase: Codebase, record: { readonly file?: string; readonly layer?: string }) =>
    record.file === undefined ? (record.layer ?? "no layer") : (layerOfPath(codebase, record.file)?.name ?? "no layer");

/**
 * Lists where each criterion is proved, by the layers of its tests and load limits, and the invariants no test proves.
 * @param context what the stage works from
 * @returns one line per criterion, then one per unproven invariant
 */
const testsView = Effect.fnUntraced(function* (context: StageContext) {
    const written = yield* readRecords(context.layout.tests.records);
    const tests = yield* recordsOf(written, "AcceptanceTest");
    const thresholds = yield* recordsOf(written, "LoadThreshold");
    const unproven = yield* uncitedInvariants(context.layout.orient.records, tests, "proves", "test proving it");
    const proofs = context.workItem.criteria.map(({ ac }) => {
        const layers = new Set(
            [...tests, ...thresholds]
                .filter((record) => record.ac === ac)
                .map((record) => layerNameOf(context.codebase, record)),
        );
        return `${ac} is proved in: ${layers.size === 0 ? "no layer yet" : [...layers].join(", ")}`;
    });
    return [...proofs, ...unproven];
});

export const testsStage: ProducerStage = {
    stage: "tests",
    agent: "write-acceptance-tests",
    files: (layout) => layout.tests,
    skips: (context) => context.request.kind === "design",
    description:
        "The tests stage, skipped for a design, which builds screens only and leaves proving the criteria to the build after the pick: prepare then accepts it with no agent. Prepare prints the write-acceptance-tests dispatch; check runs the coverage gate (every acceptance criterion has a test, every test file in a layer of the root AGENTS.md, every command check in one) and finds a cited orientation record that does not exist, then lists where each criterion is proved; finish accepts the output or returns the gaps as feedback.",
    arguments: (context) =>
        Effect.succeed({
            ...sharedArguments(context),
            tracePath: context.layout.trace.records,
            ...orientationArguments(context),
            changesPath: context.layout.changes.records,
            changedFilesFolder: context.layout.changes.files,
            filesFolder: context.layout.tests.files,
            outputPath: context.layout.tests.records,
        }),
    gaps: (context) =>
        Effect.gen(function* () {
            const records = yield* readRecords(context.layout.tests.records);
            const tests = yield* recordsOf(records, "AcceptanceTest");
            return [
                ...(yield* coverageGaps(context.codebase, context.workItem, records, {
                    filesFolder: context.layout.tests.files,
                    proposedFiles: yield* (yield* System).listFiles(context.layout.tests.files),
                })),
                ...(yield* citationGaps(context.layout.orient.records, tests, "proves")),
            ];
        }),
    view: testsView,
};
