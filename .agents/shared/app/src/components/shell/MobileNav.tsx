import { Button } from "@continuum/ui/components/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@continuum/ui/components/sheet";
import { SidebarProvider } from "@continuum/ui/components/sidebar";
import { Menu } from "lucide-react";
import type { CSSProperties } from "react";
import { NavMenu, type NavProps } from "./NavMenu";

// The menu on a narrow screen: the design system's sheet from the left, holding the sidebar's menu. One of the app's
// islands: the page loads its script only on a screen below Finch's `md` (`client:media`), so a wide screen ships none.

/**
 * The button that opens the menu, and the sheet it opens.
 * @param props what the menu shows, and the word that names the button and the sheet
 * @returns the button; the sheet is rendered into the page's end when open
 */
export function MobileNav(props: NavProps & { readonly menu: string }) {
    const { menu, ...nav } = props;
    return (
        <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label={menu} />}>
                <Menu aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="left" className="w-(--size-navigation) gap-0 bg-sidebar p-0 text-sidebar-foreground">
                <SheetHeader className="sr-only">
                    <SheetTitle>{menu}</SheetTitle>
                </SheetHeader>
                <SidebarProvider className="min-h-0 flex-col" style={{ "--sidebar-width": "var(--size-navigation)" } as CSSProperties}>
                    <NavMenu {...nav} />
                </SidebarProvider>
            </SheetContent>
        </Sheet>
    );
}
