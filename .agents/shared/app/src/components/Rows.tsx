import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@continuum/ui/components/item";
import { ChevronRight } from "lucide-react";
import type { RowView } from "../case/view";
import { KindBadge } from "./KindBadge";
import { RuleStatusLine } from "./RuleStatus";

// Rows of the next level or of a fold, each the design system's list row: the name, one line, the kind of place, a risk
// word with its icon and the count in that level's noun. A row that opens something is a link, with a chevron at its end
// and the row's hover and focus; the rest are plain rows. An action named in code shows what it does as its title and
// the name from code as a small tag under it.
// The page's script builds the same row for the detail it reads on demand, from the row this file renders into the
// page's parts (`part`), so the two cannot drift.

/**
 * A name from code, small and quiet, wrapping anywhere so a long name never widens the page.
 * @param props the name
 * @returns the tag
 */
export function CodeTag({ code }: { readonly code: string }) {
    return (
        <code className="w-fit max-w-full rounded-control bg-muted px-spacing-xs font-mono text-xs text-muted-foreground wrap-anywhere" data-written-by="agent" data-part="code">
            {code}
        </code>
    );
}

/**
 * One row.
 * @param props the row, the address of the site's root from this page, and a hook for the page's script
 * @returns the row
 */
export function Row({ row, root, part }: { readonly row: RowView; readonly root: string; readonly part?: string }) {
    const item = (
        <Item size="xs" render={row.href === undefined ? <div /> : <a href={`${root}${row.href}`} />} data-part={part}>
            <ItemContent className="min-w-0">
                <ItemTitle className="line-clamp-none" data-written-by="agent">
                    {row.name}
                </ItemTitle>
                {row.code === undefined ? null : <CodeTag code={row.code} />}
                {row.line === undefined ? null : (
                    <ItemDescription className="line-clamp-none" data-written-by="agent">
                        {row.line}
                    </ItemDescription>
                )}
            </ItemContent>
            <ItemActions className="text-xs text-muted-foreground">
                {row.kind === undefined ? null : <KindBadge label={row.kind} writtenBy="agent" part="kind" />}
                {row.risk === undefined ? null : <KindBadge kind={row.risk.badge} label={row.risk.word} writtenBy="app" part="risk" />}
                {row.count === undefined ? null : (
                    <span className="tabular-nums" title={row.count.scope} data-written-by="app" data-part="count">
                        {row.count.text}
                    </span>
                )}
                {row.href === undefined ? null : (
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--motion-duration-quick) group-hover/item:translate-x-0.5 group-hover/item:text-foreground group-focus-visible/item:text-foreground" />
                )}
            </ItemActions>
        </Item>
    );
    // The status holds a link of its own, so it sits beside the row's link, never inside it.
    return row.status === undefined ? (
        item
    ) : (
        <div className="flex flex-col" data-row-with-status>
            {item}
            <RuleStatusLine status={row.status} root={root} />
        </div>
    );
}

/**
 * The rows, one list.
 * @param props the rows and the address of the site's root from this page
 * @returns the list
 */
export function Rows({ rows, root }: { readonly rows: readonly RowView[]; readonly root: string }) {
    return (
        <div className="flex flex-col" data-part="rows">
            {rows.map((row, at) => (
                <Row key={`${row.href ?? ""}${row.name}${String(at)}`} row={row} root={root} />
            ))}
        </div>
    );
}
