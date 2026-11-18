import { Schema } from "effect";
import { HeldThreshold, ProvedTest, type Manifest } from "./documents";
import { about, recordTypes, storedOf, Text } from "./records";
import type { Run } from "./run-context";

const Results = Schema.Struct({
    tests: Schema.Array(Schema.Struct({ ...ProvedTest.fields, layer: Text })),
    thresholds: Schema.Array(HeldThreshold),
}).annotate(
    about("Every result of one run of the checks for a criterion: its tests, each with its layer, and its limits."),
);

export const Ran = Schema.TaggedUnion({ notRun: {}, ran: { results: Results } }).annotate(
    about("A run of the checks, once it has run, with its results for the criterion."),
);

export const CriterionView = Schema.Struct({
    ac: Text,
    name: Text.annotate(about("The criterion as the approver reads it: Criterion 1, Criterion 2, and so on.")),
    text: Text,
    steps: Schema.Array(storedOf(recordTypes.PathStep)),
    tests: Schema.Array(storedOf(recordTypes.AcceptanceTest)),
    thresholds: Schema.Array(storedOf(recordTypes.LoadThreshold)),
    before: Ran.annotate(about("Its results after the tests-only commit.")),
    proof: Ran.annotate(about("Its results after the code commit.")),
    standing: Schema.Struct({
        status: Schema.Literals(["pass", "warn", "fail"]),
        label: Text,
        why: Text,
    }).annotate(
        about("How it stands once its tests could have run: no test, not run yet, not proved, proved or failing."),
    ),
}).annotate(about("One acceptance criterion with everything the pages show of it."));

export type CriterionView = typeof CriterionView.Type;

type Results = typeof Results.Type;

/**
 * Picks out of one run's manifest the tests tagged with a criterion, each with its layer, and the limits set for it.
 * @param manifest the manifest of one run of the checks
 * @param ac the criterion
 * @returns its tests' results and its thresholds
 */
function resultsFor(manifest: Manifest, ac: string): Results {
    return {
        tests: manifest.layers.flatMap(({ layer, proof }) =>
            proof.tests.filter((test) => test.acs.includes(ac)).map((test) => ({ ...test, layer })),
        ),
        thresholds: manifest.layers.flatMap(({ proof }) => proof.thresholds.filter((held) => held.ac === ac)),
    };
}

/**
 * Says how a criterion stands: no test, not run yet, proved, or failing. A planned load limit counts like a test.
 * @param planned how many tests and limits are planned for it
 * @param proof its results after the code commit
 * @returns its standing: a status, a label and a sentence saying why
 */
function proofStandingOf(planned: number, proof: typeof CriterionView.Type.proof): CriterionView["standing"] {
    if (planned === 0) {
        return { status: "fail", label: "No test", why: "No test proves this criterion." };
    }
    if (proof._tag === "notRun") {
        return { status: "warn", label: "Not run yet", why: "Its tests run once the plan is built." };
    }
    const results = [
        ...proof.results.tests.map((test) => test.passed),
        ...proof.results.thresholds.map((held) => held.held),
    ];
    if (results.length === 0) {
        return {
            status: "fail",
            label: "Not proved",
            why: "The checks ran after the code was applied, but gave no result for this criterion's tests: a layer proves a criterion only through a proof.json or JUnit XML in its evidence folder, or a command check.",
        };
    }
    const failed = results.filter((passed) => !passed).length;
    const one = results.length === 1;
    const all = results.length === 2 ? "Both of its checks" : `All ${results.length} of its checks`;
    return failed === 0
        ? { status: "pass", label: "Proved", why: `${one ? "Its one check" : all} passed after the code was applied.` }
        : {
              status: "fail",
              label: "Failing",
              why: `${one ? "Its one check" : `${failed} of its ${results.length} checks`} failed after the code was applied.`,
          };
}

/**
 * A criterion's number as the approver reads it.
 * @param index its place in the work item, from 0
 * @returns the name, such as "Criterion 1"
 */
export const criterionName = (index: number) => `Criterion ${index + 1}`;

/**
 * Gathers, for each criterion of the work item, its path steps, tests, load limits, results before and after the code
 * commit, and its standing.
 * @param run the run
 * @returns one row per criterion in the work item's order; empty when the run has no work item yet
 */
export function criteriaOf(run: Run): CriterionView[] {
    if (run.workItem === undefined) {
        return [];
    }
    const { records, manifests } = run;
    return run.workItem.criteria.map(({ ac, text }, i) => {
        const tests = records.tests.filter((test) => test.ac === ac);
        const thresholds = records.thresholds.filter((threshold) => threshold.ac === ac);
        const before = manifests.afterTests;
        const after = manifests.afterCode;
        const proof: CriterionView["proof"] =
            after === undefined ? { _tag: "notRun" } : { _tag: "ran", results: resultsFor(after, ac) };
        return {
            ac,
            name: criterionName(i),
            text,
            steps: records.steps.filter((step) => step.ac === ac),
            tests,
            thresholds,
            before: before === undefined ? { _tag: "notRun" } : { _tag: "ran", results: resultsFor(before, ac) },
            proof,
            standing: proofStandingOf(tests.length + thresholds.length, proof),
        };
    });
}
