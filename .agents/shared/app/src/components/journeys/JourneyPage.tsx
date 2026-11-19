import { Sections } from "@continuum/ui/components/details";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@continuum/ui/components/item";
import type { JourneyView, PairRow, StepView, TodayStepView } from "../../case/journeys";
import type { Link } from "../../case/view";
import { copy } from "../../lib/copy";
import { Section } from "../Explorer";
import { Fold } from "../Fold";
import { Drop } from "./JourneyList";
import { ChangeChip, ChangeChips, LinkLine, LinkRows } from "./Parts";

// One journey: what the person gets and the kinds of change, then each step of today beside the step of the new way
// that does its work (two columns pinned under one header on a wide screen; today first, then the new way, on a
// narrow one), what the new way leaves out and why, why this way was chosen, the challenges still open, and the
// journeys before and after it in the list's order.

const words = copy.journeys;

const StepNumber = ({ value }: { readonly value: number }) => (
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs tabular-nums text-muted-foreground" aria-hidden="true">
        {value}
    </span>
);

const ColumnLabel = ({ text }: { readonly text: string }) => (
    <p className="text-xs font-medium text-muted-foreground md:sr-only" data-written-by="app">
        {text}
    </p>
);

const TodayCell = ({ steps }: { readonly steps: readonly TodayStepView[] }) => (
    <div className="flex flex-col gap-spacing-md">
        <ColumnLabel text={words.today} />
        {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-written-by="app">
                {words.noToday}
            </p>
        ) : (
            steps.map((step) => (
                <div key={step.number} className="flex gap-spacing-md" data-today-step>
                    <StepNumber value={step.number} />
                    <div className="flex min-w-0 flex-col gap-spacing-2xs">
                        <p className="font-medium" data-written-by="agent">
                            {step.intent}
                        </p>
                        <p className="text-sm text-muted-foreground" data-written-by="agent">
                            {step.system}
                        </p>
                    </div>
                </div>
            ))
        )}
    </div>
);

const Step = ({ step, root }: { readonly step: StepView; readonly root: string }) => (
    <div className="flex gap-spacing-md" data-proposed-step>
        <StepNumber value={step.number} />
        <div className="flex min-w-0 flex-1 flex-col gap-spacing-xs">
            <p className="font-medium" data-written-by="agent">
                {step.intent}
            </p>
            <p className="text-sm text-muted-foreground" data-written-by="agent">
                {step.system}
            </p>
            <p>
                <ChangeChip group={step.change.group} label={step.change.label} />
            </p>
            <p className="text-sm">
                <span className="text-muted-foreground" data-written-by="app">
                    {words.why}:{" "}
                </span>
                <span data-written-by="agent">{step.reason}</span>
            </p>
            {step.changed.length === 0 ? null : (
                <div className="flex flex-col gap-spacing-xs">
                    <p className="text-xs font-medium text-muted-foreground" data-written-by="app">
                        {words.changes}
                    </p>
                    {step.changed.map((change, at) => (
                        <div key={`${change.rule.name}${String(at)}`} className="flex flex-col gap-spacing-2xs border-s-2 border-border ps-spacing-md">
                            <p data-written-by="agent">{change.rule.href === undefined ? change.rule.name : <a href={`${root}${change.rule.href}`}>{change.rule.name}</a>}</p>
                            <p className="text-sm">
                                <span className="text-muted-foreground" data-written-by="app">
                                    {words.changesTo}:{" "}
                                </span>
                                <span data-written-by="agent">{change.to}</span>
                            </p>
                        </div>
                    ))}
                </div>
            )}
            <LinkLine label={words.whereToday} items={step.places} root={root} />
            <LinkLine label={words.landsIn} items={step.domains} root={root} />
            <div className="flex flex-col">
                {step.kept.length === 0 ? null : (
                    <Fold summary={step.keptTitle ?? words.keeps} writtenBy="app">
                        <LinkRows items={step.kept} root={root} />
                    </Fold>
                )}
                {step.dropped.length === 0 ? null : (
                    <Fold summary={step.droppedTitle ?? words.drops} writtenBy="app">
                        <LinkRows items={step.dropped} root={root} />
                    </Fold>
                )}
                {step.stories.length === 0 ? null : (
                    <Fold summary={words.builtBy}>
                        <LinkRows items={step.stories} root={root} />
                    </Fold>
                )}
                {step.data.length === 0 ? null : (
                    <Fold summary={words.data}>
                        <ul className="flex list-disc flex-col gap-spacing-2xs ps-spacing-xl">
                            {step.data.map((name) => (
                                <li key={name} data-written-by="agent">
                                    {name}
                                </li>
                            ))}
                        </ul>
                    </Fold>
                )}
            </div>
        </div>
    </div>
);

const ProposedCell = ({ steps, root }: { readonly steps: readonly StepView[]; readonly root: string }) => (
    <div className="flex flex-col gap-spacing-md">
        <ColumnLabel text={words.proposed} />
        {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-written-by="app">
                {words.noProposed}
            </p>
        ) : (
            steps.map((step) => <Step key={step.number} step={step} root={root} />)
        )}
    </div>
);

const Pairs = ({ rows, root }: { readonly rows: readonly PairRow[]; readonly root: string }) => (
    <div className="flex flex-col" role="table" aria-label={words.steps}>
        <div className="sticky top-12 z-10 hidden grid-cols-2 gap-spacing-4xl border-b border-border bg-background py-spacing-xs md:grid" role="row">
            <p className="text-xs font-medium text-muted-foreground" role="columnheader" data-written-by="app">
                {words.today}
            </p>
            <p className="text-xs font-medium text-muted-foreground" role="columnheader" data-written-by="app">
                {words.proposed}
            </p>
        </div>
        {rows.map((row, at) => (
            <div key={String(at)} className="grid gap-spacing-xl border-b border-border py-spacing-xl md:grid-cols-2 md:gap-spacing-4xl" role="row" data-pair>
                <div role="cell" className="min-w-0">
                    <TodayCell steps={row.today} />
                </div>
                <div role="cell" className="min-w-0">
                    <ProposedCell steps={row.proposed} root={root} />
                </div>
            </div>
        ))}
    </div>
);

const TodayOnly = ({ rows }: { readonly rows: readonly PairRow[] }) => (
    <div className="flex flex-col gap-spacing-xl">
        {rows.flatMap((row) => row.today).map((step) => (
            <div key={step.number} className="flex gap-spacing-md" data-today-step>
                <StepNumber value={step.number} />
                <div className="flex min-w-0 flex-col gap-spacing-2xs">
                    <p className="font-medium" data-written-by="agent">
                        {step.intent}
                    </p>
                    <p className="text-sm text-muted-foreground" data-written-by="agent">
                        {step.system}
                    </p>
                </div>
            </div>
        ))}
    </div>
);

const PagerLink = ({ link, word, rel, root }: { readonly link: Link; readonly word: string; readonly rel: string; readonly root: string }) => (
    <Item size="xs" variant="outline" className="min-w-0 flex-1 basis-48" render={<a href={`${root}${link.href}`} rel={rel} />}>
        <ItemContent className="min-w-0">
            <ItemDescription className="text-xs" data-written-by="app">
                {word}
            </ItemDescription>
            <ItemTitle className="line-clamp-none" data-written-by="agent">
                {link.name}
            </ItemTitle>
        </ItemContent>
    </Item>
);

/**
 * The journey.
 * @param props the journey's view and the address of the site's root from this page
 * @returns the body of the journey's page
 */
export function JourneyPage({ view, root }: { readonly view: JourneyView; readonly root: string }) {
    return (
        <div className="flex flex-col gap-spacing-5xl">
            <div className="flex flex-col gap-spacing-md">
                <ChangeChips groups={view.groups} />
                {view.counts === null ? null : (
                    <p className="text-sm text-muted-foreground tabular-nums" data-written-by="app">
                        {view.counts}
                    </p>
                )}
                {view.way === null ? null : (
                    <p>
                        <span className="font-medium" data-written-by="app">
                            {words.newWay("")}
                        </span>
                        <span className="font-medium" data-written-by="agent">
                            {view.way.name}
                        </span>
                        <span data-written-by="agent">. {view.way.idea}</span>
                    </p>
                )}
                <LinkLine label={words.capability} items={view.capability === null ? [] : [view.capability]} root={root} />
            </div>
            <Sections>
                {view.way === null ? (
                    <Section title={words.stepsToday} writtenBy="app">
                        <TodayOnly rows={view.rows} />
                    </Section>
                ) : (
                    <Section title={words.steps} writtenBy="app">
                        <p className="text-sm text-muted-foreground" data-written-by="app">
                            {words.stepsNote}
                        </p>
                        <Pairs rows={view.rows} root={root} />
                    </Section>
                )}
                {view.drops.length === 0 ? null : (
                    <Section title={words.leftOut} writtenBy="app">
                        <div className="flex flex-col">
                            {view.drops.map((drop, at) => (
                                <Drop key={String(at)} drop={drop} root={root} showJourney={false} />
                            ))}
                        </div>
                    </Section>
                )}
                {view.way === null ? null : (
                    <Section title={words.whyThisWay} writtenBy="app">
                        <dl className="flex flex-col gap-spacing-md">
                            {view.way.recommended === null ? null : (
                                <div className="flex flex-col gap-spacing-2xs">
                                    <dt className="text-sm text-muted-foreground" data-written-by="app">
                                        {words.recommended}
                                    </dt>
                                    <dd data-written-by="agent">{view.way.recommended}</dd>
                                </div>
                            )}
                            <div className="flex flex-col gap-spacing-2xs">
                                <dt className="text-sm text-muted-foreground" data-written-by="app">
                                    {words.tradeoff}
                                </dt>
                                <dd data-written-by="agent">{view.way.tradeoff}</dd>
                            </div>
                        </dl>
                        {view.alternatives.length === 0 ? null : (
                            <div className="border-t border-border">
                                <Fold summary={words.otherWays}>
                                    <div className="flex flex-col gap-spacing-lg">
                                        {view.alternatives.map((way) => (
                                            <div key={way.name} className="flex flex-col gap-spacing-2xs">
                                                <p className="font-medium" data-written-by="agent">
                                                    {way.name}
                                                </p>
                                                <p data-written-by="agent">{way.idea}</p>
                                                <p className="text-sm">
                                                    <span className="text-muted-foreground" data-written-by="app">
                                                        {words.tradeoff}:{" "}
                                                    </span>
                                                    <span data-written-by="agent">{way.tradeoff}</span>
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </Fold>
                            </div>
                        )}
                    </Section>
                )}
                {view.challenges.length === 0 ? null : (
                    <Section title={words.challenges} writtenBy="app">
                        <p className="text-sm text-muted-foreground" data-written-by="app">
                            {words.challengesNote}
                        </p>
                        <ul className="flex list-disc flex-col gap-spacing-xs ps-spacing-xl">
                            {view.challenges.map((text) => (
                                <li key={text} data-written-by="agent">
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}
            </Sections>
            {view.prev === null && view.next === null ? null : (
                <nav aria-label={words.pager} className="flex flex-wrap gap-spacing-md">
                    {view.prev === null ? null : <PagerLink link={view.prev} word={words.previous} rel="prev" root={root} />}
                    {view.next === null ? null : <PagerLink link={view.next} word={words.next} rel="next" root={root} />}
                </nav>
            )}
        </div>
    );
}
