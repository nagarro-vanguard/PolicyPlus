import { Badge } from "@continuum/ui/components/badge";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@continuum/ui/components/input-group";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@continuum/ui/components/item";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@continuum/ui/components/table";
import { CircleCheck, Search } from "lucide-react";
import type { ReactNode } from "react";
import type { Option, ProposedView, RiskItem, Since, TodayView } from "../case/architecture-view";
import { copy } from "../lib/copy";
import { Fold } from "./Fold";

// The pieces of the Architecture page (and the Choices page that shares some), server rendered from the design system's
// primitives with no script of their own; the filter over a long list is the page's small script (src/scripts/filter.ts).
// Every sentence is the case's own (`agent`) but the headings and labels (`app`).

const words = copy.architecture;

/** A heading inside a section; `listed` puts it in the page's list of headings, under its section's. */
export function Sub({ title, lead, listed = false, children }: { readonly title: string; readonly lead?: string; readonly listed?: boolean; readonly children: ReactNode }) {
    return (
        <div className="flex flex-col gap-spacing-md" data-part="subsection">
            <div className="flex flex-col gap-spacing-2xs">
                <h3 className="text-sm font-semibold" data-written-by="app" data-contents-entry={listed ? "" : undefined}>
                    {title}
                </h3>
                {lead === undefined ? null : (
                    <p className="text-muted-foreground" data-written-by="app">
                        {lead}
                    </p>
                )}
            </div>
            {children}
        </div>
    );
}

/** A label and its value on one line, the value the case's words. */
function Pair({ label, children }: { readonly label: string; readonly children: ReactNode }) {
    return (
        <p>
            <span className="text-muted-foreground" data-written-by="app">
                {label}:
            </span>{" "}
            <span data-written-by="agent">{children}</span>
        </p>
    );
}

/** A filter over the rows of a list or table on the page, by the words in each row. */
export function Filter({ label, target }: { readonly label: string; readonly target: string }) {
    return (
        <InputGroup className="max-w-sm" data-needs-js hidden>
            <InputGroupAddon>
                <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput type="search" aria-label={label} placeholder={label} aria-controls={target} data-filter-input={target} />
        </InputGroup>
    );
}

/** The line a filtered list shows when no row matches. */
export function NoMatch() {
    return (
        <p className="text-muted-foreground" hidden data-filter-empty data-written-by="app">
            {words.noMatch}
        </p>
    );
}

/** Today's data: what the system keeps. */
export function TodayData({ today }: { readonly today: TodayView }) {
    return (
        <>
            {today.entities.length === 0 ? null : (
                <Sub title={words.entities} listed>
                    {today.entities.length > 15 ? <Filter label={words.entitiesFilter} target="entities" /> : null}
                    <div id="entities" className="flex flex-col">
                        {today.entities.map((each) => (
                            <Item key={each.name} size="xs" data-filter-row>
                                <ItemContent className="min-w-0">
                                    <ItemTitle className="line-clamp-none" data-written-by="agent">
                                        {each.name}
                                    </ItemTitle>
                                    <ItemDescription className="line-clamp-none" data-written-by="agent">
                                        {each.line}
                                    </ItemDescription>
                                </ItemContent>
                            </Item>
                        ))}
                        <NoMatch />
                    </div>
                </Sub>
            )}
        </>
    );
}

/** The opening of the proposal: its idea, why it has this shape, and its numbers. */
export function ProposedHead({ view }: { readonly view: ProposedView }) {
    return (
        <div className="flex flex-col gap-spacing-md">
            <p className="text-base font-medium" data-written-by="agent">
                {view.name}
            </p>
            <p data-written-by="agent">{view.idea}</p>
            {view.why === null ? null : <Pair label={words.why}>{view.why}</Pair>}
            {view.facts.length === 0 ? null : (
                <ul className="flex flex-wrap gap-x-spacing-xl gap-y-spacing-2xs text-sm text-muted-foreground tabular-nums">
                    {view.facts.map((fact) => (
                        <li key={fact.text} title={fact.scope} data-written-by="app">
                            {fact.text}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** The parts that run: each with its kind, what it does and where it runs when the case says, and the domains it holds. */
export function Containers({ view }: { readonly view: ProposedView }) {
    return (
        <div className="flex flex-col gap-spacing-md">
            {view.containers.map((each) => (
                <Item key={each.name} variant="outline" size="sm" className="items-start">
                    <ItemContent className="min-w-0 gap-spacing-xs">
                        <ItemTitle className="line-clamp-none" data-written-by="agent">
                            {each.name}
                            {each.kind === null ? null : (
                                <>
                                    {" "}
                                    <Badge variant="secondary" data-written-by="agent">
                                        {each.kind}
                                    </Badge>
                                </>
                            )}
                        </ItemTitle>
                        <div className="flex flex-col gap-spacing-2xs text-sm">
                            {each.does === null ? null : <Pair label={words.does}>{each.does}</Pair>}
                            {each.runsOn === null ? null : <Pair label={words.runsOn}>{each.runsOn}</Pair>}
                            <Pair label={words.holds}>{each.holds.join(", ")}</Pair>
                        </div>
                    </ItemContent>
                </Item>
            ))}
        </div>
    );
}

/** Each domain, folded: what it is, why it stands alone, what it uses and what uses it. */
export function Domains({ view }: { readonly view: ProposedView }) {
    return (
        <div className="flex flex-col border-t border-border">
            {view.domains.map((domain) => (
                <Fold key={domain.name} summary={domain.name} writtenBy="agent">
                    <div className="flex flex-col gap-spacing-xs">
                        <p data-written-by="agent">{domain.concept}</p>
                        <Pair label={words.domainWhy}>{domain.why}</Pair>
                        <Pair label={words.uses}>{domain.uses.length === 0 ? words.nothing : domain.uses.join(", ")}</Pair>
                        <Pair label={words.usedBy}>{domain.usedBy.length === 0 ? words.nothing : domain.usedBy.join(", ")}</Pair>
                        {domain.counts.length === 0 ? null : (
                            <p className="text-sm text-muted-foreground tabular-nums" data-written-by="app">
                                {domain.counts.join(", ")}
                            </p>
                        )}
                    </div>
                </Fold>
            ))}
        </div>
    );
}

/** The target stack: each line of the request, what it is for and the parts of the new code that carry it. */
export function Stack({ view }: { readonly view: ProposedView }) {
    return (
        <div className="flex flex-col">
            {view.stack.map((each) => (
                <Item key={each.line} size="xs" className="items-start">
                    <ItemContent className="min-w-0">
                        {each.label === "" ? null : (
                            <ItemTitle className="line-clamp-none" data-written-by="agent">
                                {each.label}
                            </ItemTitle>
                        )}
                        <ItemDescription className="line-clamp-none text-foreground" data-written-by="agent">
                            {each.line}
                        </ItemDescription>
                        {each.carriedBy.length === 0 ? null : (
                            <ItemDescription className="line-clamp-none">
                                <span data-written-by="app">{words.carriedBy}:</span> <span data-written-by="agent">{each.carriedBy.join(", ")}</span>
                            </ItemDescription>
                        )}
                    </ItemContent>
                </Item>
            ))}
        </div>
    );
}

/** Risks or open questions, one item each: the first sentence as its title, the rest on opening, what it is about and what keeps it in check. */
export function Risks({ items }: { readonly items: readonly RiskItem[] }) {
    return (
        <div className="flex flex-col border-t border-border">
            {items.map((risk) => {
                const more = risk.detail !== null || risk.about.length > 0 || risk.containedBy !== null;
                if (!more)
                    return (
                        <p key={risk.title} className="border-b border-border py-spacing-xs" data-written-by="agent">
                            {risk.title}
                        </p>
                    );
                return (
                    <Fold key={risk.title} summary={risk.title} writtenBy="agent">
                        <div className="flex flex-col gap-spacing-xs">
                            {risk.detail === null ? null : <p data-written-by="agent">{risk.detail}</p>}
                            {risk.about.length === 0 ? null : <Pair label={words.about}>{risk.about.join(", ")}</Pair>}
                            {risk.containedBy === null ? null : <Pair label={words.containedBy}>{risk.containedBy}</Pair>}
                        </div>
                    </Fold>
                );
            })}
        </div>
    );
}

/** Names in one cell, or the plain word for an option whose record keeps none. */
function Listed({ names }: { readonly names: readonly string[] }) {
    return names.length === 0 ? (
        <span className="text-muted-foreground" data-written-by="app">
            {words.notKept}
        </span>
    ) : (
        <span data-written-by="agent">{names.join(", ")}</span>
    );
}

/** Where today's rules land: one row per layer of today, one column per domain and one for rules no domain holds. */
export function Landing({ view }: { readonly view: NonNullable<ProposedView["landing"]> }) {
    return (
        <div className="flex flex-col gap-spacing-md">
            <p className="text-sm text-muted-foreground" data-written-by="app">
                {words.landingScroll}
            </p>
            <div className="overflow-x-auto" role="region" aria-label={view.caption} tabIndex={0}>
                <Table>
                    <caption className="sr-only" data-written-by="app">
                        {view.caption}
                    </caption>
                    <TableHeader>
                        <TableRow>
                            <TableHead data-written-by="app">{words.layer}</TableHead>
                            {view.columns.map((name) => (
                                <TableHead key={name} className="h-auto min-w-24 py-spacing-xs align-bottom whitespace-normal" data-written-by="agent">
                                    {name}
                                </TableHead>
                            ))}
                            <TableHead className="text-end" data-written-by="app">
                                {words.total}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {view.rows.map((row) => (
                            <TableRow key={row.name}>
                                <TableHead scope="row" className="h-auto py-spacing-xs align-top font-medium whitespace-normal" data-written-by="agent">
                                    {row.name}
                                </TableHead>
                                {row.cells.map((cell, at) => (
                                    <TableCell key={`${row.name}${String(at)}`} className="text-end tabular-nums" title={cell.scope === "" ? undefined : cell.scope} data-written-by="app">
                                        {cell.text === "" ? <span className="text-muted-foreground" aria-label={words.nothing}>·</span> : cell.text}
                                    </TableCell>
                                ))}
                                <TableCell className="text-end font-medium tabular-nums" data-written-by="app">
                                    {row.total}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <Fold summary={copy.plan.matrixText}>
                <ul className="flex list-disc flex-col gap-spacing-2xs ps-spacing-4xl text-sm">
                    {view.lines.map((line) => (
                        <li key={line} data-written-by="app">
                            {line}
                        </li>
                    ))}
                </ul>
            </Fold>
        </div>
    );
}

/** The rules no domain holds, each with the reason its journey gives, under one fold titled with their number. */
export function Unplaced({ view }: { readonly view: NonNullable<ProposedView["unplaced"]> }) {
    return (
        <Fold summary={view.title}>
            <div className="flex flex-col gap-spacing-md">
                <p className="text-sm text-muted-foreground" data-written-by="app">
                    {words.unplacedLead}
                </p>
                <ul className="flex flex-col gap-spacing-md">
                    {view.rules.map((rule, at) => (
                        <li key={`${String(at)}${rule.says}`} className="flex flex-col gap-spacing-2xs border-s-2 border-border ps-spacing-md">
                            <p data-written-by="agent">{rule.says}</p>
                            {rule.reason === null ? (
                                <p className="text-sm text-muted-foreground" data-written-by="app">
                                    {words.noReason}
                                </p>
                            ) : (
                                <Pair label={copy.journeys.droppedReason}>{rule.reason}</Pair>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </Fold>
    );
}

/** The options considered, compared one aspect per row and one option per column, the chosen one first. */
export function Options({ options }: { readonly options: readonly Option[] }) {
    const rows: { label: string; cell: (option: Option) => ReactNode }[] = [
        { label: words.idea, cell: (option) => <span data-written-by="agent">{option.idea}</span> },
        { label: words.cost, cell: (option) => <span data-written-by="agent">{option.cost}</span> },
        { label: words.partsRow, cell: (option) => <Listed names={option.parts} /> },
        { label: words.domainsRow, cell: (option) => <Listed names={option.domains} /> },
        {
            label: words.whyChosen,
            cell: (option) =>
                option.chosen && option.why !== null ? (
                    <span data-written-by="agent">{option.why}</span>
                ) : (
                    <span className="text-muted-foreground" data-written-by="app">
                        {option.chosen ? words.chosenYes : words.chosenNo}
                    </span>
                ),
        },
    ];
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-32" data-written-by="app">
                        {words.aspect}
                    </TableHead>
                    {options.map((option) => (
                        <TableHead key={option.name} className="h-auto min-w-56 py-spacing-xs align-top whitespace-normal">
                            <span className="flex flex-col items-start gap-spacing-2xs">
                                <span data-written-by="agent">{option.name}</span>
                                {option.chosen ? (
                                    <Badge variant="outline" data-written-by="app">
                                        <CircleCheck aria-hidden="true" />
                                        {words.chosen}
                                    </Badge>
                                ) : null}
                            </span>
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((row) => (
                    <TableRow key={row.label}>
                        <TableHead scope="row" className="h-auto py-spacing-xs align-top font-medium whitespace-normal" data-written-by="app">
                            {row.label}
                        </TableHead>
                        {options.map((option) => (
                            <TableCell key={option.name} className="align-top whitespace-normal">
                                {row.cell(option)}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

/** The challenges a reviewer raised that are still open, each saying when it is about an option not chosen. */
export function Challenges({ items }: { readonly items: ProposedView["challenges"] }) {
    return (
        <div className="flex flex-col">
            {items.map((each) => (
                <Item key={each.says} size="xs" className="items-start">
                    <ItemContent className="min-w-0">
                        <ItemDescription className="line-clamp-none text-foreground" data-written-by="agent">
                            {each.says}
                        </ItemDescription>
                        {each.other === null ? null : (
                            <ItemDescription className="line-clamp-none" data-written-by="app">
                                {words.aboutOther(each.other)}
                            </ItemDescription>
                        )}
                    </ItemContent>
                </Item>
            ))}
        </div>
    );
}

/** What changed since the person confirmed, folded, each kind of change with its names. */
export function SinceFold({ since }: { readonly since: Since | null }) {
    if (since === null) return null;
    const groups = [
        { label: words.added, names: since.added },
        { label: words.removed, names: since.removed },
        { label: words.changedItems, names: since.changed },
    ].filter((group) => group.names.length > 0);
    return (
        <div className="border-t border-border">
            <Fold summary={words.changed}>
                <div className="flex flex-col gap-spacing-md">
                    {groups.map((group) => (
                        <div key={group.label} className="flex flex-col gap-spacing-2xs">
                            <p className="font-medium" data-written-by="app">
                                {group.label}
                            </p>
                            <ul className="flex list-disc flex-col gap-spacing-2xs ps-spacing-4xl">
                                {group.names.map((name) => (
                                    <li key={name} data-written-by="agent">
                                        {name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </Fold>
        </div>
    );
}
