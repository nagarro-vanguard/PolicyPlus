import { Sections } from "@continuum/ui/components/details";
import { Input } from "@continuum/ui/components/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@continuum/ui/components/item";
import { Label } from "@continuum/ui/components/label";
import { NoDataState } from "@continuum/ui/components/no-data-state";
import type { DropView, JourneysView, ListRow } from "../../case/journeys";
import { copy } from "../../lib/copy";
import { Section } from "../Explorer";
import { ChangeChips, LinkRows } from "./Parts";

// The list of journeys: what today and the new way mean in one sentence, the numbers, a plain filter, the journeys
// grouped by the hierarchy's own areas and capabilities, one line each with its kinds of change, and what the new ways
// drop on purpose, each with its reason. The filter is the page's own small script (src/scripts/journeys.ts); without
// it every journey shows.

const words = copy.journeys;

const Row = ({ row, root, hasWays }: { readonly row: ListRow; readonly root: string; readonly hasWays: boolean }) => (
    <Item
        size="xs"
        className="flex-wrap md:flex-nowrap"
        render={<a href={`${root}${row.href}`} />}
        data-journey-row
        data-area={row.area}
        data-changes={row.hasChanges ? "1" : "0"}
        data-dropped={row.hasDropped ? "1" : "0"}
        data-text={`${row.title} ${row.outcome}`.toLowerCase()}
    >
        <ItemContent className="min-w-0">
            <ItemTitle className="line-clamp-none" data-written-by="agent">
                {row.title}
            </ItemTitle>
            <ItemDescription className="line-clamp-none" data-written-by="agent">
                {row.outcome}
            </ItemDescription>
            {row.counts === null ? null : (
                <ItemDescription className="line-clamp-none text-xs tabular-nums" data-written-by="app">
                    {row.counts}
                </ItemDescription>
            )}
        </ItemContent>
        {!hasWays ? null : (
            <ItemActions className="w-full flex-wrap justify-start text-xs text-muted-foreground md:w-auto md:max-w-1/2 md:justify-end">
                {row.hasWay ? (
                    <ChangeChips groups={row.groups} />
                ) : (
                    <span data-written-by="app">{words.noWay}</span>
                )}
            </ItemActions>
        )}
    </Item>
);

/**
 * One thing a new way drops on purpose, with its reason and what it leaves out.
 * @param props the drop and the address of the site's root from this page
 * @returns the block
 */
export function Drop({ drop, root, showJourney = true }: { readonly drop: DropView; readonly root: string; readonly showJourney?: boolean }) {
    return (
        <div className="flex flex-col gap-spacing-xs border-b border-border py-spacing-lg" data-drop data-area={drop.area}>
            {!showJourney || drop.journey.name === "" ? null : (
                <h3 className="text-sm font-medium" data-written-by="agent">
                    {drop.journey.href === undefined ? drop.journey.name : <a href={`${root}${drop.journey.href}`}>{drop.journey.name}</a>}
                </h3>
            )}
            <p>
                <span className="text-muted-foreground" data-written-by="app">
                    {words.droppedReason}:{" "}
                </span>
                <span data-written-by="agent">{drop.reason}</span>
            </p>
            {drop.actions.length === 0 ? null : (
                <div className="flex flex-col">
                    <p className="text-xs text-muted-foreground" data-written-by="app">
                        {words.droppedActions}
                    </p>
                    <LinkRows items={drop.actions} root={root} />
                </div>
            )}
            {drop.rules.length === 0 ? null : (
                <div className="flex flex-col">
                    <p className="text-xs text-muted-foreground" data-written-by="app">
                        {words.droppedRules}
                    </p>
                    <LinkRows items={drop.rules} root={root} />
                </div>
            )}
        </div>
    );
}

/**
 * The list.
 * @param props the section's view and the address of the site's root from this page
 * @returns the body of the list page
 */
export function JourneyList({ view, root }: { readonly view: JourneysView; readonly root: string }) {
    return (
        <div className="flex flex-col gap-spacing-4xl">
            <div className="flex flex-col gap-spacing-md">
                <p className="text-muted-foreground" data-written-by="app">
                    {view.hasWays ? words.meaning : words.meaningToday}
                </p>
            </div>
            <form role="search" aria-label={words.filter} className="flex flex-wrap items-end gap-spacing-xl" data-journey-filter data-needs-js hidden>
                <div className="flex min-w-48 flex-1 flex-col gap-spacing-xs">
                    <Label htmlFor="journey-words" data-written-by="app">
                        {words.words}
                    </Label>
                    <Input id="journey-words" name="q" type="search" placeholder={words.wordsHint} autoComplete="off" />
                </div>
                {view.areas.length < 2 ? null : (
                    <div className="flex flex-col gap-spacing-xs">
                        <Label htmlFor="journey-area" data-written-by="app">
                            {words.area}
                        </Label>
                        <select
                            id="journey-area"
                            name="area"
                            className="h-8 rounded-control border border-input bg-background px-spacing-md text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                            <option value="" data-written-by="app">
                                {words.allAreas}
                            </option>
                            {view.areas.map((area) => (
                                <option key={area.slug} value={area.slug} data-written-by="agent">
                                    {area.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {!view.hasWays ? null : (
                    <div className="flex flex-wrap gap-spacing-xl pb-spacing-xs">
                        <Label className="font-normal" data-written-by="app">
                            <input type="checkbox" name="changes" value="1" className="size-4 accent-foreground" />
                            {words.hasChanges}
                        </Label>
                        <Label className="font-normal" data-written-by="app">
                            <input type="checkbox" name="dropped" value="1" className="size-4 accent-foreground" />
                            {words.hasDropped}
                        </Label>
                    </div>
                )}
            </form>
            <p className="text-sm text-muted-foreground" aria-live="polite" data-journey-status data-written-by="app" data-showing={words.showing} data-none={words.noMatch}></p>
            <Sections>
                {view.actors.length === 0 ? null : (
                    <div id="actors" data-journey-actors>
                        <Section title={words.actors} writtenBy="app">
                            <div className="flex flex-col gap-spacing-md">
                                {view.actors.map((actor) => (
                                    <div key={actor.name} className="flex flex-col gap-spacing-2xs">
                                        <h3 className="text-sm font-medium" data-written-by="agent">
                                            {actor.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground" data-written-by="agent">
                                            {actor.journeys.map((journey, at) => (
                                                <span key={journey.page}>
                                                    {at === 0 ? "" : ", "}
                                                    <a href={`${root}${journey.page}`}>{journey.title}</a>
                                                </span>
                                            ))}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    </div>
                )}
                {view.groups.map((group) => (
                    <div key={group.area?.slug ?? "other"} data-journey-group={group.area?.slug ?? "other"}>
                        <Section title={group.area?.name ?? words.otherJourneys} writtenBy={group.area === null ? "app" : "agent"}>
                            {group.capabilities.map((capability) => (
                                <div key={capability.name} className="flex flex-col gap-spacing-xs" data-journey-capability>
                                    {capability.name === "" ? null : (
                                        <h3 className="text-sm font-medium text-muted-foreground" data-written-by="agent">
                                            {capability.href === undefined ? capability.name : <a href={`${root}${capability.href}`}>{capability.name}</a>}
                                        </h3>
                                    )}
                                    <div className="flex flex-col">
                                        {capability.rows.map((row) => (
                                            <Row key={row.slug} row={row} root={root} hasWays={view.hasWays} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </Section>
                    </div>
                ))}
                {!view.hasWays ? null : (
                    <div id="dropped" data-journey-drops>
                        <Section title={words.dropped} writtenBy="app">
                            {view.drops.length === 0 ? (
                                <NoDataState compact title={words.droppedNone} message={words.droppedNoneWhy} />
                            ) : (
                                <>
                                    <p className="text-muted-foreground" data-written-by="app">
                                        {words.droppedLead}
                                    </p>
                                    <div className="flex flex-col">
                                        {view.drops.map((drop, at) => (
                                            <Drop key={`${drop.journey.name}${String(at)}`} drop={drop} root={root} />
                                        ))}
                                    </div>
                                </>
                            )}
                        </Section>
                    </div>
                )}
            </Sections>
        </div>
    );
}
