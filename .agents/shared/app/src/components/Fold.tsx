import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

// A fold that is one line until opened: the summary is the control, the rest shows on demand, shut unless `open`. The
// design system has no fold yet (its `details` is a section of label and value pairs), so this one is the reader's own,
// on the theme's roles; it moves to Continuum UI through its registry when the product needs one too.

/**
 * A fold.
 * @param props the summary, who wrote it, whether it starts open, the kind for the page's script, and what it holds
 * @returns a `details` element
 */
export function Fold({
    summary,
    writtenBy = "app",
    open = false,
    kind,
    children,
}: {
    readonly summary: ReactNode;
    readonly writtenBy?: "agent" | "app";
    readonly open?: boolean;
    readonly kind?: string;
    readonly children: ReactNode;
}) {
    return (
        <details className="group/fold border-b border-border" open={open} data-fold={kind} data-part="fold">
            <summary className="flex min-h-9 cursor-pointer list-none items-center gap-spacing-md py-spacing-xs text-sm font-medium [&::-webkit-details-marker]:hidden hover:text-foreground">
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--motion-duration-quick) group-open/fold:rotate-90" />
                <span data-written-by={writtenBy}>{summary}</span>
            </summary>
            <div className="pb-spacing-lg ps-spacing-4xl" data-part="fold-body">
                {children}
            </div>
        </details>
    );
}
