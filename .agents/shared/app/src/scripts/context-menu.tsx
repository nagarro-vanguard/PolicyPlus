// The menu beside Copy on every page that shows a node's context text: the design system's menu, mounted where the page
// left an empty marker (`data-context-menu`), so a page with no script shows Copy alone, as it always did. The path it
// copies is the file's address below the site's root, never the address of this page.

import { createRoot } from "react-dom/client";
import { ContextMenu } from "../components/ContextMenu";
import { copy } from "../lib/copy";

const belowRoot = (href: string) => href.replace(/^(\.\.?\/)+/, "");

const enhance = () => {
    for (const marker of document.querySelectorAll<HTMLElement>("[data-context-menu]")) {
        if (marker.dataset.enhanced !== undefined) continue;
        marker.dataset.enhanced = "true";
        const href = marker.dataset.file ?? "";
        const mount = document.createElement("div");
        marker.after(mount);
        createRoot(mount).render(
            <ContextMenu
                href={href}
                path={belowRoot(href)}
                onPath={() => {
                    void navigator.clipboard?.writeText(belowRoot(href)).then(() => {
                        const status = document.querySelector<HTMLElement>("[data-live-status]");
                        if (status !== null) status.textContent = copy.explorer.pathCopied;
                    });
                }}
            />,
        );
    }
};

enhance();
document.addEventListener("astro:page-load", enhance);
// A story's sheet is drawn after the page loads, with its own marker.
new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
