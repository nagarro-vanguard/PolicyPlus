/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { jsx } from "../jsx";

/** Whether a step's code is there today, changes, or is new. */
export type StepState = "exists" | "changes" | "new";

/** One step of a flow: its name, where it is, its state, and how the step before reaches it. */
export type FlowStep = { name: string; detail?: string; state?: StepState; reachedBy?: string };

const stateWords: Record<StepState, string> = { exists: "As today", changes: "Changes", new: "New" };

/**
 * A path through a system, step by step from its way in, each step drawn by its state: a thin line as it is today,
 * a thick line where it changes, a dashed line where it is new, with the state also in words. A flow as it is, with
 * no step given a state (an analysis of a system, not a change to it), draws every step plainly, with no legend. It
 * is built from text, not an image, so it wraps on a phone, reads aloud in order, and prints.
 * @param props the flow
 * @param props.label what the path is, such as the criterion it serves
 * @param props.steps the steps, from the way in
 * @returns the flow and its legend
 */
export const FlowDiagram = ({ label, steps }: { label: string; steps: readonly FlowStep[] }) => (
    <figure class="flow-figure">
        <ol class="flow" role="list" aria-label={label}>
            {steps.map((step, i) => (
                <li>
                    {i > 0 && (
                        <div class="flow-link">
                            <span aria-hidden="true">{"↓"}</span>
                            {step.reachedBy === undefined ? "then" : step.reachedBy}
                        </div>
                    )}
                    <div class="flow-step" data-state={step.state}>
                        <div class="flow-step-head">
                            <span class="flow-step-name">{step.name}</span>
                            {step.state !== undefined && <span class="flow-state">{stateWords[step.state]}</span>}
                        </div>
                        {step.detail && <code class="flow-detail">{step.detail}</code>}
                    </div>
                </li>
            ))}
        </ol>
        {steps.some((step) => step.state !== undefined) && (
            <figcaption class="flow-legend">
                <span>As today</span>
                <span class="legend-changes">Changes</span>
                <span class="legend-new">New</span>
            </figcaption>
        )}
    </figure>
);
