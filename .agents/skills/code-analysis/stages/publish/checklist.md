# Review checklist: The briefing

The system page lists what the system offers under these areas, read by people deciding about the system who will never open the code; every capability page names its area. An area claims every capability in it (`briefPath`). Open the code a capability's evidence cites where a claim about it is uncertain.

## Wrong

- An area whose capabilities serve no one purpose together, or one named by a technical layer rather than by what it does for the people using the system; two areas a person running it would call one.
- An area's purpose its capabilities do not show, or one that would fit any system (for example "manages data for users").
- Areas that restate the capabilities' names and explain nothing.

## Missing

- A grouping the brief plainly shows (capabilities sharing their data, in the same parts, started by the same people) that the areas split apart.
- An assumption, where the records point two ways and the areas chose one.

## Cross-cutting concerns

- A `CrossCuttingConcern` whose name or purpose the lines do not support, or whose verdict is not the one the lines show: shared business code called a mechanism, or a mechanism (language lookup, rights, logging, error reporting, configuration) called domain code.
- A candidate grouped with blocks that do different work, or one concern split across records where one name covers the blocks.
- A concern the code applies without a call that the briefing left out of its facts.

## Places

- A `Screen` named by a file, class or folder, not by what is done there; two records that are one place to the people using it (a page and its dialog), or one that merges places they would tell apart.
- A `kind` the files do not show: `screen` on a page, a command, a build step or a scheduled task; `service` on tests; `other` on a page, window, dialog or service people work with.
- A purpose that would fit any place, or that its candidate's entry points do not show.
- A `SystemWords` name the brief and the code's titles do not show, or a term the brief never uses or defines by itself.

## Views

- A `View` whose title no reader would ask, whose caption says what its boxes do not show, or that restates a table beside it.
- No functional or technical view, or one that mixes levels so that it answers no question.
- Boxes that hide what matters (one part of many) where the question needs them all, or a box that cites nothing where records exist.
