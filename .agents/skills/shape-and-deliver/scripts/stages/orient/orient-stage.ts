import { Effect } from "effect";
import { orientGaps, orientationIn, orientView } from "../../core/orient-gates";
import { sharedArguments, type ProducerStage } from "../../core/record-stage";

export const orientStage: ProducerStage = {
    stage: "orient",
    agent: "orient-in-kb",
    files: (layout) => layout.orient,
    skips: (context) => context.codebase.kbPath === undefined,
    description:
        "The orientation stage, skipped when the codebase declares no knowledge base: prepare then accepts it with no agent. Prepare prints the orient-in-kb dispatch; check finds a criterion no entity record names, a record naming a criterion the work item lacks, or a cited knowledge base file that does not exist, then lists the invariant files no record cites; finish accepts the output or returns the gaps as feedback.",
    arguments: (context) =>
        Effect.succeed({
            ...sharedArguments(context),
            ...(context.codebase.kbPath === undefined ? {} : { kbPath: context.codebase.kbPath }),
            outputPath: context.layout.orient.records,
        }),
    gaps: (context) =>
        orientationIn(context.layout.orient.records).pipe(
            Effect.flatMap((records) => orientGaps(context.codebase, context.workItem, records)),
        ),
    view: (context) =>
        orientationIn(context.layout.orient.records).pipe(
            Effect.flatMap((records) => orientView(context.codebase, records)),
        ),
};
