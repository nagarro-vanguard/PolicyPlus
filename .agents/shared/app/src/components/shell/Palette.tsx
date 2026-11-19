import { Input } from "@continuum/ui/components/input";

// The search: a modal `dialog` over the page, a text field and a list of results, both filled and driven by the page's
// script (src/scripts/shell.ts) from `data/search.json`. The design system has no command list yet (it is to be added
// to Continuum UI through its registry, then synced); until then this is the reader's own, on the design system's field.

/**
 * The search dialog.
 * @param props its words
 * @returns the dialog, shut
 */
export function Palette({ words }: { readonly words: { readonly search: string; readonly searchHint: string; readonly results: string; readonly searchHelp: string } }) {
    return (
        <dialog
            id="palette"
            aria-label={words.search}
            data-palette
            className="m-auto mt-[12vh] w-[min(36rem,calc(100%-2rem))] max-w-none rounded-overlay border border-border bg-popover p-0 text-popover-foreground shadow-(--shadow-elevation-3) backdrop:bg-background/70 backdrop:backdrop-blur-xs"
        >
            <form method="dialog" role="search" className="flex flex-col">
                <label className="sr-only" htmlFor="palette-input" data-written-by="app">
                    {words.search}
                </label>
                <div className="border-b border-border p-spacing-md">
                    <Input
                        id="palette-input"
                        type="text"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="palette-list"
                        aria-autocomplete="list"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={words.searchHint}
                    />
                </div>
                <ul id="palette-list" role="listbox" aria-label={words.results} className="flex max-h-[50vh] flex-col overflow-y-auto p-spacing-2xs" />
                <p id="palette-help" className="border-t border-border px-spacing-lg py-spacing-xs text-xs text-muted-foreground" data-written-by="app">
                    {words.searchHelp}
                </p>
            </form>
        </dialog>
    );
}
