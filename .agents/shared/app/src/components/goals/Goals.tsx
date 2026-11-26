import { Sections } from "@continuum/ui/components/details";
import { Item, ItemContent, ItemTitle } from "@continuum/ui/components/item";
import { NoDataState } from "@continuum/ui/components/no-data-state";
import type { GoalView, GoalsPageView, Link, MarkView } from "../../case/goals-view";
import { copy } from "../../lib/copy";
import { Section } from "../Explorer";
import { KindBadge } from "../KindBadge";

// The Goals section's body and a goal's own page. Each goal is shown in the words of the people who asked, then, in the
// app's words, whether each stage of the work (journeys, architecture, foundation decisions, stories) considered it, with a
// link to what that stage said. Written-by marks keep three voices apart: the person's goal and the stages' own sentences
// are the agents', the marks and headings are the app's. A mark is a word with its icon, never colour alone, and the marks
// wrap under the goal's words on a narrow screen. Nothing here says a goal is built or met: the work stops at the plan.

const words = copy.goals;

const linkClass = "underline decoration-border underline-offset-4 hover:decoration-foreground";

/** One link of a stage's work, or its plain name when the page it names is not in this site. */
function LinkItem({ link, root }: { readonly link: Link; readonly root: string }) {
    return link.href === undefined ? (
        <span data-written-by="agent">{link.name}</span>
    ) : (
        <a href={`${root}${link.href}`} className={linkClass} data-written-by="agent">
            {link.name}
        </a>
    );
}

/** The four marks of a goal in a line: the stage's name, a link to its page, and the mark's word. */
function Marks({ goal, root }: { readonly goal: GoalView; readonly root: string }) {
    return (
        <ul className="flex flex-wrap items-center gap-x-spacing-xl gap-y-spacing-xs text-sm" data-part="goal-marks">
            {goal.marks.map((mark) => (
                <li key={mark.stage} className="flex flex-wrap items-center gap-spacing-xs" data-stage={mark.stage} data-state={mark.state}>
                    <a href={`${root}${mark.href}`} className={linkClass} data-written-by="app">
                        {mark.stageWord}
                    </a>
                    <KindBadge kind={mark.badge} label={mark.word} writtenBy="app" part="goal-mark" />
                </li>
            ))}
        </ul>
    );
}

/**
 * The Goals section's body.
 * @param props the view and the address of the site's root
 * @returns the body
 */
export function Goals({ view, root }: { readonly view: GoalsPageView; readonly root: string }) {
    if (view.goals.length === 0) return <NoDataState title={words.none} message={words.noneHint} />;
    return (
        <div className="flex flex-col gap-spacing-4xl" data-goals>
            <p className="text-muted-foreground" data-written-by="app">
                {words.meaning}
            </p>
            {view.stale ? (
                <p role="status" data-written-by="app">
                    <KindBadge kind="goal-stale" writtenBy="app" /> {words.staleNote}
                </p>
            ) : null}
            <Sections>
                <Section title={words.listTitle} writtenBy="app">
                    <ol className="flex flex-col">
                        {view.goals.map((goal) => (
                            <li key={goal.number} id={`goal-${goal.number}`} className="scroll-mt-spacing-5xl rounded-control target:bg-muted" data-goal-row data-summary={goal.summary}>
                                <Item size="xs" render={<article />} className="flex-wrap">
                                    <div className="shrink-0 md:w-40">
                                        <KindBadge kind={goal.summaryBadge} label={goal.summaryWord} writtenBy="app" part="goal-summary" />
                                    </div>
                                    <ItemContent className="min-w-0 flex-1 basis-80">
                                        <ItemTitle className="line-clamp-none font-normal" data-written-by="agent">
                                            <a href={`${root}${goal.page}`} className={linkClass}>
                                                <span className="tabular-nums">{goal.number}. </span>
                                                {goal.text}
                                            </a>
                                        </ItemTitle>
                                    </ItemContent>
                                    <div className="w-full basis-full md:ps-44">
                                        <Marks goal={goal} root={root} />
                                    </div>
                                </Item>
                            </li>
                        ))}
                    </ol>
                </Section>
            </Sections>
        </div>
    );
}

/** One stage's mark with what it says and where to read it, on a goal's page. */
function StageRow({ mark, root }: { readonly mark: MarkView; readonly root: string }) {
    return (
        <li id={`stage-${mark.stage}`} className="flex flex-col gap-spacing-2xs border-s-2 border-border ps-spacing-md" data-stage={mark.stage} data-state={mark.state}>
            <p className="flex flex-wrap items-center gap-spacing-xs">
                <a href={`${root}${mark.href}`} className={`${linkClass} font-medium`} data-written-by="app">
                    {mark.stageWord}
                </a>
                <KindBadge kind={mark.badge} label={mark.word} writtenBy="app" part="goal-mark" />
            </p>
            {mark.line === null ? null : (
                <p className="text-sm text-muted-foreground" data-written-by="app">
                    {mark.line}
                </p>
            )}
            {mark.links.length === 0 ? null : (
                <p className="flex flex-wrap gap-x-spacing-md gap-y-spacing-2xs text-sm">
                    {mark.links.map((link) => (
                        <LinkItem key={`${link.href ?? ""}${link.name}`} link={link} root={root} />
                    ))}
                </p>
            )}
        </li>
    );
}

/**
 * A goal's own page: its words as the person wrote them, where it was considered, and what each stage said.
 * @param props the goal and the address of the site's root
 * @returns the body
 */
export function GoalPage({ goal, root }: { readonly goal: GoalView; readonly root: string }) {
    return (
        <div className="flex flex-col gap-spacing-4xl" data-goal-page data-summary={goal.summary}>
            <div className="flex flex-col gap-spacing-md">
                <p className="flex flex-wrap items-center gap-spacing-xs">
                    <KindBadge kind={goal.summaryBadge} label={goal.summaryWord} writtenBy="app" part="goal-summary" />
                </p>
                <p className="text-sm text-muted-foreground" data-written-by="app">
                    {words.asked}
                </p>
                <p className="whitespace-pre-line" data-written-by="agent">
                    {goal.text}
                </p>
            </div>
            <Sections>
                <Section title={words.stagesTitle} writtenBy="app">
                    <ul className="flex flex-col gap-spacing-lg">
                        {goal.marks.map((mark) => (
                            <StageRow key={mark.stage} mark={mark} root={root} />
                        ))}
                    </ul>
                </Section>
                {goal.answer === null ? null : (
                    <Section title={words.answer} writtenBy="app">
                        <p data-written-by="agent">{goal.answer.how}</p>
                        {goal.answer.where.length === 0 ? (
                            <p className="text-sm text-muted-foreground" data-written-by="app">
                                {words.settledLine}
                            </p>
                        ) : (
                            <p className="flex flex-wrap gap-x-spacing-md gap-y-spacing-2xs text-sm">
                                <span className="text-muted-foreground" data-written-by="app">
                                    {words.answerWhere}:
                                </span>
                                {goal.answer.where.map((link) => (
                                    <LinkItem key={link.name} link={link} root={root} />
                                ))}
                            </p>
                        )}
                        {goal.components === 0 ? null : (
                            <p className="text-sm text-muted-foreground" data-written-by="app">
                                {words.components(goal.components)}
                            </p>
                        )}
                    </Section>
                )}
                <div id="decision">
                    <Section title={words.decisionTitle} writtenBy="app">
                        {goal.decision === null ? (
                            <p data-written-by="app">{words.nothing}</p>
                        ) : (
                            <div className="flex flex-col gap-spacing-xs">
                                <p data-written-by="agent">{goal.decision.chose}</p>
                                <p className="text-sm" data-written-by="agent">
                                    <span className="text-muted-foreground" data-written-by="app">
                                        {words.decisionLayer}:{" "}
                                    </span>
                                    {goal.decision.layer}
                                </p>
                                <p className="text-sm" data-written-by="agent">
                                    <span className="text-muted-foreground" data-written-by="app">
                                        {words.decisionReason}:{" "}
                                    </span>
                                    {goal.decision.reason}
                                </p>
                            </div>
                        )}
                    </Section>
                </div>
                {goal.stories.length === 0 ? null : (
                    <Section title={words.storiesTitle} writtenBy="app">
                        <ul className="flex flex-col gap-spacing-2xs text-sm">
                            {goal.stories.map((link) => (
                                <li key={`${link.href ?? ""}${link.name}`}>
                                    <LinkItem link={link} root={root} />
                                </li>
                            ))}
                        </ul>
                        {goal.epics === 0 ? null : (
                            <p className="text-sm text-muted-foreground" data-written-by="app">
                                {words.epics(goal.epics)}
                            </p>
                        )}
                    </Section>
                )}
                {goal.journeys.length === 0 ? null : (
                    <Section title={words.journeysTitle} writtenBy="app">
                        <ul className="flex flex-col gap-spacing-2xs text-sm">
                            {goal.journeys.map((link) => (
                                <li key={`${link.href ?? ""}${link.name}`}>
                                    <LinkItem link={link} root={root} />
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}
            </Sections>
        </div>
    );
}
