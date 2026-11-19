# Design language of the analysis app

Follows Continuum's design language: consistency over local taste, the reader's words, state never by colour alone, one accent for the main action, sections with a heading and a thin rule and never a card, content, loading, no data and error on every list, WCAG 2.2 AA, light and dark. The components and every value (colour, type, size, spacing, radius, depth, density) are Continuum UI's, synced into `vendor/ui` and never edited there (`vendor/README.md`); the reader's few values of its own (the severity, state and provenance scales, the diagram tokens, the reading column) are in `src/styles/reader-theme.css`. Pages and the reader's composites are built from those components with Tailwind classes on the theme. This file holds only what the code does not show. Nothing outside the two theme files names a raw colour or a pixel font size; a test fails if it does.

## Colour and meaning

- Colour is spent on problems and on three scales: severity, state and provenance. The accent is never one of them, and never a link.
- A badge always has an icon and a word; the three provenance badges also differ by edge, not only colour.
- A claim shows how sure we are and where it comes from, on every kind of page.
- A place in the code is always an evidence chip that copies it, never plain text.

## Layout

- One frame on every page: a sidebar, a thin top bar, the page. No right rail, no outline, no related panel.
- The sidebar is one level and carries no counts: Overview, then Understand (Journeys, Architecture, Data, Risks), Modernization (Decisions, Plan; only when they exist) and Reference (Capabilities and screens, Business rules). The capabilities are on the reference page, not in the sidebar; the palette finds everything else. Below the theme's `md` the sidebar is a sheet, opened from the top bar. A script that sets a page up runs each time a page is shown.
- One reading column. A table or a drawing may go wider and says so.
- Density is the app's, not a page's: no page sets its own or offers a control for it.
- Type and control sizes come from the theme; a page never invents one. A control is never taller than a line of text with its padding, and nothing is larger than the page heading.

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
