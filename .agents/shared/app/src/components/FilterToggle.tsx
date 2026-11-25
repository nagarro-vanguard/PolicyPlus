import { Button } from "@continuum/ui/components/button";

// A filter that is on or off, drawn as the design system's Button pressed or not. The native checkbox the page ships stays
// in the page, hidden: it is what the filter script reads; this button shows its state and sets it
// (src/scripts/filter-selects.tsx). The state is also said in words by the label, never by colour alone.

/**
 * A pressed-or-not button for one filter.
 * @param props the label, whether it is on, and what to do when pressed
 * @returns the button
 */
export function FilterToggle({
    label,
    pressed,
    onToggle,
}: {
    readonly label: string;
    readonly pressed: boolean;
    readonly onToggle: () => void;
}) {
    return (
        <Button type="button" size="sm" variant={pressed ? "secondary" : "outline"} aria-pressed={pressed} onClick={onToggle} data-written-by="app">
            {label}
        </Button>
    );
}
