/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { WordKey } from "./components/account.tsx";
import { FindingCard, QuestionCard, VideoProof } from "./components/cards.tsx";
import { factsSample } from "./catalogue-facts.tsx";
import { CodeBlock, CopyButton, DiffView } from "./components/code.tsx";
import { DataTable, Disclosure, RiskMap, Timeline } from "./components/data.tsx";
import { FlowDiagram } from "./components/flow.tsx";
import { PlainWords } from "./components/page.tsx";
import { Callout, StatusBadge } from "./components/status.tsx";
import { StandingBadge, type Standing } from "./components/stage.tsx";
import { Fragment, jsx, type Html } from "./jsx";

const standings: readonly Standing[] = ["notStarted", "running", "waitingForYou", "stopped", "done"];

const before = `export const listRuns = (workspace: string) =>
    db.select().from(runs);

export const runCount = () => db.$count(runs);
`;

const after = `export const listRuns = (workspace: string) =>
    db.select().from(runs).where(eq(runs.workspace, workspace));

export const runCount = () => db.$count(runs);
`;

/** Sample content for each component, as the catalogue shows it: its anchor, heading, when to use it, and the sample. */
export const catalogueSamples: readonly { id: string; title: string; lede: string; content: Html }[] = [
    factsSample,
    {
        id: "standing",
        title: "StandingBadge",
        lede: "Where a stage of a run stands, in every skill: the states a stage model is a union of. A stage's page (StagePage) and a run's page (RunOverview) show it.",
        content: (
            <p>
                {standings.map((standing) => (
                    <>
                        <StandingBadge standing={standing} />{" "}
                    </>
                ))}
            </p>
        ),
    },
    {
        id: "plain-words",
        title: "Plain words",
        lede: "The opening of a page for a reader who reads nothing else.",
        content: (
            <PlainWords>
                <p>A person in a workspace sees that workspace's runs, and only those.</p>
                <p>Two criteria are covered and proved; nothing is left open.</p>
            </PlainWords>
        ),
    },
    {
        id: "status",
        title: "Status badges and callouts",
        lede: "Every status has an icon, a word and a colour.",
        content: (
            <>
                <p>
                    <StatusBadge status="pass" label="Covered and proved" />{" "}
                    <StatusBadge status="fail" label="Not covered" />{" "}
                    <StatusBadge status="warn" label="Covered, not yet proved" />{" "}
                    <StatusBadge status="info" label="Note" /> <StatusBadge status="neutral" label="Not started" />
                </p>
                <Callout status="info" title="What happens next">
                    <p>Read the plan and answer its questions, then run the command to build it.</p>
                </Callout>
                <Callout status="fail" title="The run stopped">
                    <p>An existing check already fails before any change, so the plan cannot prove the work yet.</p>
                </Callout>
            </>
        ),
    },
    {
        id: "tables",
        title: "Tables and disclosures",
        lede: "Tables carry a caption and header scopes; detail for engineers sits in a disclosure.",
        content: (
            <>
                <DataTable
                    empty="None."
                    caption="Acceptance criteria"
                    columns={[
                        { key: "ac", label: "Criterion", rowHeader: true },
                        { key: "means", label: "What it means" },
                        { key: "tests", label: "Tests", numeric: true },
                        { key: "status", label: "Status" },
                    ]}
                    rows={[
                        {
                            ac: "AC-1",
                            means: "Given two runs, when I open Runs, then I see both.",
                            tests: 2,
                            status: <StatusBadge status="pass" label="Covered and proved" />,
                        },
                        {
                            ac: "AC-2",
                            means: "Given a run in another workspace, when I open Runs, then I do not see it.",
                            tests: 1,
                            status: <StatusBadge status="warn" label="Covered, not yet proved" />,
                        },
                    ]}
                />
                <Disclosure title="For engineers">
                    <p>Two files change in the api layer; one test file is added in the e2e layer.</p>
                </Disclosure>
            </>
        ),
    },
    {
        id: "flow",
        title: "Flow diagram",
        lede: "A criterion's path from its way in to its data, each step by its state.",
        content: (
            <FlowDiagram
                label="AC-2: the path of a workspace's runs"
                steps={[
                    { name: "The Runs page", detail: "apps/web/routes/runs.tsx:12", state: "exists" },
                    { name: "GET /runs", detail: "apps/api/runs.ts:4", state: "changes", reachedBy: "requests" },
                    {
                        name: "Runs of one workspace",
                        detail: "packages/db/runs.ts",
                        state: "new",
                        reachedBy: "calls",
                    },
                    { name: "The runs table", state: "exists", reachedBy: "reads" },
                ]}
            />
        ),
    },
    {
        id: "flow-as-it-is",
        title: "Flow diagram, as it is",
        lede: "A flow of a system as it stands, with no change to show: no state on any step, and no legend.",
        content: (
            <FlowDiagram
                label="How an order is placed"
                steps={[
                    { name: "The order page", detail: "web/orders/new.tsx:8" },
                    { name: "Place an order", detail: "api/orders.ts:21", reachedBy: "requests" },
                    { name: "The orders table", reachedBy: "saves" },
                ]}
            />
        ),
    },
    {
        id: "code",
        title: "Code and diffs",
        lede: "Exact text keeps its layout; a diff folds what does not change.",
        content: (
            <>
                <DiffView title="apps/api/runs.ts (modify)" before={before} after={after} />
                <CodeBlock id="sample-code" title="Command" code={"/deliver-work implement-request.md"} />
                <p>
                    <CopyButton text="Approved" label="Copy a text" />
                </p>
            </>
        ),
    },
    {
        id: "risks",
        title: "Risk map and timeline",
        lede: "Risks link into their detail; a timeline shows what happened, in order.",
        content: (
            <>
                <RiskMap
                    label="Risks of this change"
                    risks={[
                        {
                            label: "Runs of other workspaces leak",
                            href: "#finding-1",
                            status: "fail",
                            level: "High",
                        },
                        { label: "List gets slower", href: "#question-1", status: "warn", level: "Medium" },
                        { label: "Column renamed", href: "#tables", status: "info", level: "Low" },
                    ]}
                />
                <Timeline
                    events={[
                        { when: "10:02", title: "Trace", status: "pass", statusLabel: "Accepted" },
                        {
                            when: "10:09",
                            title: "Code changes",
                            status: "warn",
                            statusLabel: "Redone once",
                            detail: "The base check found a file outside any layer.",
                        },
                        { when: "10:15", title: "Plan review", status: "pass", statusLabel: "Passed" },
                    ]}
                />
            </>
        ),
    },
    {
        id: "cards",
        title: "Findings, questions and proof",
        lede: "Findings read as claim, evidence, why it matters and fix; questions carry a recommended answer.",
        content: (
            <>
                <FindingCard
                    id="finding-1"
                    claim="The runs query does not filter by workspace."
                    status="fail"
                    statusLabel="Must fix"
                    evidence={<code>apps/api/runs.ts:2</code>}
                    why="A person would see every workspace's runs, which breaks AC-2."
                    fix="Filter the query by the person's workspace."
                />
                <QuestionCard
                    id="question-1"
                    question="Should the list show archived runs?"
                    why="Showing them adds a filter to the query and a toggle to the page."
                    recommended="No; leave archived runs out until a story asks for them."
                    labels={{ why: "Why it matters", recommended: "Recommended answer" }}
                />
                <WordKey
                    title="How sure we are"
                    items={[
                        { word: "confirmed", meaning: "accepted by its review" },
                        { word: "provisional", meaning: "not yet reviewed, or under review" },
                    ]}
                />
                <VideoProof
                    title="AC-1: runs are listed"
                    src="evidence/e2e/ac-1.webm"
                    status="pass"
                    statusLabel="Passed"
                    caption={<p>The person opens Runs and sees both runs.</p>}
                />
            </>
        ),
    },
];
