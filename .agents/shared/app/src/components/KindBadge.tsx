import { Badge } from "@continuum/ui/components/badge";
import { cn } from "cn";
import { CircleAlert, CircleCheck, CircleHelp, Eye, Info, Pencil, Search, TriangleAlert, type LucideIcon } from "lucide-react";

// A word with its icon on the design system's badge, painted in one of the reader's semantic scales, never colour alone.
// Kinds: neutral; severity high, medium, low; state changes-state, read-only; provenance stated, inferred, assumed.
// The word is the kind's own unless `label` is given.

export type Kind = "neutral" | "high" | "medium" | "low" | "changes-state" | "read-only" | "stated" | "inferred" | "assumed";

const known: Record<Exclude<Kind, "neutral">, { icon: LucideIcon; word: string; paint: string }> = {
    high: { icon: TriangleAlert, word: "High", paint: "border-severity-high-edge bg-severity-high-surface text-severity-high-text" },
    medium: { icon: CircleAlert, word: "Medium", paint: "border-severity-medium-edge bg-severity-medium-surface text-severity-medium-text" },
    low: { icon: Info, word: "Low", paint: "border-severity-low-edge bg-severity-low-surface text-severity-low-text" },
    "changes-state": { icon: Pencil, word: "Changes state", paint: "border-state-changes-edge bg-state-changes-surface text-state-changes-text" },
    "read-only": { icon: Eye, word: "Read only", paint: "border-state-readonly-edge bg-state-readonly-surface text-state-readonly-text" },
    stated: { icon: CircleCheck, word: "Stated by the code", paint: "border-provenance-stated-edge bg-provenance-stated-surface text-provenance-stated-text" },
    inferred: { icon: Search, word: "Inferred", paint: "border-provenance-inferred-edge bg-provenance-inferred-surface text-provenance-inferred-text" },
    assumed: { icon: CircleHelp, word: "Assumed", paint: "border-provenance-assumed-edge bg-provenance-assumed-surface text-provenance-assumed-text" },
};

/**
 * A badge of a kind, with its icon and word.
 * @param props the kind, the word when it is not the kind's own, who wrote the word, and a hook for the page's script
 * @returns the badge
 */
export function KindBadge({
    kind = "neutral",
    label,
    writtenBy,
    part,
}: {
    readonly kind?: Kind;
    readonly label?: string;
    readonly writtenBy?: "agent" | "app";
    readonly part?: string;
}) {
    const shown = kind === "neutral" ? undefined : known[kind];
    const Icon = shown?.icon;
    return (
        <Badge variant={kind === "neutral" ? "secondary" : "outline"} className={cn(shown?.paint)} data-written-by={writtenBy} data-part={part}>
            {Icon === undefined ? null : <Icon aria-hidden="true" />}
            {label ?? shown?.word ?? ""}
        </Badge>
    );
}
