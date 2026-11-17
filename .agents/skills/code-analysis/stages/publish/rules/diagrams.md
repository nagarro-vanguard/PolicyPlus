# Diagrams: rules

What a diagram of the system may show, when one is worth drawing, and how it is drawn. A figure that shows what the records do not hold, or hides what they do, misleads the person reading it. The build of ux-visuals and its reviewer apply these rules, for any stack and any medium.

## Records and commands

- A diagram reads the payloads (`payloads/system.json` and one file per capability); it never reads the store, and no stage records anything about a picture.
- `diagrams.config.ts`, in `stages/publish/ux-visuals/src/lib`, is the one place that says which diagram goes where, what a place must hold for it to be drawn, how it is laid out and drawn (HTML, SVG, or a node-and-edge library where a person pans and drills) and how many boxes it may hold. Changing any of that is an edit there, never in a page.
- `cli/build-ux-visuals.ts` writes `ux-visuals/` after `write-payloads`; a figure that does not hold fails the build.

## A diagram

- Every box is a layer, capability, screen, action, data kind or external system a payload names, and every arrow is links, entry points or actions a payload counts. It carries the record ids and the count, so a figure traces back.
- Drawn only where it says something: a place that holds too little for it (one capability, no outside system) shows the count that fell short, and its page lists instead.
- Words come from the analysis and the design system; no stack, product or medium is named in a rule.
- A layer is the product unless tooling or tests hold half of its blocks; the figures say "project work" where it is not.

## Drawing

- Nothing is left out silently: what does not fit is folded into one box with its count, and the text version lists every box and arrow.
- A figure is never shrunk below three quarters of its size to fit a page: it folds boxes, then runs the other way, and if it still does not fit it says so.
- A label is wrapped and cut by the room it takes (a wide character counts twice), with the full text in the box's title.
- Meaning is never by colour alone; light and dark both read; every figure has a title, a description and a text version, and downloads as it is.
- The same payload gives the same figure.

## What the code cannot settle

- Whether a layer is the product is a reading of the kinds of part its blocks lie in, not a fact the code states; the payloads carry no review status, so a figure cannot mark a record still disputed.
