import { Badge } from "@continuum/ui/components/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@continuum/ui/components/item";
import { Equal, Merge, Minus, Plus, RefreshCw, type LucideIcon } from "lucide-react";
import type { MaybeLink } from "../../case/journeys";
import { type ChangeGroup, changeGroupWords } from "../../lib/copy";

// The small pieces the two Journeys pages share: the change chip (a word and its icon, never colour alone) and a list
// of things the case links to, each a link into the section that holds it, or plain words when that section is not built.

const icons: Readonly<Record<ChangeGroup, LucideIcon>> = { kept: Equal, merged: Merge, reworked: RefreshCw, new: Plus, dropped: Minus };

/**
 * A kind of change as a chip.
 * @param props the kind of change and, when it says more than the kind, the step's own label
 * @returns the chip
 */
export function ChangeChip({ group, label }: { readonly group: ChangeGroup; readonly label?: string }) {
    const Icon = icons[group];
    return (
        <Badge variant="outline" data-written-by="app" data-change={group}>
            <Icon aria-hidden="true" />
            {label ?? changeGroupWords[group]}
        </Badge>
    );
}

/**
 * The kinds of change of a journey, in one line.
 * @param props the kinds
 * @returns the chips, or nothing
 */
export function ChangeChips({ groups }: { readonly groups: readonly ChangeGroup[] }) {
    if (groups.length === 0) return null;
    return (
        <span className="flex flex-wrap gap-spacing-xs">
            {groups.map((group) => (
                <ChangeChip key={group} group={group} />
            ))}
        </span>
    );
}

/**
 * Things the case links to, one row each, with the sentence that says what it is.
 * @param props the things and the address of the site's root from this page
 * @returns the rows
 */
export function LinkRows({ items, root }: { readonly items: readonly MaybeLink[]; readonly root: string }) {
    return (
        <div className="flex flex-col">
            {items.map((item, at) => (
                <Item key={`${item.href ?? ""}${item.name}${String(at)}`} size="xs" render={item.href === undefined ? <div /> : <a href={`${root}${item.href}`} />}>
                    <ItemContent className="min-w-0">
                        <ItemTitle className="line-clamp-none" data-written-by="agent">
                            {item.name}
                        </ItemTitle>
                        {item.line === undefined ? null : (
                            <ItemDescription className="line-clamp-none" data-written-by="agent">
                                {item.line}
                            </ItemDescription>
                        )}
                    </ItemContent>
                </Item>
            ))}
        </div>
    );
}

/**
 * Things the case links to, inline after a label.
 * @param props the label, the things and the address of the site's root from this page
 * @returns the line, or nothing when there is nothing
 */
export function LinkLine({ label, items, root }: { readonly label: string; readonly items: readonly MaybeLink[]; readonly root: string }) {
    if (items.length === 0) return null;
    return (
        <p className="text-sm">
            <span className="text-muted-foreground" data-written-by="app">
                {label}:{" "}
            </span>
            {items.map((item, at) => (
                <span key={`${item.name}${String(at)}`} data-written-by="agent">
                    {at > 0 ? ", " : ""}
                    {item.href === undefined ? (
                        item.name
                    ) : (
                        <a href={`${root}${item.href}`}>
                            {item.name}
                        </a>
                    )}
                </span>
            ))}
        </p>
    );
}
