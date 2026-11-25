import { Button } from "@continuum/ui/components/button";
import { Copy } from "lucide-react";
import { copy } from "../lib/copy";

// The control that copies a node context text, with the size of what it copies. The page's script
// (src/scripts/shell.ts) reads the text when the button is pressed; when the browser refuses the clipboard, the text is
// shown in the box `ContextFallback` draws, inside the same `data-for-context` block.

/**
 * The button.
 * @param props the text's file, from the page, and its size
 * @returns the button
 */
export function ContextCopy({ file, kilobytes }: { readonly file: string; readonly kilobytes: number }) {
    return (
        <Button variant="outline" data-context-file={file} data-copied={copy.site.copied} data-part="context">
            <Copy aria-hidden="true" />
            <span data-label data-written-by="app">
                {copy.explorer.copyContext}
            </span>
            <span className="text-muted-foreground" data-written-by="app" data-part="context-size">
                {copy.explorer.size(kilobytes)}
            </span>
        </Button>
    );
}
