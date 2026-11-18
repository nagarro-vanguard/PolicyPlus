/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { DataTable } from "../../page-components/components/data";
import { Fragment, jsx } from "../../page-components/jsx";
import { Section } from "../../page-components/components/page";
import { StatusBadge } from "../../page-components/components/status";
import { VideoProof } from "../../page-components/components/cards";
import { agree, counted } from "../../page-components/words";
import { isPlainName, staysInside } from "../../core/contained-path";
import type { CriterionView } from "../../core/criteria";
import { BeforeTheCode, ChecksRun, Departures, WhatProvesIt } from "../../core/pages/shared-sections";
import { ReviewNotes } from "../../core/pages/stage-page-frame";
import { drawWith, foundOf, type StageView } from "../../core/stage-run-frame";
import type { Model } from "../../core/stage-model";
import type { ChangeReviewFound } from "./render-model";
import { changeReviewFound, changeReviewStanding } from "./render-read";

type Found = typeof ChangeReviewFound.Type;

/**
 * Shows a criterion's card: its standing, how its tests did before the code (bug or technical story only), what they prove,
 * their recordings and whether each load limit held.
 * @param props the component's inputs
 * @param props.found the evidence, for the kind of work and the recordings' folder
 * @param props.criterion the criterion to show
 * @returns the card
 */
const ProofOf = ({ found, criterion }: { found: Found; criterion: CriterionView }) => {
    const results = criterion.proof._tag === "ran" ? criterion.proof.results : { tests: [], thresholds: [] };
    const recordings = results.tests.flatMap((test) =>
        test.video === undefined || !isPlainName(test.layer) || !staysInside(test.layer, test.video)
            ? []
            : [{ ...test, video: test.video }],
    );
    const limits = results.thresholds.flatMap((held) =>
        criterion.thresholds
            .filter((threshold) => threshold.metric === held.metric)
            .map((threshold) => ({ held: held.held, outcome: threshold.outcome })),
    );
    return (
        <section class="card" aria-labelledby={`proof-${criterion.ac}`}>
            <div class="card-head">
                <h3 id={`proof-${criterion.ac}`}>
                    {criterion.name}: {criterion.text}
                </h3>
                <StatusBadge status={criterion.standing.status} label={criterion.standing.label} />
            </div>
            <p>{criterion.standing.why}</p>
            <BeforeTheCode kind={found.kind} before={criterion.before} />
            <p>What its tests prove:</p>
            <WhatProvesIt criterion={criterion} />
            {recordings.map((test, i) => (
                <VideoProof
                    title={`Recording ${recordings.length > 1 ? `${i + 1} ` : ""}of ${criterion.name}`}
                    src={`${found.evidence}/${test.layer}/${test.video}`}
                    status={test.passed ? "pass" : "fail"}
                    statusLabel={test.passed ? "Passed" : "Failed"}
                />
            ))}
            {limits.map((limit) => (
                <p>
                    <StatusBadge status={limit.held ? "pass" : "fail"} label={limit.held ? "Held" : "Not held"} />{" "}
                    {limit.outcome}
                </p>
            ))}
        </section>
    );
};

/**
 * Tabulates for an engineer every test's layer, title and result with any failure message, and every load limit's
 * observed value against its limit.
 * @param props the component's inputs
 * @param props.found the evidence
 * @returns the section
 */
const Results = ({ found }: { found: Found }) => (
    <Section id="results" title="Every result" reader="engineer">
        <DataTable
            caption="Results after the code commit"
            columns={[
                { key: "criterion", label: "Criterion", rowHeader: true },
                { key: "layer", label: "Layer" },
                { key: "test", label: "Test or limit" },
                { key: "result", label: "Result" },
            ]}
            rows={found.criteria.flatMap((criterion) =>
                criterion.proof._tag === "notRun"
                    ? []
                    : [
                          ...criterion.proof.results.tests.map((test) => ({
                              criterion: criterion.name,
                              layer: test.layer,
                              test: test.title,
                              result: `${test.passed ? "Passed" : "Failed"}${test.message === undefined ? "" : `: ${test.message}`}`,
                          })),
                          ...criterion.proof.results.thresholds.map((held) => ({
                              criterion: criterion.name,
                              layer: "load",
                              test: <code>{held.metric}</code>,
                              result: `${held.observed}, within ${held.limit}: ${held.held ? "held" : "not held"}`,
                          })),
                      ],
            )}
            empty="No result yet."
            stack
        />
    </Section>
);

/**
 * Tabulates each fact the change could have broken with its tests, and says "Yes" only when it has tests and all passed.
 * @param props the component's inputs
 * @param props.found the evidence
 * @returns the section
 */
const FactsKept = ({ found }: { found: Found }) => (
    <Section id="facts" title="Facts kept">
        <DataTable
            caption="Each fact the change could have broken, and its proof"
            columns={[
                { key: "fact", label: "Fact", rowHeader: true },
                { key: "tests", label: "Proved by" },
                { key: "held", label: "Held" },
            ]}
            rows={found.facts.map((fact) => ({
                fact: fact.why,
                tests: fact.tests.length === 0 ? "No test" : fact.tests.map((test) => test.title).join(", "),
                held: fact.tests.length > 0 && fact.tests.every((test) => test.held) ? "Yes" : "Not shown to hold",
            }))}
            empty="None."
        />
    </Section>
);

/**
 * Gives the verdict of how many criteria are proved and, once there are findings, the approver each criterion's proof and
 * the facts kept, and the engineer every result, the departures, the review and every check.
 * @param model the stage's model
 * @returns the view
 */
const changeReviewView = (model: Model<Found, Found>): StageView => {
    const found = foundOf(model);
    if (found === undefined) {
        return {};
    }
    const proved = found.criteria.filter((criterion) => criterion.standing.status === "pass").length;
    const total = counted(found.criteria.length, "acceptance criterion", "acceptance criteria");
    return {
        verdict: `${String(proved)} of ${total} ${agree(found.criteria.length, "is", "are")} proved by tests that ran after the code was applied.`,
        approver: (
            <>
                <Section id="proof" title="Proof, criterion by criterion">
                    {found.criteria.map((criterion) => (
                        <ProofOf found={found} criterion={criterion} />
                    ))}
                </Section>
                {found.facts.length > 0 && <FactsKept found={found} />}
            </>
        ),
        engineer: (
            <>
                <Results found={found} />
                <Departures deviations={found.code.deviations} />
                <ReviewNotes found={found} subject="change" />
                {found.code.checks !== undefined && <ChecksRun checks={found.code.checks} title="Every check" />}
            </>
        ),
    };
};

export const changeReviewDraw = drawWith({
    stage: "change-review",
    standing: changeReviewStanding,
    progress: (run) => ({ rounds: run.rounds.fix.rounds, maxRounds: run.rounds.fix.maxRounds }),
    decisions: () => [],
    running: changeReviewFound,
    done: changeReviewFound,
    headline: (found) => [{ of: "Finding", count: found.findings.length }],
    view: changeReviewView,
});
