import type { RuleStatus } from "../case/rule-status";
import { KindBadge } from "./KindBadge";
import { copy } from "../lib/copy";

// Where a business rule stands in the plan, said under the rule wherever the rule is listed: built by a story (a link
// to it on the plan page), left out on purpose (the journey's reason), or in no story (highlighted in the medium scale
// the risks use, with its derived reason). The status is derived in src/case/rule-status.ts from files the case holds.
// The page's script draws the same line in the drawer from the pieces `Parts` renders, so the classes have one source.

const linkClass = "text-foreground underline decoration-muted-foreground underline-offset-4 hover:decoration-foreground";
const lineClass = "flex flex-wrap items-center gap-x-spacing-md gap-y-spacing-2xs px-spacing-md pb-spacing-xs text-xs";

/**
 * The line.
 * @param props the status, the address of the site's root from this page, whether to list the stories that only rely
 *   on the rule, and a hook for the page's script
 * @returns the line
 */
export function RuleStatusLine({ status, root, detail = false, part }: { readonly status: RuleStatus; readonly root: string; readonly detail?: boolean; readonly part?: string }) {
    const none = status.state === "none";
    return (
        <div
            className={`${lineClass} ${none ? "ms-spacing-md border-s-2 border-severity-medium-edge bg-severity-medium-surface py-spacing-xs ps-spacing-md text-foreground" : "text-muted-foreground"}`}
            data-rule-status={status.state}
            data-written-by="app"
            data-part={part}
        >
            {status.state === "built" ? null : <KindBadge kind={none ? "medium" : "neutral"} label={status.label} />}
            {status.builtBy === null ? null : (
                <span>
                    <span className="font-medium text-foreground" data-status-label>
                        {copy.rules.builtBy}
                    </span>{" "}
                    <a href={`${root}${status.builtBy.href}`} className={linkClass} data-status-link data-written-by="agent">
                        {status.builtBy.n} · {status.builtBy.title}
                    </a>
                </span>
            )}
            {status.reason === "" ? null : (
                <span className="min-w-0 flex-1 basis-60" data-status-reason data-written-by={status.state === "dropped" ? "agent" : "app"}>
                    {status.reason}
                </span>
            )}
            {!detail || status.reliedOnBy.length === 0 ? null : (
                <span data-status-also>
                    {copy.rules.reliedOn}{" "}
                    {status.reliedOnBy.map((story, at) => (
                        <span key={story.n}>
                            {at === 0 ? null : "; "}
                            <a href={`${root}${story.href}`} className={linkClass} data-written-by="agent">
                                {story.n} · {story.title}
                            </a>
                        </span>
                    ))}
                </span>
            )}
        </div>
    );
}
