import { Button } from "@continuum/ui/components/button";
import { Kbd } from "@continuum/ui/components/kbd";
import { Search } from "lucide-react";

// The top bar's two controls, rendered to HTML at build time: the button that opens the search (the page's script binds
// it, `data-palette-open`, with `/`, Control K and Command K) and the theme control, Auto, Light or Dark (the theme script,
// public/site.js, binds `data-theme-choice` and keeps the choice).

/**
 * The search button.
 * @param props its words
 * @returns the button
 */
export function SearchButton({ label }: { readonly label: string }) {
    return (
        <Button
            variant="outline"
            className="min-w-0 flex-1 justify-start text-muted-foreground sm:max-w-sm"
            data-palette-open
            aria-keyshortcuts="/ Control+K Meta+K"
            aria-haspopup="dialog"
        >
            <Search aria-hidden="true" />
            <span className="truncate" data-written-by="app">
                {label}
            </span>
            <Kbd className="ms-auto hidden sm:inline-flex">
                <span data-kbd>⌘K</span>
            </Kbd>
        </Button>
    );
}

const choices = [
    ["auto", "Auto"],
    ["light", "Light"],
    ["dark", "Dark"],
] as const;

/**
 * Auto, Light or Dark; Auto follows the system.
 * @returns the group of three buttons
 */
export function ThemeControl() {
    return (
        <div role="group" aria-label="Theme" className="flex shrink-0 items-center rounded-control border border-border p-px" data-theme-control>
            {choices.map(([choice, word]) => (
                <Button
                    key={choice}
                    variant="ghost"
                    size="xs"
                    className="aria-pressed:bg-secondary aria-pressed:text-secondary-foreground"
                    data-theme-choice={choice}
                    aria-pressed={choice === "auto"}
                >
                    {word}
                </Button>
            ))}
        </div>
    );
}
