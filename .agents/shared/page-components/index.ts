/**
 * Page components: one design system every skill builds its generated HTML pages from. Pages compose these components with
 * the JSX runtime and link the site's stylesheet and script, written once per site (`assetFiles`), never inlined. See
 * catalogue.html for every token and component.
 */
export { assetFiles, assetsFor, type SiteAssets } from "./assets";
export { namesId, visibleText, visibleTextByReader } from "./visible-text";
export { documentText, Fragment, jsx, type Child, type Html } from "./jsx";
export { CopyButton, CodeBlock, DiffView } from "./components/code.tsx";
export {
    DataTable,
    Disclosure,
    RiskMap,
    Timeline,
    type Column,
    type Risk,
    type TimelineEvent,
} from "./components/data.tsx";
export { FindingCard, QuestionCard, VideoProof } from "./components/cards.tsx";
export { FactCard, RegisterRow, TopicBlock, type Mark } from "./components/facts.tsx";
export { NewMarker, WordKey } from "./components/account.tsx";
export { FlowDiagram, type FlowStep, type StepState } from "./components/flow.tsx";
export { OnThisPage, Page, PageHeader, PlainWords, Section } from "./components/page.tsx";
export { Callout, StatusBadge, SummaryStrip, type Status, type SummaryFigure } from "./components/status.tsx";
export {
    RunOverview,
    StagePage,
    StandingBadge,
    standingWord,
    statusOfStanding,
    type RunOverviewProps,
    type RunStage,
    type StagePageProps,
    type Standing,
} from "./components/stage.tsx";
export { agree, anchorOf, counted, madeOn, num } from "./words";
