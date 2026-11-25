import { Badge } from "@continuum/ui/components/badge";
import { Button } from "@continuum/ui/components/button";
import { Sections } from "@continuum/ui/components/details";
import { Input } from "@continuum/ui/components/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@continuum/ui/components/item";
import { Label } from "@continuum/ui/components/label";
import { NoDataState } from "@continuum/ui/components/no-data-state";
import { Textarea } from "@continuum/ui/components/textarea";
import { ChevronDownIcon, ChevronRightIcon, Copy, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { PlainLink, PlanView, StoryView } from "../../case/plan-view";
import { copy } from "../../lib/copy";
import { Section } from "../Explorer";
import { Fold } from "../Fold";
import { Matrix } from "./Matrix";

// The Plan section's page: how the plan is built up, its phases in build order with their epics and the layers they are
// built in, the journey by domain matrix, every story grouped by phase with its filters, and what the plan leaves out.
// A story opens in a sheet on the same page (`#story=<n>`): the page's script (src/scripts/plan.ts) reads the story's
// body from `plan/story/<n>.html`, written at build time from StoryBody below, into the sheet, a native modal dialog
// painted as the design system's sheet, so the page ships no framework and does not grow with the plan's rules. The copy of a story context is read from `plan/brief/<n>.txt` when asked for.

const words = copy.plan;
const selectClass =
    "h-8 w-full appearance-none rounded-control border border-input bg-background ps-spacing-md pe-8 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

const LinkOrText = ({ link, root, writtenBy = "agent" }: { readonly link: PlainLink; readonly root: string; readonly writtenBy?: "agent" | "app" }) =>
    link.href === undefined ? (
        <span data-written-by={writtenBy}>{link.name}</span>
    ) : (
        <a href={`${root}${link.href}`} className="underline decoration-border underline-offset-4 hover:decoration-foreground" data-written-by={writtenBy}>
            {link.name}
        </a>
    );

const Block = ({ title, children }: { readonly title: string; readonly children: ReactNode }) => (
    <section className="flex flex-col gap-spacing-xs" aria-label={title}>
        <h3 className="text-sm font-medium" data-written-by="app">
            {title}
        </h3>
        {children}
    </section>
);

const StoryLinks = ({ stories }: { readonly stories: StoryView["blockedBy"] }) =>
    stories.length === 0 ? (
        <p className="text-muted-foreground" data-written-by="app">
            {words.none}
        </p>
    ) : (
        <ul className="flex flex-col gap-spacing-2xs">
            {stories.map((story) => (
                <li key={story.n}>
                    <a href={`#story=${story.n}`} className="underline decoration-border underline-offset-4 hover:decoration-foreground" data-written-by="agent">
                        {story.title}
                    </a>
                </li>
            ))}
        </ul>
    );

/**
 * What the sheet shows for one story.
 * @param props the story and the address of the site's root
 * @returns the story's body
 */
export function StoryBody({ story, root }: { readonly story: StoryView; readonly root: string }) {
    return (
        <div className="flex flex-col gap-spacing-xl text-sm">
            <p className="flex flex-wrap items-center gap-spacing-xs">
                <Badge variant="secondary" data-written-by="agent">
                    {story.kindLabel}
                </Badge>
                <Badge variant="outline" data-written-by="app">
                    {words.phase(story.phase)}
                </Badge>
                {story.epicLabel === "" ? null : (
                    <Badge variant="outline" className="h-auto whitespace-normal" data-written-by="agent">
                        {story.epicLabel}
                    </Badge>
                )}
            </p>
            <Block title={words.what}>
                <p data-written-by="agent">{story.what}</p>
            </Block>
            <Block title={words.why}>
                <p data-written-by="agent">{story.why}</p>
            </Block>
            {story.criteria.length === 0 ? null : (
                <Block title={words.criteriaTitle}>
                    <ol className="flex flex-col gap-spacing-md">
                        {story.criteria.map((criterion, at) => (
                            <li key={`${String(at)}${criterion.says}`} className="flex flex-col gap-spacing-2xs border-s-2 border-border ps-spacing-md">
                                {criterion.given === null || criterion.when === null || criterion.then === null ? (
                                    <p data-written-by="agent">{criterion.says}</p>
                                ) : (
                                    <dl className="grid grid-cols-[auto_1fr] gap-x-spacing-md gap-y-spacing-2xs">
                                        <dt className="font-medium text-muted-foreground" data-written-by="app">
                                            {words.given}
                                        </dt>
                                        <dd data-written-by="agent">{criterion.given}</dd>
                                        <dt className="font-medium text-muted-foreground" data-written-by="app">
                                            {words.when}
                                        </dt>
                                        <dd data-written-by="agent">{criterion.when}</dd>
                                        <dt className="font-medium text-muted-foreground" data-written-by="app">
                                            {words.then}
                                        </dt>
                                        <dd data-written-by="agent">{criterion.then}</dd>
                                    </dl>
                                )}
                                {criterion.rules.length === 0 ? null : (
                                    <p className="text-muted-foreground">
                                        <span data-written-by="app">{words.restsOn}: </span>
                                        {criterion.rules.map((rule, index) => (
                                            <span key={`${rule.name}${String(index)}`}>
                                                {index === 0 ? null : "; "}
                                                <LinkOrText link={rule} root={root} />
                                            </span>
                                        ))}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ol>
                </Block>
            )}
            {story.open.length === 0 ? null : (
                <Fold summary={words.openChallenges}>
                    <div className="flex flex-col gap-spacing-xs">
                        <p className="text-muted-foreground" data-written-by="app">
                            {words.openChallengesNote}
                        </p>
                        <ul className="flex list-disc flex-col gap-spacing-2xs ps-spacing-4xl">
                            {story.open.map((text) => (
                                <li key={text} data-written-by="agent">
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </Fold>
            )}
            <Block title={words.servesSteps}>
                {story.steps.length === 0 ? (
                    <p className="text-muted-foreground" data-written-by="app">
                        {words.noSteps}
                    </p>
                ) : (
                    <ul className="flex flex-col gap-spacing-xs">
                        {story.steps.map((step) => (
                            <li key={`${step.journey.name}${String(step.number)}`} className="flex flex-col">
                                <span>
                                    <LinkOrText link={step.journey} root={root} /> <span className="text-muted-foreground" data-written-by="app">{words.stepOf(step.number, step.of)}</span>
                                </span>
                                <span className="text-muted-foreground" data-written-by="agent">
                                    {step.intent}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Block>
            {story.rules.length === 0 ? null : (
                <Block title={words.rules}>
                    <ul className="flex flex-col gap-spacing-md">
                        {story.rules.map((rule, at) => (
                            <li key={`${rule.place}${String(at)}`} className="flex flex-col gap-spacing-2xs">
                                <LinkOrText link={rule} root={root} />
                                <span className="flex flex-wrap items-center gap-spacing-xs">
                                    <Button variant="outline" size="xs" data-copy-text={rule.place} data-copied={copy.site.copied} title={words.copyPlace}>
                                        <code data-label className="font-mono text-xs">
                                            {rule.place}
                                        </code>
                                    </Button>
                                    {rule.changedTo === null ? null : (
                                        <Badge variant="outline" data-written-by="app">
                                            {words.changed}
                                        </Badge>
                                    )}
                                </span>
                                {rule.changedTo === null ? null : (
                                    <p>
                                        <span className="font-medium" data-written-by="app">
                                            {words.changedTo}:
                                        </span>{" "}
                                        <span data-written-by="agent">{rule.changedTo}</span>
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                </Block>
            )}
            {story.reliesOn.length === 0 ? null : (
                <Fold summary={words.relies}>
                    <ul className="flex flex-col gap-spacing-xs">
                        {story.reliesOn.map((rule, at) => (
                            <li key={`${rule.name}${String(at)}`} className="flex flex-col gap-spacing-2xs">
                                <LinkOrText link={rule} root={root} />
                                {rule.builtBy === null ? null : (
                                    <span className="text-xs text-muted-foreground">
                                        <span data-written-by="app">{copy.rules.builtBy}</span> <LinkOrText link={rule.builtBy} root={root} />
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </Fold>
            )}
            {story.domainNames.length === 0 && story.components.length === 0 && story.layers.length === 0 ? null : (
                <dl className="grid grid-cols-[auto_1fr] gap-x-spacing-xl gap-y-spacing-xs">
                    {story.layers.length === 0 ? null : (
                        <>
                            <dt className="text-muted-foreground" data-written-by="app">
                                {words.builtIn}
                            </dt>
                            <dd data-written-by="agent">{story.layers.join(", ")}</dd>
                        </>
                    )}
                    {story.domainNames.length === 0 ? null : (
                        <>
                            <dt className="text-muted-foreground" data-written-by="app">
                                {words.domains}
                            </dt>
                            <dd data-written-by="agent">{story.domainNames.join(", ")}</dd>
                        </>
                    )}
                    {story.components.length === 0 ? null : (
                        <>
                            <dt className="text-muted-foreground" data-written-by="app">
                                {words.components}
                            </dt>
                            <dd data-written-by="agent">{story.components.join(", ")}</dd>
                        </>
                    )}
                </dl>
            )}
            <Block title={words.blockedBy}>
                <StoryLinks stories={story.blockedBy} />
            </Block>
            <Block title={words.blocksTitle}>
                <StoryLinks stories={story.unblocks} />
            </Block>
            {story.brief === null ? null : (
                <div className="flex flex-col items-start gap-spacing-md" data-for-context>
                    <Button variant="outline" data-context-file={`${root}${story.brief.file}`} data-copied={copy.site.copied}>
                        <Copy aria-hidden="true" />
                        <span data-label data-written-by="app">
                            {copy.explorer.copyContext}
                        </span>
                        <span className="text-muted-foreground" data-written-by="app">
                            {copy.explorer.size(story.brief.kilobytes)}
                        </span>
                    </Button>
                    <Textarea className="font-mono text-xs" readOnly hidden aria-label={copy.explorer.forContext} data-context-fallback rows={8} />
                </div>
            )}
        </div>
    );
}

/**
 * One story in the list: its full title, what it does, its kind of work, the layers it is built in, and how it sits
 * among the others. Selecting it opens the story in the sheet.
 * @param props the story
 * @returns the row
 */
function StoryRow({ story }: { readonly story: StoryView }) {
    return (
        <div data-story-row data-n={story.n} data-phase={story.phase} data-epic={story.epic} data-kind={story.kind} data-domains={` ${story.domains.join(" ")} `} data-text={story.text}>
            <Item size="xs" render={<a href={`#story=${story.n}`} data-story-open={story.n} />}>
                <ItemContent className="min-w-0 basis-80">
                    <ItemTitle className="line-clamp-none" data-written-by="agent">
                        {story.title}
                    </ItemTitle>
                    <ItemDescription className="line-clamp-none" data-written-by="agent">
                        {story.what}
                    </ItemDescription>
                    {story.layers.length === 0 ? null : (
                        <ItemDescription className="line-clamp-none text-xs">
                            <span data-written-by="app">{words.builtIn}: </span>
                            <span data-written-by="agent">{story.layers.join(", ")}</span>
                        </ItemDescription>
                    )}
                </ItemContent>
                <ItemActions className="flex-wrap text-xs text-muted-foreground">
                    <Badge variant="secondary" data-written-by="agent">
                        {story.kindLabel}
                    </Badge>
                    <span className="tabular-nums" data-written-by="app">
                        {story.waitsText ?? words.nothingBlocks}
                    </span>
                    {story.unblocksText === null ? null : (
                        <span className="tabular-nums" data-written-by="app">
                            {story.unblocksText}
                        </span>
                    )}
                </ItemActions>
            </Item>
        </div>
    );
}

const Filter = ({ id, label, options }: { readonly id: string; readonly label: string; readonly options: readonly { value: string; label: string }[] }) =>
    options.length < 2 ? null : (
        <div className="flex min-w-40 flex-1 flex-col gap-spacing-xs">
            <Label htmlFor={`plan-${id}`} data-written-by="app">
                {label}
            </Label>
            <div className="relative" data-plan-select-wrap>
            <select id={`plan-${id}`} name={id} className={selectClass} data-plan-select>
                <option value="" data-written-by="app">
                    {words.any}
                </option>
                {options.map((option) => (
                    <option key={option.value} value={option.value} data-written-by="agent">
                        {option.label}
                    </option>
                ))}
            </select>
            <ChevronDownIcon aria-hidden="true" className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
        </div>
    );

/**
 * The Plan section's body.
 * @param props the plan's view and the address of the site's root
 * @returns the body
 */
export function Plan({ view, root }: { readonly view: PlanView; readonly root: string }) {
    const byPhase = view.phases.map((phase) => ({ phase, stories: view.stories.filter((story) => story.phase === phase.number) }));
    return (
        <div className="flex flex-col gap-spacing-5xl" data-plan>
            <div className="flex flex-col gap-spacing-xs">
                {view.stale ? (
                    <p className="font-medium" role="status" data-written-by="app">
                        {words.stale}
                    </p>
                ) : null}
                <p data-written-by="app">
                    {view.structure} {words.phaseMeans}
                </p>
            </div>
            <Sections>
                <div id="phases">
                    <Section title={words.phasesTitle} writtenBy="app">
                        <p className="text-sm text-muted-foreground" data-written-by="app">
                            {words.phasesLede}
                        </p>
                        <form role="search" aria-label={words.search} className="flex flex-wrap items-end gap-spacing-xl" data-plan-filter data-needs-js hidden>
                            <div className="flex min-w-48 basis-full flex-col gap-spacing-xs">
                                <Label htmlFor="plan-q" data-written-by="app">
                                    {words.search}
                                </Label>
                                <Input id="plan-q" name="q" type="search" autoComplete="off" />
                            </div>
                            <Filter id="phase" label={words.phaseFilter} options={view.filters.phases} />
                            <Filter id="epic" label={words.epicFilter} options={view.filters.epics} />
                            <Filter id="domain" label={words.domainFilter} options={view.filters.domains} />
                            <Filter id="kind" label={words.kindFilter} options={view.filters.kinds} />
                        </form>
                        <div className="flex flex-wrap items-center gap-spacing-md" data-needs-js hidden>
                            <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite" data-story-count data-written-by="app" data-shown={words.shown} data-of={words.of} data-noun={view.storyNoun.many}></p>
                            <p className="text-sm" data-cell-chip hidden>
                                <Badge variant="outline" data-written-by="app">
                                    {words.cellFilter}
                                </Badge>
                            </p>
                            <Button variant="ghost" size="sm" className="-ms-spacing-md" data-plan-clear data-written-by="app">
                                {words.clear}
                            </Button>
                        </div>
                        <div data-story-empty hidden>
                            <NoDataState compact title={words.noMatch} message={words.noMatchHint} />
                        </div>
                        <ol className="flex flex-col">
                            {byPhase.map(({ phase, stories }) => {
                                const noun = stories.length === 1 ? view.storyNoun.one : view.storyNoun.many;
                                const groups: { label: string; stories: StoryView[] }[] = [];
                                for (const story of stories) {
                                    const last = groups[groups.length - 1];
                                    if (last !== undefined && last.label === story.epicLabel) last.stories.push(story);
                                    else groups.push({ label: story.epicLabel, stories: [story] });
                                }
                                return (
                                    <li key={phase.number} className="border-b border-border last:border-0" data-phase-group={phase.number}>
                                        <details className="group/phase" data-phase-card data-phase={phase.number}>
                                            <summary className="flex cursor-pointer list-none flex-col gap-spacing-2xs py-spacing-lg ps-10 pe-spacing-md hover:bg-accent/40 [&::-webkit-details-marker]:hidden relative rounded-control">
                                                <ChevronRightIcon aria-hidden="true" className="absolute start-spacing-md top-spacing-lg mt-0.5 size-4 text-muted-foreground transition-transform duration-(--motion-duration-quick) group-open/phase:rotate-90" />
                                                <span className="flex flex-wrap items-baseline justify-between gap-x-spacing-md">
                                                    <h3 className="text-sm font-medium" data-written-by="app">
                                                        {words.phase(phase.number)}
                                                    </h3>
                                                    <span className="text-xs tabular-nums text-muted-foreground" data-phase-count data-total={stories.length} data-noun={noun} data-written-by="app">
                                                        {stories.length} {noun}
                                                    </span>
                                                </span>
                                                <span className="text-sm text-muted-foreground" data-written-by="agent">
                                                    {phase.why}
                                                </span>
                                            </summary>
                                            <div className="flex flex-col gap-spacing-lg pb-spacing-xl ps-10">
                                                {phase.builtIn.length === 0 ? null : (
                                                    <p className="text-xs text-muted-foreground">
                                                        <span data-written-by="app">{words.builtIn}: </span>
                                                        <span data-written-by="agent">{phase.builtIn.join(", ")}</span>
                                                    </p>
                                                )}
                                                {groups.map((group, at) => (
                                                    <section key={`${group.label}${String(at)}`} className="flex flex-col gap-spacing-2xs" data-epic-group aria-label={group.label === "" ? words.phase(phase.number) : group.label}>
                                                        {group.label === "" || groups.length === 1 ? null : (
                                                            <h4 className="text-xs font-medium text-muted-foreground" data-written-by="agent">
                                                                {group.label}
                                                            </h4>
                                                        )}
                                                        <div className="flex flex-col">
                                                            {group.stories.map((story) => (
                                                                <StoryRow key={story.n} story={story} />
                                                            ))}
                                                        </div>
                                                    </section>
                                                ))}
                                            </div>
                                        </details>
                                    </li>
                                );
                            })}
                        </ol>
                    </Section>
                </div>
                {view.matrix === null ? null : (
                    <Section title={words.matrixTitle} writtenBy="app">
                        <Matrix view={view.matrix} />
                    </Section>
                )}
                <Section title={words.notCovered} writtenBy="app">
                    <p className="text-sm text-muted-foreground" data-written-by="app">
                        {words.notCoveredLede}
                    </p>
                    {view.notCovered.dropped.length === 0 && view.notCovered.noStory === null && view.notCovered.unplaced === null && view.notCovered.unplanned === null ? (
                        <NoDataState compact title={words.nothingLeftOut} message={words.notCoveredLede} />
                    ) : null}
                    {view.notCovered.noStory === null ? null : (
                        <Fold summary={`${copy.rules.listTitle} (${view.notCovered.noStory.count})`}>
                            <p className="text-sm" data-written-by="app">
                                <a href={`${root}${view.notCovered.noStory.href}`} className="underline decoration-border underline-offset-4 hover:decoration-foreground">
                                    {copy.rules.listLink}
                                </a>{" "}
                                <span className="text-muted-foreground">{copy.rules.listNote}</span>
                            </p>
                        </Fold>
                    )}
                    {view.notCovered.dropped.length === 0 ? null : (
                        <Fold summary={words.droppedTitle}>
                            <ul className="flex flex-col gap-spacing-lg text-sm">
                                {view.notCovered.dropped.map((drop, at) => (
                                    <li key={`${drop.journey.name}${String(at)}`} className="flex flex-col gap-spacing-2xs">
                                        <LinkOrText link={drop.journey} root={root} />
                                        <p className="text-muted-foreground" data-written-by="agent">
                                            {drop.reason}
                                        </p>
                                        {drop.items.length === 0 ? null : (
                                            <ul className="flex list-disc flex-col gap-spacing-2xs ps-spacing-4xl">
                                                {drop.items.map((item, index) => (
                                                    <li key={`${item.name}${String(index)}`}>
                                                        <LinkOrText link={item} root={root} />
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </Fold>
                    )}
                    {view.notCovered.unplaced === null ? null : (
                        <Fold summary={words.unplacedTitle}>
                            <ul className="flex flex-col gap-spacing-2xs text-sm">
                                {view.notCovered.unplaced.counts.map((count) => (
                                    <li key={count.text}>
                                        <a href={`${root}${view.notCovered.unplaced?.href ?? ""}`} className="underline decoration-border underline-offset-4 hover:decoration-foreground" data-written-by="app">
                                            {count.text}
                                        </a>{" "}
                                        <span className="text-muted-foreground" data-written-by="app">
                                            ({count.scope})
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </Fold>
                    )}
                    {view.notCovered.unplanned === null ? null : (
                        <Fold summary={view.notCovered.unplanned.title}>
                            <div className="flex flex-col gap-spacing-xs text-sm">
                                <p className="text-muted-foreground" data-written-by="app">
                                    {words.unplannedNote}
                                </p>
                                <ul className="flex flex-col gap-spacing-2xs">
                                    {view.notCovered.unplanned.items.map((item) => (
                                        <li key={item.place} className="flex flex-wrap items-center gap-x-spacing-md gap-y-spacing-2xs">
                                            <code className="font-mono text-xs" data-written-by="agent">
                                                {item.name}
                                            </code>
                                            <Button variant="outline" size="xs" data-copy-text={item.place} data-copied={copy.site.copied} title={words.copyPlace}>
                                                <code data-label className="font-mono text-xs">
                                                    {item.place}
                                                </code>
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Fold>
                    )}
                </Section>
            </Sections>
            <dialog
                id="story-sheet"
                aria-labelledby="story-sheet-title"
                className="fixed inset-y-0 start-auto end-0 z-30 m-0 h-dvh max-h-none w-full max-w-none border-s border-border bg-popover p-0 text-popover-foreground shadow-(--shadow-elevation-2) backdrop:bg-background/70 backdrop:backdrop-blur-xs sm:max-w-xl min-[900px]:top-12 min-[900px]:h-[calc(100dvh-3rem)] min-[900px]:w-[26rem] print:hidden"
                data-story-sheet
            >
                <div className="flex h-full flex-col">
                    <div className="flex items-start gap-spacing-md border-b border-border p-spacing-xxl">
                        <div className="flex min-w-0 flex-1 flex-col gap-spacing-2xs">
                            <p className="text-xs text-muted-foreground" data-written-by="app">
                                {words.story}
                            </p>
                            <h2 id="story-sheet-title" className="text-base font-medium" data-written-by="agent"></h2>
                        </div>
                        <Button variant="ghost" size="icon-sm" aria-label={words.close} data-story-close>
                            <XIcon aria-hidden="true" />
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-spacing-xxl" data-story-sheet-body aria-live="polite"></div>
                </div>
            </dialog>
        </div>
    );
}
