# Design language of the analysis app

Follows Continuum's design language: consistency over local taste, the reader's words, state never by colour alone, one accent for the main action, sections with a heading and a thin rule and never a card, content, loading, no data and error on every list, WCAG 2.2 AA, light and dark. The components and every value (colour, type, size, spacing, radius, depth, density) are Continuum UI's, synced into `vendor/ui` and never edited there (`vendor/README.md`); the reader's few values of its own (the severity, state and provenance scales, the diagram tokens, the reading column) are in `src/styles/reader-theme.css`. Pages and the reader's composites are built from those components with Tailwind classes on the theme. This file holds only what the code does not show. Nothing outside the two theme files names a raw colour or a pixel font size; a test fails if it does.

## Colour and meaning

- Colour is spent on problems and on three scales: severity, state and provenance. The accent is never one of them, and never a link.
- A badge always has an icon and a word; the three provenance badges also differ by edge, not only colour.
- A claim shows how sure we are and where it comes from, on every kind of page.
- A place in the code is always an evidence chip that copies it, never plain text.

## Layout

- One frame on every page: a sidebar, a thin top bar, the page. The one thing beside the page is the "On this page" rail (a fold at the top of the page below 1280 pixels), which lists the page's own headings and appears only on a page with four or more. No related panel.
- The sidebar is one level and carries no counts: one flat list of the sections (Overview, Capabilities and places, Journeys, Architecture, Choices, Plan, Risks). The capabilities are on their own page, not in the sidebar; the palette finds everything else. Below the theme's `md` the sidebar is a sheet, opened from the top bar. A script that sets a page up runs each time a page is shown.
- One reading column. A table or a drawing may go wider and says so.
- Density is the app's, not a page's: no page sets its own or offers a control for it.
- Type and control sizes come from the theme; a page never invents one. A control is never taller than a line of text with its padding, and nothing is larger than the page heading. The reader's text is 13px, so its controls are compact: buttons are the `sm` size (`icon-sm` for an icon), and the input, the input group and the select are 1.75rem, set once in `reader-theme.css`; no page sets a control height.

## Navigation

The sidebar and the "On this page" rail are one language, held in `src/components/shell/navItem.ts`; change it there.

- Idle is muted text. Hover turns the text to the foreground colour and fades in a soft fill over the quick motion duration; the fill is decoration and carries nothing. Pressed darkens the fill.
- Focus is a full-strength 2 px outline in the ring colour, two pixels off the item, shown at once. Never lower its opacity: at 50% it is 2.55:1 (dark) and 2.16:1 (light) against the page, under the 3:1 a focus indicator needs.
- The current item has a 2 px leading border in the foreground colour, set with `aria-current` (`page` in the sidebar, `location` in the rail). The border is the signal that is not colour alone and the one that survives forced colours: the filled background is only 1.53:1 (dark) and 1.18:1 (light) against the page. The sidebar adds the fill and weight 500 (its rows are one line); the rail uses neither, because the heavier weight re-wrapped 3 of 27 entries on the Architecture page.
- A row is never under 24 pixels high (WCAG 2.5.8) and sits clear of the rail's edge so the outline is not cut off.
- The same selection treatment (leading border and fill) marks the chosen row in the search palette. The plan matrix's chosen cell, an inverted fill, is the one deliberate exception: it marks a cell of a table, not a place to go.
- Known gap, outside this app: the design system's `item.tsx` marks its current row with an inset box-shadow, which forced-colours mode removes. Report it for the next sync of Continuum UI; do not edit `vendor/ui`.

## Content

- Summary first, detail on demand: a page opens with the answer, folds the rest, and shows a list, filter, grouping or table control only when the list is long.
- A title is at most eight words; the sentence it came from is the lede. A row shows its full sentence, or the first, and is never cut or ended with an ellipsis. The short name serves the palette and the sidebar.
- A number carries its unit and is said once per page. A fact is said once, on the page that owns it.
- Empty means a word saying why and where to look.
- Shareable: the address holds what the reader sees (the lens of a journey, an open fold, a toggle), so a link shows what its sender saw.
- One front door: the search. A page offers a list control only when the list is long (over about 50 rows) and the control answers what search cannot, such as a facet; everything else is a heading, an order or a fold.

## Diagrams

- Text is never smaller than the diagram tokens give, at full size; a drawing is never scaled down to fit.
- One level at a time, with a limit on the boxes in view; the rest folds into a count and a table. A dense relation is a matrix. Selecting a box brightens what it uses and what uses it.
- Colour carries meaning only and is joined by a word or a shape. Every drawing has a text version.

## Context

- Drawers (the story sheet and the detail of an action or a rule) share one frame: a kind label, the title, a close button, in a panel beside the page. Their sections are a small label (`text-sm font-medium`) over the body, never the page's 16px heading with a rule; a list longer than a screen is a fold or has a filter; a status or a source every row shares is said once above the list, and a row says it only when it differs.
- One control on every page that shows a node: the outline "Copy" button with the size of the text ("about 91 KB"), and beside it an icon-only menu with "Copy file path" and "Download". One Copy copies the whole text; nothing is cut, and nothing offers a shorter version.
- The path is relative to the site root (`context/<kind>/<key>.md`, a real file of the app folder) so it holds wherever the folder sits; Download is a link to the same file; Copy reads the embedded script, so all three work from `file://`.
- The control uses the design system's `Button` and `DropdownMenu`: the theme's focus ring and fills, a target of at least 24 pixels, the app's words (`src/lib/copy.ts`) marked as the app's, no card and no accent colour.
- A text states what the thing is and does in the reader's words, with the rules and evidence it rests on and what is unsure. It never holds a record id, a stored word of the data, a review or provenance label, JSON or a diagram source.

