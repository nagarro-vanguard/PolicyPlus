import { Effect } from "effect";
import { citationGaps, uncitedInvariants } from "../../core/orient-gates";
import { pathStepsIn, stepCitationGaps, traceGaps } from "../../core/plan-gates";
import { sharedArguments, orientationArguments, type ProducerStage } from "../../core/record-stage";

export const traceStage: ProducerStage = {
    stage: "trace",
    agent: "trace-story-paths",
    files: (layout) => layout.trace,
    description:
        "The trace stage. Prepare prints the trace-story-paths dispatch; check finds a criterion with no path from its way in, a path with a step missing, a cited line outside the code, or a cited orientation record that does not exist, then lists the invariants no step cites; finish accepts the output or returns the gaps as feedback.",
    arguments: (context) =>
        Effect.succeed({
            ...sharedArguments(context),
            ...orientationArguments(context),
            outputPath: context.layout.trace.records,
        }),
    gaps: (context) =>
        Effect.gen(function* () {
            const steps = yield* pathStepsIn(context.layout.trace.records);
            return [
                ...traceGaps(context.workItem, steps),
                ...(yield* stepCitationGaps(context.codebase.root, steps)),
                ...(yield* citationGaps(context.layout.orient.records, steps, "cites")),
            ];
        }),
    view: (context) =>
        pathStepsIn(context.layout.trace.records).pipe(
            Effect.flatMap((steps) =>
                uncitedInvariants(context.layout.orient.records, steps, "cites", "path step touching it"),
            ),
        ),
};
