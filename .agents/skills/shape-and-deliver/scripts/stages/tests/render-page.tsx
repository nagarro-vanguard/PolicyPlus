/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { DataTable, Disclosure } from "../../page-components/components/data";
import { DiffView } from "../../page-components/components/code";
import { Fragment, jsx } from "../../page-components/jsx";
import { Section } from "../../page-components/components/page";
import { drawWith, foundOf, type StageView } from "../../core/stage-run-frame";
import type { Model } from "../../core/stage-model";
import type { TestsFound } from "./render-model";
import { testsFound } from "./render-read";
import { producerDecisions, producerStanding } from "../producer-reads";

type Found = typeof TestsFound.Type;

/**
 * Lists why a test file is there: each test it holds with its criterion, each load limit it measures, and any reason a
 * support file is needed.
 * @param props the component's inputs
 * @param props.found the proposed tests
 * @param props.path the test file's path
 * @returns the reasons
 */
const WhyThisTestFile = ({ found, path }: { found: Found; path: string }) => (
    <ul>
        {found.criteria.flatMap((criterion) => [
            ...criterion.tests
                .filter((test) => test.file === path)
                .map((test) => (
                    <li id={test.id}>
                        <strong>{test.title}</strong> ({criterion.name}): {test.outcome}
                    </li>
                )),
            ...criterion.thresholds
                .filter((threshold) => threshold.file === path)
                .map((threshold) => (
                    <li id={threshold.id}>
                        {criterion.name}: {threshold.outcome}
                    </li>
                )),
        ])}
        {found.support
            .filter((support) => support.path === path)
            .map((support) => (
                <li id={support.id}>{support.reason}</li>
            ))}
    </ul>
);

/**
 * Tabulates each load limit with its criterion, its measure, its value and whether it came from the story or the default.
 * @param props the component's inputs
 * @param props.found the proposed tests
 * @returns the table
 */
const LoadLimits = ({ found }: { found: Found }) => (
    <DataTable
        caption="Load limits"
        columns={[
            { key: "criterion", label: "Criterion", rowHeader: true },
            { key: "metric", label: "Measure" },
            { key: "limit", label: "Limit", numeric: true },
            { key: "source", label: "Comes from" },
        ]}
        rows={found.criteria.flatMap((criterion) =>
            criterion.thresholds.map((threshold) => ({
                criterion: criterion.name,
                metric: <code>{threshold.metric}</code>,
                limit: threshold.limit,
                source:
                    threshold.source === "story" && threshold.quote !== undefined
                        ? `The story: "${threshold.quote}"`
                        : "The load layer's default",
            })),
        )}
        empty="No load limit."
    />
);

/**
 * Lists each command check: the command and its layer, for a criterion no test runner reaches.
 * @param props the component's inputs
 * @param props.found the proposed tests
 * @returns the list, or nothing when there is no command check
 */
const CommandChecks = ({ found }: { found: Found }) => {
    const checks = found.criteria.flatMap((criterion) =>
        criterion.tests.flatMap((test) => (test.command === undefined ? [] : [{ criterion, test }])),
    );
    return checks.length === 0 ? (
        <></>
    ) : (
        <ul>
            {checks.map(({ criterion, test }) => (
                <li id={test.id}>
                    <code>{test.command}</code> in {test.layer} ({criterion.name}): {test.outcome}
                </li>
            ))}
        </ul>
    );
};

/**
 * Shows an engineer every file the tests add, each in its layer with why it is there and its whole diff, then the load
 * limits.
 * @param props the component's inputs
 * @param props.found the proposed tests
 * @returns the section
 */
const TestTour = ({ found }: { found: Found }) => (
    <Section id="tests" title="The tests" reader="engineer">
        {found.files.map((file) => (
            <Disclosure title={`${file.path} (${file.layer})`}>
                <WhyThisTestFile found={found} path={file.path} />
                <DiffView title={file.path} before={file.before} after={file.after} />
            </Disclosure>
        ))}
        <CommandChecks found={found} />
        <LoadLimits found={found} />
    </Section>
);

/**
 * Gives the engineer the test files and load limits once there are findings; the approver sees nothing from this stage.
 * @param model the stage's model
 * @returns the view
 */
const testsView = (model: Model<Found, Found>): StageView => {
    const found = foundOf(model);
    return found === undefined ? {} : { engineer: <TestTour found={found} /> };
};

export const testsDraw = drawWith({
    stage: "tests",
    standing: (run) => producerStanding(run, "tests", "The proposed tests"),
    progress: (run) => ({ rounds: run.rounds.tests.rounds, maxRounds: run.rounds.tests.maxRounds }),
    decisions: (run) => producerDecisions(run, "tests"),
    running: testsFound,
    done: testsFound,
    headline: (found) => [
        { of: "AcceptanceTest", count: found.criteria.reduce((total, each) => total + each.tests.length, 0) },
    ],
    view: testsView,
});
