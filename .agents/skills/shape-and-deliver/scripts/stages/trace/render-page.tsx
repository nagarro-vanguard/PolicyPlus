/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { DataTable } from "../../page-components/components/data";
import { FlowDiagram } from "../../page-components/components/flow";
import { Fragment, jsx } from "../../page-components/jsx";
import { Section } from "../../page-components/components/page";
import { drawWith, foundOf, type StageView } from "../../core/stage-run-frame";
import type { Model } from "../../core/stage-model";
import type { TraceFound } from "./render-model";
import { traceFound } from "./render-read";
import { producerDecisions, producerStanding } from "../producer-reads";

type Found = typeof TraceFound.Type;

/**
 * Writes where a step's code is, as `file:line` or `file:first-last`, or just the file for a step with no code yet.
 * @param step the step
 * @param step.file its file
 * @param step.lines its lines, when its code exists
 * @param step.lines.first its first line
 * @param step.lines.last its last line
 * @returns the citation
 */
const citationOf = (step: {
    readonly file: string;
    readonly lines?: { readonly first: number; readonly last: number };
}) =>
    step.lines === undefined
        ? step.file
        : `${step.file}:${step.lines.first}${step.lines.last === step.lines.first ? "" : `-${step.lines.last}`}`;

/**
 * Shows the approver each criterion's path as a diagram of steps, each marked as it is today, changing or new, with the
 * place its work starts; says so when a criterion is not traced yet.
 * @param props the component's inputs
 * @param props.found the criteria with their steps
 * @returns the section
 */
const Paths = ({ found }: { found: Found }) => (
    <Section id="paths" title="Paths">
        {found.criteria.map((criterion) => {
            const [first] = criterion.steps;
            return (
                <section aria-labelledby={`path-${criterion.ac}`}>
                    <h3 id={`path-${criterion.ac}`}>{criterion.name}</h3>
                    {first === undefined ? (
                        <p>Not traced yet.</p>
                    ) : (
                        <>
                            {first.start !== undefined && <p>{first.start}</p>}
                            <FlowDiagram
                                label={`The path of ${criterion.name}`}
                                steps={criterion.steps.map((step) => ({
                                    name: step.name,
                                    state: step.status,
                                    ...(step.reachedBy === undefined ? {} : { reachedBy: step.reachedBy }),
                                }))}
                            />
                        </>
                    )}
                </section>
            );
        })}
    </Section>
);

/**
 * Lists for an engineer each step of each criterion with where its code is.
 * @param props the component's inputs
 * @param props.found the criteria with their steps
 * @returns the section
 */
const WhereEachStepIs = ({ found }: { found: Found }) => (
    <Section id="steps" title="Where each step is" reader="engineer">
        <DataTable
            caption="Each step and its code"
            columns={[
                { key: "criterion", label: "Criterion", rowHeader: true },
                { key: "step", label: "Step" },
                { key: "code", label: "Code" },
            ]}
            rows={found.criteria.flatMap((criterion) =>
                criterion.steps.map((step) => ({
                    criterion: criterion.name,
                    step: step.name,
                    code: <code>{citationOf(step)}</code>,
                })),
            )}
            empty="Nothing is traced yet."
        />
    </Section>
);

/**
 * Gives the approver each criterion's path and the engineer where each step's code is, once there are findings, also
 * while the trace is still running.
 * @param model the stage's model
 * @returns the view
 */
const traceView = (model: Model<Found, Found>): StageView => {
    const found = foundOf(model);
    return found === undefined
        ? {}
        : {
              approver: <Paths found={found} />,
              engineer: <WhereEachStepIs found={found} />,
          };
};

export const traceDraw = drawWith({
    stage: "trace",
    standing: (run) => producerStanding(run, "trace", "The trace"),
    progress: (run) => ({ rounds: run.rounds.trace.rounds, maxRounds: run.rounds.trace.maxRounds }),
    decisions: (run) => producerDecisions(run, "trace"),
    running: traceFound,
    done: traceFound,
    headline: (found) => [
        { of: "PathStep", count: found.criteria.reduce((total, each) => total + each.steps.length, 0) },
    ],
    view: traceView,
});
