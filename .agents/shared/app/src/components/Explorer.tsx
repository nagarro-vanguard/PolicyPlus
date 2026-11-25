import { DetailsSection, Sections } from "@continuum/ui/components/details";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@continuum/ui/components/item";
import type { ReactNode } from "react";
import type { CountView } from "../case/format";
import type { Link, NodeView } from "../case/view";
import { copy } from "../lib/copy";
import { Fold } from "./Fold";
import { Rows } from "./Rows";

// One node of the hierarchy, the same anatomy at every level: the next level as rows, folds for
// the rest, links to the same thing elsewhere, and the way up, back and on. What kind of thing it is, its few facts and
// the context a reader can copy are in the page's header (src/components/shell/PageHeader.tsx). Every count comes from the case's numbers table with its
// scope as the explanation; every name and sentence is the analysis's own. Built from the design system's primitives;
// a section's heading is marked with who wrote it on the section's wrapper, since the design system's section takes
// its heading as words only.

/**
 * A section of the design system, its heading marked with who wrote it.
 * @param props the heading, who wrote it, and what the section holds
 * @returns the section
 */
export function Section({ title, writtenBy, children }: { readonly title: string; readonly writtenBy: "agent" | "app"; readonly children: ReactNode }) {
    return (
        <div data-written-by={writtenBy} data-part="section">
            <DetailsSection title={title}>{children}</DetailsSection>
        </div>
    );
}

/**
 * The facts line: each count with its scope as the explanation on hover.
 * @param props the facts and what checks the node
 * @returns the list, or nothing
 */
export function Facts({ facts, tests }: { readonly facts: readonly CountView[]; readonly tests: CountView | null }) {
    if (facts.length === 0) return null;
    return (
        <ul aria-label={copy.explorer.facts} className="flex flex-wrap gap-x-spacing-xl gap-y-spacing-2xs text-sm text-muted-foreground tabular-nums" data-part="facts">
            {facts.map((fact) => (
                <li key={fact.text} title={fact.scope} data-written-by="app">
                    {fact.text}
                </li>
            ))}
            {tests === null ? null : (
                <li title={tests.scope} data-written-by="app">
                    {copy.explorer.checkedBy(tests.text)}
                </li>
            )}
        </ul>
    );
}

const PagerLink = ({ link, word, rel, root }: { readonly link: Link; readonly word: string; readonly rel?: string; readonly root: string }) => (
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
 * A link to another node as a row: its name, the name from code or a second line, and its count.
 * @param link the link
 * @returns the row
 */
export const rowOfLink = (link: Link & { count?: CountView }) => ({
    href: link.href,
    name: link.name,
    ...(link.code === undefined ? {} : { code: link.code }),
    ...(link.line === undefined ? {} : { line: link.line }),
    ...(link.count === undefined ? {} : { count: link.count }),
});

/**
 * The node.
 * @param props the node's view and the address of the site's root from this page
 * @returns the node, as the page shows it
 */
export function Explorer({ view, root }: { readonly view: NodeView; readonly root: string }) {
    return (
        <div className="flex flex-col gap-spacing-5xl" data-node-view>
            <Sections>
                {view.children.rows.length === 0 ? null : (
                    <Section title={view.children.heading} writtenBy="agent">
                        <Rows rows={view.children.rows} root={root} />
                    </Section>
                )}
                {view.folds.length === 0 ? null : (
                    <div className="flex flex-col border-t border-border">
                        {view.folds.map((fold) => (
                            <Fold key={fold.kind} summary={fold.title} kind={fold.kind}>
                                <Rows rows={fold.rows} root={root} />
                            </Fold>
                        ))}
                    </div>
                )}
                {view.noStory === null ? null : (
                    <Section title={view.noStory.title} writtenBy="app">
                        <p className="text-sm text-muted-foreground" data-written-by="app">
                            {view.noStory.note}
                        </p>
                        <Rows rows={view.noStory.rows} root={root} />
                    </Section>
                )}
                {view.lateral.map((group) => (
                    <Section key={group.label} title={group.label} writtenBy="app">
                        <Rows rows={group.links.map(rowOfLink)} root={root} />
                    </Section>
                ))}
            </Sections>
            {view.up === null && view.prev === null && view.next === null ? null : (
                <nav aria-label={copy.explorer.up} className="flex flex-wrap gap-spacing-md">
                    {view.prev === null ? null : <PagerLink link={view.prev} word={copy.explorer.previous} rel="prev" root={root} />}
                    {view.up === null ? null : <PagerLink link={view.up} word={copy.explorer.up} root={root} />}
                    {view.next === null ? null : <PagerLink link={view.next} word={copy.explorer.next} rel="next" root={root} />}
                </nav>
            )}
        </div>
    );
}
