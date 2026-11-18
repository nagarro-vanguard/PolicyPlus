/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { Fragment, jsx } from "../../page-components/jsx";
import { drawWith, foundOf, type StageView } from "../../core/stage-run-frame";
import type { Model } from "../../core/stage-model";
import { ChecksRun } from "../../core/pages/shared-sections";
import type { TestsFirstFound } from "./render-model";
import { testsFirstFound, testsFirstStanding } from "./render-read";

type Found = typeof TestsFirstFound.Type;

/**
 * Lists for an engineer every layer's checks on today's code, or shows nothing before they ran.
 * @param props the component's inputs
 * @param props.found what tests first found
 * @returns the checks, or nothing before they ran
 */
const Before = ({ found }: { found: Found }) =>
    found.checks === undefined ? (
        <></>
    ) : (
        <ChecksRun checks={found.checks} title="For engineers: every check on today's code" />
    );

/**
 * Gives the engineer the checks on today's code once there are findings; the approver sees nothing from this stage.
 * @param model the stage's model
 * @returns the view
 */
const testsFirstView = (model: Model<Found, Found>): StageView => {
    const found = foundOf(model);
    return found === undefined ? {} : { engineer: <Before found={found} /> };
};

export const testsFirstDraw = drawWith({
    stage: "tests-first",
    standing: testsFirstStanding,
    progress: () => ({ rounds: 0, maxRounds: 0 }),
    decisions: () => [],
    running: testsFirstFound,
    done: testsFirstFound,
    headline: () => [],
    view: testsFirstView,
});
