import { Trail, TrailCurrent, TrailStep } from "@continuum/ui/components/trail";
import type { Link } from "../../case/view";

// The way down to this page on the design system's trail: the whole system first, the current place last and not a
// link. Every step's words are the analysis's own, so the trail is marked as written by it.

/**
 * The trail.
 * @param props the steps above this page, this page's name and the address of the site's root from it
 * @returns the trail, or nothing at the top
 */
export function Crumbs({ crumbs, current, root }: { readonly crumbs: readonly Link[]; readonly current: string; readonly root: string }) {
    if (crumbs.length === 0) return null;
    return (
        <div data-written-by="agent">
            <Trail>
                {crumbs.map((crumb) => (
                    <TrailStep key={crumb.href} href={`${root}${crumb.href}`}>
                        {crumb.name}
                    </TrailStep>
                ))}
                <TrailCurrent>{current}</TrailCurrent>
            </Trail>
        </div>
    );
}
