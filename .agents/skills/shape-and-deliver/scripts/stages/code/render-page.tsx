/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { Fragment, jsx } from "../../page-components/jsx";
import { ChecksRun, Departures } from "../../core/pages/shared-sections";
import { drawWith, foundOf, type StageView } from "../../core/stage-run-frame";
import type { Model } from "../../core/stage-model";
import type { CodeFound } from "./render-model";
import { codeDecisions, codeFound, codeStanding } from "./render-read";

type Found = typeof CodeFound.Type;

/**
 * Shows an engineer the departures from the plan and, once the checks ran, every check after the code commit.
 * @param props the component's inputs
 * @param props.found the code as built
 * @returns the sections
 */
const Built = ({ found }: { found: Found }) => (
    <>
        <Departures deviations={found.deviations} />
        {found.checks !== undefined && <ChecksRun checks={found.checks} title="Every check after the code commit" />}
    </>
);

/**
 * Gives the engineer the departures and checks once there are findings, and a verdict asking for an answer while the
 * repair waits on the approver.
 * @param model the stage's model
 * @returns the view
 */
const codeView = (model: Model<Found, Found>): StageView => {
    const found = foundOf(model);
    const verdict = model._tag === "waitingForYou" ? "The build needs your decision: answer its question." : undefined;
    return {
        ...(verdict === undefined ? {} : { verdict }),
        ...(found === undefined ? {} : { engineer: <Built found={found} /> }),
    };
};

export const codeDraw = drawWith({
    stage: "code",
    standing: codeStanding,
    progress: (run) => ({ rounds: run.rounds.fix.rounds, maxRounds: run.rounds.fix.maxRounds }),
    decisions: codeDecisions,
    running: codeFound,
    done: codeFound,
    headline: (found) => [{ of: "Deviation", count: found.deviations.length }],
    view: codeView,
});
