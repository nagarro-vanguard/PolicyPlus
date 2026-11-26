import { Button } from "@continuum/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@continuum/ui/components/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@continuum/ui/components/tooltip";
import { Download, EllipsisVertical, FileText } from "lucide-react";
import { copy } from "../lib/copy";

// The two other ways to take a context text, as the design system's menu: the path of the real file (relative to the
// site's root, so it holds wherever the app folder sits) and a download of that file.

/**
 * The menu.
 * @param props the real file's address from the page, and its path below the site's root
 * @returns the menu
 */
export function ContextMenu({ href, path, onPath }: { readonly href: string; readonly path: string; readonly onPath: () => void }) {
    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger render={<span />}>
                    <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label={copy.explorer.moreWays} />}>
                        <EllipsisVertical aria-hidden="true" />
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent data-written-by="app">{copy.explorer.moreWays}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-auto">
                <DropdownMenuItem onClick={onPath} data-written-by="app" data-path={path}>
                    <FileText aria-hidden="true" />
                    {copy.explorer.copyPath}
                </DropdownMenuItem>
                <DropdownMenuItem render={<a href={href} download />} data-written-by="app">
                    <Download aria-hidden="true" />
                    {copy.explorer.download}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
