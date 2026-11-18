import { Schema } from "effect";
import { Kind } from "../../core/documents";
import { about, recordTypes, storedOf, Text } from "../../core/records";
import { ChangesFound } from "../changes/render-model";
import { TestsFound } from "../tests/render-model";

export const PlanReviewFound = Schema.Struct({
    kind: Kind,
    criteria: Schema.Array(Schema.Struct({ name: Text, text: Text })),
    changes: ChangesFound,
    tests: TestsFound,
    findings: Schema.Array(storedOf(recordTypes.Finding)),
    reviewed: Schema.Boolean.annotate(about("Whether the plan review has written its findings.")),
    startedFromDesign: Schema.optionalKey(
        Schema.Boolean.annotate(about("Whether the plan started from the picked design's analysis of the story.")),
    ),
}).annotate(about("The plan: the kind of work, the criteria, the code changes, the tests, and what the review found."));
