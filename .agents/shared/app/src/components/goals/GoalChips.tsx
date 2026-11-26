import type { GoalChip } from "../../case/goals-view";
import { copy } from "../../lib/copy";

// The goals a thing serves, said as a short line of links on the page that holds the thing: each chip is the goal's number
// and short label, the goal's own words on hover, a link to its page. It is drawn only when a goal links there, so a page
// no goal reaches shows nothing.

/**
 * The chips of the goals a thing serves.
 * @param props the chips, the line's words (the goal line by default) and the address of the site's root from this page
 * @returns the line, or nothing when no goal links here
 */
export function GoalChips({ chips, root, label = copy.goals.serves }: { readonly chips: readonly GoalChip[]; readonly root: string; readonly label?: string }) {
    if (chips.length === 0) return null;
    return (
        <p className="flex flex-wrap items-baseline gap-x-spacing-md gap-y-spacing-2xs text-sm" data-part="goal-chips">
            <span className="text-muted-foreground" data-written-by="app">
                {label}:
            </span>
            {chips.map((chip) => (
                <a
                    key={chip.number}
                    href={`${root}${chip.href}`}
                    title={chip.text}
                    className="underline decoration-border underline-offset-4 hover:decoration-foreground"
                    data-written-by="agent"
                    data-part="goal-chip"
                >
                    <span className="tabular-nums">{copy.goals.number(chip.number)}</span>: {chip.label}
                </a>
            ))}
        </p>
    );
}
