/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { DataTable } from "../../page-components/components/data";
import { Fragment, jsx } from "../../page-components/jsx";
import { Section } from "../../page-components/components/page";
import { StatusBadge } from "../../page-components/components/status";
import type { Ran } from "../criteria";
import type { Kind, LayerChecks } from "../documents";
import type { RecordOf } from "../record-files";

/** A criterion's tests and load limits, as a stage's findings hold them. */
type TestedCriterion = {
    readonly ac: string;
    readonly name: string;
    readonly tests: readonly RecordOf<"AcceptanceTest">[];
    readonly thresholds: readonly RecordOf<"LoadThreshold">[];
};

/**
 * Lists for an engineer every command one run of the checks ran, with its layer and whether it passed or the exit code
 * it ended with.
 * @param props the component's inputs
 * @param props.checks the run of the checks to list
 * @param props.title the section's title
 * @returns the section
 */
export const ChecksRun = ({ checks, title }: { checks: LayerChecks; title: string }) => (
    <Section id="checks" title={title} reader="engineer">
        <DataTable
            caption="Each layer's checks"
            columns={[
                { key: "layer", label: "Layer", rowHeader: true },
                { key: "command", label: "Command" },
                { key: "result", label: "Result" },
            ]}
            rows={checks.runs.map((run) => ({
                layer: run.layer,
                command: <code>{run.command}</code>,
                result: (
                    <StatusBadge
                        status={run.exitCode === 0 ? "pass" : "fail"}
                        label={run.exitCode === 0 ? "Passed" : `Exited ${run.exitCode}`}
                    />
                ),
            }))}
            empty="No check ran."
        />
    </Section>
);

/**
 * Lists for an engineer each file where the code departs from the approved plan: what the plan said, what the code
 * showed and what was done. Says there is none when nothing departs.
 * @param props the component's inputs
 * @param props.deviations the departures recorded
 * @returns the section
 */
export const Departures = ({ deviations }: { deviations: readonly RecordOf<"Deviation">[] }) => (
    <Section id="deviations" title="Where the code departs from the plan" reader="engineer">
        <DataTable
            caption="Departures from the approved plan"
            columns={[
                { key: "file", label: "File", rowHeader: true },
                { key: "planSaid", label: "The plan said" },
                { key: "codeRevealed", label: "The code showed" },
                { key: "choice", label: "What was done" },
            ]}
            rows={deviations.map((deviation) => ({
                file: <code>{deviation.file}</code>,
                planSaid: deviation.planSaid,
                codeRevealed: deviation.codeRevealed,
                choice: deviation.choice,
            }))}
            empty="None: the code is as the plan was approved."
        />
    </Section>
);

/**
 * Lists what a criterion's tests and load limits show, one line each, or says no test proves it yet.
 * @param props the component's inputs
 * @param props.criterion the criterion's tests and load limits
 * @returns the list
 */
export const WhatProvesIt = ({ criterion }: { criterion: TestedCriterion }) =>
    criterion.tests.length + criterion.thresholds.length === 0 ? (
        <p>No test proves it yet.</p>
    ) : (
        <ul>
            {criterion.tests.map((test) => (
                <li>{test.outcome}</li>
            ))}
            {criterion.thresholds.map((threshold) => (
                <li>{threshold.outcome}</li>
            ))}
        </ul>
    );

/**
 * Shows each criterion under its name with what its tests and load limits will show.
 * @param props the component's inputs
 * @param props.found the proposed tests
 * @param props.found.criteria each criterion with its tests and load limits
 * @returns the section
 */
export const HowItIsProved = ({ found }: { found: { criteria: readonly TestedCriterion[] } }) => (
    <Section id="proved" title="How each criterion will be proved">
        {found.criteria.map((criterion) => (
            <section aria-labelledby={`proved-${criterion.ac}`}>
                <h3 id={`proved-${criterion.ac}`}>{criterion.name}</h3>
                <WhatProvesIt criterion={criterion} />
            </section>
        ))}
    </Section>
);

/**
 * Says, for a bug or a technical story, how the criterion's tests came out on the code before the change. Shows nothing for a
 * feature or a design, or when the tests did not run or there are none.
 * @param props the component's inputs
 * @param props.kind the kind of work
 * @param props.before the criterion's test results on the code before the change
 * @returns the note
 */
export const BeforeTheCode = ({ kind, before }: { kind: Kind; before: typeof Ran.Type }) => {
    if (kind === "feature" || kind === "design" || before._tag === "notRun" || before.results.tests.length === 0) {
        return <></>;
    }
    const { tests } = before.results;
    const failed = tests.filter((test) => !test.passed).length;
    return kind === "bug" ? (
        <p>
            Before the fix, {failed === tests.length ? "its test failed, as the bug said it would" : "its test passed"}.
        </p>
    ) : (
        <p>
            Before the change,{" "}
            {failed === 0 ? "its tests already passed, pinning today's behaviour" : "some of its tests failed"}.
        </p>
    );
};
