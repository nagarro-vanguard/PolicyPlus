/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { CriterionCard } from "../../page-components/components/cards";
import { DataTable, Disclosure } from "../../page-components/components/data";
import { Fragment, documentText, jsx, type Child } from "../../page-components/jsx";
import { Page, PageHeader, Section } from "../../page-components/components/page";
import { madeOn } from "../../page-components/words";
import { type Status } from "../../page-components/components/status";
import { criteriaOf, type CriterionView } from "../criteria";
import type { Run } from "../run-context";
import { stageNames, type Stage } from "../run-layout";
import type { StageView } from "../stage-run-frame";
import type { StageSummary } from "../stage-model";
import { countedWords, saidOf, Questions } from "./stage-page-frame";
import { stageTitle } from "./stage-labels";

/** The stylesheet and script every page links, in the internal assets folder. */
const assets = { stylesheet: "internal/assets/page.css", script: "internal/assets/page.js" };

/** What the pages are built from: the run, each started stage's model and what it shows each reader. */
export type Parts = {
    readonly run: Run;
    readonly summaries: ReadonlyMap<Stage, StageSummary>;
    readonly views: ReadonlyMap<Stage, StageView>;
    /** When the pages were made, as an ISO date and time. */
    readonly madeAt: string;
};

/** Where a page stands, as its badge says it. */
type Badge = { readonly status: Status; readonly label: string };

/**
 * Gives the work item's title, or its id while the item is not read yet.
 * @param run the run
 * @returns the title
 */
const titleOf = (run: Run) => (run.workItem === undefined ? run.plan.workItemId : run.workItem.title);

/**
 * Turns a stage's state into a page badge: stopped, needs you, done, under way, or not started.
 * @param summary the stage's model, or undefined when it has none
 * @returns the badge
 */
const badgeOf = (summary: StageSummary | undefined): Badge => {
    switch (summary === undefined ? "notStarted" : summary._tag) {
        case "stopped":
            return { status: "fail", label: "Stopped" };
        case "waitingForYou":
            return { status: "warn", label: "Needs you" };
        case "done":
            return { status: "pass", label: "Done" };
        case "running":
            return { status: "info", label: "Under way" };
        default:
            return { status: "neutral", label: "Not started" };
    }
};

/**
 * Shows the questions the given stages wait on as cards under one heading, each question once. Shows nothing when there
 * are none.
 * @param props the component's inputs
 * @param props.parts what the pages are built from
 * @param props.stages the stages whose questions to collect
 * @returns the section, or nothing
 */
const DecisionsSection = ({ parts, stages }: { parts: Parts; stages: readonly Stage[] }) => {
    const all = stages.flatMap((stage) => {
        const summary = parts.summaries.get(stage);
        return summary === undefined
            ? []
            : summary.decisions.flatMap((decision) => (decision._tag === "question" ? [decision.question] : []));
    });
    const questions = all.filter((question, at) => all.findIndex((other) => other.id === question.id) === at);
    return questions.length === 0 ? (
        <></>
    ) : (
        <Section id="decisions" title="Decisions" lede="Each has a recommendation, which stands if you approve.">
            <Questions questions={questions} />
        </Section>
    );
};

/**
 * Collects one reader's section from each of the given stages that has one, keeping the order of the stages.
 * @param parts what the pages are built from
 * @param stages the stages to take sections from, in order
 * @param reader which reader's sections to take
 * @returns each section
 */
const sectionsOf = (parts: Parts, stages: readonly Stage[], reader: "approver" | "engineer"): Child[] =>
    stages.flatMap((stage) => {
        const view = parts.views.get(stage);
        const section = view === undefined ? undefined : view[reader];
        return section === undefined ? [] : [section];
    });

/**
 * Shows a page of the run: a header with the title, the verdict and a status badge, then its sections, and the time it
 * was made.
 * @param props the page's inputs
 * @param props.meta further facts under the verdict, when the page has any
 * @param props.title the page's title
 * @param props.verdict the verdict, in one sentence
 * @param props.badge the status badge beside the verdict
 * @param props.madeAt when the page was made, as an ISO date and time, given by the caller
 * @param props.children the page's sections
 * @returns the page's `<html>`
 */
const ReaderPage = (props: {
    title: string;
    verdict: string;
    badge: Badge;
    madeAt: string;
    meta?: Child;
    children?: Child;
}) => (
    <Page
        title={props.title}
        assets={assets}
        generatedAt={madeOn(props.madeAt)}
        header={<PageHeader title={props.title} verdict={props.verdict} status={props.badge} meta={props.meta} />}
    >
        {props.children}
    </Page>
);

/** The stages, in order, whose approver sections make the plan page. */
const planStages: readonly Stage[] = ["work-item", "orient", "trace", "changes", "tests", "plan-review"];
/** The stages, in order, whose engineer sections make the code page. */
const codeStages: readonly Stage[] = stageNames.filter((stage) => stage !== "work-item" && stage !== "change-review");

/**
 * Builds the plan page for the approver: the plan review's verdict, the questions to answer, then the approver's sections
 * of the work item, orientation, trace, proposed code, proposed tests and plan review. Gives nothing until one of them has a section.
 * @param parts what the pages are built from
 * @returns the page's text, or undefined when no stage has anything for the approver
 */
export const planPage = (parts: Parts) => {
    const sections = sectionsOf(parts, planStages, "approver");
    if (sections.length === 0) {
        return undefined;
    }
    const review = parts.views.get("plan-review");
    const verdict = review === undefined || review.verdict === undefined ? "The plan is being made." : review.verdict;
    return documentText(
        <ReaderPage
            title={`Plan: ${titleOf(parts.run)}`}
            verdict={verdict}
            badge={badgeOf(parts.summaries.get("plan-review"))}
            madeAt={parts.madeAt}
        >
            <DecisionsSection parts={parts} stages={planStages} />
            {sections}
        </ReaderPage>,
    );
};

/**
 * Counts what the code changes and the tests contain, in one sentence, or says they are being made.
 * @param parts what the pages are built from
 * @returns the sentence
 */
const sizeOf = (parts: Parts) => {
    const figures = ["changes", "tests"].flatMap((stage) => {
        const summary = parts.summaries.get(stage as Stage);
        return summary === undefined || !("headline" in summary) ? [] : summary.headline;
    });
    return figures.length === 0 ? "The code changes are being made." : `${countedWords(figures)}.`;
};

/**
 * Picks the model the code page's badge follows: the code stage's once it has one, else the code changes'.
 * @param parts what the pages are built from
 * @returns that model, or undefined when neither stage has started
 */
const codeSummary = (parts: Parts) => {
    const built = parts.summaries.get("code");
    return built === undefined ? parts.summaries.get("changes") : built;
};

/**
 * Builds the code page for the engineer from the engineer's sections of the orientation, trace, code changes, tests, plan
 * review, tests first and code, with a size sentence as the verdict. Gives nothing until one of them has a section.
 * @param parts what the pages are built from
 * @returns the page's text, or undefined when no stage has anything for the engineer
 */
export const codePage = (parts: Parts) => {
    const sections = sectionsOf(parts, codeStages, "engineer");
    if (sections.length === 0) {
        return undefined;
    }
    return documentText(
        <ReaderPage
            title={`Code: ${titleOf(parts.run)}`}
            verdict={sizeOf(parts)}
            badge={badgeOf(codeSummary(parts))}
            madeAt={parts.madeAt}
        >
            {sections}
        </ReaderPage>,
    );
};

/**
 * Builds the evidence page: the questions the code stage waits on, then the change review's approver sections and its
 * engineer sections. Gives nothing until the change review has a view.
 * @param parts what the pages are built from
 * @returns the page's text, or undefined before the change review has started
 */
export const evidencePage = (parts: Parts) => {
    const view = parts.views.get("change-review");
    if (view === undefined) {
        return undefined;
    }
    const sections = [
        ...sectionsOf(parts, ["change-review"], "approver"),
        ...sectionsOf(parts, ["change-review"], "engineer"),
    ];
    return documentText(
        <ReaderPage
            title={`Evidence: ${titleOf(parts.run)}`}
            verdict={view.verdict === undefined ? "The change is being reviewed." : view.verdict}
            badge={badgeOf(parts.summaries.get("change-review"))}
            madeAt={parts.madeAt}
        >
            <DecisionsSection parts={parts} stages={["code"]} />
            {sections}
        </ReaderPage>,
    );
};

/**
 * Shows each acceptance criterion in the work item's words, with how it stands only once the checks ran after the code.
 * @param props the component's inputs
 * @param props.criteria the criteria with their standing
 * @param props.ran whether the checks ran after the code commit
 * @returns the section
 */
const Criteria = ({ criteria, ran }: { criteria: readonly CriterionView[]; ran: boolean }) => (
    <Section id="criteria" title="Acceptance criteria">
        {criteria.map((criterion) => (
            <CriterionCard
                ac={criterion.ac}
                name={criterion.name}
                text={criterion.text}
                standing={ran ? criterion.standing : undefined}
            />
        ))}
    </Section>
);

/**
 * Decides the run's verdict, in the order: stopped, plan ready, build needs a decision, a stage under way, built and
 * proved (the checks after the code passed and every criterion is proved), plan approved, nothing under way. The two waiting cases also give the link to the page to open.
 * @param parts what the pages are built from
 * @returns the verdict, and the link text and page when something waits on the reader
 */
const needsOf = (parts: Parts) => {
    const tagOf = (stage: Stage) => {
        const summary = parts.summaries.get(stage);
        return summary === undefined ? "notStarted" : summary._tag;
    };
    const waiting = (stage: Stage) => tagOf(stage) === "waitingForYou";
    const stopped = stageNames.find((stage) => tagOf(stage) === "stopped");
    const running = stageNames.find((stage) => tagOf(stage) === "running");
    if (stopped !== undefined) {
        return { verdict: "The delivery stopped; whoever runs it has the details." };
    }
    if (waiting("plan-review")) {
        return {
            verdict: "The plan is ready for you.",
            needs: { text: "Read the plan and answer its questions", href: "plan.html" },
        };
    }
    if (waiting("code")) {
        return {
            verdict: "The build needs your decision.",
            needs: { text: "Answer the build's question", href: "evidence.html" },
        };
    }
    if (running !== undefined) {
        return { verdict: `Working on: ${stageTitle(running).toLowerCase()}.` };
    }
    const checks = parts.run.checks.afterCode;
    if (
        checks !== undefined &&
        checks.outcome === "passed" &&
        criteriaOf(parts.run).every((criterion) => criterion.standing.label === "Proved")
    ) {
        return { verdict: "Built and proved." };
    }
    return { verdict: tagOf("plan-review") === "done" ? "The plan was approved." : "Nothing is under way." };
};

/**
 * Shows a "Needs you" link when something waits on the reader, and a list of links to the pages that exist.
 * @param props the component's inputs
 * @param props.needs the link text and page that need the reader, when one does
 * @param props.pages the label and address of each page that exists
 * @returns the sections
 */
const Directions = (props: {
    needs: { readonly text: string; readonly href: string } | undefined;
    pages: readonly { readonly label: string; readonly href: string }[];
}) => (
    <>
        {props.needs !== undefined && (
            <Section id="needs" title="Needs you">
                <p>
                    <a href={props.needs.href}>{props.needs.text}</a>
                </p>
            </Section>
        )}
        {props.pages.length > 0 && (
            <Section id="pages" title="Pages">
                <ul>
                    {props.pages.map((link) => (
                        <li>
                            <a href={link.href}>{link.label}</a>
                        </li>
                    ))}
                </ul>
            </Section>
        )}
    </>
);

/**
 * Shows, in a collapsed table, each stage's title and a sentence for its state.
 * @param props the component's inputs
 * @param props.parts what the pages are built from
 * @returns the disclosure
 */
const Progress = ({ parts }: { parts: Parts }) => (
    <Disclosure title="Progress">
        <DataTable
            caption="Each stage of the delivery"
            columns={[
                { key: "stage", label: "Stage", rowHeader: true },
                { key: "state", label: "State" },
            ]}
            rows={stageNames.map((stage) => {
                const summary = parts.summaries.get(stage);
                return { stage: stageTitle(stage), state: summary === undefined ? "Not started." : saidOf(summary) };
            })}
            empty="No stage."
        />
    </Disclosure>
);

/**
 * Builds the start page: the work item's title with the run's verdict, the link to what needs the reader, the pages that
 * exist, the acceptance criteria and each stage's state.
 * @param parts what the pages are built from
 * @param existing which of the plan, code and evidence pages were written
 * @param existing.plan whether the plan page was written
 * @param existing.code whether the code page was written
 * @param existing.evidence whether the evidence page was written
 * @returns the page's text
 */
export const startPage = (
    parts: Parts,
    existing: { readonly plan: boolean; readonly code: boolean; readonly evidence: boolean },
) => {
    const { verdict, needs } = needsOf(parts);
    const { run } = parts;
    const pages = [
        ...(existing.plan ? [{ label: "Plan", href: "plan.html" }] : []),
        ...(existing.code ? [{ label: "Code", href: "code.html" }] : []),
        ...(existing.evidence ? [{ label: "Evidence", href: "evidence.html" }] : []),
    ];
    const badge: Badge =
        needs === undefined
            ? { status: "neutral", label: "Nothing needs you" }
            : { status: "warn", label: "Needs you" };
    const link =
        run.plan.workItemUrl === undefined ? (
            run.plan.workItemId
        ) : (
            <a href={run.plan.workItemUrl}>{run.plan.workItemId}</a>
        );
    return documentText(
        <ReaderPage
            title={titleOf(run)}
            verdict={verdict}
            badge={badge}
            madeAt={parts.madeAt}
            meta={<p class="meta">{link}</p>}
        >
            <Directions needs={needs} pages={pages} />
            <Criteria criteria={criteriaOf(run)} ran={run.manifests.afterCode !== undefined} />
            <Progress parts={parts} />
        </ReaderPage>,
    );
};
