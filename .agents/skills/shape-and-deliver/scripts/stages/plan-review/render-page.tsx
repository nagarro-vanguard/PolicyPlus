/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { Fragment, jsx } from "../../page-components/jsx";
import { Section } from "../../page-components/components/page";
import { HowItIsProved } from "../../core/pages/shared-sections";
import { ReviewNotes } from "../../core/pages/stage-page-frame";
import { drawWith, foundOf, type StageView } from "../../core/stage-run-frame";
import type { Model } from "../../core/stage-model";
import type { PlanReviewFound } from "./render-model";
import { planReviewDecisions, planReviewFound, planReviewStanding } from "./render-read";

type Found = typeof PlanReviewFound.Type;

/**
 * Tells the approver the plan started from the analysis of the picked design, and to say so if the story has changed
 * since. Shows nothing for a plan that did not start from a design.
 * @param props the component's inputs
 * @param props.found the plan
 * @returns the section, or nothing
 */
const StartedFromDesign = ({ found }: { found: Found }) =>
    found.startedFromDesign === true ? (
        <Section id="started-from-design" title="Where this plan started">
            <p>
                This plan started from the analysis made for the picked design, updated for what the build adds. If the
                story has changed since the design, say so and the plan starts again.
            </p>
        </Section>
    ) : (
        <></>
    );

/**
 * Shows, for a bug, what its test does first. Shows nothing for any other kind.
 * @param props the component's inputs
 * @param props.found the plan
 * @returns the section, or nothing
 */
const WhatElseHolds = ({ found }: { found: Found }) =>
    found.kind === "bug" ? (
        <Section id="what-else-holds" title="What else holds">
            <p>The test for the bug is written to fail on today's code, and to pass once the fix is in.</p>
        </Section>
    ) : (
        <></>
    );

/**
 * Shows one sentence telling the approver to agree with every recommended answer to have the plan built, or to say what
 * to change.
 * @returns the section
 */
const Decide = () => (
    <Section id="decide" title="Your answer">
        <p>Agree with every recommended answer to have it built, or say what to change.</p>
    </Section>
);

/**
 * Shows the approver each defect the plan review found and nobody could fix, because the stage that owns it had no
 * round left, so the plan reached them with it still open. Shows nothing when the review left no defect.
 * @param props the component's inputs
 * @param props.found the plan
 * @returns the section, or nothing
 */
const OpenDefects = ({ found }: { found: Found }) => {
    const defects = found.findings.filter((finding) => finding.weight === "defect");
    return defects.length === 0 ? (
        <></>
    ) : (
        <Section id="open-defects" title="Problems still open in this plan">
            <p>
                The review found {defects.length === 1 ? "a problem" : `${defects.length} problems`} that no step had a
                round left to fix. Decide whether the plan is good enough to build with{" "}
                {defects.length === 1 ? "it" : "them"}.
            </p>
            <ul>
                {defects.map((finding) => (
                    <li>
                        {finding.says} Fix: {finding.fix}
                    </li>
                ))}
            </ul>
        </Section>
    );
};

const planVerdicts = {
    waitingForYou: "The plan is ready: read it, answer its questions, then have it built.",
    done: "The plan was approved.",
} as const;

/**
 * Words the plan's verdict: ready to read and build when waiting, approved when done, else still being made.
 * @param tag the stage's state
 * @returns the verdict
 */
const verdictOf = (tag: Model<Found, Found>["_tag"]) =>
    tag === "waitingForYou" || tag === "done" ? planVerdicts[tag] : "The plan is being made.";

/**
 * Gives the plan's verdict and, once there are findings, the approver a design-origin note, any defect left open,
 * what else holds, the closing
 * answer and how each criterion will be proved, and the engineer the review's findings.
 * @param model the stage's model
 * @returns the view
 */
const planReviewView = (model: Model<Found, Found>): StageView => {
    const found = foundOf(model);
    const verdict = verdictOf(model._tag);
    return found === undefined
        ? { verdict }
        : {
              verdict,
              approver: (
                  <>
                      <StartedFromDesign found={found} />
                      {(model._tag === "waitingForYou" || model._tag === "done") && <OpenDefects found={found} />}
                      <WhatElseHolds found={found} />
                      <Decide />
                      <HowItIsProved found={found.tests} />
                  </>
              ),
              engineer: <ReviewNotes found={found} subject="plan" />,
          };
};

export const planReviewDraw = drawWith({
    stage: "plan-review",
    standing: planReviewStanding,
    progress: (run) => ({
        rounds: Math.max(run.rounds.trace.rounds, run.rounds.changes.rounds, run.rounds.tests.rounds),
        maxRounds: run.rounds.trace.maxRounds,
    }),
    decisions: planReviewDecisions,
    running: planReviewFound,
    done: planReviewFound,
    headline: (found) => [{ of: "Finding", count: found.findings.length }],
    view: planReviewView,
});
