import { Button } from "@continuum/ui/components/button";
import { Copy } from "lucide-react";
import { copy } from "../lib/copy";

// The control that takes a node's context text: one "Copy" with the size of what it copies, and beside it the menu of
// two other ways (the file's path, and a download of the file), drawn by src/scripts/context-menu.tsx. The page's script
// (src/scripts/shell.ts) reads the text when Copy is pressed; when the browser refuses the clipboard, the text is shown
// in the box `PageHeader` draws, inside the same `data-for-context` block. The path and the download name the real
// `.md` file beside the pages (`context/<kind>/<key>.md`), which is there for an editor or a coding agent too.

/**
 * The text's file as the page names it, with its extension changed to the real file's.
 * @param file the text's file as the page names it
 * @returns the file the path and the download point at
 */
export const contextMarkdownOf = (file: string) => file.replace(/\.txt$/, ".md");

/**
 * The control.
 * @param props the text's file, from the page, and its size
 * @returns the control
 */
export function ContextCopy({ file, kilobytes }: { readonly file: string; readonly kilobytes: number }) {
    return (
        <div className="flex items-center gap-spacing-xs">
            <Button variant="outline" data-context-file={file} data-copied={copy.site.copied} data-part="context">
                <Copy aria-hidden="true" />
                <span data-label data-written-by="app">
                    {copy.explorer.copyContext}
                </span>
                <span className="text-muted-foreground" data-written-by="app" data-part="context-size">
                    {copy.explorer.size(kilobytes)}
                </span>
            </Button>
            <span data-context-menu data-file={contextMarkdownOf(file)} data-needs-js hidden></span>
        </div>
    );
}
