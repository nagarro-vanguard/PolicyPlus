import { Sidebar, SidebarProvider } from "@continuum/ui/components/sidebar";
import type { CSSProperties } from "react";
import { NavMenu, type NavProps } from "./NavMenu";

// The design system's sidebar beside the page, from Finch's `md` up; rendered to HTML at build time and never hydrated,
// so it ships no script. Below `md` it is hidden and MobileNav's sheet holds the same menu.

/**
 * The sidebar.
 * @param props what the menu shows
 * @returns the sidebar, with the gap that keeps the page beside it
 */
export function SideNav(props: NavProps) {
    return (
        <SidebarProvider className="min-h-0 w-auto shrink-0" style={{ "--sidebar-width": "var(--size-navigation)" } as CSSProperties}>
            <Sidebar>
                <NavMenu {...props} />
            </Sidebar>
        </SidebarProvider>
    );
}
