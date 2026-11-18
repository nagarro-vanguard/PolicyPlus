import { Schema } from "effect";
import { CriterionView } from "../../core/criteria";
import { Kind } from "../../core/documents";
import { about, recordTypes, storedOf, Text } from "../../core/records";
import { CodeFound } from "../code/render-model";

export const ChangeReviewFound = Schema.Struct({
    kind: Kind,
    criteria: Schema.Array(CriterionView),
    evidence: Text.annotate(about("The code stage's evidence folder, relative to this page, where each recording is.")),
    facts: Schema.Array(
        Schema.Struct({
            why: Text.annotate(about("The fact the story could break, in the product's words.")),
            tests: Schema.Array(Schema.Struct({ title: Text, held: Schema.Boolean })).annotate(
                about("The tests that prove it still holds, and whether each passed after the code."),
            ),
        }),
    ),
    code: CodeFound,
    findings: Schema.Array(storedOf(recordTypes.Finding)),
    reviewed: Schema.Boolean.annotate(about("Whether the change review has written its findings.")),
}).annotate(about("What the built change proves, criterion by criterion, and what its review found."));
