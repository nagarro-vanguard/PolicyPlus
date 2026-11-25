import { copy } from "../../lib/copy";
import { Fold } from "../Fold";
import { navItem } from "./navItem";

// The list of a page's own headings, as the layout finds them in the page it rendered: a rail beside the page on a wide
// screen, a fold at the top of the page below that. The page's script (src/scripts/contents.ts) marks the heading the
// reader is at (`aria-current`) and moves to a heading smoothly, unless the reader asked for less motion. Each entry
// takes its look (hover, pressed, focus, current) from navItem.ts, the language it shares with the sidebar. A row is
// never under 24 pixels high (WCAG 2.5.8) and sits clear of the rail's edge, so its focus outline is not clipped.

export type ContentsEntry = { id: string; text: string; depth: 2 | 3; writtenBy: "agent" | "app" };

/** A page lists its headings only from this many, so a short page keeps its single column. */
export const contentsFrom = 4;

const Links = ({ entries }: { readonly entries: readonly ContentsEntry[] }) => (
    <ul className="flex flex-col gap-spacing-3xs text-sm">
        {entries.map((entry) => (
            <li key={entry.id} className={entry.depth === 3 ? "ps-spacing-lg" : undefined}>
                <a
                    href={`#${entry.id}`}
                    className={`block py-spacing-3xs ps-spacing-md pe-spacing-md ${navItem}`}
                    data-contents-link={entry.id}
                    data-written-by={entry.writtenBy}
                >
                    {entry.text}
                </a>
            </li>
        ))}
    </ul>
);

/**
 * The rail, beside the page from 1280 pixels.
 * @param props the headings
 * @returns the complementary landmark
 */
export function ContentsRail({ entries }: { readonly entries: readonly ContentsEntry[] }) {
    return (
        <aside
            aria-label={copy.site.onThisPage}
            className="sticky top-12 hidden max-h-[calc(100dvh-3rem)] w-56 shrink-0 self-start overflow-y-auto pt-spacing-4xl ps-spacing-md pe-spacing-xl pb-spacing-xl min-[1280px]:block print:hidden"
            data-contents
        >
            <p className="mb-spacing-xs ps-spacing-md text-xs font-medium text-muted-foreground" data-written-by="app">
                {copy.site.onThisPage}
            </p>
            <Links entries={entries} />
        </aside>
    );
}

/**
 * The fold, at the top of the page below 1280 pixels.
 * @param props the headings
 * @returns the fold
 */
export function ContentsFold({ entries }: { readonly entries: readonly ContentsEntry[] }) {
    return (
        <nav aria-label={copy.site.onThisPage} className="border-t border-border min-[1280px]:hidden print:hidden" data-contents>
            <Fold summary={copy.site.onThisPage}>
                <Links entries={entries} />
            </Fold>
        </nav>
    );
}
