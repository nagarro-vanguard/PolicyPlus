import { Schema } from "effect";
import { Kind as KitKind, WorkItem as KitWorkItem } from "./work-item-parser";
import { AcId, about, Text } from "./records";

export const Kind = Schema.Literals([...KitKind.literals, "design"]).annotate(
    about(
        "The kind of work: a new feature, a bug fix, a technical change to the code, or the design of a feature that shows screens: variants of its screens, built for production, one of which is picked.",
    ),
);

export type Kind = typeof Kind.Type;

export const WorkItem = Schema.Struct({ ...KitWorkItem.fields, kind: Kind }).annotate(
    about("The work item as its parser checked it, with its criteria numbered AC-1, AC-2 and so on."),
);

export type WorkItem = typeof WorkItem.Type;

export const ProvedTest = Schema.Struct({
    title: Text,
    acs: Schema.Array(AcId).annotate(about("The criteria the plan credits the test with; empty for an existing test.")),
    passed: Schema.Boolean,
    message: Schema.optionalKey(Schema.String).annotate(about("The failure text, when it did not pass.")),
    video: Schema.optionalKey(Text).annotate(
        about("The video's path relative to the proof file, when one was recorded."),
    ),
});

export const HeldThreshold = Schema.Struct({
    ac: AcId,
    metric: Text,
    limit: Schema.Number,
    observed: Schema.Number,
    held: Schema.Boolean,
});

export const Proof = Schema.Struct({
    tests: Schema.Array(ProvedTest),
    thresholds: Schema.Array(HeldThreshold),
}).annotate(
    about(
        "What one test layer's run proved, read from that layer's $EVIDENCE_DIR: its proof.json and its JUnit XML, joined.",
    ),
);

export type Proof = typeof Proof.Type;

export const Manifest = Schema.Struct({
    phase: Schema.Literals(["afterTests", "afterCode"]),
    layers: Schema.Array(Schema.Struct({ layer: Text, proof: Proof })),
}).annotate(about("Every test layer's proof for one run of the checks, as run-layer-checks collected it."));

export type Manifest = typeof Manifest.Type;

export const Applied = Schema.Struct({
    base: Schema.optionalKey(Text.annotate(about("The commit the branch was at before the plan's first commit."))),
    testsCommit: Schema.optionalKey(Text.annotate(about("The commit holding the plan's tests alone."))),
    testsProved: Schema.optionalKey(
        Schema.Boolean.annotate(about("True once the checks after the tests-only commit passed.")),
    ),
    codeCommit: Schema.optionalKey(Text.annotate(about("The commit holding the plan's code."))),
    pending: Schema.optionalKey(
        Schema.Struct({
            base: Text.annotate(about("The commit the branch was at before the plan's code was written.")),
            files: Schema.Array(Text).annotate(
                about("The files the plan's code left uncommitted, all written by this run."),
            ),
            said: Text.annotate(about("What refused the commit or the generator.")),
        }).annotate(
            about(
                "The plan's code is in the tree but not committed because a hook or a generator refused it; the repair commits it.",
            ),
        ),
    ),
}).annotate(
    about(
        "What applying the plan and running the checks have done on the branch so far, so a stopped run resumes where it stopped.",
    ),
);

export type Applied = typeof Applied.Type;

export const LayerChecks = Schema.Struct({
    phase: Schema.Literals(["afterTests", "afterCode"]),
    outcome: Schema.Literals(["passed", "fix", "stop"]).annotate(
        about("passed: the phase holds; fix: the fix agent repairs the gaps; stop: the run stops for the operator."),
    ),
    reason: Schema.optionalKey(Text.annotate(about("Why the run stopped."))),
    kind: Schema.optionalKey(
        Schema.Literals(["environment", "existing-checks"]).annotate(
            about("What kind of stop: an unavailable environment, or checks that already failed before the change."),
        ),
    ),
    gaps: Schema.optionalKey(Schema.Array(Text).annotate(about("What fails after the code commit, one gap each."))),
    runs: Schema.Array(
        Schema.Struct({ layer: Text, command: Text, exitCode: Schema.Number, outputEnd: Schema.String }),
    ).annotate(
        about("Each layer's Verify command, in dependency order, with its exit code and the end of its output."),
    ),
}).annotate(about("One run of every layer's checks and what run-layer-checks judged from it."));

export type LayerChecks = typeof LayerChecks.Type;
