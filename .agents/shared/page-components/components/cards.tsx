/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { jsx, type Child } from "../jsx";
import { StatusBadge, type Status } from "./status.tsx";

/**
 * One finding of a review, read as a claim, the evidence for it, why it matters, and the fix.
 * @param props the finding
 * @param props.id its anchor, so a risk map or a table can link to it
 * @param props.claim what is wrong, in one sentence
 * @param props.status how serious it is
 * @param props.statusLabel the word for that, such as "Must fix"
 * @param props.evidence where it shows
 * @param props.why why it matters, when that is not plain from the claim
 * @param props.fix the change that closes it
 * @returns the card
 */
export const FindingCard = (props: {
    id: string;
    claim: string;
    status: Status;
    statusLabel: string;
    evidence: Child;
    why?: Child;
    fix: Child;
}) => (
    <article class="card finding" id={props.id} data-status={props.status} aria-labelledby={`${props.id}-claim`}>
        <div class="card-head">
            <h3 id={`${props.id}-claim`}>{props.claim}</h3>
            <StatusBadge status={props.status} label={props.statusLabel} />
        </div>
        <dl>
            <div>
                <dt>Evidence</dt>
                <dd>{props.evidence}</dd>
            </div>
            {props.why && (
                <div>
                    <dt>Why it matters</dt>
                    <dd>{props.why}</dd>
                </div>
            )}
            <div>
                <dt>Fix</dt>
                <dd>{props.fix}</dd>
            </div>
        </dl>
    </article>
);

/**
 * A question only the reader can answer, with why it matters and the answer the work follows until they say
 * otherwise.
 * @param props the question
 * @param props.id its anchor
 * @param props.question the question
 * @param props.why what changes depending on the answer
 * @param props.recommended the recommended answer
 * @param props.labels what the card calls its two parts: a question for an approver asks "Why it matters" and gives a
 *  "Recommended answer"
 * @param props.labels.why the first part's label
 * @param props.labels.recommended the second part's label
 * @returns the card
 */
export const QuestionCard = (props: {
    id: string;
    question: string;
    why: Child;
    recommended: Child;
    labels: { readonly why: string; readonly recommended: string };
}) => (
    <article class="card" id={props.id} aria-labelledby={`${props.id}-question`}>
        <div class="card-head">
            <h3 id={`${props.id}-question`}>{props.question}</h3>
        </div>
        <dl>
            <div>
                <dt>{props.labels.why}</dt>
                <dd>{props.why}</dd>
            </div>
            <div class="recommended">
                <dt>{props.labels.recommended}</dt>
                <dd>{props.recommended}</dd>
            </div>
        </dl>
    </article>
);

/**
 * A recording that proves something, with what it proves and whether it passed. The recording is linked, not
 * copied into the page, and print shows the caption alone.
 * @param props the proof
 * @param props.title what the recording shows
 * @param props.src the recording, relative to the page
 * @param props.status how its test ended
 * @param props.statusLabel the word for that
 * @param props.caption what a reader should see in it
 * @returns the figure
 */
export const VideoProof = (props: {
    title: string;
    src: string;
    status: Status;
    statusLabel: string;
    caption?: Child;
}) => (
    <figure class="card video-proof">
        <video controls preload="metadata" src={props.src} aria-label={props.title}></video>
        <figcaption>
            <span class="card-head">
                <strong>{props.title}</strong>
                <StatusBadge status={props.status} label={props.statusLabel} />
            </span>
            {props.caption}
            <a href={props.src}>Open the recording</a>
        </figcaption>
    </figure>
);
