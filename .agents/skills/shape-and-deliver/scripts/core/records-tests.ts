import { Schema } from "effect";
import { AcId, RepoPath, Text, about, field, idOf, idPrefix } from "./record-fields";

export const AcceptanceTest = Schema.Struct({
    id: idOf(idPrefix.AcceptanceTest),
    ac: AcId,
    file: Schema.optionalKey(
        RepoPath.annotate(
            field(
                "The test file, under the stage's files/ folder. A test names `file`, or, for a criterion no test runner reaches, `command` and `layer`: never both.",
                "engineer",
            ),
        ),
    ),
    command: Schema.optionalKey(
        Text.annotate(
            field(
                "A command check, for a criterion no test runner reaches (infrastructure, a command-line tool): the shell command the build runs after the code commit from the layer's folder, with EVIDENCE_DIR and WORK_ITEM_ID set. Exit 0 proves the criterion, anything else fails it. It is the test's title, and the end of its output is kept as evidence.",
                "engineer",
            ),
        ),
    ),
    layer: Schema.optionalKey(
        Text.annotate(
            field(
                "A command check's layer: its name in the root AGENTS.md's table, whose folder the command runs in.",
                "engineer",
            ),
        ),
    ),
    title: Text.annotate(
        field(
            "The test's title as the test layer reports it: descriptive of the criterion's behaviour, with no planning identifier. A JUnit test is credited to the criterion when its classname and name contain this title, ignoring case.",
            "engineer",
        ),
    ),
    proves: Schema.optionalKey(
        Schema.Array(Schema.String).annotate(
            field("The ids of the invariants at risk this test proves still hold.", "agent"),
        ),
    ),
    outcome: Text.annotate(
        field(
            "What the test proves, as the approver reads it beside the criterion on the plan and the evidence: what a person or system sees, in the product's words.",
            "approver",
        ),
    ),
})
    .check(
        Schema.makeFilter(
            (test) =>
                (test.file !== undefined && test.command === undefined && test.layer === undefined) ||
                (test.file === undefined && test.command !== undefined && test.layer !== undefined) ||
                "a test names a `file`, or a `command` and its `layer`, and nothing else",
        ),
    )
    .annotate(about("One test that proves an acceptance criterion: a test file, or a command check."));
