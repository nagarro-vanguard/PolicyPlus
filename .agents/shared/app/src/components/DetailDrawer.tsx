import { Button } from "@continuum/ui/components/button";
import { XIcon } from "lucide-react";
import { copy } from "../lib/copy";

// The drawer an action or a business rule opens in, on the page that holds it (`#<key>`): a native dialog painted as
// the design system's sheet, empty until the page's script (src/scripts/shell.ts) reads the detail and draws it from the
// pieces in `data/parts.html`. On a wide screen it sits beside the page, which still scrolls; under 900 pixels it covers
// the page as a modal sheet. No framework: the page ships no island for it.

/**
 * The drawer, empty.
 * @returns the dialog
 */
export function DetailDrawer() {
    return (
        <dialog
            id="detail"
            aria-labelledby="detail-title"
            className="fixed inset-y-0 start-auto end-0 z-30 m-0 h-dvh max-h-none w-full max-w-none border-s border-border bg-popover p-0 text-popover-foreground shadow-(--shadow-elevation-2) backdrop:bg-background/70 backdrop:backdrop-blur-xs sm:max-w-xl min-[900px]:top-12 min-[900px]:h-[calc(100dvh-3rem)] min-[900px]:w-[26rem] print:hidden"
            data-detail-drawer
            data-context-scope
        >
            <div className="flex h-full flex-col">
                <div className="flex items-start gap-spacing-md border-b border-border p-spacing-xxl">
                    <div className="flex min-w-0 flex-1 flex-col gap-spacing-2xs">
                        <p className="text-xs text-muted-foreground" data-written-by="agent" data-detail-noun></p>
                        <h2 id="detail-title" tabIndex={-1} className="text-base font-medium" data-written-by="agent"></h2>
                        <div className="flex" data-detail-code></div>
                    </div>
                    <Button variant="ghost" size="icon-sm" aria-label={copy.explorer.close} data-detail-close>
                        <XIcon aria-hidden="true" />
                    </Button>
                </div>
                <div className="flex flex-1 flex-col gap-spacing-xl overflow-y-auto p-spacing-xxl" data-detail-body></div>
            </div>
        </dialog>
    );
}
