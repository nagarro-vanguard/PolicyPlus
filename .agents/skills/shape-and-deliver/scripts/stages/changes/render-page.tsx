/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { DataTable, Disclosure } from "../../page-components/components/data";
import { DiagramFigure } from "../../page-components/components/diagram";
import { DiffView } from "../../page-components/components/code";
import { Fragment, jsx } from "../../page-components/jsx";
import { Section } from "../../page-components/components/page";
import { drawWith, foundOf, type StageView } from "../../core/stage-run-frame";
import type { Model } from "../../core/stage-model";
import type { ChangesFound } from "./render-model";
import { changesFound } from "./render-read";
import { producerDecisions, producerStanding } from "../producer-reads";

type Found = typeof ChangesFound.Type;

const actionWords = {
    add: "added",
    modify: "changed",
    delete: "deleted",
    generate: "written by its generator",
} as const;

/**
 * Shows an engineer each changed file under its layer, in dependency order, as a collapsed diff titled with its path,
 * what happens to it and why. Says no file is proposed when there is none.
 * @param props the component's inputs
 * @param props.found the code changes
 * @returns the section
 */
const CodeTour = ({ found }: { found: Found }) => (
    <Section id="code" title="The code" reader="engineer">
        {found.layers.length === 0 && <p>No file is proposed yet.</p>}
        {found.layers.map((layer) => (
            <>
                <h3>{layer.layer}</h3>
                {layer.files.map(({ change, product, before, after }) => (
                    <Disclosure
                        id={change.id}
                        title={`${product ? "Changes the product: " : ""}${change.path}, ${actionWords[change.action]}: ${change.reason}`}
                    >
                        <DiffView title={change.path} before={before} after={after} />
                    </Disclosure>
                ))}
            </>
        ))}
    </Section>
);

/**
 * Shows the approver each design choice with what it was chosen over, why, and what it costs.
 * @param props the component's inputs
 * @param props.found the code changes
 * @returns the section
 */
const Decisions = ({ found }: { found: Found }) => (
    <Section id="design" title="How it is designed">
        <DataTable
            caption="The choices that shape the code, and what each was chosen over"
            columns={[
                { key: "decision", label: "Chosen", rowHeader: true },
                { key: "instead", label: "Instead of" },
                { key: "because", label: "Because" },
                { key: "costs", label: "It costs" },
            ]}
            rows={found.decisions.map((each) => ({
                decision: each.decision,
                instead: each.instead,
                because: each.because,
                costs: each.costs,
            }))}
            empty="No design choice is recorded."
        />
    </Section>
);

/**
 * Draws the design diagrams meant for one reader, each with its source in a collapsed block.
 * @param props the component's inputs
 * @param props.found the code changes
 * @param props.reader whose diagrams to draw
 * @returns the section, or nothing when no diagram is for this reader
 */
const Views = ({ found, reader }: { found: Found; reader: "approver" | "engineer" }) => {
    const views = found.views.filter((each) => each.reader === reader);
    return views.length === 0 ? (
        <></>
    ) : (
        <Section id={`diagrams-${reader}`} title="The design as a whole" reader={reader}>
            {views.map((each) => (
                <DiagramFigure id={each.id} title={each.title} source={each.source} />
            ))}
        </Section>
    );
};

/**
 * Gives the approver the design decisions and their diagrams, when there are any, and the engineer the engineer's
 * diagrams and the changed files, once there are findings.
 * @param model the stage's model
 * @returns the view
 */
const changesView = (model: Model<Found, Found>): StageView => {
    const found = foundOf(model);
    if (found === undefined) {
        return {};
    }
    return {
        ...(found.decisions.length === 0 && !found.views.some((each) => each.reader === "approver")
            ? {}
            : {
                  approver: (
                      <>
                          {found.decisions.length === 0 ? <></> : <Decisions found={found} />}
                          <Views found={found} reader="approver" />
                      </>
                  ),
              }),
        engineer: (
            <>
                <Views found={found} reader="engineer" />
                <CodeTour found={found} />
            </>
        ),
    };
};

export const changesDraw = drawWith({
    stage: "changes",
    standing: (run) => producerStanding(run, "changes", "The proposed code"),
    progress: (run) => ({ rounds: run.rounds.changes.rounds, maxRounds: run.rounds.changes.maxRounds }),
    decisions: (run) => producerDecisions(run, "changes"),
    running: changesFound,
    done: changesFound,
    headline: (found) => [
        { of: "DesignDecision", count: found.decisions.length },
        { of: "PlanView", count: found.views.length },
        { of: "ChangedFile", count: found.layers.reduce((total, each) => total + each.files.length, 0) },
    ],
    view: changesView,
});
