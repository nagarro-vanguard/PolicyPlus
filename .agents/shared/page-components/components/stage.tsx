/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import type { SiteAssets } from "../assets";
import { Fragment, jsx, type Child } from "../jsx";
import { madeOn } from "../words";
import { Timeline } from "./data.tsx";
import { Page, PageHeader, Section } from "./page.tsx";
import { Callout, StatusBadge, type Status } from "./status.tsx";

/** Where a stage of a run stands: the states every skill's stage model is a union of (P4c). */
export type Standing = "notStarted" | "running" | "waitingForYou" | "stopped" | "done";

const standingStatus: Readonly<Record<Standing, Status>> = {
    notStarted: "neutral",
    running: "info",
    waitingForYou: "warn",
    stopped: "fail",
    done: "pass",
};

const standingWords: Readonly<Record<Standing, string>> = {
    notStarted: "not started",
    running: "running",
    waitingForYou: "waiting for you",
    stopped: "stopped",
    done: "done",
};

/**
 * A standing as a status: its colour, its icon and its word, never colour alone.
 * @param standing the standing
 * @returns the status
 */
export const statusOfStanding = (standing: Standing) => standingStatus[standing];

/**
 * A standing in words.
 * @param standing the standing
 * @returns the words
 */
export const standingWord = (standing: Standing) => standingWords[standing];

/**
 * A standing as a badge.
 * @param props the badge
 * @param props.standing the standing
 * @returns the badge
 */
export const StandingBadge = ({ standing }: { standing: Standing }) => (
    <StatusBadge status={statusOfStanding(standing)} label={standingWord(standing)} />
);

/** What a stage's page shows around its own content, whatever the skill. */
export type StagePageProps = {
    readonly eyebrow: string;
    readonly title: string;
    readonly standing: Standing;
    readonly said: string;
    readonly madeAt: string;
    readonly assets: SiteAssets;
    readonly runPage: { readonly href: string; readonly label: string };
    readonly children: Child;
};

/**
 * A stage's page (P4c): its header with its standing and the way back to the run page; what it needs from the reader
 * and what it found, as the stage's own renderer draws them. How many rounds a stage used is the operator's, never the
 * reader's (P4e: no round number on a page).
 * @param props the page
 * @returns the page's `<html>` element
 */
export const StagePage = (props: StagePageProps) => (
    <Page
        title={`${props.title}: ${standingWord(props.standing)}`}
        assets={props.assets}
        generatedAt={madeOn(props.madeAt)}
        header={
            <PageHeader
                eyebrow={props.eyebrow}
                title={props.title}
                lede={props.said}
                status={{ status: statusOfStanding(props.standing), label: standingWord(props.standing) }}
                meta={
                    <p class="meta">
                        <a href={props.runPage.href}>{props.runPage.label}</a>
                    </p>
                }
            />
        }
    >
        {props.children}
    </Page>
);

/** One stage as the run page shows it. */
export type RunStage = {
    readonly title: string;
    readonly href: string | undefined;
    readonly standing: Standing;
    readonly said: string;
    readonly learned: readonly string[];
};

/** What a run page shows, whatever the skill. */
export type RunOverviewProps = {
    readonly eyebrow: string;
    readonly title: string;
    readonly lede: string;
    readonly madeAt: string;
    readonly assets: SiteAssets;
    readonly meta: Child;
    readonly stages: readonly RunStage[];
    readonly children?: Child;
};

/**
 * A stage's name, linked to its page once it has one.
 * @param props the stage
 * @param props.stage the stage
 * @returns the name
 */
const StageLink = ({ stage }: { stage: RunStage }) =>
    stage.href === undefined ? <>{stage.title}</> : <a href={stage.href}>{stage.title}</a>;

/**
 * Does anything need you: every stage stopped or waiting for the reader, each with what it says.
 * @param props the stages
 * @param props.stages every stage
 * @returns the section
 */
const NeedsYou = ({ stages }: { stages: readonly RunStage[] }) => {
    const needing = stages.filter((stage) => stage.standing === "stopped" || stage.standing === "waitingForYou");
    return (
        <Section id="does-anything-need-you" title="Does anything need you?">
            {needing.length ? (
                needing.map((stage) => (
                    <Callout status={statusOfStanding(stage.standing)} title={stage.title}>
                        <p>
                            {stage.said} <StageLink stage={stage} />
                        </p>
                    </Callout>
                ))
            ) : (
                <p>Nothing waits for you.</p>
            )}
        </Section>
    );
};

/**
 * What it has learned so far: each stage's headline, or where it stands.
 * @param props the stages
 * @param props.stages every stage
 * @returns the section
 */
const Learned = ({ stages }: { stages: readonly RunStage[] }) => (
    <Section id="what-it-has-learned-so-far" title="What it has learned so far">
        {stages.map((stage) => (
            <>
                <h3>{stage.title}</h3>
                {stage.learned.length ? (
                    <ul>
                        {stage.learned.map((line) => (
                            <li>{line}</li>
                        ))}
                    </ul>
                ) : (
                    <p>{stage.said}</p>
                )}
            </>
        ))}
    </Section>
);

/**
 * A run's page (D82, P4c), in the order a busy person asks: does anything need me, where is it, what has it learned so
 * far; a skill's own facts of the run, such as what the work is, after the first answer.
 * @param props the page
 * @returns the page's `<html>` element
 */
export const RunOverview = (props: RunOverviewProps) => (
    <Page
        title={props.title}
        assets={props.assets}
        generatedAt={madeOn(props.madeAt)}
        header={<PageHeader eyebrow={props.eyebrow} title={props.title} lede={props.lede} meta={props.meta} />}
    >
        <NeedsYou stages={props.stages} />
        {props.children}
        <Section id="where-it-is" title="Where it is">
            <Timeline
                events={props.stages.map((stage) => ({
                    title: stage.title,
                    status: statusOfStanding(stage.standing),
                    statusLabel: standingWord(stage.standing),
                    detail: (
                        <>
                            {stage.said} <StageLink stage={stage} />
                        </>
                    ),
                }))}
            />
        </Section>
        <Learned stages={props.stages} />
    </Page>
);
