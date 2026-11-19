import { Button } from "@continuum/ui/components/button";
import { Item, ItemContent, ItemDescription, ItemFooter, ItemTitle } from "@continuum/ui/components/item";
import { Label } from "@continuum/ui/components/label";
import { NoDataState } from "@continuum/ui/components/no-data-state";
import { riskAnchorOf, type RisksView } from "../../case/risks-view";
import { copy } from "../../lib/copy";
import { Facts } from "../Explorer";
import { KindBadge } from "../KindBadge";

// The Risks section's body: the rule of the ranking in one sentence, a filter by severity and by capability, and every
// risk in rank order, each with its statement, its severity word and icon, its kind of problem and what it touches. A
// risk has its own anchor (`#risk-<rank>`), which the Overview's "Check these first" links to; the filter is kept in the
// address (`?severity=&capability=`) by the page's script (src/scripts/risks.ts).

const words = copy.risks;
const selectClass =
    "h-8 w-full rounded-control border border-input bg-background px-spacing-md text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * The Risks section's body.
 * @param props the view and the address of the site's root
 * @returns the body
 */
export function Risks({ view, root }: { readonly view: RisksView; readonly root: string }) {
    if (view.risks.length === 0) return <NoDataState title={words.none} message={words.noneHint} />;
    return (
        <div className="flex flex-col gap-spacing-4xl" data-risks>
            <div className="flex flex-col gap-spacing-md">
                {view.count === null ? null : <Facts facts={[view.count]} tests={null} />}
                <p className="text-muted-foreground" data-written-by="app">
                    {view.rule}
                </p>
            </div>
            <form role="search" aria-label={words.title} className="flex flex-wrap items-end gap-spacing-xl" data-risk-filter data-needs-js hidden>
                {view.severities.length < 2 ? null : (
                    <div className="flex min-w-40 flex-1 flex-col gap-spacing-xs">
                        <Label htmlFor="risk-severity" data-written-by="app">
                            {words.severity}
                        </Label>
                        <select id="risk-severity" name="severity" className={selectClass}>
                            <option value="" data-written-by="app">
                                {words.any}
                            </option>
                            {view.severities.map((option) => (
                                <option key={option.value} value={option.value} data-written-by="app">
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {view.capabilities.length < 2 ? null : (
                    <div className="flex min-w-48 flex-[2] flex-col gap-spacing-xs">
                        <Label htmlFor="risk-capability" data-written-by="app">
                            {words.capability}
                        </Label>
                        <select id="risk-capability" name="capability" className={selectClass}>
                            <option value="" data-written-by="app">
                                {words.any}
                            </option>
                            {view.capabilities.map((option) => (
                                <option key={option.value} value={option.value} data-written-by="agent">
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <Button type="reset" variant="ghost" size="sm" data-written-by="app">
                    {words.clear}
                </Button>
            </form>
            <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite" data-risk-count data-written-by="app" data-shown={words.shown} data-of={words.of} data-noun={view.noun} data-needs-js hidden></p>
            <div data-risk-empty hidden>
                <NoDataState compact title={words.noMatch} message={words.noMatchHint} />
            </div>
            <ol className="flex flex-col gap-spacing-xs">
                {view.risks.map((risk) => (
                    <li
                        key={risk.rank}
                        id={riskAnchorOf(risk.rank)}
                        className="scroll-mt-spacing-5xl rounded-control target:bg-muted"
                        data-risk-row
                        data-severity={risk.severity}
                        data-capabilities={` ${risk.touches.flatMap((touch) => (touch.capability === undefined ? [] : [touch.capability])).join(" ")} `}
                    >
                        <Item size="xs" render={<article />}>
                            <ItemContent className="min-w-0 basis-80">
                                <ItemTitle className="line-clamp-none font-normal" data-written-by="agent">
                                    <span className="sr-only">{risk.rank}. </span>
                                    {risk.statement}
                                </ItemTitle>
                                <ItemDescription className="line-clamp-none" data-written-by="agent">
                                    {risk.category}
                                </ItemDescription>
                            </ItemContent>
                            <div className="shrink-0">
                                <KindBadge kind={risk.badge} label={risk.word} writtenBy="app" />
                            </div>
                            <ItemFooter className="flex-wrap justify-start gap-x-spacing-md gap-y-spacing-2xs text-xs">
                                <span className="text-muted-foreground" data-written-by="app">
                                    {words.touches}:
                                </span>
                                {risk.touches.length === 0 ? (
                                    <span data-written-by="app">{words.noCapability}</span>
                                ) : (
                                    risk.touches.map((touch) =>
                                        touch.href === undefined ? (
                                            <span key={touch.name} data-written-by="agent">
                                                {touch.name}
                                            </span>
                                        ) : (
                                            <a key={touch.name} href={`${root}${touch.href}`} className="underline decoration-border underline-offset-4 hover:decoration-foreground" data-written-by="agent">
                                                {touch.name}
                                            </a>
                                        ),
                                    )
                                )}
                            </ItemFooter>
                        </Item>
                    </li>
                ))}
            </ol>
        </div>
    );
}
