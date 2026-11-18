/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { FindingCard, QuestionCard } from "../../page-components/components/cards";
import { Fragment, jsx } from "../../page-components/jsx";
import { Section } from "../../page-components/components/page";
import { counted } from "../../page-components/words";
import type { RecordOf } from "../record-files";
import type { Counted, Model } from "../stage-model";
import { recordWords } from "./stage-labels";

type AnyModel = Model<unknown, unknown>;

/**
 * Writes counts of records in words, such as "5 path steps, 1 question".
 * @param figures the count of each record type
 * @returns the words, or "nothing" when there are no counts
 */
export const countedWords = (figures: readonly Counted[]) =>
    figures.length
        ? figures
              .map((figure) => {
                  const [one, many] = recordWords[figure.of];
                  return counted(figure.count, one, many);
              })
              .join(", ")
        : "nothing";

/**
 * Says in one sentence where a stage stands; a waiting stage names how many questions wait on the approver, if any.
 * @param model the stage's model
 * @returns the sentence
 */
export function saidOf(model: AnyModel): string {
    const questions = model.decisions.filter((decision) => decision._tag === "question").length;
    switch (model._tag) {
        case "notStarted":
            return "Not started.";
        case "running":
            return "Under way.";
        case "stopped":
            return "Stopped: whoever runs the delivery has the details.";
        case "waitingForYou":
            return questions
                ? `Waiting for you: ${counted(questions, "question", "questions")}.`
                : "Waiting for your decision.";
        case "done":
            return "Done.";
    }
}

/**
 * Shows each open question as a card with why it matters and the recommended answer.
 * @param props the component's inputs
 * @param props.questions the questions the approver has to answer
 * @returns the cards
 */
export const Questions = ({ questions }: { questions: readonly RecordOf<"Question">[] }) => (
    <>
        {questions.map((question) => (
            <QuestionCard
                id={question.id}
                question={question.question}
                why={question.whyItMatters}
                recommended={question.recommended}
                labels={{ why: "Why it matters", recommended: "Recommended answer" }}
            />
        ))}
    </>
);

const weights = {
    security: { status: "fail", label: "Security" },
    defect: { status: "fail", label: "Must fix" },
    note: { status: "info", label: "Note" },
} as const;

/**
 * Shows one review finding as a card: what it claims, its weight, the evidence and the fix.
 * @param props the component's inputs
 * @param props.finding the finding to show
 * @returns the card
 */
const Finding = ({ finding }: { finding: RecordOf<"Finding"> }) => (
    <FindingCard
        id={finding.id}
        claim={finding.says}
        status={weights[finding.weight].status}
        statusLabel={weights[finding.weight].label}
        evidence={finding.evidence.join("; ")}
        fix={finding.fix}
    />
);

/**
 * Shows an engineer what a review found: each finding as a card, or a line saying it has not run or found nothing.
 * @param props the component's inputs
 * @param props.found whether the review has run, and what it found
 * @param props.found.reviewed whether the review has written its findings
 * @param props.found.findings the findings it wrote
 * @param props.subject what was reviewed, named in the section's title
 * @returns the section
 */
export const ReviewNotes = ({
    found,
    subject,
}: {
    found: { reviewed: boolean; findings: readonly RecordOf<"Finding">[] };
    subject: "plan" | "change";
}) => (
    <Section id="review" title={`The ${subject} review`} reader="engineer">
        {!found.reviewed && <p>The {subject} has not been reviewed yet.</p>}
        {found.reviewed && found.findings.length === 0 && <p>The review found nothing.</p>}
        {found.findings.map((finding) => (
            <Finding finding={finding} />
        ))}
    </Section>
);
