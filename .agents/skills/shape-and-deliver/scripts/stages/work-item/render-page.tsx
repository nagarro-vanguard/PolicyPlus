/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { CriterionCard } from "../../page-components/components/cards";
import { Section } from "../../page-components/components/page";
import { jsx } from "../../page-components/jsx";
import { criterionName } from "../../core/criteria";
import { drawWith } from "../../core/stage-run-frame";
import type { StageView } from "../../core/stage-run-frame";
import type { Model } from "../../core/stage-model";
import type { WorkItemFound } from "./render-model";
import { workItemFound, workItemStanding } from "./render-read";

type Found = typeof WorkItemFound.Type;

/**
 * Shows each acceptance criterion as the person wrote it.
 * @param props the component's inputs
 * @param props.found the work item as read
 * @returns the section
 */
const WhatIsAsked = ({ found }: { found: Found }) => (
    <Section id="criteria" title="Acceptance criteria">
        {found.workItem.criteria.map((criterion, i) => (
            <CriterionCard ac={criterion.ac} name={criterionName(i)} text={criterion.text} />
        ))}
    </Section>
);

/**
 * Shows the approver the work item's criteria once it is read, and nothing before.
 * @param model the stage's model
 * @returns the view
 */
const workItemView = (model: Model<Record<string, never>, Found>): StageView =>
    model._tag === "done" ? { approver: <WhatIsAsked found={model.found} /> } : {};

export const workItemDraw = drawWith({
    stage: "work-item",
    standing: workItemStanding,
    progress: () => ({ rounds: 0, maxRounds: 0 }),
    decisions: () => [],
    running: () => ({}),
    done: workItemFound,
    headline: () => [],
    view: workItemView,
});
