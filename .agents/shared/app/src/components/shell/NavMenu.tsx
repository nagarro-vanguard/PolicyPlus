import {
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@continuum/ui/components/sidebar";

// The sections of the site as the design system's sidebar menu: the system's name, then one level of sections, the
// current one marked. The same menu fills the sidebar beside the page and the sheet on a narrow screen.

export type NavProps = {
    /** The system's name, written by the analysis. */
    readonly name: string;
    /** The address of the site's root from this page. */
    readonly root: string;
    /** The sections a reader can open, with the current one. */
    readonly sections: readonly { readonly id: string; readonly label: string; readonly href: string; readonly current: "page" | "true" | undefined }[];
    /** The words of the frame. */
    readonly words: { readonly sections: string; readonly sectionsTitle: string };
};

/**
 * The menu, inside a sidebar provider.
 * @param props the system's name, the root, the sections and the frame's words
 * @returns the header and the menu
 */
export function NavMenu({ name, root, sections, words }: NavProps) {
    return (
        <>
            <SidebarHeader>
                <a href={`${root}index.html`} data-astro-prefetch="hover" data-written-by="agent" className="flex min-h-8 items-center gap-spacing-md rounded-control px-spacing-md text-sm font-semibold no-underline">
                    <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-primary" />
                    {name}
                </a>
            </SidebarHeader>
            <SidebarContent>
                <nav aria-label={words.sections}>
                    <SidebarGroup>
                        <SidebarGroupLabel render={<h2 />} data-written-by="app">
                            {words.sectionsTitle}
                        </SidebarGroupLabel>
                        <SidebarMenu>
                            {sections.map((section) => (
                                <SidebarMenuItem key={section.id}>
                                    <SidebarMenuButton
                                        isActive={section.current !== undefined}
                                        render={<a href={`${root}${section.href}`} data-section={section.id} data-astro-prefetch="hover" aria-current={section.current} />}
                                    >
                                        <span data-written-by="app">{section.label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                </nav>
            </SidebarContent>
        </>
    );
}
