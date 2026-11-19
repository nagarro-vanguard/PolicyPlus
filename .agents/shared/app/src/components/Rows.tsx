import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@continuum/ui/components/item";
import type { RowView } from "../case/view";
import { KindBadge } from "./KindBadge";

// Rows of the next level or of a fold, each the design system's list row: the name, one line, the kind of place, a risk
// word with its icon and the count in that level's noun. A row that opens something is a link; the rest are plain rows.
// The page's script builds the same row for the detail it reads on demand, from the row this file renders into the
// page's parts (`part`), so the two cannot drift.

/**
 * One row.
 * @param props the row, the address of the site's root from this page, and a hook for the page's script
 * @returns the row
 */
export function Row({ row, root, part }: { readonly row: RowView; readonly root: string; readonly part?: string }) {
    return (
        <Item size="xs" render={row.href === undefined ? <div /> : <a href={`${root}${row.href}`} />} data-part={part}>
            <ItemContent className="min-w-0">
                <ItemTitle className="line-clamp-none" data-written-by="agent">
                    {row.name}
                </ItemTitle>
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
            </ItemActions>
        </Item>
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
