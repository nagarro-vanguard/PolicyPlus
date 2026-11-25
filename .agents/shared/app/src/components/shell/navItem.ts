// The look of one item in a navigation, shared by the sidebar (NavMenu.tsx) and the "On this page" rail and fold
// (Contents.tsx), so the two read as one language. The recipe, from docs/nav-design-plan.md:
//
//   idle      muted text
//   hover     text to foreground and a soft fill, faded in over the quick motion duration (decoration only)
//   pressed   a darker fill
//   focus     a full-strength 2 px outline in the ring colour, two pixels off the item, shown at once (never faded:
//             the transition names colour, fill and border only, so the outline is not in it)
//   current   foreground text and a 2 px leading border in the foreground colour (and weight 500 where a row cannot
//             re-wrap, see navItemFill). The border is the signal
//             that is not colour alone and that survives forced colours; a fill by itself is 1.2 to 1.5 against the page
//             and would fail 3:1. The leading edge is square so the border sits flush; the trailing edge is rounded.
//
// The current item carries `aria-current` (`page` in the sidebar, `location` in the rail), so one selector serves both.
// Every colour is a theme token and every time a motion token, so reduced motion (which zeroes the tokens) holds.

/** The classes every navigation item shares. */
export const navItem =
    "border-s-2 border-transparent rounded-s-none rounded-e-control text-muted-foreground no-underline " +
    "transition-[color,background-color,border-color] duration-(--motion-duration-quick) ease-(--motion-ease-out) " +
    "hover:bg-accent/50 hover:text-foreground " +
    "active:bg-[color-mix(in_oklab,var(--accent),var(--foreground)_10%)] active:text-foreground " +
    "focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring " +
    "aria-[current]:border-foreground aria-[current]:text-foreground";

/**
 * What only the sidebar adds to the current item: the filled background (a navigation of pages) and weight 500. Its rows
 * are one line each, so the heavier weight cannot re-wrap them. The rail's entries are headings that wrap, and measured
 * on the Architecture page the heavier weight re-wrapped 3 of its 27 rows, moving the list below; so the rail marks its
 * item by the border and the foreground colour alone.
 */
export const navItemFill = "aria-[current]:bg-accent aria-[current]:hover:bg-accent aria-[current]:font-medium";
